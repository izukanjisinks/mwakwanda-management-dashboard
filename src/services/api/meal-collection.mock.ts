import type {
  MealSession, MealSessionListParams, PaginatedMealSessions,
  MealSessionCreatePayload, MealSessionUpdatePayload, MealSessionStatusUpdate, UpdateGracePeriodPayload,
  MealCollectionLogEntry,
  MealCollectRequest, MealCollectionResult, ResidentSummary,
  MealCardAssignment, MealCardListParams, AssignCardPayload, UpdateCardPayload, ReplaceCardPayload,
  SyncScansPayload, SyncScansResponse, SyncScansResult, CurrentStay,
} from '@/types/meal-collection'
import type { BookingAttendee } from '@/types/booking'
import { CARD_ROLES } from '@/constants/meals'

// In-memory stand-in for the real backend (meal-collection.ts), matching its
// exact method signatures so it swaps in behind meal-collection-adapter.ts.
// Remove at cutover once /meal-sessions, /meal-cards, /meal-collections,
// /rooms/{id}/current-stay, and /bookings/{id}/charges exist server-side.

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms))
}
function uuid(): string {
  return crypto.randomUUID()
}
function nowIso(): string {
  return new Date().toISOString()
}

const BUFFET_PRICE = 100 // ZMW, fixed per doc's "typically fixed per buffet"

// ── Seed: rooms' current bookings/residents ───────────────────────────────────

function attendant(id: string, name: string, idCard: string, bookingId: string, isLead = false): BookingAttendee {
  return { id, booking_id: bookingId, full_name: name, identification_card: idCard, is_lead_contact: isLead, created_at: nowIso() }
}

const stays: CurrentStay[] = [
  {
    booking_id: 'bk-1', booking_number: 'BK-2001', room_id: 'room-101', room_name: 'Room 101',
    attendees: [
      attendant('att-1', 'Chanda Mutale', '111222333', 'bk-1', true),
      attendant('att-2', 'Grace Mutale', '444555666', 'bk-1'),
    ],
  },
  {
    booking_id: 'bk-2', booking_number: 'BK-2002', room_id: 'room-102', room_name: 'Room 102',
    attendees: [
      attendant('att-3', 'John Banda', '777888999', 'bk-2', true),
    ],
  },
]

// Room 101 is shared (2 occupants) and carries two resident cards; Room 102
// has one resident card plus a spare Room Service card (no occupant on file
// — e.g. carried by staff for door access, not entitled to buffet meals).
// Each occupant-linked card denormalizes attendee_id/holder_name/
// identification_card at assignment time — but the buffet charge itself
// still always posts to the room's current booking invoice, since there's
// no per-resident invoice to split.
let cards: MealCardAssignment[] = [
  { id: 'card-1', card_uid: 'RFID-0001', room_id: 'room-101', room_name: 'Room 101', role: 'resident', attendee_id: 'att-1', holder_name: 'Chanda Mutale', identification_card: '111222333', status: 'active', issued_at: nowIso(), created_at: nowIso(), updated_at: nowIso() },
  { id: 'card-2', card_uid: 'RFID-0002', room_id: 'room-101', room_name: 'Room 101', role: 'resident', attendee_id: 'att-2', holder_name: 'Grace Mutale', identification_card: '444555666', status: 'active', issued_at: nowIso(), created_at: nowIso(), updated_at: nowIso() },
  { id: 'card-3', card_uid: 'RFID-0003', room_id: 'room-102', room_name: 'Room 102', role: 'resident', attendee_id: 'att-3', holder_name: 'John Banda', identification_card: '777888999', status: 'active', issued_at: nowIso(), created_at: nowIso(), updated_at: nowIso() },
  { id: 'card-4', card_uid: 'RFID-0004', room_id: 'room-102', room_name: 'Room 102', role: 'room_service', status: 'active', issued_at: nowIso(), created_at: nowIso(), updated_at: nowIso() },
]

