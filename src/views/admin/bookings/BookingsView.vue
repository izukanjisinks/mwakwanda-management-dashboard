<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Eye, Search, ChevronLeft, ChevronRight, Building2, User, Theater,
  BedDouble, CalendarDays, LogIn, LogOut, Loader2, Plus, MapPin, Users,
  Clock, UtensilsCrossed,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useBookingsStore } from '@/stores/bookings'
import { useBranchFilterStore } from '@/stores/branchFilter'
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
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import WalkInBookingDialog from '@/components/bookings/WalkInBookingDialog.vue'

const store = useBookingsStore()
const branchFilterStore = useBranchFilterStore()

type BookerTab = 'individual' | 'corporate' | 'events'
const activeTab = ref<BookerTab>('individual')

const search = ref('')
const statusFilter = ref<BookingStatus | 'all'>('all')
const page = ref(1)
const pageSize = 10

const walkInOpen = ref(false)
function onWalkInSaved() {
  page.value = 1
  loadBookings()
}

function loadBookings() {
  const statusVal = statusFilter.value === 'all' ? undefined : statusFilter.value
  if (activeTab.value === 'events') {
    // Events are corporate bookings of type 'event'; event_type holds the kind.
    store.fetchEventBookings(page.value, pageSize, statusVal)
  } else {
    store.fetchBookings(page.value, pageSize, activeTab.value, statusVal)
  }
}

onMounted(loadBookings)
watch(page, loadBookings)
watch(activeTab, () => { page.value = 1; search.value = ''; loadBookings() })
watch(() => branchFilterStore.selectedBranchId, () => { page.value = 1; loadBookings() })

