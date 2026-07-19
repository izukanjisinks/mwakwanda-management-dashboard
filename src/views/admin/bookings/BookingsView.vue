<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Eye, Search, ChevronLeft, ChevronRight, Building2, User, UserCheck,
  BedDouble, CalendarDays, LogIn, LogOut, Loader2, Plus, MapPin, Users,
  Clock, UtensilsCrossed, Download,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useBookingsStore } from '@/stores/bookings'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { bookingApi } from '@/services/api/bookings'
import { getApiError } from '@/utils/errors'
import type { Booking, BookingStatus, BookingRoomAssignment, BookingAttendee, BookingEvent } from '@/types/booking'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'

const router = useRouter()
const store = useBookingsStore()
const branchFilterStore = useBranchFilterStore()
const confirmDialog = useConfirmDialog()

type BookerTab = 'individual' | 'corporate'
const activeTab = ref<BookerTab>('individual')

const search = ref('')
const statusFilter = ref<BookingStatus | 'all'>('all')
type BookingTypeFilter = 'all' | 'accommodation' | 'event'
const bookingTypeFilter = ref<BookingTypeFilter>('all')
const page = ref(1)
const pageSize = 10

function loadBookings() {
  const statusVal = statusFilter.value === 'all' ? undefined : statusFilter.value
  const typeVal = bookingTypeFilter.value === 'all' ? undefined : bookingTypeFilter.value
  store.fetchBookings(page.value, pageSize, activeTab.value, statusVal, typeVal)
}

onMounted(loadBookings)
watch(page, loadBookings)
watch(activeTab, () => { page.value = 1; search.value = ''; bookingTypeFilter.value = 'all'; loadBookings() })
watch(bookingTypeFilter, () => { page.value = 1; loadBookings() })
watch(() => branchFilterStore.selectedBranchId, () => { page.value = 1; loadBookings() })

function setStatus(val: unknown) {
  if (typeof val !== 'string') return
  statusFilter.value = val as BookingStatus | 'all'
  page.value = 1
  loadBookings()
}

function setBookingType(val: unknown) {
  if (typeof val !== 'string') return
  bookingTypeFilter.value = val as BookingTypeFilter
  page.value = 1
  loadBookings()
}

// ── CSV export ────────────────────────────────────────────────────────────────
const exportFrom = ref('') // YYYY-MM-DD
const exportTo = ref('')
const exporting = ref(false)

async function onExport() {
  exporting.value = true
  try {
    // Map the active tab to the API's booker_type / booking_type so the export
    // gets the column set matching the table on screen.
    const params: Record<string, string | undefined> = {
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      branch_id: branchFilterStore.apiBranchId,
      from: exportFrom.value || undefined,
      to: exportTo.value || undefined,
      booker_type: activeTab.value,
      booking_type: bookingTypeFilter.value === 'all' ? undefined : bookingTypeFilter.value,
    }
    await bookingApi.exportCsv(params)
    toast.success('Export started.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to export bookings.'))
  } finally {
    exporting.value = false
  }
}

// Client-side search over the loaded page
const visibleBookings = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.bookings
  return store.bookings.filter(b =>
    b.booker_name?.toLowerCase().includes(q) ||
    b.company_name?.toLowerCase().includes(q) ||
    b.booking_number?.toLowerCase().includes(q),
  )
})

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / pageSize)))

type StatusMeta = { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }

const statusConfig: Record<BookingStatus, StatusMeta> = {
  pending:     { label: 'Pending',     variant: 'outline' },
  confirmed:   { label: 'Confirmed',   variant: 'default' },
  checked_in:  { label: 'Checked In',  variant: 'secondary' },
  checked_out: { label: 'Checked Out', variant: 'secondary' },
  cancelled:   { label: 'Cancelled',   variant: 'destructive' },
}

