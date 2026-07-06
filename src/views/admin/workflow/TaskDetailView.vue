<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { bookingRequestApi, type MaterialiseAssignment } from '@/services/api/booking-requests'
import { roomApi } from '@/services/api/room'
import { venueApi } from '@/services/api/venue'
import { menusApi } from '@/services/api/menus'
import { getApiError } from '@/utils/errors'
import { toast } from 'vue-sonner'
import type { CorporateBookingRequest, IndividualBookingRequest } from '@/types/booking'
import type { Room } from '@/types/room'
import type { Venue } from '@/types/venue'
import type { MenuItem } from '@/types/menu'
import type { WorkflowTask } from '@/types/workflow'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import TaskActionDialog from '@/components/workflow/TaskActionDialog.vue'
import PersonHistoryDialog, { type PersonRef } from '@/components/workflow/PersonHistoryDialog.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  ArrowLeft, FileText, ImageIcon, ExternalLink,
  CheckCircle2, XCircle, Clock, Building2, User, CalendarDays,
  BedDouble, Users, Loader2, UtensilsCrossed, Theater, History,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useWorkflowStore()

const taskId = computed(() => route.params.id as string)
// Resolved directly from the backend so tasks opened from the All Tasks list
// (assigned to other staff) load correctly, not just the user's own inbox.
const task = ref<WorkflowTask | undefined>(undefined)

const loading = ref(false)
const individualRequest = ref<IndividualBookingRequest | null>(null)
const corporateRequest = ref<CorporateBookingRequest | null>(null)

const isCorporate = computed(() => task.value?.task_details?.task_type === 'corporate_booking')

const isCancelled = computed(() =>
  corporateRequest.value?.status === 'cancelled' ||
  individualRequest.value?.status === 'cancelled',
)

// ─── Individual accommodation details ─────────────────────────────────────────
// Reads the unified envelope (payload.accommodation.*) and falls back to the
// legacy flat payload (check_in/special_requests at top level) for old requests.
const individualDetails = computed(() => {
  const p = individualRequest.value?.payload
  if (!p) return null
  const acc = p.accommodation
  const rooms = acc?.rooms ?? []
  return {
    check_in: acc?.check_in ?? p.check_in ?? '',
    check_out: acc?.check_out ?? p.check_out ?? '',
    notes: acc?.notes ?? p.special_requests ?? '',
    // Guest pre-selects rooms on the website; show the first room's name as the
    // headline, but keep the full list for multi-room bookings.
    rooms: rooms.length
      ? rooms.map(r => ({ name: r.room_name ?? '', type: r.room_type ?? '', rate: r.rate_per_night }))
      : [],
  }
})

// ─── Corporate room assignment (accommodation) ────────────────────────────────
interface GuestRow {
  full_name: string
  identification_card?: string
  email?: string
  phone?: string
  check_in?: string
  check_out?: string
  room_type?: string
  is_lead_contact?: boolean
}

// New envelope shapes. Attendants carry full_name; dates + room type live in the
// shared accommodation block, not per attendant.
interface AttendantRow {
  full_name?: string
  email?: string
  phone?: string
  id_number?: string
  is_lead_contact?: boolean
}
interface AccommodationBlock {
  check_in?: string
  check_out?: string
  room_count?: number
  room_type_preference?: string
}

// normaliseGuests maps the corporate request payload to a flat GuestRow list,
// supporting both the new envelope (attendants[] + shared accommodation block)
// and the legacy shape (guests[] each with their own first/last name + dates).
function normaliseGuests(p: Record<string, unknown> | undefined): GuestRow[] {
  if (!p) return []
  const acc = p.accommodation as AccommodationBlock | undefined

  // New shape: attendants[] with a shared accommodation block.
  const attendants = p.attendants as AttendantRow[] | undefined
  if (Array.isArray(attendants) && attendants.length) {
    return attendants.map((a) => ({
      full_name: a.full_name ?? '',
      identification_card: a.id_number,
      email: a.email,
      phone: a.phone,
      check_in: acc?.check_in,
      check_out: acc?.check_out,
      room_type: acc?.room_type_preference,
      is_lead_contact: a.is_lead_contact,
    }))
  }

  // Legacy shape: guests[] each with first/last name + per-guest dates.
  const legacy = p.guests as Array<Record<string, string>> | undefined
  if (Array.isArray(legacy) && legacy.length) {
    return legacy.map((g) => ({
      full_name: [g.first_name, g.last_name].filter(Boolean).join(' '),
      identification_card: g.identification_card,
      email: g.email,
      check_in: g.check_in,
      check_out: g.check_out,
      room_type: g.room_type,
    }))
  }

  return []
}

const corporateGuests = computed<GuestRow[]>(() => {
  if (!isCorporate.value) return []
  if (corporateRequest.value?.booking_type !== 'accommodation') return []
  const p = corporateRequest.value?.payload as Record<string, unknown> | undefined
  return normaliseGuests(p)
})

const isAccommodation = computed(() =>
  isCorporate.value && corporateRequest.value?.booking_type === 'accommodation',
)

// Named guest roster on an event request (optional — booker may give headcount only).
const eventGuests = computed<GuestRow[]>(() => {
  if (corporateRequest.value?.booking_type !== 'event') return []
  const p = corporateRequest.value?.payload as Record<string, unknown> | undefined
  return normaliseGuests(p)
})

// ─── Event sessions (standalone event booking, Flow B) ────────────────────────
interface EventSession {
  event_name?: string
  event_type?: string
  event_date?: string
  start_time?: string
  end_time?: string
  expected_attendees?: number
  setup_type?: string
  venue_id?: string
  venue_name?: string
  special_requirements?: string
}
interface EventBlock {
  reason_for_booking?: string
  start_date?: string
  end_date?: string
  schedule_mode?: string
  notes?: string
  sessions?: EventSession[]
}

// Event payload comes from whichever request type is loaded (corporate or
// individual) — both store it under payload.event in the new envelope.
const eventBlock = computed<EventBlock | null>(() => {
  const p = (isCorporate.value
    ? corporateRequest.value?.payload
    : individualRequest.value?.payload) as Record<string, unknown> | undefined
  return (p?.event as EventBlock) ?? null
})

const eventSessions = computed<EventSession[]>(() => eventBlock.value?.sessions ?? [])

const isEvent = computed(() => {
  const t = isCorporate.value
    ? corporateRequest.value?.booking_type
    : individualRequest.value?.booking_type
  return t === 'event'
})

// ─── Meal sessions (standalone meal booking, Flow B) ─────────────────────────
interface MealIndividualOrder {
  quantity: number
  menu_item_id: string
  attendant_idx: number
}

interface MealSession {
  session_name?: string
  meal_date?: string
  meal_period?: string
  serving_time?: string
  service_type?: string
  pax_count?: number
  dietary_notes?: string
  arrangements_notes?: string
  individual_orders?: MealIndividualOrder[]
}
interface MealBlock {
  reason_for_booking?: string
  start_date?: string
  end_date?: string
  meal_mode?: string
  schedule_mode?: string
  notes?: string
  sessions?: MealSession[]
}

const mealBlock = computed<MealBlock | null>(() => {
  const p = (isCorporate.value
    ? corporateRequest.value?.payload
    : individualRequest.value?.payload) as Record<string, unknown> | undefined
  return (p?.meal as MealBlock) ?? null
})

const mealSessions = computed<MealSession[]>(() => mealBlock.value?.sessions ?? [])

const isMeal = computed(() => {
  const t = isCorporate.value
    ? corporateRequest.value?.booking_type
    : individualRequest.value?.booking_type
  return t === 'meals'
})

// Price-resolved meals view (menu item names + prices + totals), built server-side.
const mealsSummary = computed(() => corporateRequest.value?.meals_summary ?? null)

// Menu item lookup map populated when viewing an individual meal task (corporate has meals_summary instead).
const menuItemMap = ref<Record<string, MenuItem>>({})

// Attendants listed on a meal request — indexed to match individual_orders[].attendant_idx
const mealAttendants = computed(() => {
  if (!isMeal.value) return []
  const p = (isCorporate.value
    ? corporateRequest.value?.payload
    : individualRequest.value?.payload) as Record<string, unknown> | undefined
  const list = p?.attendants as Array<{ full_name?: string; id_number?: string; email?: string; phone?: string; is_lead_contact?: boolean }> | undefined
  return list ?? []
})

// Dates with fallback from raw mealBlock when meals_summary hasn't been resolved yet
const mealFromDate  = computed(() => mealsSummary.value?.from ?? mealBlock.value?.start_date)
const mealToDate    = computed(() => mealsSummary.value?.to   ?? mealBlock.value?.end_date)
const mealHeadcount = computed(() =>
  mealsSummary.value?.headcount
  ?? (mealSessions.value[0]?.pax_count)
  ?? (mealAttendants.value.length > 0 ? mealAttendants.value.length : undefined),
)

// Returns the summed quantity of orders for one attendant in a session
function ordersForAttendant(session: MealSession, attendantIdx: number) {
  return (session.individual_orders ?? []).filter(o => o.attendant_idx === attendantIdx)
}