function setStatus(val: unknown) {
  if (typeof val !== 'string') return
  statusFilter.value = val as BookingStatus | 'all'
  page.value = 1
  loadBookings()
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

// ── Individual: single-assignment helpers ─────────────────────────────────────
function leadAssignment(b: Booking): BookingRoomAssignment | undefined {
  return b.assignments?.[0]
}

function nights(b: Booking): number | string {
  const a = leadAssignment(b)
  if (!a) return '—'
  const diff = new Date(a.check_out).getTime() - new Date(a.check_in).getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

function allowedTransitions(status: BookingStatus): BookingStatus[] {
  switch (status) {
    case 'pending':    return ['confirmed', 'cancelled']
    case 'confirmed':  return ['checked_in', 'cancelled']
    case 'checked_in': return ['checked_out']
    default:           return []
  }
}

function isStatusItemDisabled(b: Booking, key: string): boolean {
  return key !== b.status && !allowedTransitions(b.status).includes(key as BookingStatus)
}

async function handleStatusChange(b: Booking, status: unknown) {
  if (typeof status !== 'string') return
  const next = status as BookingStatus
  if (!allowedTransitions(b.status).includes(next)) return
  try {
    await store.updateStatus(b.id, next)
    toast.success(`Booking updated to ${statusConfig[next].label}.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to update booking status.'))
  }
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
    const [assignments, attendees] = await Promise.all([
      bookingApi.listAssignments(b.id),
      bookingApi.listAttendees(b.id),
    ])
    sheetAssignments.value = assignments ?? []
    sheetAttendees.value = attendees ?? []
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

async function refreshSheetAssignments() {
  if (!sheetBooking.value) return
  sheetAssignments.value = await bookingApi.listAssignments(sheetBooking.value.id) ?? []
}

async function checkInAssignment(a: BookingRoomAssignment) {
  if (!sheetBooking.value) return
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

// ── Event detail sheet ────────────────────────────────────────────────────────
// Events check in/out at the BOOKING level (the whole venue reservation), not per
// attendee — so the sheet drives the booking's own status transitions.
const eventSheetOpen = ref(false)
const eventBooking = ref<Booking | null>(null)
const eventDetail = ref<BookingEvent | null>(null)
const eventAttendees = ref<BookingAttendee[]>([])
const eventSheetLoading = ref(false)
const eventActioning = ref(false)

async function openEventSheet(b: Booking) {
  eventBooking.value = b
  eventSheetOpen.value = true
  eventSheetLoading.value = true
  eventDetail.value = null
  eventAttendees.value = []
  try {
    const full = await bookingApi.get(b.id)
    eventBooking.value = full
    eventDetail.value = full.events?.[0] ?? null
    eventAttendees.value = full.attendees ?? []
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load event details.'))
  } finally {
    eventSheetLoading.value = false
  }
}

async function eventCheckIn() {
  if (!eventBooking.value) return
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
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === 'events' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'events'"
      >
        <Theater class="size-4" />
        Events
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
          <SelectValue placeholder="All statuses" />
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

      <Button v-if="activeTab === 'individual'" class="ml-auto" @click="walkInOpen = true">
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
            <TableHead>Room</TableHead>
            <TableHead>Check-In</TableHead>
            <TableHead>Check-Out</TableHead>
            <TableHead>Nights</TableHead>
            <TableHead>Total (ZMW)</TableHead>
            <TableHead>Status</TableHead>
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
                No individual bookings found.
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow v-for="b in visibleBookings" :key="b.id">
              <TableCell class="font-mono text-sm">{{ b.booking_number }}</TableCell>
              <TableCell>
                <div class="font-medium">{{ b.booker_name }}</div>
                <div v-if="b.booker_email" class="text-xs text-muted-foreground">{{ b.booker_email }}</div>
              </TableCell>
              <TableCell>{{ leadAssignment(b)?.room_name || '—' }}</TableCell>
              <TableCell>{{ fmt(leadAssignment(b)?.check_in) }}</TableCell>
              <TableCell>{{ fmt(leadAssignment(b)?.check_out) }}</TableCell>
              <TableCell>{{ nights(b) }}</TableCell>
              <TableCell class="font-medium">{{ b.total_amount?.toLocaleString() }}</TableCell>
              <TableCell>
                <Select
                  :model-value="b.status"
                  :disabled="allowedTransitions(b.status).length === 0"
                  @update:model-value="(v) => handleStatusChange(b, v)"
                >
                  <SelectTrigger class="h-7 text-xs w-32 px-2" :class="allowedTransitions(b.status).length === 0 ? 'opacity-50 cursor-not-allowed' : ''">
                    <Badge :variant="statusMeta(b.status).variant" class="text-xs">
                      {{ statusMeta(b.status).label }}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="(cfg, key) in statusConfig"
                      :key="key"
                      :value="key"
                      class="text-xs"
                      :disabled="isStatusItemDisabled(b, key)"
                    >
                      {{ cfg.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
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

    <!-- ─── Events table ─────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'events'" class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>Booking #</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>Type</TableHead>
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
                No event bookings found.
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow
              v-for="b in visibleBookings"
              :key="b.id"
              class="cursor-pointer hover:bg-muted/40"
              @click="openEventSheet(b)"
            >
              <TableCell class="font-mono text-sm">{{ b.booking_number }}</TableCell>
              <TableCell class="font-medium">{{ b.company_name || b.booker_name || '—' }}</TableCell>
              <TableCell>{{ b.venue_name || '—' }}</TableCell>
              <TableCell class="capitalize">{{ b.booking_type }}</TableCell>
              <TableCell class="font-medium">{{ b.total_amount?.toLocaleString() }}</TableCell>
              <TableCell>
                <Badge :variant="statusMeta(b.status).variant" class="text-xs">
                  {{ statusMeta(b.status).label }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="icon" class="size-8" @click.stop="openEventSheet(b)">
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
                No corporate bookings found.
              </TableCell>
            </TableRow>
          </template>
          <template v-else>
            <TableRow
              v-for="b in visibleBookings"
              :key="b.id"
              class="cursor-pointer hover:bg-muted/40"
              @click="openCorporateSheet(b)"
            >
              <TableCell class="font-mono text-sm">{{ b.booking_number }}</TableCell>
              <TableCell class="font-medium">{{ b.company_name || '—' }}</TableCell>
              <TableCell>{{ b.booker_name || b.profile_name || '—' }}</TableCell>
              <TableCell class="capitalize">{{ b.booking_type }}</TableCell>
              <TableCell class="font-medium">{{ b.total_amount?.toLocaleString() }}</TableCell>
              <TableCell>
                <Badge :variant="statusMeta(b.status).variant" class="text-xs">
                  {{ statusMeta(b.status).label }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="icon" class="size-8" @click.stop="openCorporateSheet(b)">
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
  <Sheet v-model:open="sheetOpen">
    <SheetContent side="right" class="w-full sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
      <SheetHeader class="px-6 pt-5 pb-4 border-b pr-14">
        <SheetTitle>{{ sheetBooking?.company_name || 'Corporate Booking' }}</SheetTitle>
        <div v-if="sheetBooking" class="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span class="font-mono">{{ sheetBooking.booking_number }}</span>
          <Badge :variant="statusMeta(sheetBooking.status).variant" class="text-xs">
            {{ statusMeta(sheetBooking.status).label }}
          </Badge>
        </div>
      </SheetHeader>

      <div class="flex-1 min-h-0 overflow-auto p-6 flex flex-col gap-5">
        <!-- Booking meta -->
        <div v-if="sheetBooking" class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-xs text-muted-foreground mb-0.5">Booked By</p>
            <p class="font-medium">{{ sheetBooking.booker_name || sheetBooking.profile_name || '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-muted-foreground mb-0.5">Total</p>
            <p class="font-medium">ZMW {{ sheetBooking.total_amount?.toLocaleString() }}</p>
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
            <span class="text-xs text-muted-foreground ml-auto">{{ sheetAssignments.length }} room{{ sheetAssignments.length !== 1 ? 's' : '' }}</span>
          </div>

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
                  {{ fmt(a.check_in) }} → {{ fmt(a.check_out) }}
                </div>
                <div v-if="a.room_cost">ZMW {{ a.room_cost.toLocaleString() }}</div>
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
        </div>
      </div>
    </SheetContent>
  </Sheet>

  <!-- ─── Event detail sheet ─────────────────────────────────────────────── -->
  <Sheet v-model:open="eventSheetOpen">
    <SheetContent side="right" class="w-full sm:max-w-xl flex flex-col gap-0 p-0 overflow-hidden">
      <SheetHeader class="px-6 pt-5 pb-4 border-b pr-14">
        <SheetTitle>{{ eventBooking?.company_name || eventBooking?.booker_name || 'Event Booking' }}</SheetTitle>
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
          <!-- Venue reservation card -->
          <div v-if="eventDetail" class="rounded-lg border p-4 flex flex-col gap-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2">
                <MapPin class="size-4 text-primary" />
                <div>
                  <p class="font-medium text-sm">{{ eventDetail.venue_name || 'Venue' }}</p>
                  <p class="text-xs text-muted-foreground mt-0.5 capitalize">{{ eventDetail.event_type }}</p>
                </div>
              </div>
              <Badge variant="outline" class="text-xs shrink-0">
                {{ eventDetail.pax_count }} pax
              </Badge>
            </div>
            <div class="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <div class="flex items-center gap-1">
                <CalendarDays class="size-3.5" />
                {{ fmt(eventDetail.start_date) }} → {{ fmt(eventDetail.end_date) }}
              </div>
              <div>{{ eventDetail.days }} day{{ eventDetail.days !== 1 ? 's' : '' }}</div>
              <div v-if="eventDetail.start_time" class="flex items-center gap-1">
                <Clock class="size-3.5" />
                {{ eventDetail.start_time }}<template v-if="eventDetail.end_time"> – {{ eventDetail.end_time }}</template>
              </div>
            </div>
            <div v-if="eventDetail.catering_required" class="flex items-center gap-1.5 text-xs text-amber-600">
              <UtensilsCrossed class="size-3.5" />
              Catering required
            </div>
            <div class="flex items-center justify-between text-sm pt-1 border-t">
              <span class="text-muted-foreground">Hire ({{ eventDetail.days }} × ZMW {{ eventDetail.price?.toLocaleString() }})</span>
              <span class="font-medium">ZMW {{ eventBooking?.total_amount?.toLocaleString() }}</span>
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
                {{ eventAttendees.length ? `${eventAttendees.length} named` : `${eventDetail?.pax_count ?? 0} expected` }}
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
                <span class="font-medium">{{ eventDetail?.pax_count ?? 0 }}</span>
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

  <!-- Walk-in booking dialog (individual) -->
  <WalkInBookingDialog v-model:open="walkInOpen" @saved="onWalkInSaved" />
</template>