// Defensive lookup: never let an unexpected/missing status crash the render.
function statusMeta(status?: string): StatusMeta {
  return statusConfig[status as BookingStatus] ?? { label: status || 'Unknown', variant: 'outline' }
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// fmtDateTime formats an actual check-in/out timestamp (date + time of day).
function fmtDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Corporate detail sheet ────────────────────────────────────────────────────
const sheetOpen = ref(false)
const sheetBooking = ref<Booking | null>(null)
const sheetAssignments = ref<BookingRoomAssignment[]>([])
const sheetAttendees = ref<BookingAttendee[]>([])
const sheetLoading = ref(false)
const assignmentActioning = ref<string | null>(null)

async function openCorporateSheet(b: Booking) {
  sheetBooking.value = b
  sheetOpen.value = true
  sheetLoading.value = true
  try {
    const full = await bookingApi.get(b.id)
    sheetBooking.value = full
    sheetAssignments.value = full.assignments ?? []
    sheetAttendees.value = full.attendees ?? []
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load booking details.'))
  } finally {
    sheetLoading.value = false
  }
}

function attendeeName(a: BookingRoomAssignment): string {
  if (a.attendee_name) return a.attendee_name
  const match = sheetAttendees.value.find(at => at.id === a.attendee_id)
  return match?.full_name ?? '—'
}

function roomForAttendant(idx: number) {
  return sheetBooking.value?.metadata?.accommodation?.rooms?.find(r => r.attendant_idx === idx)
}

async function refreshSheetAssignments() {
  if (!sheetBooking.value) return
  const full = await bookingApi.get(sheetBooking.value.id)
  sheetBooking.value = full
  sheetAssignments.value = full.assignments ?? []
  sheetAttendees.value = full.attendees ?? []
}

async function checkInAssignment(a: BookingRoomAssignment) {
  if (!sheetBooking.value) return
  const confirmed = await confirmDialog.confirm({
    title: 'Check in guest?',
    description: `Check in ${attendeeName(a)} to ${a.room_name || 'their room'}?`,
    confirmText: 'Check In',
  })
  if (!confirmed) return
  assignmentActioning.value = a.id
  try {
    await bookingApi.checkInAssignment(sheetBooking.value.id, a.id)
    await refreshSheetAssignments()
    toast.success('Guest checked in.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to check in.'))
  } finally {
    assignmentActioning.value = null
  }
}

async function checkOutAssignment(a: BookingRoomAssignment) {
  if (!sheetBooking.value) return
  const confirmed = await confirmDialog.confirm({
    title: 'Check out guest?',
    description: `Check out ${attendeeName(a)} from ${a.room_name || 'their room'}?`,
    confirmText: 'Check Out',
  })
  if (!confirmed) return
  assignmentActioning.value = a.id
  try {
    await bookingApi.checkOutAssignment(sheetBooking.value.id, a.id)
    await refreshSheetAssignments()
    toast.success('Guest checked out.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to check out.'))
  } finally {
    assignmentActioning.value = null
  }
}

function assignmentStatusVariant(status: string) {
  switch (status) {
    case 'confirmed':   return 'default' as const
    case 'checked_in':  return 'secondary' as const
    case 'checked_out': return 'outline' as const
    case 'cancelled':   return 'destructive' as const
    default:            return 'outline' as const
  }
}

// For individual bookings: pair each metadata attendant with their requested room
// and the actual assignment so we can show check-in/out actions.
// Matching strategy:
//   1. Try room_id match (attendant's requested room_id vs assignment.room_id)
//   2. Fall back to the next unmatched assignment in list order
// The fallback handles cases where the staff reassigned a different room during
// approval, so the room_id in metadata no longer matches the assignment.
const indGuestRows = computed(() => {
  if (sheetBooking.value?.booker_type !== 'individual') return []
  const attendants = sheetBooking.value?.metadata?.attendants ?? []
  const metaRooms  = sheetBooking.value?.metadata?.accommodation?.rooms ?? []
  const acc        = sheetBooking.value?.metadata?.accommodation
  const usedIds    = new Set<string>()

  return attendants.map((a, i) => {
    const metaRoom = metaRooms.find(r => r.attendant_idx === i)

    // 1. Prefer room_id match
    let assignment = metaRoom
      ? sheetAssignments.value.find(s => !usedIds.has(s.id) && s.room_id === metaRoom.room_id)
      : undefined

    // 2. Fall back to the next unclaimed assignment
    if (!assignment) {
      assignment = sheetAssignments.value.find(s => !usedIds.has(s.id))
    }

    if (assignment) usedIds.add(assignment.id)

    return {
      attendant:  a,
      metaRoom,
      assignment,
      checkIn:  assignment?.check_in  ?? acc?.check_in,
      checkOut: assignment?.check_out ?? acc?.check_out,
    }
  })
})

// ── Event detail sheet ────────────────────────────────────────────────────────
// Events check in/out at the BOOKING level (the whole venue reservation), not per
// attendee — so the sheet drives the booking's own status transitions.
const eventSheetOpen = ref(false)
const eventBooking = ref<Booking | null>(null)
// A booking can carry multiple sessions (one booking_events row per session, each
// with its own venue/date/time). eventSessions holds them all.
const eventSessions = ref<BookingEvent[]>([])
const eventAttendees = ref<BookingAttendee[]>([])
// Headcount fallback: the largest session pax (sessions usually share attendees
// rather than summing — the biggest session is the meaningful expected count).
const eventExpectedPax = computed(() =>
  eventSessions.value.reduce((max, s) => Math.max(max, s.pax_count ?? 0), 0),
)
const eventSheetLoading = ref(false)
const eventActioning = ref(false)

async function openEventSheet(b: Booking) {
  eventBooking.value = b
  eventSheetOpen.value = true
  eventSheetLoading.value = true
  eventSessions.value = []
  eventAttendees.value = []
  try {
    const full = await bookingApi.get(b.id)
    eventBooking.value = full
    eventSessions.value = full.events ?? []
    eventAttendees.value = full.attendees ?? []
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load event details.'))
  } finally {
    eventSheetLoading.value = false
  }
}