const corpCompany  = computed(() => corporateRequest.value?.payload?.company)
const corpBookedBy = computed(() => corporateRequest.value?.payload?.booked_by)
const corpCurrency = computed(() => corporateRequest.value?.payload?.currency ?? 'ZMW')
const corpParticipantCount = computed(() => corporateRequest.value?.payload?.participant_count)

// guest index → selected room id
const guestRoomSelection = ref<Record<number, string>>({})
// guest index → available rooms for that guest's dates
const guestAvailableRooms = ref<Record<number, Room[]>>({})
const roomsLoading = ref(false)

async function loadAvailableRooms() {
  if (!isAccommodation.value) return
  roomsLoading.value = true
  try {
    await Promise.all(
      corporateGuests.value.map(async (g, i) => {
        if (!g.check_in || !g.check_out) {
          guestAvailableRooms.value[i] = []
          return
        }
        const rooms = await roomApi.listAvailable({
          check_in: g.check_in,
          check_out: g.check_out,
          page_size: 200,
          branch_id: task.value?.branch_id,
        })
        guestAvailableRooms.value[i] = rooms ?? []
      }),
    )
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load available rooms.'))
  } finally {
    roomsLoading.value = false
  }
}

// ─── Individual booking — attendants & room assignment ────────────────────────

const isIndAccommodation = computed(() =>
  !isCorporate.value && individualRequest.value?.booking_type === 'accommodation',
)

const indAttendants = computed(() =>
  individualRequest.value?.payload?.attendants ?? [],
)

const indRoomsFromPayload = computed(() =>
  individualRequest.value?.payload?.accommodation?.rooms ?? [],
)

const indAttendantCheckIn = ref<Record<number, string>>({})
const indAttendantCheckOut = ref<Record<number, string>>({})
const indRoomSelection = ref<Record<number, string>>({})
const indAvailableRooms = ref<Record<number, Room[]>>({})
const indRoomsLoading = ref(false)

// Prevent the same room being picked for two attendants whose stays overlap.
// If their date ranges don't overlap, the room is free for both.
function indRoomTakenByOther(attendantIdx: number, roomId: string): boolean {
  return Object.entries(indRoomSelection.value).some(([idx, rid]) => {
    if (Number(idx) === attendantIdx || rid !== roomId) return false
    const otherCi = indAttendantCheckIn.value[Number(idx)]
    const otherCo = indAttendantCheckOut.value[Number(idx)]
    const selfCi  = indAttendantCheckIn.value[attendantIdx]
    const selfCo  = indAttendantCheckOut.value[attendantIdx]
    // If either side is missing dates, assume conflict to be safe
    if (!otherCi || !otherCo || !selfCi || !selfCo) return true
    // Overlap: A starts before B ends AND B starts before A ends
    return otherCi < selfCo && selfCi < otherCo
  })
}

async function loadIndAvailableRooms(attendantIdx?: number) {
  if (!isIndAccommodation.value) return
  indRoomsLoading.value = true
  try {
    await Promise.all(
      (attendantIdx !== undefined ? [attendantIdx] : indAttendants.value.map((_, i) => i))
        .map(async (i) => {
          const ci = indAttendantCheckIn.value[i]
          const co = indAttendantCheckOut.value[i]
          if (!ci || !co) {
            indAvailableRooms.value[i] = []
            return
          }
          const rooms = await roomApi.listAvailable({
            check_in: ci,
            check_out: co,
            page_size: 200,
            branch_id: task.value?.branch_id,
          })
          indAvailableRooms.value[i] = rooms ?? []
        }),
    )
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load available rooms.'))
  } finally {
    indRoomsLoading.value = false
  }
}


const indAllGuestsAssigned = computed(() => {
  if (!isIndAccommodation.value) return true
  if (indAttendants.value.length === 0) return true
  return indAttendants.value.every((_, i) => !!indRoomSelection.value[i])
})

// Approve gating — every guest/attendant must have a room, every session a venue
const allGuestsAssigned = computed(() => {
  if (isEvent.value) return allSessionsAssigned.value
  if (isCorporate.value) {
    if (!isAccommodation.value) return true
    if (corporateGuests.value.length === 0) return false
    return corporateGuests.value.every((_, i) => !!guestRoomSelection.value[i])
  }
  return indAllGuestsAssigned.value
})

// Prevent the same room being picked for two corporate guests whose stays overlap.
// If their date ranges don't overlap, the room is free for both.
function roomTakenByOther(guestIndex: number, roomId: string): boolean {
  return Object.entries(guestRoomSelection.value).some(([idx, rid]) => {
    if (Number(idx) === guestIndex || rid !== roomId) return false
    const other = corporateGuests.value[Number(idx)]
    const self  = corporateGuests.value[guestIndex]
    // If either side is missing dates, assume conflict to be safe
    if (!other?.check_in || !other?.check_out || !self?.check_in || !self?.check_out) return true
    // Overlap: A starts before B ends AND B starts before A ends
    return other.check_in < self.check_out && self.check_in < other.check_out
  })
}

// ─── Event booking — session venue assignment ──────────────────────────────────

const sessionVenueSelection = ref<Record<number, string>>({})
const sessionEventDate      = ref<Record<number, string>>({})
const sessionStartTime      = ref<Record<number, string>>({})
const sessionEndTime        = ref<Record<number, string>>({})
// Per-session venue list: session index → available venues for that session's date
const availableVenues       = ref<Record<number, Venue[]>>({})
const venuesLoading         = ref(false)

async function loadAvailableVenues(sessionIdx?: number) {
  if (!isEvent.value) return
  venuesLoading.value = true
  try {
    const indices = sessionIdx !== undefined
      ? [sessionIdx]
      : eventSessions.value.map((_, i) => i)
    await Promise.all(
      indices.map(async (i) => {
        const date = sessionEventDate.value[i]
        if (!date) { availableVenues.value[i] = []; return }
        const result = await venueApi.list({
          from: date,
          to: date,
          page_size: 200,
          branch_id: task.value?.branch_id,
        })
        availableVenues.value[i] = result?.data ?? []
      }),
    )
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load available venues.'))
  } finally {
    venuesLoading.value = false
  }
}

// Prevent the same venue being assigned to two sessions whose time slots overlap
// on the same date.
function venueTakenByOther(sessionIdx: number, venueId: string): boolean {
  return Object.entries(sessionVenueSelection.value).some(([idx, vid]) => {
    if (Number(idx) === sessionIdx || vid !== venueId) return false
    const otherDate = sessionEventDate.value[Number(idx)]
    const selfDate  = sessionEventDate.value[sessionIdx]
    if (otherDate && selfDate && otherDate !== selfDate) return false
    const otherStart = sessionStartTime.value[Number(idx)]
    const otherEnd   = sessionEndTime.value[Number(idx)]
    const selfStart  = sessionStartTime.value[sessionIdx]
    const selfEnd    = sessionEndTime.value[sessionIdx]
    if (!otherStart || !otherEnd || !selfStart || !selfEnd) return true
    return otherStart < selfEnd && selfStart < otherEnd
  })
}

const allSessionsAssigned = computed(() => {
  if (!isEvent.value) return true
  if (eventSessions.value.length === 0) return true
  return eventSessions.value.every((_, i) => !!sessionVenueSelection.value[i])
})

const documents = computed<string[]>(() => {
  if (isCorporate.value) return corporateRequest.value?.documents ?? []
  return individualRequest.value?.documents ?? []
})

// Document sheet
const docSheetOpen = ref(false)
const selectedDoc = ref<string>('')

function isPdf(url: string) {
  return url.toLowerCase().includes('.pdf')
}

function openDoc(url: string) {
  selectedDoc.value = url
  docSheetOpen.value = true
}

// Person history dialog
const personHistoryOpen = ref(false)
const selectedPerson = ref<PersonRef | null>(null)

function openPersonHistory(name: string, email?: string) {
  selectedPerson.value = { name, email }
  personHistoryOpen.value = true
}

// Action dialog
const actionDialog = ref(false)
const dialogAction = ref<'approve' | 'reject' | null>(null)

function openAction(action: 'approve' | 'reject') {
  dialogAction.value = action
  actionDialog.value = true
}