let sessions: MealSession[] = [
  { id: 'ms-1', meal_period: 'breakfast', buffet_menu_item_id: 'menu-breakfast', buffet_name: 'Breakfast Buffet', start_time: '06:00', end_time: '09:00', days_of_week: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], auto_open_close: true, status: 'open', grace_period_minutes: 15, created_at: nowIso(), updated_at: nowIso() },
  { id: 'ms-2', meal_period: 'lunch', buffet_menu_item_id: 'menu-lunch', buffet_name: 'Lunch Buffet', start_time: '12:00', end_time: '14:00', days_of_week: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], auto_open_close: true, status: 'scheduled', grace_period_minutes: 15, created_at: nowIso(), updated_at: nowIso() },
  { id: 'ms-3', meal_period: 'dinner', buffet_menu_item_id: 'menu-dinner', buffet_name: 'Dinner Buffet', start_time: '18:00', end_time: '21:00', days_of_week: ['mon', 'tue', 'wed', 'thu', 'fri'], auto_open_close: false, status: 'closed', grace_period_minutes: 15, created_at: nowIso(), updated_at: nowIso() },
]

let logs: MealCollectionLogEntry[] = []

// ── Resolution ─────────────────────────────────────────────────────────────────

function allAttendees(): Array<{ attendee: BookingAttendee; stay: CurrentStay }> {
  return stays.flatMap(stay => stay.attendees.map(attendee => ({ attendee, stay })))
}

function toSummary(attendee: BookingAttendee, stay: CurrentStay): ResidentSummary {
  return {
    attendee_id: attendee.id,
    full_name: attendee.full_name,
    identification_card: attendee.identification_card,
    room_name: stay.room_name,
    booking_id: stay.booking_id,
    booking_number: stay.booking_number,
  }
}

function resolveByIdCard(idCard: string): ResidentSummary[] {
  return allAttendees()
    .filter(({ attendee }) => attendee.identification_card === idCard)
    .map(({ attendee, stay }) => toSummary(attendee, stay))
}

function chargeAndLog(sessionId: string, req: MealCollectRequest, method: 'card' | 'typed', resident: ResidentSummary, cardUid: string | undefined): MealCollectionResult {
  const invoiceId = `inv-${resident.booking_id}`
  const logEntry: MealCollectionLogEntry = {
    id: uuid(),
    meal_session_id: sessionId,
    attendee_id: resident.attendee_id,
    resident_name: resident.full_name,
    identification_card: resident.identification_card,
    method,
    card_uid: cardUid,
    room_name: resident.room_name,
    amount: BUFFET_PRICE,
    invoice_id: invoiceId,
    collected_by: 'staff-current',
    collected_by_name: 'Front Desk',
    collected_at: req.client_collected_at,
    created_at: nowIso(),
  }
  logs = [logEntry, ...logs]

  return {
    result: 'matched',
    resident,
    charge: { invoice_id: invoiceId, line_item_id: uuid(), amount: BUFFET_PRICE },
    message: `Charged ZMW ${BUFFET_PRICE} to ${resident.room_name ?? 'booking'}.`,
  }
}

// A card scan resolves to its registered holder, if one was set at
// assignment time (see assignCard) — a room-only card has none. The room's
// current booking is looked up separately because that's the actual billing
// target — there's no per-resident invoice to charge against, so a stale or
// room-only card still bills whoever occupies the room now, even though the
// display name may not be the person who actually scanned.
function decide(sessionId: string, req: MealCollectRequest): MealCollectionResult {
  const card = cards.find(c => c.card_uid === req.input && c.status === 'active')
  if (card) {
    const role = CARD_ROLES.find(r => r.value === card.role)
    if (role && !role.can_collect_meals) {
      return { result: 'not_permitted', message: `${role.label} cards can't be used to collect meals.` }
    }
    const stay = stays.find(s => s.room_id === card.room_id)
    if (!stay) {
      return { result: 'not_found', message: `${card.room_name ?? 'This room'} has no current guest — nothing to charge.` }
    }
    const fallbackName = stay.attendees.find(a => a.is_lead_contact)?.full_name ?? stay.room_name ?? 'Guest'
    const resident: ResidentSummary = {
      attendee_id: card.attendee_id,
      full_name: card.holder_name ?? fallbackName,
      identification_card: card.identification_card,
      room_name: stay.room_name,
      booking_id: stay.booking_id,
      booking_number: stay.booking_number,
    }
    return chargeAndLog(sessionId, req, 'card', resident, req.input)
  }

  // Fall back to typed National ID / passport number against current residents.
  const matches = resolveByIdCard(req.input)
  if (matches.length === 0) {
    return { result: 'not_found', message: 'No resident found for this card or ID.' }
  }
  if (matches.length > 1) {
    return { result: 'ambiguous', candidates: matches, message: `${matches.length} residents share this ID — select the correct one.` }
  }
  return chargeAndLog(sessionId, req, 'typed', matches[0]!, undefined)
}