async function eventCheckIn() {
  if (!eventBooking.value) return
  const confirmed = await confirmDialog.confirm({
    title: 'Check in event?',
    description: `Check in ${eventBooking.value.company_name || eventBooking.value.booker_name || 'this booking'} (${eventBooking.value.booking_number})?`,
    confirmText: 'Check In',
  })
  if (!confirmed) return
  eventActioning.value = true
  try {
    const updated = await bookingApi.checkIn(eventBooking.value.id)
    eventBooking.value = { ...eventBooking.value, status: updated.status }
    syncRowStatus(updated.id, updated.status)
    toast.success('Event checked in.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to check in.'))
  } finally {
    eventActioning.value = false
  }
}

async function eventCheckOut() {
  if (!eventBooking.value) return
  const confirmed = await confirmDialog.confirm({
    title: 'Check out event?',
    description: `Check out ${eventBooking.value.company_name || eventBooking.value.booker_name || 'this booking'} (${eventBooking.value.booking_number})?`,
    confirmText: 'Check Out',
  })
  if (!confirmed) return
  eventActioning.value = true
  try {
    const updated = await bookingApi.checkOut(eventBooking.value.id)
    eventBooking.value = { ...eventBooking.value, status: updated.status }
    syncRowStatus(updated.id, updated.status)
    toast.success('Event checked out.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to check out.'))
  } finally {
    eventActioning.value = false
  }
}

function syncRowStatus(id: string, status: BookingStatus) {
  const idx = store.bookings.findIndex(b => b.id === id)
  if (idx !== -1) store.bookings[idx]!.status = status
}
</script>