async function handleConfirm(action: string, comments: string) {
  if (!task.value) return
  const taskType = task.value.task_details?.task_type
  const refId = task.value.task_details?.task_id
  const payload = { action, comments: comments || undefined }

  try {
    // For approve, call the domain endpoint first so the booking is created
    // before the workflow step advances
    if (action === 'approve' && refId) {
      if (taskType === 'individual_booking') {
        const indAssignments = indAttendants.value
          .map((_, i) => {
            const roomId = indRoomSelection.value[i]
            if (!roomId) return null
            const room = indAvailableRooms.value[i]?.find((r: Room) => r.id === roomId)
            return {
              attendant_idx: i,
              room_id: roomId,
              room_name: room?.name,
              check_in: indAttendantCheckIn.value[i] || undefined,
              check_out: indAttendantCheckOut.value[i] || undefined,
            }
          })
          .filter((a): a is NonNullable<typeof a> => a !== null)
        await bookingRequestApi.approveIndividual(refId, {
          assignments: indAssignments.length ? indAssignments : undefined,
        })
        // Materialise venue assignments for individual event bookings
        if (isEvent.value) {
          const venueAssignments = eventSessions.value
            .map((_, i) => {
              const venueId = sessionVenueSelection.value[i]
              if (!venueId) return null
              const venue = availableVenues.value.find(v => v.id === venueId)
              return {
                session_index: i,
                venue_id: venueId,
                venue_name: venue?.name,
                event_date: sessionEventDate.value[i] || undefined,
                start_time: sessionStartTime.value[i] || undefined,
                end_time: sessionEndTime.value[i] || undefined,
              }
            })
            .filter((a): a is NonNullable<typeof a> => a !== null)
          if (venueAssignments.length) {
            await bookingRequestApi.materialiseIndividualEvent(refId, venueAssignments)
          }
        }
      } else if (taskType === 'corporate_booking') {
        await bookingRequestApi.approve(refId)
        // Accommodation requests materialise into a booking with the rooms
        // staff assigned to each guest
        if (isAccommodation.value) {
          const assignments = corporateGuests.value.reduce<MaterialiseAssignment[]>((acc, _, i) => {
            const roomId = guestRoomSelection.value[i]
            if (!roomId) return acc
            const room = guestAvailableRooms.value[i]?.find(r => r.id === roomId)
            acc.push({ guest_index: i, room_id: roomId, room_name: room?.name, room_type: room?.type as string | undefined })
            return acc
          }, [])
          await bookingRequestApi.materialise(refId, assignments)
        }
        // Event requests materialise into a booking with the venues staff assigned
        if (isEvent.value) {
          const venueAssignments = eventSessions.value
            .map((_, i) => {
              const venueId = sessionVenueSelection.value[i]
              if (!venueId) return null
              const venue = availableVenues.value.find(v => v.id === venueId)
              return {
                session_index: i,
                venue_id: venueId,
                venue_name: venue?.name,
                event_date: sessionEventDate.value[i] || undefined,
                start_time: sessionStartTime.value[i] || undefined,
                end_time: sessionEndTime.value[i] || undefined,
              }
            })
            .filter((a): a is NonNullable<typeof a> => a !== null)
          if (venueAssignments.length) {
            await bookingRequestApi.materialiseEvent(refId, venueAssignments)
          }
        }
      }
    }

    await store.processTask(task.value.instance_id, payload)
    toast.success(action === 'approve' ? 'Task approved.' : 'Task rejected.')
    actionDialog.value = false
    router.push({ name: 'workflow-tasks' })
  } catch (err) {
    toast.error(getApiError(err, 'Failed to process task.'))
  }
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusVariant(status: string) {
  switch (status) {
    case 'pending':     return 'secondary' as const
    case 'confirmed':   return 'default' as const
    case 'checked_in':  return 'default' as const
    case 'checked_out': return 'outline' as const
    case 'approved':    return 'default' as const
    case 'cancelled':   return 'destructive' as const
    case 'rejected':    return 'destructive' as const
    default:            return 'secondary' as const
  }
}

function bookingTypeLabel(type: string) {
  switch (type) {
    case 'accommodation': return 'Accommodation'
    case 'meals':         return 'Meals'
    case 'conference':    return 'Conference'
    case 'event':         return 'Event'
    default:              return type
  }
}

onMounted(async () => {
  // Prefer the already-loaded store cache (populated by the task list page)
  // so navigation from the inbox never needs an extra round-trip, and a broken
  // or missing /workflow/tasks/:id endpoint doesn't prevent viewing tasks.
  const cached = [...store.tasks, ...store.allTasks].find(t => t.id === taskId.value)

  if (cached) {
    task.value = cached
  } else {
    try {
      task.value = (await store.fetchTaskById(taskId.value)) ?? undefined
    } catch {
      task.value = undefined
    }
  }

  const t = task.value
  if (!t) {
    toast.error('Task not found.')
    router.push({ name: 'workflow-tasks' })
    return
  }

  const refId = t.task_details?.task_id
  if (!refId) return

  loading.value = true
  try {
    if (isCorporate.value) {
      corporateRequest.value = await bookingRequestApi.get(refId)
      // Only pending accommodation requests need a room picker
      if (isAccommodation.value && task.value?.status !== 'completed') {
        await loadAvailableRooms()
      }
      // Event requests need a venue picker per session
      if (isEvent.value && task.value?.status !== 'completed') {
        eventSessions.value.forEach((s, i) => {
          sessionEventDate.value[i] = s.event_date ?? ''
          sessionStartTime.value[i] = s.start_time ?? ''
          sessionEndTime.value[i]   = s.end_time ?? ''
          if (s.venue_id) sessionVenueSelection.value[i] = s.venue_id
        })
        await loadAvailableVenues()
      }
      if (isMeal.value) {
        try {
          const menu = await menusApi.getMenu({ page_size: 500 })
          for (const item of menu.items?.data ?? []) menuItemMap.value[item.id] = item
        } catch { /* non-fatal */ }
      }
    } else {
      individualRequest.value = await bookingRequestApi.getIndividual(refId)
      if (isIndAccommodation.value) {
        const acc = individualRequest.value?.payload?.accommodation
        const sharedCheckIn = acc?.check_in ?? ''
        const sharedCheckOut = acc?.check_out ?? ''
        // Pre-fill per-attendant dates from the shared accommodation dates
        indAttendants.value.forEach((_, i) => {
          indAttendantCheckIn.value[i] = sharedCheckIn
          indAttendantCheckOut.value[i] = sharedCheckOut
        })
        // Pre-fill room selections from payload
        for (const room of acc?.rooms ?? []) {
          if (room.attendant_idx !== undefined) {
            indRoomSelection.value[room.attendant_idx] = room.room_id
          }
        }
        if (task.value?.status === 'pending' || task.value?.status === 'in_progress') {
          await loadIndAvailableRooms()
        }
      }
      if (isEvent.value && task.value?.status !== 'completed') {
        eventSessions.value.forEach((s, i) => {
          sessionEventDate.value[i] = s.event_date ?? ''
          sessionStartTime.value[i] = s.start_time ?? ''
          sessionEndTime.value[i]   = s.end_time ?? ''
          if (s.venue_id) sessionVenueSelection.value[i] = s.venue_id
        })
        await loadAvailableVenues()
      }
      if (isMeal.value) {
        try {
          const menu = await menusApi.getMenu({ page_size: 500 })
          for (const item of menu.items?.data ?? []) {
            menuItemMap.value[item.id] = item
          }
        } catch {
          // non-fatal: items will display ID fallback
        }
      }
    }
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load details.'))
  } finally {
    loading.value = false
  }
})
</script>

<template>
<div>
  <DashboardHeader title="Task Detail" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Back -->
    <div>
      <Button variant="ghost" class="-ml-2" @click="router.push({ name: 'workflow-tasks' })">
        <ArrowLeft class="size-4 mr-2" />
        Back to Task Inbox
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="loading || store.tasksLoading" class="flex flex-col gap-4">
      <div class="h-32 rounded-xl bg-muted animate-pulse" />
      <div class="h-48 rounded-xl bg-muted animate-pulse" />
    </div>

    <template v-else-if="task">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left: details -->
        <div class="lg:col-span-2 flex flex-col gap-6">

          <!-- Task header card -->
          <div class="rounded-xl border bg-card p-6 flex flex-col gap-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs text-muted-foreground mb-1">Step</p>
                <h2 class="text-lg font-semibold">{{ task.step_name }}</h2>
                <p v-if="task.task_details?.task_description" class="text-sm text-muted-foreground mt-1">
                  {{ task.task_details.task_description }}
                </p>
              </div>
              <Badge :variant="statusVariant(task.status)" class="shrink-0 capitalize">
                {{ task.status.replace('_', ' ') }}
              </Badge>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t text-sm">
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Submitted by</p>
                <p class="font-medium">{{ task.task_details?.sender_details?.sender_name || '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Type</p>
                <div class="flex items-center gap-1.5">
                  <Building2 v-if="isCorporate" class="size-3.5 text-muted-foreground" />
                  <User v-else class="size-3.5 text-muted-foreground" />
                  <p>{{ isCorporate ? 'Corporate' : 'Individual' }}</p>
                </div>
              </div>
              <div v-if="task.task_details?.task_ref">
                <p class="text-xs text-muted-foreground mb-0.5">Reference</p>
                <p class="font-mono text-xs">{{ task.task_details.task_ref }}</p>
              </div>
              <div v-if="task.due_date">
                <p class="text-xs text-muted-foreground mb-0.5">Due Date</p>
                <div class="flex items-center gap-1.5">
                  <Clock class="size-3.5 text-muted-foreground" />
                  <p>{{ fmt(task.due_date) }}</p>
                </div>
              </div>
              <div v-if="task.completed_at">
                <p class="text-xs text-muted-foreground mb-0.5">Completed</p>
                <p>{{ fmt(task.completed_at) }}</p>
              </div>
            </div>
          </div>

          <!-- Individual booking request details -->
          <template v-if="!isCorporate && individualRequest">

            <!-- Booking summary card -->
            <div class="rounded-xl border bg-card p-6 flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-1">
                <UtensilsCrossed v-if="isMeal" class="size-4 text-primary" />
                <Theater v-else-if="isEvent" class="size-4 text-primary" />
                <BedDouble v-else class="size-4 text-primary" />
                <h3 class="font-semibold">Booking Request</h3>
                <Badge :variant="statusVariant(individualRequest.status)" class="ml-auto capitalize text-xs">
                  {{ individualRequest.status }}
                </Badge>
              </div>
              <hr class="border-border" />
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <template v-if="isIndAccommodation">
                  <div v-if="individualDetails?.check_in">
                    <p class="text-xs text-muted-foreground mb-0.5">Check-in</p>
                    <div class="flex items-center gap-1.5">
                      <CalendarDays class="size-3.5 text-muted-foreground" />
                      <p>{{ fmt(individualDetails.check_in) }}</p>
                    </div>
                  </div>
                  <div v-if="individualDetails?.check_out">
                    <p class="text-xs text-muted-foreground mb-0.5">Check-out</p>
                    <div class="flex items-center gap-1.5">
                      <CalendarDays class="size-3.5 text-muted-foreground" />
                      <p>{{ fmt(individualDetails.check_out) }}</p>
                    </div>
                  </div>
                  <div v-if="indAttendants.length">
                    <p class="text-xs text-muted-foreground mb-0.5">Guests</p>
                    <p class="font-medium">{{ indAttendants.length }}</p>
                  </div>
                </template>
                <template v-else-if="isEvent">
                  <div v-if="eventBlock?.start_date">
                    <p class="text-xs text-muted-foreground mb-0.5">Start Date</p>
                    <p>{{ fmt(eventBlock.start_date) }}</p>
                  </div>
                  <div v-if="eventBlock?.end_date">
                    <p class="text-xs text-muted-foreground mb-0.5">End Date</p>
                    <p>{{ fmt(eventBlock.end_date) }}</p>
                  </div>
                </template>
                <template v-else-if="isMeal">
                  <div v-if="mealBlock?.start_date">
                    <p class="text-xs text-muted-foreground mb-0.5">Start Date</p>
                    <p>{{ fmt(mealBlock.start_date) }}</p>
                  </div>
                  <div v-if="mealBlock?.end_date">
                    <p class="text-xs text-muted-foreground mb-0.5">End Date</p>
                    <p>{{ fmt(mealBlock.end_date) }}</p>
                  </div>
                  <div v-if="mealSessions.length">
                    <p class="text-xs text-muted-foreground mb-0.5">Sessions</p>
                    <p class="font-medium">{{ mealSessions.length }} meal session{{ mealSessions.length !== 1 ? 's' : '' }}</p>
                  </div>
                  <div v-if="mealBlock?.reason_for_booking" class="col-span-2 sm:col-span-3">
                    <p class="text-xs text-muted-foreground mb-0.5">Purpose of Meal</p>
                    <p class="font-medium">{{ mealBlock.reason_for_booking }}</p>
                  </div>
                </template>
              </div>

              <!-- Meal sessions (individual booking) -->
              <div v-if="isMeal && mealSessions.length" class="rounded-xl border bg-muted/20 overflow-hidden">
                <div class="px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                  Meal Sessions ({{ mealSessions.length }})
                </div>
                <div class="divide-y">
                  <div v-for="(s, si) in mealSessions" :key="si" class="px-4 py-3 text-sm">
                    <!-- Session header -->
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <span class="font-medium">{{ s.session_name || fmt(s.meal_date || '') }}</span>
                      <span class="text-xs text-muted-foreground capitalize">{{ (s.meal_period || '').replace('_', ' ') }}</span>
                    </div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                      <span v-if="s.meal_date">{{ fmt(s.meal_date) }}</span>
                      <span v-if="s.serving_time" class="flex items-center gap-1">
                        <Clock class="size-3" />{{ s.serving_time }}
                      </span>
                      <span v-if="s.service_type" class="capitalize">{{ s.service_type.replace('_', ' ') }}</span>
                      <span v-if="s.pax_count">{{ s.pax_count }} pax</span>
                    </div>
                    <p v-if="s.dietary_notes" class="text-xs mb-2 text-muted-foreground">{{ s.dietary_notes }}</p>
                    <p v-if="s.arrangements_notes" class="text-xs mb-2">{{ s.arrangements_notes }}</p>

                    <!-- Per-attendant orders -->
                    <template v-if="s.service_type === 'individual_order' && s.individual_orders?.length">
                      <div v-if="mealAttendants.length" class="flex flex-col gap-2 mt-1">
                        <div
                          v-for="(a, ai) in mealAttendants"
                          :key="ai"
                          class="rounded-lg border bg-card overflow-hidden"
                        >
                          <div class="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b">
                            <span class="text-xs font-medium">{{ a.full_name || `Guest ${ai + 1}` }}</span>
                            <span v-if="a.is_lead_contact" class="text-[10px] font-semibold text-amber-600 border border-amber-300 rounded px-1">Lead</span>
                            <span class="ml-auto text-xs text-muted-foreground tabular-nums">
                              {{ ordersForAttendant(s, ai).reduce((sum, o) => sum + o.quantity, 0) }} item(s)
                            </span>
                          </div>
                          <div v-if="ordersForAttendant(s, ai).length" class="divide-y">
                            <div
                              v-for="(o, oi) in ordersForAttendant(s, ai)"
                              :key="oi"
                              class="flex items-center justify-between px-3 py-2 text-xs"
                            >
                              <span class="font-medium">
                                {{ menuItemMap[o.menu_item_id]?.name || o.menu_item_id }}
                              </span>
                              <div class="flex items-center gap-3 text-muted-foreground">
                                <span>× {{ o.quantity }}</span>
                                <span v-if="menuItemMap[o.menu_item_id]?.price" class="tabular-nums">
                                  ZMW {{ (menuItemMap[o.menu_item_id].price * o.quantity).toLocaleString() }}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p v-else class="px-3 py-2 text-xs text-muted-foreground">No items selected.</p>
                        </div>
                      </div>
                      <!-- Fallback when no attendant list: flat item list -->
                      <div v-else class="flex flex-col gap-1 mt-1">
                        <div
                          v-for="(o, oi) in s.individual_orders"
                          :key="oi"
                          class="flex items-center justify-between text-xs bg-muted/30 rounded px-3 py-1.5"
                        >
                          <span class="font-medium">{{ menuItemMap[o.menu_item_id]?.name || o.menu_item_id }}</span>
                          <div class="flex items-center gap-3 text-muted-foreground">
                            <span>× {{ o.quantity }}</span>
                            <span v-if="menuItemMap[o.menu_item_id]?.price" class="tabular-nums">
                              ZMW {{ (menuItemMap[o.menu_item_id].price * o.quantity).toLocaleString() }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </template>

                    <!-- Buffet / shared items for this session -->
                    <template v-else-if="s.individual_orders?.length">
                      <div class="flex flex-col gap-1 mt-1">
                        <div
                          v-for="(o, oi) in s.individual_orders"
                          :key="oi"
                          class="flex items-center justify-between text-xs bg-muted/30 rounded px-3 py-1.5"
                        >
                          <span class="font-medium">{{ menuItemMap[o.menu_item_id]?.name || o.menu_item_id }}</span>
                          <div class="flex items-center gap-3 text-muted-foreground">
                            <span>× {{ o.quantity }}</span>
                            <span v-if="menuItemMap[o.menu_item_id]?.price" class="tabular-nums">
                              ZMW {{ (menuItemMap[o.menu_item_id].price * o.quantity).toLocaleString() }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Event sessions -->
              <div v-if="isEvent && eventSessions.length" class="rounded-xl border bg-muted/20 overflow-hidden">
                <div class="px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                  Sessions ({{ eventSessions.length }})
                </div>
                <div class="divide-y">
                  <div v-for="(s, i) in eventSessions" :key="i" class="px-4 py-3 text-sm">
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <span class="font-medium">{{ s.event_name || ('Session ' + (i + 1)) }}</span>
                      <span class="text-xs text-muted-foreground capitalize">{{ (s.event_type || 'event').replace('_', ' ') }}</span>
                    </div>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span v-if="s.event_date">{{ fmt(s.event_date) }}</span>
                      <span v-if="s.start_time">{{ s.start_time }}<template v-if="s.end_time">–{{ s.end_time }}</template></span>
                      <span v-if="s.venue_name">Venue: {{ s.venue_name }}</span>
                      <span v-if="s.expected_attendees">{{ s.expected_attendees }} pax</span>
                      <span v-if="s.setup_type" class="capitalize">{{ s.setup_type.replace('_', ' ') }}</span>
                    </div>
                    <p v-if="s.special_requirements" class="text-xs mt-1">{{ s.special_requirements }}</p>
                  </div>
                </div>
              </div>

              <!-- Requested rooms (accommodation) -->
              <div v-if="isIndAccommodation && individualDetails?.rooms.length" class="rounded-xl border bg-muted/20 overflow-hidden">
                <div class="px-4 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40 flex items-center gap-1.5">
                  <BedDouble class="size-3.5" />
                  Requested Rooms ({{ individualDetails.rooms.length }})
                </div>
                <div class="divide-y">
                  <div
                    v-for="(r, i) in individualDetails.rooms"
                    :key="i"
                    class="px-4 py-3 text-sm flex items-center justify-between gap-2"
                  >
                    <div>
                      <span class="font-medium">{{ r.name || '—' }}</span>
                      <span v-if="r.type" class="text-xs text-muted-foreground ml-2 capitalize">{{ r.type }}</span>
                    </div>
                    <span v-if="r.rate" class="text-xs font-medium text-muted-foreground">ZMW {{ r.rate.toLocaleString() }}/night</span>
                  </div>
                </div>
              </div>

              <div v-if="individualDetails?.notes" class="pt-3 border-t text-sm">
                <p class="text-xs text-muted-foreground mb-0.5">Special Requests</p>
                <p>{{ individualDetails.notes }}</p>
              </div>
              <div v-if="individualRequest.notes" class="pt-3 border-t text-sm">
                <p class="text-xs text-muted-foreground mb-0.5">Notes</p>
                <p>{{ individualRequest.notes }}</p>
              </div>
            </div>

            <!-- Booked By card -->
            <div class="rounded-xl border bg-card p-6 flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-1">
                <User class="size-4 text-primary" />
                <h3 class="font-semibold">Booked By</h3>
              </div>
              <hr class="border-border" />
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p class="text-xs text-muted-foreground mb-0.5">Name</p>
                  <p class="font-medium">{{ individualRequest.booker_name }}</p>
                </div>
                <div v-if="individualRequest.booker_email">
                  <p class="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p>{{ individualRequest.booker_email }}</p>
                </div>
                <div v-if="individualRequest.booker_phone">
                  <p class="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p>{{ individualRequest.booker_phone }}</p>
                </div>
              </div>
            </div>

            <!-- Venue Assignment card (individual event booking) -->
            <div v-if="isEvent && eventSessions.length" class="rounded-xl border bg-card overflow-hidden">
              <div class="flex items-center gap-2 p-5 pb-4 border-b">
                <Theater class="size-4 text-primary" />
                <h3 class="font-semibold">Venue Assignment</h3>
              </div>
              <div v-if="task.status === 'pending' || task.status === 'in_progress'" class="px-5 py-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border-b flex items-center gap-1.5">
                <Theater class="size-3.5" />
                Assign a venue to every session before approving.
              </div>
              <div class="divide-y">
                <div class="grid grid-cols-12 gap-2 px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                  <div class="col-span-3">Session</div>
                  <div class="col-span-2">Date</div>
                  <div class="col-span-2">Start</div>
                  <div class="col-span-2">End</div>
                  <div class="col-span-3">Venue</div>
                </div>
                <div v-for="(s, i) in eventSessions" :key="i" class="grid grid-cols-12 gap-2 px-5 py-3 text-sm items-center">
                  <div class="col-span-3">
                    <span class="font-medium leading-snug block">{{ s.event_name || ('Session ' + (i + 1)) }}</span>
                    <span v-if="s.event_type" class="text-[10px] text-muted-foreground capitalize">{{ s.event_type.replace('_', ' ') }}</span>
                  </div>
                  <div class="col-span-2">
                    <input
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="sessionEventDate[i]"
                      type="date"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      @change="loadAvailableVenues(i)"
                    />
                    <div v-else class="flex items-center gap-1 text-xs">
                      <CalendarDays class="size-3 text-muted-foreground shrink-0" />
                      <span>{{ fmt(sessionEventDate[i] || '') }}</span>
                    </div>
                  </div>
                  <div class="col-span-2">
                    <input
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="sessionStartTime[i]"
                      type="time"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <span v-else class="text-xs">{{ sessionStartTime[i] || '—' }}</span>
                  </div>
                  <div class="col-span-2">
                    <input
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="sessionEndTime[i]"
                      type="time"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <span v-else class="text-xs">{{ sessionEndTime[i] || '—' }}</span>
                  </div>
                  <div class="col-span-3">
                    <select
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="sessionVenueSelection[i]"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      :class="{ 'border-amber-400': !sessionVenueSelection[i] }"
                    >
                      <option value="" disabled>
                        {{ venuesLoading ? 'Loading…' : !sessionEventDate[i] ? 'Set date first' : (availableVenues[i]?.length ?? 0) > 0 ? 'Select venue' : 'No venues available' }}
                      </option>
                      <option
                        v-for="v in (availableVenues[i] ?? [])"
                        :key="v.id"
                        :value="v.id"
                        :disabled="venueTakenByOther(i, v.id)"
                      >
                        {{ v.name }} ({{ v.venue_type.replace('_', ' ') }}, cap. {{ v.capacity }}){{ venueTakenByOther(i, v.id) ? ' · taken' : '' }}
                      </option>
                    </select>
                    <div v-else class="text-xs font-medium">
                      {{ (availableVenues[i] ?? []).find(v => v.id === sessionVenueSelection[i])?.name || s.venue_name || '—' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Guests & Room Assignment card (accommodation with new-envelope payload) -->
            <div v-if="isIndAccommodation && indAttendants.length" class="rounded-xl border bg-card overflow-hidden">
              <div class="flex items-center gap-2 p-5 pb-4 border-b">
                <Users class="size-4 text-primary" />
                <h3 class="font-semibold">Guests &amp; Room Assignment</h3>
              </div>

              <!-- Assign-room reminder banner -->
              <div v-if="task.status === 'pending' || task.status === 'in_progress'" class="px-5 py-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border-b flex items-center gap-1.5">
                <BedDouble class="size-3.5" />
                Set dates and assign a room to every guest before approving.
              </div>

              <!-- Guest rows -->
              <div class="divide-y">
                <!-- Column headers -->
                <div class="grid grid-cols-12 gap-2 px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                  <div class="col-span-3">Guest</div>
                  <div class="col-span-2">ID Number</div>
                  <div class="col-span-2">Check-in</div>
                  <div class="col-span-2">Check-out</div>
                  <div class="col-span-3">Room</div>
                </div>

                <div v-for="(a, i) in indAttendants" :key="i" class="grid grid-cols-12 gap-2 px-5 py-3 text-sm items-center">
                  <!-- Name + Lead badge -->
                  <div class="col-span-3">
                    <span class="font-medium block leading-snug">{{ a.full_name || '—' }}</span>
                    <span v-if="a.is_lead_contact" class="text-[10px] font-semibold uppercase tracking-wide text-amber-600 border border-amber-300 rounded px-1 py-0.5">Lead</span>
                  </div>
                  <!-- ID -->
                  <div class="col-span-2 text-muted-foreground text-xs font-mono">{{ a.id_number || '—' }}</div>
                  <!-- Check-in (editable when pending/in_progress, read-only otherwise) -->
                  <div class="col-span-2">
                    <input
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="indAttendantCheckIn[i]"
                      type="date"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      @change="loadIndAvailableRooms(i)"
                    />
                    <div v-else class="flex items-center gap-1 text-xs">
                      <CalendarDays class="size-3 text-muted-foreground shrink-0" />
                      <span>{{ fmt(indAttendantCheckIn[i] || '') }}</span>
                    </div>
                  </div>
                  <!-- Check-out -->
                  <div class="col-span-2">
                    <input
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="indAttendantCheckOut[i]"
                      type="date"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      @change="loadIndAvailableRooms(i)"
                    />
                    <div v-else class="flex items-center gap-1 text-xs">
                      <CalendarDays class="size-3 text-muted-foreground shrink-0" />
                      <span>{{ fmt(indAttendantCheckOut[i] || '') }}</span>
                    </div>
                  </div>
                  <!-- Room picker (pending) / assigned room (completed) -->
                  <div class="col-span-3">
                    <select
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="indRoomSelection[i]"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      :class="{ 'border-amber-400': !indRoomSelection[i] }"
                    >
                      <option value="" disabled>
                        {{ indRoomsLoading ? 'Loading…' : ((indAvailableRooms[i]?.length ?? 0) > 0 ? 'Select room' : 'No rooms available') }}
                      </option>
                      <option
                        v-for="room in (indAvailableRooms[i] ?? [])"
                        :key="room.id"
                        :value="room.id"
                        :disabled="indRoomTakenByOther(i, room.id)"
                      >
                        {{ room.name }} ({{ room.type }}) — ZMW {{ room.price_per_night?.toLocaleString() }}{{ indRoomTakenByOther(i, room.id) ? ' · taken' : '' }}
                      </option>
                    </select>
                    <div v-else class="text-xs">
                      <span class="font-medium">{{ indRoomsFromPayload.find(r => r.attendant_idx === i)?.room_name || '—' }}</span>
                      <span v-if="indRoomsFromPayload.find(r => r.attendant_idx === i)?.room_type" class="text-muted-foreground ml-1 capitalize">
                        ({{ indRoomsFromPayload.find(r => r.attendant_idx === i)?.room_type }})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Fallback: accommodation without new-envelope attendants (legacy payload) -->
            <div v-else-if="isIndAccommodation && !indAttendants.length" class="rounded-xl border bg-card p-6 flex flex-col gap-4 text-sm">
              <div class="flex items-center gap-2">
                <BedDouble class="size-4 text-primary" />
                <h3 class="font-semibold">Accommodation</h3>
              </div>
              <hr class="border-border" />
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div v-if="individualDetails?.rooms.length || individualRequest.room_name">
                  <p class="text-xs text-muted-foreground mb-0.5">Room</p>
                  <p class="font-medium">
                    {{ individualDetails?.rooms.map(r => r.name).filter(Boolean).join(', ') || individualRequest.room_name }}
                  </p>
                </div>
                <div v-if="individualDetails?.check_in">
                  <p class="text-xs text-muted-foreground mb-0.5">Check-in</p>
                  <div class="flex items-center gap-1.5">
                    <CalendarDays class="size-3.5 text-muted-foreground" />
                    <p>{{ fmt(individualDetails.check_in) }}</p>
                  </div>
                </div>
                <div v-if="individualDetails?.check_out">
                  <p class="text-xs text-muted-foreground mb-0.5">Check-out</p>
                  <div class="flex items-center gap-1.5">
                    <CalendarDays class="size-3.5 text-muted-foreground" />
                    <p>{{ fmt(individualDetails.check_out) }}</p>
                  </div>
                </div>
              </div>
            </div>

          </template>

          <!-- Corporate booking request details -->
          <template v-if="isCorporate && corporateRequest">
            <!-- Request summary -->
            <div class="rounded-xl border bg-card p-6 flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-1">
                <Building2 class="size-4 text-primary" />
                <h3 class="font-semibold">Booking Request</h3>
                <Badge variant="outline" class="ml-auto capitalize text-xs">
                  {{ bookingTypeLabel(corporateRequest.booking_type) }}
                </Badge>
              </div>
              <hr class="border-border" />
              <!-- Company identity -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div v-if="corporateRequest.company_name">
                  <p class="text-xs text-muted-foreground mb-0.5">Company</p>
                  <p class="font-medium">{{ corporateRequest.company_name }}</p>
                </div>
                <div v-if="corporateRequest.branch_name">
                  <p class="text-xs text-muted-foreground mb-0.5">Branch</p>
                  <p>{{ corporateRequest.branch_name }}</p>
                </div>
                <div v-if="corpCompany?.industry">
                  <p class="text-xs text-muted-foreground mb-0.5">Industry</p>
                  <p>{{ corpCompany.industry }}</p>
                </div>
                <div v-if="corpCompany?.tpin">
                  <p class="text-xs text-muted-foreground mb-0.5">TPIN</p>
                  <p class="font-mono text-xs">{{ corpCompany.tpin }}</p>
                </div>
                <div v-if="corpCompany?.email">
                  <p class="text-xs text-muted-foreground mb-0.5">Company Email</p>
                  <p>{{ corpCompany.email }}</p>
                </div>
                <div v-if="corpCompany?.phone">
                  <p class="text-xs text-muted-foreground mb-0.5">Company Phone</p>
                  <p>{{ corpCompany.phone }}</p>
                </div>
                <div v-if="corpCompany?.department_name">
                  <p class="text-xs text-muted-foreground mb-0.5">Department</p>
                  <p>{{ corpCompany.department_name }}</p>
                </div>
                <div v-if="corpCompany?.cost_center">
                  <p class="text-xs text-muted-foreground mb-0.5">Cost Center</p>
                  <p class="font-mono text-xs">{{ corpCompany.cost_center }}</p>
                </div>
                <div v-if="corpCompany?.cost_center_type">
                  <p class="text-xs text-muted-foreground mb-0.5">Cost Center Type</p>
                  <p class="capitalize">{{ corpCompany.cost_center_type.replace('_', ' ') }}</p>
                </div>
                <div v-if="corpCompany?.gl_code">
                  <p class="text-xs text-muted-foreground mb-0.5">GL Code</p>
                  <p class="font-mono text-xs">{{ corpCompany.gl_code }}</p>
                </div>
              </div>

              <hr class="border-border" />

              <!-- Booking meta -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p class="text-xs text-muted-foreground mb-0.5">Status</p>
                  <Badge :variant="statusVariant(corporateRequest.status)" class="capitalize text-xs">
                    {{ corporateRequest.status }}
                  </Badge>
                </div>
                <div v-if="corpCurrency">
                  <p class="text-xs text-muted-foreground mb-0.5">Currency</p>
                  <p>{{ corpCurrency }}</p>
                </div>
                <div v-if="corpParticipantCount">
                  <p class="text-xs text-muted-foreground mb-0.5">Participants</p>
                  <p>{{ corpParticipantCount }}</p>
                </div>
                <div v-if="corporateRequest.reason_for_booking">
                  <p class="text-xs text-muted-foreground mb-0.5">Reason</p>
                  <p>{{ corporateRequest.reason_for_booking }}</p>
                </div>
                <div v-if="corporateRequest.notes">
                  <p class="text-xs text-muted-foreground mb-0.5">Notes</p>
                  <p>{{ corporateRequest.notes }}</p>
                </div>
              </div>
            </div>

            <!-- Booked By -->
            <div v-if="corpBookedBy?.name" class="rounded-xl border bg-card p-6 flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-1">
                <User class="size-4 text-primary" />
                <h3 class="font-semibold">Booked By</h3>
              </div>
              <hr class="border-border" />
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p class="text-xs text-muted-foreground mb-0.5">Name</p>
                  <p class="font-medium">{{ corpBookedBy.name }}</p>
                </div>
                <div v-if="corpBookedBy.email">
                  <p class="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p>{{ corpBookedBy.email }}</p>
                </div>
                <div v-if="corpBookedBy.phone">
                  <p class="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p>{{ corpBookedBy.phone }}</p>
                </div>
                <div v-if="corpBookedBy.job_title">
                  <p class="text-xs text-muted-foreground mb-0.5">Job Title</p>
                  <p>{{ corpBookedBy.job_title }}</p>
                </div>
                <div v-if="corpBookedBy.man_number">
                  <p class="text-xs text-muted-foreground mb-0.5">Man Number</p>
                  <p class="font-mono text-xs">{{ corpBookedBy.man_number }}</p>
                </div>
              </div>
            </div>

            <!-- Authoriser -->
            <div v-if="corporateRequest.authoriser_name" class="rounded-xl border bg-card p-6 flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-1">
                <User class="size-4 text-primary" />
                <h3 class="font-semibold">Authoriser</h3>
              </div>
              <hr class="border-border" />
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p class="text-xs text-muted-foreground mb-0.5">Name</p>
                  <p class="font-medium">{{ corporateRequest.authoriser_name }}</p>
                </div>
                <div v-if="corporateRequest.authoriser_title">
                  <p class="text-xs text-muted-foreground mb-0.5">Title</p>
                  <p>{{ corporateRequest.authoriser_title }}</p>
                </div>
                <div v-if="corporateRequest.authoriser_department">
                  <p class="text-xs text-muted-foreground mb-0.5">Department</p>
                  <p>{{ corporateRequest.authoriser_department }}</p>
                </div>
                <div v-if="corporateRequest.authoriser_email">
                  <p class="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p>{{ corporateRequest.authoriser_email }}</p>
                </div>
                <div v-if="corporateRequest.authoriser_phone">
                  <p class="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p>{{ corporateRequest.authoriser_phone }}</p>
                </div>
                <div v-if="corporateRequest.authoriser_gl_code">
                  <p class="text-xs text-muted-foreground mb-0.5">GL Code</p>
                  <p class="font-mono text-xs">{{ corporateRequest.authoriser_gl_code }}</p>
                </div>
              </div>
            </div>

            <!-- Payload details (guests list from the original submission) -->
            <div v-if="corporateRequest.payload" class="rounded-xl border bg-card overflow-hidden">
              <div class="flex items-center gap-2 p-5 pb-4 border-b">
                <Users class="size-4 text-primary" />
                <h3 class="font-semibold">Submission Details</h3>
              </div>
              <!-- Accommodation guests + room assignment -->
              <template v-if="isAccommodation && corporateGuests.length">
                <div v-if="task.status === 'pending' || task.status === 'in_progress'" class="px-5 py-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border-b flex items-center gap-1.5">
                  <BedDouble class="size-3.5" />
                  Assign a room to every guest before approving.
                </div>
                <div class="divide-y">
                  <div class="grid grid-cols-12 gap-2 px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                    <div class="col-span-3">Guest</div>
                    <div class="col-span-2">ID / Passport</div>
                    <div class="col-span-2">Check-in</div>
                    <div class="col-span-2">Check-out</div>
                    <div class="col-span-3">Assign Room</div>
                  </div>
                  <div
                    v-for="(g, i) in corporateGuests"
                    :key="i"
                    class="grid grid-cols-12 gap-2 px-5 py-3 text-sm items-center"
                  >
                    <div class="col-span-3">
                      <span class="font-medium block leading-snug">{{ g.full_name || '—' }}</span>
                      <span v-if="g.is_lead_contact" class="text-[10px] font-semibold uppercase tracking-wide text-amber-600 border border-amber-300 rounded px-1 py-0.5">Lead</span>
                    </div>
                    <div class="col-span-2 text-muted-foreground text-xs font-mono">{{ g.identification_card || '—' }}</div>
                    <div class="col-span-2 text-muted-foreground text-xs">{{ g.check_in || '—' }}</div>
                    <div class="col-span-2 text-muted-foreground text-xs">{{ g.check_out || '—' }}</div>
                    <div class="col-span-3">
                      <!-- Pending: room picker -->
                      <select
                        v-if="task.status === 'pending' || task.status === 'in_progress'"
                        v-model="guestRoomSelection[i]"
                        class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                        :class="{ 'border-amber-400': !guestRoomSelection[i] }"
                      >
                        <option value="" disabled>
                          {{ roomsLoading ? 'Loading…' : (guestAvailableRooms[i]?.length ? 'Select room' : 'No rooms available') }}
                        </option>
                        <option
                          v-for="room in guestAvailableRooms[i]"
                          :key="room.id"
                          :value="room.id"
                          :disabled="roomTakenByOther(i, room.id)"
                        >
                          {{ room.name }} ({{ room.type }}) — ZMW {{ room.price_per_night?.toLocaleString() }}{{ roomTakenByOther(i, room.id) ? ' · taken' : '' }}
                        </option>
                      </select>
                      <!-- Completed: show preference -->
                      <span v-else class="text-muted-foreground capitalize text-xs">{{ g.room_type || '—' }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <!-- Event — standalone booking (Flow B): one or more sessions, each
                   with its own venue / date / time -->
              <template v-else-if="corporateRequest.booking_type === 'event'">
                <div class="px-5 py-4 text-sm grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div v-if="eventBlock?.start_date">
                    <p class="text-xs text-muted-foreground mb-0.5">Start Date</p>
                    <p>{{ fmt(eventBlock.start_date) }}</p>
                  </div>
                  <div v-if="eventBlock?.end_date">
                    <p class="text-xs text-muted-foreground mb-0.5">End Date</p>
                    <p>{{ fmt(eventBlock.end_date) }}</p>
                  </div>
                  <div v-if="eventBlock?.schedule_mode">
                    <p class="text-xs text-muted-foreground mb-0.5">Schedule</p>
                    <p class="capitalize">{{ eventBlock.schedule_mode.replace('_', ' ') }}</p>
                  </div>
                  <div v-if="eventBlock?.reason_for_booking" class="col-span-2 sm:col-span-3">
                    <p class="text-xs text-muted-foreground mb-0.5">Reason</p>
                    <p>{{ eventBlock.reason_for_booking }}</p>
                  </div>
                </div>

                <!-- Sessions -->
                <div v-if="eventSessions.length" class="border-t">
                  <div class="px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                    Sessions ({{ eventSessions.length }})
                  </div>
                  <div class="divide-y">
                    <div v-for="(s, i) in eventSessions" :key="i" class="px-5 py-3 text-sm">
                      <div class="flex items-center justify-between gap-2 mb-1">
                        <span class="font-medium">{{ s.event_name || ('Session ' + (i + 1)) }}</span>
                        <span class="text-xs text-muted-foreground capitalize">{{ (s.event_type || 'event').replace('_', ' ') }}</span>
                      </div>
                      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span v-if="s.event_date">{{ fmt(s.event_date) }}</span>
                        <span v-if="s.start_time">{{ s.start_time }}<template v-if="s.end_time">–{{ s.end_time }}</template></span>
                        <span v-if="s.venue_name">Venue: {{ s.venue_name }}</span>
                        <span v-if="s.expected_attendees">{{ s.expected_attendees }} pax</span>
                        <span v-if="s.setup_type" class="capitalize">{{ s.setup_type.replace('_', ' ') }}</span>
                      </div>
                      <p v-if="s.special_requirements" class="text-xs mt-1">{{ s.special_requirements }}</p>
                    </div>
                  </div>
                </div>

                <!-- Named guest roster, if the booker provided one -->
                <div v-if="eventGuests.length" class="border-t">
                  <div class="px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                    Guest List ({{ eventGuests.length }})
                  </div>
                  <div class="divide-y">
                    <div
                      v-for="(g, i) in eventGuests"
                      :key="i"
                      class="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <span class="font-medium">{{ g.full_name || '—' }}</span>
                      <span class="text-xs text-muted-foreground font-mono">{{ g.identification_card || g.email || '' }}</span>
                    </div>
                  </div>
                </div>
                <div v-else class="px-5 py-3 text-xs text-muted-foreground border-t">
                  No individual guests named — headcount only.
                </div>
              </template>
              <!-- Meals — every selection is a menu item (per-guest or buffet),
                   priced from menu_items via meals_summary -->
              <template v-else-if="corporateRequest.booking_type === 'meals'">
                <div class="px-5 py-4 text-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div v-if="mealFromDate">
                    <p class="text-xs text-muted-foreground mb-0.5">From</p>
                    <p>{{ fmt(mealFromDate) }}</p>
                  </div>
                  <div v-if="mealToDate">
                    <p class="text-xs text-muted-foreground mb-0.5">To</p>
                    <p>{{ fmt(mealToDate) }}</p>
                  </div>
                  <div v-if="mealHeadcount">
                    <p class="text-xs text-muted-foreground mb-0.5">Headcount</p>
                    <p>{{ mealHeadcount }}</p>
                  </div>
                  <div v-if="mealBlock?.meal_mode">
                    <p class="text-xs text-muted-foreground mb-0.5">Meal Mode</p>
                    <p class="capitalize">{{ mealBlock.meal_mode.replace('_', ' ') }}</p>
                  </div>
                  <div v-if="corporateRequest?.reason_for_booking" class="col-span-2 sm:col-span-4">
                    <p class="text-xs text-muted-foreground mb-0.5">Purpose of Meal</p>
                    <p class="font-medium">{{ corporateRequest.reason_for_booking }}</p>
                  </div>
                  <div v-if="mealsSummary?.dietary_notes" class="col-span-2 sm:col-span-4">
                    <p class="text-xs text-muted-foreground mb-0.5">Dietary Notes</p>
                    <p>{{ mealsSummary.dietary_notes }}</p>
                  </div>
                </div>

                <!-- Attendants -->
                <div v-if="mealAttendants.length" class="border-t">
                  <div class="px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40 flex items-center gap-1.5">
                    <Users class="size-3.5" /> Attendants ({{ mealAttendants.length }})
                  </div>
                  <div class="divide-y">
                    <div
                      v-for="(a, ai) in mealAttendants"
                      :key="ai"
                      class="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <div class="flex items-center gap-2">
                        <span class="font-medium">{{ a.full_name || '—' }}</span>
                        <span v-if="a.is_lead_contact" class="text-[10px] font-semibold uppercase tracking-wide text-amber-600 border border-amber-300 rounded px-1 py-0.5">Lead</span>
                      </div>
                      <span class="text-xs text-muted-foreground font-mono">{{ a.id_number || a.email || '' }}</span>
                    </div>
                  </div>
                </div>

                <!-- Sessions from raw payload -->
                <div v-if="mealSessions.length" class="border-t">
                  <div class="px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                    Sessions ({{ mealSessions.length }})
                  </div>
                  <div class="divide-y">
                    <div v-for="(s, si) in mealSessions" :key="si" class="px-5 py-3 text-sm">
                      <div class="flex items-center justify-between gap-2 mb-1">
                        <span class="font-medium">{{ s.session_name || fmt(s.meal_date || '') }}</span>
                        <span class="text-xs text-muted-foreground capitalize">{{ (s.meal_period || '').replace('_', ' ') }}</span>
                      </div>
                      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                        <span v-if="s.meal_date">{{ fmt(s.meal_date) }}</span>
                        <span v-if="s.serving_time" class="flex items-center gap-1">
                          <Clock class="size-3" />{{ s.serving_time }}
                        </span>
                        <span v-if="s.service_type" class="capitalize">{{ s.service_type.replace('_', ' ') }}</span>
                        <span v-if="s.pax_count">{{ s.pax_count }} pax</span>
                      </div>
                      <!-- Per-attendant items when service_type is individual_order -->
                      <template v-if="s.service_type === 'individual_order' && s.individual_orders?.length && mealAttendants.length">
                        <div class="flex flex-col gap-2 mt-2">
                          <div
                            v-for="(a, ai) in mealAttendants"
                            :key="ai"
                            class="rounded-lg border bg-card overflow-hidden"
                          >
                            <div class="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b">
                              <span class="text-xs font-medium">{{ a.full_name || `Guest ${ai + 1}` }}</span>
                              <span v-if="a.is_lead_contact" class="text-[10px] font-semibold text-amber-600 border border-amber-300 rounded px-1">Lead</span>
                              <span class="ml-auto text-xs text-muted-foreground tabular-nums">
                                {{ ordersForAttendant(s, ai).reduce((sum, o) => sum + o.quantity, 0) }} item(s)
                              </span>
                            </div>
                            <div v-if="ordersForAttendant(s, ai).length" class="divide-y">
                              <div
                                v-for="(o, oi) in ordersForAttendant(s, ai)"
                                :key="oi"
                                class="flex items-center justify-between px-3 py-2 text-xs"
                              >
                                <span class="font-medium">
                                  {{ menuItemMap[o.menu_item_id]?.name || o.menu_item_id }}
                                </span>
                                <div class="flex items-center gap-3 text-muted-foreground">
                                  <span>× {{ o.quantity }}</span>
                                  <span v-if="menuItemMap[o.menu_item_id]?.price" class="tabular-nums">
                                    ZMW {{ (menuItemMap[o.menu_item_id].price * o.quantity).toLocaleString() }}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p v-else class="px-3 py-2 text-xs text-muted-foreground">No items selected.</p>
                          </div>
                        </div>
                      </template>
                      <p v-if="s.dietary_notes" class="text-xs text-muted-foreground mt-1">{{ s.dietary_notes }}</p>
                      <p v-if="s.arrangements_notes" class="text-xs mt-1">{{ s.arrangements_notes }}</p>
                    </div>
                  </div>
                </div>

                <!-- Buffet / shared items (resolved by server) -->
                <div v-if="mealsSummary?.buffet_items?.length" class="border-t">
                  <div class="px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40 flex items-center gap-1.5">
                    <UtensilsCrossed class="size-3.5" /> Buffet / Shared
                  </div>
                  <div class="divide-y">
                    <div
                      v-for="(it, i) in mealsSummary.buffet_items"
                      :key="i"
                      class="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <span>
                        <span class="font-medium">{{ it.name }}</span>
                        <span class="text-muted-foreground"> × {{ it.quantity }}</span>
                        <span v-if="it.notes" class="text-xs text-muted-foreground italic"> — {{ it.notes }}</span>
                      </span>
                      <span class="text-muted-foreground tabular-nums">ZMW {{ it.subtotal.toLocaleString() }}</span>
                    </div>
                  </div>
                </div>

                <!-- Per-guest itemised selections (resolved by server) -->
                <div v-for="(g, gi) in mealsSummary?.guests ?? []" :key="gi" class="border-t">
                  <div class="px-5 py-2 text-xs font-medium uppercase tracking-wide bg-muted/40 flex items-center justify-between">
                    <span class="text-muted-foreground">
                      {{ g.name }}
                      <span v-if="g.identification_card" class="font-mono normal-case"> · {{ g.identification_card }}</span>
                    </span>
                    <span class="text-muted-foreground tabular-nums normal-case">ZMW {{ g.subtotal.toLocaleString() }}</span>
                  </div>
                  <div class="divide-y">
                    <div
                      v-for="(it, i) in g.items"
                      :key="i"
                      class="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <span>
                        <span class="font-medium">{{ it.name }}</span>
                        <span class="text-muted-foreground"> × {{ it.quantity }}</span>
                        <span v-if="it.notes" class="text-xs text-muted-foreground italic"> — {{ it.notes }}</span>
                      </span>
                      <span class="text-muted-foreground tabular-nums">ZMW {{ it.subtotal.toLocaleString() }}</span>
                    </div>
                  </div>
                </div>

                <!-- Estimated total -->
                <div
                  v-if="mealsSummary && mealsSummary.estimated_total > 0"
                  class="flex items-center justify-between px-5 py-3 border-t bg-muted/30 text-sm font-semibold"
                >
                  <span>Estimated Total</span>
                  <span class="tabular-nums">ZMW {{ mealsSummary.estimated_total.toLocaleString() }}</span>
                </div>
              </template>
            </div>

            <!-- Venue Assignment card (corporate event booking) -->
            <div v-if="isEvent && eventSessions.length" class="rounded-xl border bg-card overflow-hidden">
              <div class="flex items-center gap-2 p-5 pb-4 border-b">
                <Theater class="size-4 text-primary" />
                <h3 class="font-semibold">Venue Assignment</h3>
              </div>
              <div v-if="task.status === 'pending' || task.status === 'in_progress'" class="px-5 py-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border-b flex items-center gap-1.5">
                <Theater class="size-3.5" />
                Assign a venue to every session before approving.
              </div>
              <div class="divide-y">
                <div class="grid grid-cols-12 gap-2 px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                  <div class="col-span-3">Session</div>
                  <div class="col-span-2">Date</div>
                  <div class="col-span-2">Start</div>
                  <div class="col-span-2">End</div>
                  <div class="col-span-3">Venue</div>
                </div>
                <div v-for="(s, i) in eventSessions" :key="i" class="grid grid-cols-12 gap-2 px-5 py-3 text-sm items-center">
                  <div class="col-span-3">
                    <span class="font-medium leading-snug block">{{ s.event_name || ('Session ' + (i + 1)) }}</span>
                    <span v-if="s.event_type" class="text-[10px] text-muted-foreground capitalize">{{ s.event_type.replace('_', ' ') }}</span>
                  </div>
                  <div class="col-span-2">
                    <input
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="sessionEventDate[i]"
                      type="date"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      @change="loadAvailableVenues(i)"
                    />
                    <div v-else class="flex items-center gap-1 text-xs">
                      <CalendarDays class="size-3 text-muted-foreground shrink-0" />
                      <span>{{ fmt(sessionEventDate[i] || '') }}</span>
                    </div>
                  </div>
                  <div class="col-span-2">
                    <input
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="sessionStartTime[i]"
                      type="time"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <span v-else class="text-xs">{{ sessionStartTime[i] || '—' }}</span>
                  </div>
                  <div class="col-span-2">
                    <input
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="sessionEndTime[i]"
                      type="time"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <span v-else class="text-xs">{{ sessionEndTime[i] || '—' }}</span>
                  </div>
                  <div class="col-span-3">
                    <select
                      v-if="task.status === 'pending' || task.status === 'in_progress'"
                      v-model="sessionVenueSelection[i]"
                      class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      :class="{ 'border-amber-400': !sessionVenueSelection[i] }"
                    >
                      <option value="" disabled>
                        {{ venuesLoading ? 'Loading…' : !sessionEventDate[i] ? 'Set date first' : (availableVenues[i]?.length ?? 0) > 0 ? 'Select venue' : 'No venues available' }}
                      </option>
                      <option
                        v-for="v in (availableVenues[i] ?? [])"
                        :key="v.id"
                        :value="v.id"
                        :disabled="venueTakenByOther(i, v.id)"
                      >
                        {{ v.name }} ({{ v.venue_type.replace('_', ' ') }}, cap. {{ v.capacity }}){{ venueTakenByOther(i, v.id) ? ' · taken' : '' }}
                      </option>
                    </select>
                    <div v-else class="text-xs font-medium">
                      {{ (availableVenues[i] ?? []).find(v => v.id === sessionVenueSelection[i])?.name || s.venue_name || '—' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Right: documents + actions -->
        <div class="flex flex-col gap-4">

          <!-- Documents card (corporate only — individual bookings carry no documents) -->
          <div v-if="isCorporate" class="rounded-xl border bg-card p-5 flex flex-col gap-3">
            <h3 class="font-semibold text-sm">Documents</h3>
            <hr class="border-border" />
            <div v-if="documents.length === 0" class="py-6 flex flex-col items-center gap-2 text-muted-foreground">
              <FileText class="size-8 opacity-30" />
              <p class="text-xs">No documents attached.</p>
            </div>
            <div v-else class="flex flex-col gap-2">
              <button
                v-for="(url, i) in documents"
                :key="i"
                class="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left w-full"
                @click="openDoc(url)"
              >
                <div class="size-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText v-if="isPdf(url)" class="size-4 text-primary" />
                  <ImageIcon v-else class="size-4 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium truncate">{{ isPdf(url) ? 'PDF Document' : 'Image' }} {{ i + 1 }}</p>
                  <p class="text-[10px] text-muted-foreground">Click to preview</p>
                </div>
                <ExternalLink class="size-3.5 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>

          <!-- Cancelled banner -->
          <div v-if="isCancelled" class="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive text-center">
            This request was <strong>cancelled by the guest</strong>. No further action is required.
          </div>

          <!-- Action buttons -->
          <div v-else-if="task.status === 'pending' || task.status === 'in_progress'" class="flex flex-col gap-2">
            <Button class="w-full" :disabled="!allGuestsAssigned" @click="openAction('approve')">
              <CheckCircle2 class="size-4 mr-2" />
              Approve
            </Button>
            <p v-if="!allGuestsAssigned" class="text-xs text-amber-600 text-center -mt-1">
              {{ isEvent ? 'Assign a venue to every session first' : 'Assign a room to every guest first' }}
            </p>
            <Button
              variant="outline"
              class="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
              @click="openAction('reject')"
            >
              <XCircle class="size-4 mr-2" />
              Reject
            </Button>
          </div>

          <div v-else class="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground text-center">
            This task has been <strong class="text-foreground capitalize">{{ task.status }}</strong>.
          </div>
        </div>

      </div>
    </template>

    <!-- Task not found -->
    <div v-else-if="!loading && !store.tasksLoading" class="py-24 flex flex-col items-center gap-3 text-muted-foreground">
      <Loader2 class="size-8 opacity-30" />
      <p>Task not found.</p>
    </div>
  </div>

  <!-- Document preview sheet -->
  <Sheet v-model:open="docSheetOpen">
    <SheetContent side="right" class="w-full sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden">
      <SheetHeader class="px-6 pt-5 pb-4 border-b pr-14">
        <SheetTitle>Document Preview</SheetTitle>
      </SheetHeader>
      <div class="flex-1 min-h-0 overflow-hidden bg-muted/30">
        <iframe v-if="isPdf(selectedDoc)" :src="selectedDoc" class="w-full h-full border-0" />
        <div v-else class="w-full h-full flex items-center justify-center p-4 overflow-auto">
          <img :src="selectedDoc" class="max-w-full max-h-full object-contain rounded-lg" alt="Document" />
        </div>
      </div>
    </SheetContent>
  </Sheet>

  <TaskActionDialog
    v-model:open="actionDialog"
    :task="task ?? null"
    :action="dialogAction"
    @confirm="handleConfirm"
  />

  <PersonHistoryDialog
    :open="personHistoryOpen"
    :person="selectedPerson"
    @update:open="personHistoryOpen = $event"
  />
</div>
</template>
