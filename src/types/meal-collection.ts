// Resident meal collection — buffet-style meal collection billed directly to a
// room's accommodation invoice. See docs/Resident_meal_collection.md. No
// individual orders, no entitlement model, no QR cards — a card scan resolves
// to a room, or a typed ID resolves to a resident, and either posts a fixed
// charge to the relevant booking's invoice.

import type { BookingAttendee } from '@/types/booking'

export type MealType = 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'supper'
export type MealSessionStatus = 'scheduled' | 'open' | 'closed' | 'cancelled'
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

// A meal collect session is a recurring schedule template (doc §3.1), not a
// dated one-off instance — e.g. "Breakfast Buffet, 06:00–09:00, every day."
export interface MealSession {
  id: string
  meal_period: MealType
  buffet_menu_item_id: string
  buffet_name?: string          // denormalized from the linked MenuItem
  start_time: string            // 'HH:MM'
  end_time: string               // 'HH:MM'
  days_of_week: Weekday[]
  auto_open_close: boolean
  status: MealSessionStatus
  grace_period_minutes: number
  branch_id?: string
  created_at: string
  updated_at: string
}

export interface MealSessionCreatePayload {
  meal_period: MealType
  buffet_menu_item_id: string
  start_time: string
  end_time: string
  auto_open_close: boolean
  days_of_week: Weekday[]
}

export type MealSessionUpdatePayload = Partial<MealSessionCreatePayload>

export interface MealSessionListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  status?: MealSessionStatus
  meal_period?: MealType
  branch_id?: string
}

export interface PaginatedMealSessions {
  data: MealSession[]
  page: number
  page_size: number
  total: number
}

export interface MealSessionStatusUpdate {
  status: MealSessionStatus   // open | closed | cancelled | scheduled (reopen)
}

export interface UpdateGracePeriodPayload {
  grace_period_minutes: number
}

// ── Collect (scan or typed-ID match + charge) ─────────────────────────────────

export type MealCollectionResultType = 'matched' | 'not_found' | 'ambiguous' | 'session_not_open' | 'not_permitted' | 'provisional'

export interface ResidentSummary {
  attendee_id?: string          // absent when a room-only card (no occupant on file) is scanned
  full_name: string
  identification_card?: string
  room_name?: string
  booking_id: string
  booking_number?: string
}

export interface MealCollectRequest {
  input: string                 // raw scanned card UID or typed ID number
  idempotency_key: string        // client-generated UUID, debounce/dedupe guard
  client_collected_at: string    // ISO, client clock — used for offline reconciliation
}

export interface MealCollectionCharge {
  invoice_id: string
  invoice_number?: string
  line_item_id: string
  amount: number
}

export interface MealCollectionResult {
  result: MealCollectionResultType
  resident?: ResidentSummary
  candidates?: ResidentSummary[]   // only populated when result === 'ambiguous'
  charge?: MealCollectionCharge
  message: string
}

// Audit trail (doc §5's "keep a simple collection log" recommendation).
export interface MealCollectionLogEntry {
  id: string
  meal_session_id: string
  attendee_id?: string
  resident_name?: string
  identification_card?: string
  method: 'card' | 'typed'
  card_uid?: string
  room_name?: string
  amount?: number
  invoice_id?: string
  collected_by: string
  collected_by_name?: string
  collected_at: string
  synced_at?: string             // null/undefined until an offline-queued entry syncs
  created_at: string
}

// ── Offline queue ─────────────────────────────────────────────────────────────

export interface ScanQueueEntry extends MealCollectRequest {
  meal_session_id: string
  queued_at: string
}

export interface SyncScansPayload {
  scans: ScanQueueEntry[]
}

export interface SyncScansResult {
  idempotency_key: string
  result: MealCollectionResultType
  meal_collection_id?: string
}

export interface SyncScansResponse {
  results: SyncScansResult[]
}

// ── Card management (room-scoped access cards, doc §4) ────────────────────────
// A card is assigned to a room and, optionally, a specific already-checked-in
// resident — knowing exactly who's holding it matters for accountability, but
// isn't always available or necessary (e.g. a spare/door-only card). Cards
// aren't meal-collection-exclusive — the same physical card can also open
// room doors etc. — so this page is general card inventory management, not
// just a meal-collection concern. The buffet charge itself still always
// posts to the room's current booking invoice regardless of holder (there's
// no per-resident invoice to split against) — attendee_id/holder_name/
// identification_card are for accountability/audit only.

export type MealCardStatus = 'active' | 'inactive' | 'replaced' | 'void'

// A card's role gates what it can be used for — e.g. a Room Service card
// can't collect meals the way a Resident card can. Capabilities per role are
// defined in constants/meals.ts (CARD_ROLES), not here — this is just the
// closed set of valid values.
export type CardRole = 'resident' | 'room_service'

export interface MealCardAssignment {
  id: string
  card_uid: string
  room_id: string
  room_name?: string
  role: CardRole
  attendee_id?: string
  holder_name?: string            // denormalized from the attendee, if any, at assignment time
  identification_card?: string    // denormalized from the attendee, if any, at assignment time
  status: MealCardStatus
  replaced_card_id?: string
  issued_at: string
  created_at: string
  updated_at: string
}

export interface MealCardListParams extends Record<string, string | number | boolean | undefined> {
  room_id?: string
  status?: MealCardStatus
}

export interface AssignCardPayload {
  card_uid: string
  room_id: string
  role: CardRole
  attendee_id?: string
}

// Generic partial update — backs edit (occupant/role), reassign-to-another-
// room, and the activate/deactivate toggle. attendee_id: null explicitly
// clears the occupant (undefined means "leave as-is"). replaced/void go
// through their own dedicated endpoints since they're not simple field patches.
export interface UpdateCardPayload {
  room_id?: string
  role?: CardRole
  attendee_id?: string | null
  status?: 'active' | 'inactive'
}

export interface ReplaceCardPayload {
  new_card_uid: string
  reason?: string
}

// The room's current active stay (booking + checked-in residents) — powers
// the "pick a checked-in guest" dropdown on the card dialog. Not used for
// billing (that's resolved server-side at /collect time); purely for
// populating who's eligible to be linked to a card right now.
export interface CurrentStay {
  booking_id: string
  booking_number?: string
  room_id: string
  room_name?: string
  attendees: BookingAttendee[]
}