<template>
  <div>
  <DashboardHeader title="Bookings" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Tabs -->
    <div class="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === 'individual' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'individual'"
      >
        <User class="size-4" />
        Individual
      </button>
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === 'corporate' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'corporate'"
      >
        <Building2 class="size-4" />
        Corporate
      </button>
    </div>

    <!-- Toolbar -->
    <div class="flex items-center gap-3 flex-wrap">
      <div class="relative w-64">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input v-model="search" placeholder="Search bookings..." class="pl-9" />
      </div>
      <Select :model-value="statusFilter" @update:model-value="setStatus">
        <SelectTrigger class="w-44">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="confirmed">Confirmed</SelectItem>
          <SelectItem value="checked_in">Checked In</SelectItem>
          <SelectItem value="checked_out">Checked Out</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>
      <Select :model-value="bookingTypeFilter" @update:model-value="setBookingType">
        <SelectTrigger class="w-44">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="accommodation">Accommodation</SelectItem>
          <SelectItem value="event">Events</SelectItem>
        </SelectContent>
      </Select>

      <!-- Export controls: created_at date range + CSV download for the active tab -->
      <div class="flex items-center gap-2 ml-auto">
        <Input
          v-model="exportFrom"
          type="date"
          class="w-40"
          title="Bookings created from"
          aria-label="From date"
        />
        <span class="text-muted-foreground text-sm">–</span>
        <Input
          v-model="exportTo"
          type="date"
          class="w-40"
          title="Bookings created up to"
          aria-label="To date"
        />
        <Button variant="outline" :disabled="exporting" @click="onExport">
          <Loader2 v-if="exporting" class="size-4 mr-2 animate-spin" />
          <Download v-else class="size-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Button @click="router.push({ name: 'admin-booking-new', query: { context: activeTab } })">
        <Plus class="size-4 mr-2" />
        New Booking
      </Button>
    </div>

    <!-- ─── Individual table ─────────────────────────────────────────────── -->
    <div v-if="activeTab === 'individual'" class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>Booking #</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Total (ZMW)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 5" :key="i">
              <TableCell colspan="7"><div class="h-4 rounded bg-muted animate-pulse" /></TableCell>
            </TableRow>
          </template>
          <template v-else-if="visibleBookings.length === 0">
            <TableRow>
              <TableCell colspan="7" class="py-16 text-center text-muted-foreground">
                No individual bookings found.
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow
              v-for="b in visibleBookings"
              :key="b.id"
              class="cursor-pointer hover:bg-muted/40"
              @click="b.booking_type === 'accommodation' || !b.booking_type ? openCorporateSheet(b) : openEventSheet(b)"
            >
              <TableCell class="font-mono text-sm">{{ b.booking_number }}</TableCell>
              <TableCell>
                <div class="font-medium">{{ b.booker_name }}</div>
                <div v-if="b.booker_email" class="text-xs text-muted-foreground">{{ b.booker_email }}</div>
              </TableCell>
              <TableCell class="capitalize">{{ b.booking_type || 'accommodation' }}</TableCell>
              <TableCell class="text-sm text-muted-foreground">{{ fmtDateTime(b.created_at) }}</TableCell>
              <TableCell class="font-medium">{{ b.total_amount?.toLocaleString() }}</TableCell>
              <TableCell>
                <Badge :variant="statusMeta(b.status).variant" class="text-xs">
                  {{ statusMeta(b.status).label }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <Button
                  variant="ghost" size="icon" class="size-8"
                  @click.stop="b.booking_type === 'accommodation' || !b.booking_type ? openCorporateSheet(b) : openEventSheet(b)"
                >
                  <Eye class="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
      <div class="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
        <span>{{ store.total }} booking{{ store.total !== 1 ? 's' : '' }}</span>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" class="size-8" :disabled="page <= 1" @click="page--"><ChevronLeft class="size-4" /></Button>
          <span>{{ page }} / {{ totalPages }}</span>
          <Button variant="outline" size="icon" class="size-8" :disabled="page >= totalPages" @click="page++"><ChevronRight class="size-4" /></Button>
        </div>
      </div>
    </div>

    <!-- ─── Corporate table ──────────────────────────────────────────────── -->
    <div v-else class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>Booking #</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Booked By</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Total (ZMW)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 5" :key="i">
              <TableCell colspan="8"><div class="h-4 rounded bg-muted animate-pulse" /></TableCell>
            </TableRow>
          </template>
          <template v-else-if="visibleBookings.length === 0">
            <TableRow>
              <TableCell colspan="8" class="py-16 text-center text-muted-foreground">
                No corporate bookings found.
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow
              v-for="b in visibleBookings"
              :key="b.id"
              class="cursor-pointer hover:bg-muted/40"
              @click="b.booking_type === 'accommodation' || !b.booking_type ? openCorporateSheet(b) : openEventSheet(b)"
            >
              <TableCell class="font-mono text-sm">{{ b.booking_number }}</TableCell>
              <TableCell class="font-medium">{{ b.company_name || '—' }}</TableCell>
              <TableCell>{{ b.booker_name || b.profile_name || '—' }}</TableCell>
              <TableCell class="capitalize">{{ b.booking_type }}</TableCell>
              <TableCell class="text-sm text-muted-foreground">{{ fmtDateTime(b.created_at) }}</TableCell>
              <TableCell class="font-medium">{{ b.total_amount?.toLocaleString() }}</TableCell>
              <TableCell>
                <Badge :variant="statusMeta(b.status).variant" class="text-xs">
                  {{ statusMeta(b.status).label }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <Button
                  variant="ghost" size="icon" class="size-8"
                  @click.stop="b.booking_type === 'accommodation' || !b.booking_type ? openCorporateSheet(b) : openEventSheet(b)"
                >
                  <Eye class="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
      <div class="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
        <span>{{ store.total }} booking{{ store.total !== 1 ? 's' : '' }}</span>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" class="size-8" :disabled="page <= 1" @click="page--"><ChevronLeft class="size-4" /></Button>
          <span>{{ page }} / {{ totalPages }}</span>
          <Button variant="outline" size="icon" class="size-8" :disabled="page >= totalPages" @click="page++"><ChevronRight class="size-4" /></Button>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── Corporate detail sheet ─────────────────────────────────────────── -->
  <Sheet :open="sheetOpen" @update:open="sheetOpen = $event">
    <SheetContent side="right" class="w-full sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
      <SheetHeader class="px-6 pt-5 pb-4 border-b pr-14">
        <SheetTitle>{{ sheetBooking?.company_name || sheetBooking?.booker_name || 'Booking Details' }}</SheetTitle>
        <SheetDescription class="sr-only">{{ sheetBooking?.booking_number ? `Booking ${sheetBooking.booking_number}` : 'Booking details' }}</SheetDescription>
        <div v-if="sheetBooking" class="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span class="font-mono">{{ sheetBooking.booking_number }}</span>
          <Badge :variant="statusMeta(sheetBooking.status).variant" class="text-xs">
            {{ statusMeta(sheetBooking.status).label }}
          </Badge>
        </div>
      </SheetHeader>

      <div class="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-4">
        <!-- Quick stats -->
        <div v-if="sheetBooking" class="grid grid-cols-2 gap-3 text-sm">
          <div class="rounded-lg border px-3 py-2.5">
            <p class="text-xs text-muted-foreground">Total</p>
            <p class="font-semibold mt-0.5">ZMW {{ sheetBooking.total_amount?.toLocaleString() }}</p>
          </div>
          <div class="rounded-lg border px-3 py-2.5 capitalize">
            <p class="text-xs text-muted-foreground">Type</p>
            <p class="font-semibold mt-0.5">{{ sheetBooking.booking_type || 'accommodation' }}</p>
          </div>
        </div>

        <!-- Booked By -->
        <div v-if="sheetBooking?.metadata?.booked_by" class="rounded-lg border p-4 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <User class="size-4 text-primary shrink-0" />
            <h3 class="font-semibold text-sm">Booked By</h3>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div v-if="sheetBooking.metadata.booked_by.name">
              <p class="text-xs text-muted-foreground">Name</p>
              <p class="font-medium mt-0.5">{{ sheetBooking.metadata.booked_by.name }}</p>
            </div>
            <div v-if="sheetBooking.metadata.booked_by.job_title">
              <p class="text-xs text-muted-foreground">Job Title</p>
              <p class="font-medium mt-0.5">{{ sheetBooking.metadata.booked_by.job_title }}</p>
            </div>
            <div v-if="sheetBooking.metadata.booked_by.email">
              <p class="text-xs text-muted-foreground">Email</p>
              <p class="font-medium mt-0.5 break-all">{{ sheetBooking.metadata.booked_by.email }}</p>
            </div>
            <div v-if="sheetBooking.metadata.booked_by.phone">
              <p class="text-xs text-muted-foreground">Phone</p>
              <p class="font-medium mt-0.5">{{ sheetBooking.metadata.booked_by.phone }}</p>
            </div>
            <div v-if="sheetBooking.metadata.booked_by.man_number">
              <p class="text-xs text-muted-foreground">Man Number</p>
              <p class="font-medium font-mono mt-0.5">{{ sheetBooking.metadata.booked_by.man_number }}</p>
            </div>
          </div>
        </div>

        <!-- Attendants (individual bookings) -->
        <div v-if="sheetBooking?.booker_type === 'individual' && sheetBooking?.metadata?.attendants?.length" class="rounded-lg border p-4 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <Users class="size-4 text-primary shrink-0" />
            <h3 class="font-semibold text-sm">Attendants</h3>
            <span class="text-xs text-muted-foreground ml-auto">{{ sheetBooking.metadata.attendants!.length }}</span>
          </div>
          <div class="divide-y">
            <div v-for="(a, i) in sheetBooking.metadata.attendants" :key="i" class="py-2.5 first:pt-0 last:pb-0 flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm">{{ a.full_name || '—' }}</span>
                <span
                  v-if="a.is_lead_contact"
                  class="text-[10px] font-semibold uppercase tracking-wide text-amber-600 border border-amber-300 rounded px-1 py-0.5"
                >Lead</span>
                <span v-if="roomForAttendant(i)" class="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                  <BedDouble class="size-3" />
                  {{ roomForAttendant(i)?.room_name }}
                  <span class="capitalize">({{ roomForAttendant(i)?.room_type }})</span>
                  <span v-if="roomForAttendant(i)?.rate_per_night">· ZMW {{ roomForAttendant(i)!.rate_per_night!.toLocaleString() }}/night</span>
                </span>
              </div>
              <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span v-if="a.id_number" class="font-mono">{{ a.id_number }}</span>
                <span v-if="a.email">{{ a.email }}</span>
                <span v-if="a.phone">{{ a.phone }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Approver -->
        <div v-if="sheetBooking?.booker_type === 'corporate' && sheetBooking?.metadata?.approver" class="rounded-lg border p-4 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <UserCheck class="size-4 text-primary shrink-0" />
            <h3 class="font-semibold text-sm">Approver</h3>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div v-if="sheetBooking.metadata.approver.name">
              <p class="text-xs text-muted-foreground">Name</p>
              <p class="font-medium mt-0.5">{{ sheetBooking.metadata.approver.name }}</p>
            </div>
            <div v-if="sheetBooking.metadata.approver.title">
              <p class="text-xs text-muted-foreground">Title</p>
              <p class="font-medium mt-0.5">{{ sheetBooking.metadata.approver.title }}</p>
            </div>
            <div v-if="sheetBooking.metadata.approver.email">
              <p class="text-xs text-muted-foreground">Email</p>
              <p class="font-medium mt-0.5 break-all">{{ sheetBooking.metadata.approver.email }}</p>
            </div>
            <div v-if="sheetBooking.metadata.approver.phone">
              <p class="text-xs text-muted-foreground">Phone</p>
              <p class="font-medium mt-0.5">{{ sheetBooking.metadata.approver.phone }}</p>
            </div>
          </div>
        </div>

        <!-- Company -->
        <div v-if="sheetBooking?.booker_type === 'corporate' && sheetBooking?.metadata?.company" class="rounded-lg border p-4 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <Building2 class="size-4 text-primary shrink-0" />
            <h3 class="font-semibold text-sm">Company</h3>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div v-if="sheetBooking.metadata.company.name">
              <p class="text-xs text-muted-foreground">Name</p>
              <p class="font-medium mt-0.5">{{ sheetBooking.metadata.company.name }}</p>
            </div>
            <div v-if="sheetBooking.metadata.company.tpin">
              <p class="text-xs text-muted-foreground">TPIN</p>
              <p class="font-medium font-mono mt-0.5">{{ sheetBooking.metadata.company.tpin }}</p>
            </div>
            <div v-if="sheetBooking.metadata.company.industry">
              <p class="text-xs text-muted-foreground">Industry</p>
              <p class="font-medium mt-0.5">{{ sheetBooking.metadata.company.industry }}</p>
            </div>
            <div v-if="sheetBooking.metadata.company.branch_name">
              <p class="text-xs text-muted-foreground">Branch</p>
              <p class="font-medium mt-0.5">{{ sheetBooking.metadata.company.branch_name }}</p>
            </div>
            <div v-if="sheetBooking.metadata.company.department_name">
              <p class="text-xs text-muted-foreground">Department</p>
              <p class="font-medium mt-0.5">{{ sheetBooking.metadata.company.department_name }}</p>
            </div>
            <div v-if="sheetBooking.metadata.company.cost_center">
              <p class="text-xs text-muted-foreground">
                {{ sheetBooking.metadata.company.cost_center_type === 'internal_order' ? 'Internal Order' : 'Cost Center' }}
              </p>
              <p class="font-medium font-mono mt-0.5">{{ sheetBooking.metadata.company.cost_center }}</p>
            </div>
            <div v-if="sheetBooking.metadata.company.gl_code">
              <p class="text-xs text-muted-foreground">GL Code</p>
              <p class="font-medium font-mono mt-0.5">{{ sheetBooking.metadata.company.gl_code }}</p>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="sheetLoading" class="flex flex-col gap-3">
          <div class="h-20 rounded-lg bg-muted animate-pulse" />
          <div class="h-20 rounded-lg bg-muted animate-pulse" />
        </div>

        <!-- Guests + their rooms -->
        <div v-else>
          <div class="flex items-center gap-2 mb-3">
            <BedDouble class="size-4 text-primary" />
            <h3 class="font-semibold text-sm">Guests &amp; Rooms</h3>
            <span class="text-xs text-muted-foreground ml-auto">
              {{ sheetBooking?.booker_type === 'individual' ? indGuestRows.length : sheetAssignments.length }}
              room{{ (sheetBooking?.booker_type === 'individual' ? indGuestRows.length : sheetAssignments.length) !== 1 ? 's' : '' }}
            </span>
          </div>

          <!-- Individual booking: built from metadata attendants paired with assignments -->
          <template v-if="sheetBooking?.booker_type === 'individual'">
            <div v-if="indGuestRows.length === 0" class="py-10 text-center text-sm text-muted-foreground">
              No guest details available.
            </div>
            <div v-else class="flex flex-col gap-3">
              <div
                v-for="(row, i) in indGuestRows"
                :key="i"
                class="rounded-lg border p-4 flex flex-col gap-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="font-medium text-sm">{{ row.attendant.full_name || '—' }}</p>
                      <span
                        v-if="row.attendant.is_lead_contact"
                        class="text-[10px] font-semibold uppercase tracking-wide text-amber-600 border border-amber-300 rounded px-1 py-0.5"
                      >Lead</span>
                    </div>
                    <p class="text-xs text-muted-foreground mt-0.5">{{ row.metaRoom?.room_name || 'Room TBC' }}</p>
                  </div>
                  <Badge
                    :variant="row.assignment ? assignmentStatusVariant(row.assignment.status) : 'outline'"
                    class="text-xs capitalize shrink-0"
                  >
                    {{ row.assignment ? row.assignment.status.replace('_', ' ') : 'Pending' }}
                  </Badge>
                </div>

                <div class="flex items-center gap-4 text-xs text-muted-foreground">
                  <div class="flex items-center gap-1">
                    <CalendarDays class="size-3.5" />
                    {{ fmt(row.checkIn) }} → {{ fmt(row.checkOut) }}
                  </div>
                  <div v-if="row.metaRoom?.rate_per_night">
                    ZMW {{ row.metaRoom.rate_per_night.toLocaleString() }}/night
                  </div>
                </div>

                <!-- Actual check-in/out times (recorded when staff press the buttons) -->
                <div
                  v-if="row.assignment && (row.assignment.checked_in_at || row.assignment.checked_out_at)"
                  class="flex flex-col gap-0.5 text-xs"
                >
                  <div v-if="row.assignment.checked_in_at" class="flex items-center gap-1.5 text-emerald-600">
                    <LogIn class="size-3.5" />
                    Checked in {{ fmtDateTime(row.assignment.checked_in_at) }}
                  </div>
                  <div v-if="row.assignment.checked_out_at" class="flex items-center gap-1.5 text-muted-foreground">
                    <LogOut class="size-3.5" />
                    Checked out {{ fmtDateTime(row.assignment.checked_out_at) }}
                  </div>
                </div>

                <!-- Per-room actions (require a confirmed assignment in the system) -->
                <div v-if="row.assignment" class="flex gap-2">
                  <Button
                    v-if="row.assignment.status === 'confirmed'"
                    size="sm" variant="outline" class="h-7 text-xs"
                    :disabled="assignmentActioning === row.assignment.id"
                    @click="checkInAssignment(row.assignment)"
                  >
                    <Loader2 v-if="assignmentActioning === row.assignment.id" class="size-3.5 mr-1 animate-spin" />
                    <LogIn v-else class="size-3.5 mr-1" />
                    Check In
                  </Button>
                  <Button
                    v-else-if="row.assignment.status === 'checked_in'"
                    size="sm" variant="outline" class="h-7 text-xs"
                    :disabled="assignmentActioning === row.assignment.id"
                    @click="checkOutAssignment(row.assignment)"
                  >
                    <Loader2 v-if="assignmentActioning === row.assignment.id" class="size-3.5 mr-1 animate-spin" />
                    <LogOut v-else class="size-3.5 mr-1" />
                    Check Out
                  </Button>
                </div>
              </div>
            </div>
          </template>

          <!-- Corporate booking: iterate over sheetAssignments as before -->
          <template v-else>
            <div v-if="sheetAssignments.length === 0" class="py-10 text-center text-sm text-muted-foreground">
              No rooms assigned to this booking.
            </div>
            <div v-else class="flex flex-col gap-3">
              <div
                v-for="a in sheetAssignments"
                :key="a.id"
                class="rounded-lg border p-4 flex flex-col gap-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="font-medium text-sm">{{ attendeeName(a) }}</p>
                    <p class="text-xs text-muted-foreground mt-0.5">{{ a.room_name || 'Room' }}</p>
                  </div>
                  <Badge :variant="assignmentStatusVariant(a.status)" class="text-xs capitalize shrink-0">
                    {{ a.status.replace('_', ' ') }}
                  </Badge>
                </div>

                <div class="flex items-center gap-4 text-xs text-muted-foreground">
                  <div class="flex items-center gap-1">
                    <CalendarDays class="size-3.5" />
                    <span class="text-[10px] uppercase tracking-wide opacity-70 mr-1">Booked</span>
                    {{ fmt(a.check_in) }} → {{ fmt(a.check_out) }}
                  </div>
                  <div v-if="a.room_cost">ZMW {{ a.room_cost.toLocaleString() }}</div>
                </div>

                <!-- Actual check-in/out times (recorded when staff press the buttons) -->
                <div
                  v-if="a.checked_in_at || a.checked_out_at"
                  class="flex flex-col gap-0.5 text-xs"
                >
                  <div v-if="a.checked_in_at" class="flex items-center gap-1.5 text-emerald-600">
                    <LogIn class="size-3.5" />
                    Checked in {{ fmtDateTime(a.checked_in_at) }}
                  </div>
                  <div v-if="a.checked_out_at" class="flex items-center gap-1.5 text-muted-foreground">
                    <LogOut class="size-3.5" />
                    Checked out {{ fmtDateTime(a.checked_out_at) }}
                  </div>
                </div>

                <!-- Per-room actions -->
                <div class="flex gap-2">
                  <Button
                    v-if="a.status === 'confirmed'"
                    size="sm" variant="outline" class="h-7 text-xs"
                    :disabled="assignmentActioning === a.id"
                    @click="checkInAssignment(a)"
                  >
                    <Loader2 v-if="assignmentActioning === a.id" class="size-3.5 mr-1 animate-spin" />
                    <LogIn v-else class="size-3.5 mr-1" />
                    Check In
                  </Button>
                  <Button
                    v-else-if="a.status === 'checked_in'"
                    size="sm" variant="outline" class="h-7 text-xs"
                    :disabled="assignmentActioning === a.id"
                    @click="checkOutAssignment(a)"
                  >
                    <Loader2 v-if="assignmentActioning === a.id" class="size-3.5 mr-1 animate-spin" />
                    <LogOut v-else class="size-3.5 mr-1" />
                    Check Out
                  </Button>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </SheetContent>
  </Sheet>

  <!-- ─── Event detail sheet ─────────────────────────────────────────────── -->
  <Sheet :open="eventSheetOpen" @update:open="eventSheetOpen = $event">
    <SheetContent side="right" class="w-full sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
      <SheetHeader class="px-6 pt-5 pb-4 border-b pr-14">
        <SheetTitle>{{ eventBooking?.company_name || eventBooking?.booker_name || 'Event Booking' }}</SheetTitle>
        <SheetDescription class="sr-only">{{ eventBooking?.booking_number ? `Booking ${eventBooking.booking_number}` : 'Event booking details' }}</SheetDescription>
        <div v-if="eventBooking" class="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span class="font-mono">{{ eventBooking.booking_number }}</span>
          <Badge :variant="statusMeta(eventBooking.status).variant" class="text-xs">
            {{ statusMeta(eventBooking.status).label }}
          </Badge>
        </div>
      </SheetHeader>

      <div class="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-5">
        <!-- Loading -->
        <div v-if="eventSheetLoading" class="flex flex-col gap-3">
          <div class="h-24 rounded-lg bg-muted animate-pulse" />
          <div class="h-20 rounded-lg bg-muted animate-pulse" />
        </div>

        <template v-else>
          <!-- Sessions — one venue reservation card per session -->
          <div v-if="eventSessions.length" class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <MapPin class="size-4 text-primary" />
              <h3 class="font-semibold text-sm">
                {{ eventSessions.length > 1 ? `Sessions (${eventSessions.length})` : 'Venue Reservation' }}
              </h3>
            </div>

            <div
              v-for="(sess, i) in eventSessions"
              :key="sess.id ?? i"
              class="rounded-lg border p-4 flex flex-col gap-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-medium text-sm">{{ sess.venue_name || 'Venue' }}</p>
                  <p class="text-xs text-muted-foreground mt-0.5 capitalize">{{ sess.event_type }}</p>
                </div>
                <Badge variant="outline" class="text-xs shrink-0">
                  {{ sess.pax_count }} pax
                </Badge>
              </div>
              <div class="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <div class="flex items-center gap-1">
                  <CalendarDays class="size-3.5" />
                  {{ fmt(sess.start_date) }}<template v-if="sess.end_date && sess.end_date !== sess.start_date"> → {{ fmt(sess.end_date) }}</template>
                </div>
                <div v-if="sess.start_time" class="flex items-center gap-1">
                  <Clock class="size-3.5" />
                  {{ sess.start_time }}<template v-if="sess.end_time"> – {{ sess.end_time }}</template>
                </div>
              </div>
              <div v-if="sess.catering_required" class="flex items-center gap-1.5 text-xs text-amber-600">
                <UtensilsCrossed class="size-3.5" />
                Catering required
              </div>
              <div v-if="sess.notes" class="text-xs text-muted-foreground">{{ sess.notes }}</div>
              <div class="flex items-center justify-between text-sm pt-1 border-t">
                <span class="text-muted-foreground">Hire</span>
                <span class="font-medium">ZMW {{ sess.price?.toLocaleString() }}</span>
              </div>
            </div>

            <!-- Booking total = sum of all session hire charges -->
            <div class="rounded-lg bg-muted/40 px-4 py-3 flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Total ({{ eventSessions.length }} session{{ eventSessions.length !== 1 ? 's' : '' }})</span>
              <span class="font-semibold">ZMW {{ eventBooking?.total_amount?.toLocaleString() }}</span>
            </div>
          </div>

          <!-- Booking-level check-in/out -->
          <div v-if="eventBooking" class="flex gap-2">
            <Button
              v-if="eventBooking.status === 'confirmed'"
              size="sm" variant="outline"
              :disabled="eventActioning"
              @click="eventCheckIn"
            >
              <Loader2 v-if="eventActioning" class="size-4 mr-1.5 animate-spin" />
              <LogIn v-else class="size-4 mr-1.5" />
              Check In Event
            </Button>
            <Button
              v-else-if="eventBooking.status === 'checked_in'"
              size="sm" variant="outline"
              :disabled="eventActioning"
              @click="eventCheckOut"
            >
              <Loader2 v-if="eventActioning" class="size-4 mr-1.5 animate-spin" />
              <LogOut v-else class="size-4 mr-1.5" />
              Check Out Event
            </Button>
          </div>

          <!-- Guest list — named roster if provided, else booking context + headcount -->
          <div>
            <div class="flex items-center gap-2 mb-3">
              <Users class="size-4 text-primary" />
              <h3 class="font-semibold text-sm">{{ eventAttendees.length ? 'Guest List' : 'Attendees' }}</h3>
              <span class="text-xs text-muted-foreground ml-auto">
                {{ eventAttendees.length ? `${eventAttendees.length} named` : `${eventExpectedPax} expected` }}
              </span>
            </div>

            <!-- Named roster provided -->
            <div v-if="eventAttendees.length" class="flex flex-col gap-2">
              <div
                v-for="g in eventAttendees"
                :key="g.id"
                class="rounded-lg border p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <p class="font-medium text-sm">{{ g.full_name }}</p>
                  <p v-if="g.email" class="text-xs text-muted-foreground mt-0.5">{{ g.email }}</p>
                </div>
                <Badge v-if="g.is_lead_contact" variant="secondary" class="text-xs shrink-0">Lead</Badge>
              </div>
            </div>

            <!-- No roster: fall back to booking context + headcount so the sheet isn't bare -->
            <div v-else class="rounded-lg border p-4 flex flex-col gap-3 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Expected attendees</span>
                <span class="font-medium">{{ eventExpectedPax }}</span>
              </div>
              <div v-if="eventBooking?.company_name" class="flex items-center justify-between">
                <span class="text-muted-foreground">Company</span>
                <span class="font-medium">{{ eventBooking.company_name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground">Booked by</span>
                <span class="font-medium">{{ eventBooking?.booker_name || eventBooking?.profile_name || '—' }}</span>
              </div>
              <div v-if="eventBooking?.booker_email" class="flex items-center justify-between">
                <span class="text-muted-foreground">Contact</span>
                <span class="font-medium">{{ eventBooking.booker_email }}</span>
              </div>
              <p class="text-xs text-muted-foreground pt-1 border-t">
                No individual guests were named — the booker provided a headcount only.
              </p>
            </div>
          </div>
        </template>
      </div>
    </SheetContent>
  </Sheet>
  </div>
</template>