// ── Mock API ─────────────────────────────────────────────────────────────────

export const mealCollectionMockApi = {
  // ── Sessions ─────────────────────────────────────────────────────────────
  listSessions: (params?: MealSessionListParams): Promise<PaginatedMealSessions> => {
    let data = sessions
    if (params?.status) data = data.filter(s => s.status === params.status)
    if (params?.meal_period) data = data.filter(s => s.meal_period === params.meal_period)
    return delay({ data, page: 1, page_size: data.length || 1, total: data.length })
  },

  getSession: (id: string): Promise<MealSession> => {
    const found = sessions.find(s => s.id === id)
    if (!found) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'Meal session not found.' } })
    return delay(found)
  },

  createSession: (payload: MealSessionCreatePayload): Promise<MealSession> => {
    const session: MealSession = {
      id: uuid(), status: 'scheduled', grace_period_minutes: 15,
      buffet_name: payload.buffet_menu_item_id, ...payload,
      created_at: nowIso(), updated_at: nowIso(),
    }
    sessions = [session, ...sessions]
    return delay(session)
  },

  updateSession: (id: string, payload: MealSessionUpdatePayload): Promise<MealSession> => {
    const idx = sessions.findIndex(s => s.id === id)
    if (idx === -1) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'Meal session not found.' } })
    sessions[idx] = { ...sessions[idx]!, ...payload, updated_at: nowIso() }
    return delay(sessions[idx]!)
  },

  deleteSession: (id: string): Promise<void> => {
    sessions = sessions.filter(s => s.id !== id)
    return delay(undefined)
  },

  updateSessionStatus: (id: string, payload: MealSessionStatusUpdate): Promise<MealSession> => {
    const idx = sessions.findIndex(s => s.id === id)
    if (idx === -1) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'Meal session not found.' } })
    sessions[idx] = { ...sessions[idx]!, status: payload.status, updated_at: nowIso() }
    return delay(sessions[idx]!)
  },

  updateGracePeriod: (id: string, payload: UpdateGracePeriodPayload): Promise<MealSession> => {
    const idx = sessions.findIndex(s => s.id === id)
    if (idx === -1) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'Meal session not found.' } })
    sessions[idx] = { ...sessions[idx]!, grace_period_minutes: payload.grace_period_minutes, updated_at: nowIso() }
    return delay(sessions[idx]!)
  },

  listCollections: (id: string): Promise<MealCollectionLogEntry[]> =>
    delay(logs.filter(l => l.meal_session_id === id)),

  // ── Collect ──────────────────────────────────────────────────────────────
  collect: (sessionId: string, payload: MealCollectRequest): Promise<MealCollectionResult> => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'Meal session not found.' } })
    if (session.status !== 'open') {
      return delay({ result: 'session_not_open', message: 'This session is not open for collection.' } as MealCollectionResult)
    }
    return delay(decide(sessionId, payload))
  },

  // ── RFID card assignments (room-scoped) ─────────────────────────────────────
  listCards: (params?: MealCardListParams): Promise<MealCardAssignment[]> => {
    let data = cards
    if (params?.room_id) data = data.filter(c => c.room_id === params.room_id)
    if (params?.status) data = data.filter(c => c.status === params.status)
    return delay(data)
  },

  assignCard: (payload: AssignCardPayload): Promise<MealCardAssignment> => {
    const stay = stays.find(s => s.room_id === payload.room_id)
    let holderName: string | undefined
    let idCard: string | undefined
    if (payload.attendee_id) {
      const attendee = stay?.attendees.find(a => a.id === payload.attendee_id)
      if (!attendee) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'This guest is not checked into this room.' } })
      holderName = attendee.full_name
      idCard = attendee.identification_card
    }

    const card: MealCardAssignment = {
      id: uuid(), card_uid: payload.card_uid, room_id: payload.room_id, room_name: stay?.room_name,
      role: payload.role,
      attendee_id: payload.attendee_id, holder_name: holderName, identification_card: idCard,
      status: 'active', issued_at: nowIso(), created_at: nowIso(), updated_at: nowIso(),
    }
    cards = [card, ...cards]
    return delay(card)
  },

  // Occupant edit, role edit, room reassignment, and the active/inactive
  // toggle all go through here as partial field patches.
  updateCard: (id: string, payload: UpdateCardPayload): Promise<MealCardAssignment> => {
    const idx = cards.findIndex(c => c.id === id)
    if (idx === -1) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'Card not found.' } })
    const current = cards[idx]!

    let roomId = current.room_id
    let roomName = current.room_name
    if (payload.room_id && payload.room_id !== current.room_id) {
      roomId = payload.room_id
      roomName = stays.find(s => s.room_id === roomId)?.room_name
    }

    let attendeeId = current.attendee_id
    let holderName = current.holder_name
    let idCard = current.identification_card
    if (payload.attendee_id !== undefined) {
      if (payload.attendee_id === null) {
        attendeeId = undefined; holderName = undefined; idCard = undefined
      } else {
        const attendee = stays.find(s => s.room_id === roomId)?.attendees.find(a => a.id === payload.attendee_id)
        if (!attendee) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'This guest is not checked into this room.' } })
        attendeeId = attendee.id; holderName = attendee.full_name; idCard = attendee.identification_card
      }
    }

    cards[idx] = {
      ...current, room_id: roomId, room_name: roomName,
      role: payload.role ?? current.role,
      attendee_id: attendeeId, holder_name: holderName, identification_card: idCard,
      status: payload.status ?? current.status,
      updated_at: nowIso(),
    }
    return delay(cards[idx]!)
  },

  replaceCard: (id: string, payload: ReplaceCardPayload): Promise<MealCardAssignment> => {
    const idx = cards.findIndex(c => c.id === id)
    if (idx === -1) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'Card not found.' } })
    const old = cards[idx]!
    cards[idx] = { ...old, status: 'replaced', updated_at: nowIso() }
    const replacement: MealCardAssignment = {
      ...old, id: uuid(), card_uid: payload.new_card_uid, status: 'active',
      replaced_card_id: old.id, issued_at: nowIso(), created_at: nowIso(), updated_at: nowIso(),
    }
    cards = [replacement, ...cards]
    return delay(replacement)
  },

  voidCard: (id: string): Promise<MealCardAssignment> => {
    const idx = cards.findIndex(c => c.id === id)
    if (idx === -1) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'Card not found.' } })
    cards[idx] = { ...cards[idx]!, status: 'void', updated_at: nowIso() }
    return delay(cards[idx]!)
  },

  getCurrentStay: (roomId: string): Promise<CurrentStay> => {
    const stay = stays.find(s => s.room_id === roomId)
    if (!stay) return Promise.reject({ error: { code: 'NOT_FOUND', message: 'This room has no active stay.' } })
    return delay(stay)
  },

  // ── Offline sync ─────────────────────────────────────────────────────────
  syncScans: (payload: SyncScansPayload): Promise<SyncScansResponse> => {
    const results: SyncScansResult[] = payload.scans.map(entry => {
      const decision = decide(entry.meal_session_id, entry)
      const logEntry = logs.find(l => l.attendee_id === decision.resident?.attendee_id && l.meal_session_id === entry.meal_session_id)
      return { idempotency_key: entry.idempotency_key, result: decision.result, meal_collection_id: logEntry?.id }
    })
    return delay({ results })
  },
}
