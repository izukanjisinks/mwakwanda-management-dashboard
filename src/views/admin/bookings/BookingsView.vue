<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Pencil, Eye, Trash2, Search, ChevronLeft, ChevronRight, CircleAlert, CalendarIcon } from 'lucide-vue-next'
import type { DateValue } from '@internationalized/date'
import { CalendarDate } from '@internationalized/date'
import { toast } from 'vue-sonner'
import { useBookingsStore } from '@/stores/bookings'
import { useAuthStore } from '@/stores/auth'
import type { Booking, BookingStatus } from '@/types/booking'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import BookingDialog from '@/components/bookings/BookingDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const store = useBookingsStore()
const authStore = useAuthStore()

const canClearOverstayed = computed(() =>
  authStore.userRole === 'admin' || authStore.userRole === 'manager'
)

const dialogOpen = ref(false)
const selectedBooking = ref<Booking | null>(null)
const deleteDialogOpen = ref(false)
const bookingToDelete = ref<Booking | null>(null)
const overstayDialogOpen = ref(false)
const overstayBooking = ref<Booking | null>(null)
const clearingOverstay = ref(false)
const search = ref('')
const statusFilter = ref<BookingStatus | 'all' | 'overstayed'>('all')
const deleting = ref(false)

// ── Date range filter ─────────────────────────────────────────────────────────
const maxDate = new CalendarDate(2035, 1, 1)

function toCalendarDate(iso: string): DateValue | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function fromCalendarDate(dv: DateValue): string {
  return `${dv.year}-${String(dv.month).padStart(2, '0')}-${String(dv.day).padStart(2, '0')}`
}

function formatDisplayDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const filterFrom = ref('')
const filterTo = ref('')
const fromOpen = ref(false)
const toOpen = ref(false)

const fromDate = computed({
  get: () => toCalendarDate(filterFrom.value),
  set: (dv) => { if (dv) { filterFrom.value = fromCalendarDate(dv); fromOpen.value = false } },
})

const toDate = computed({
  get: () => toCalendarDate(filterTo.value),
  set: (dv) => { if (dv) { filterTo.value = fromCalendarDate(dv); toOpen.value = false } },
})

const page = ref(1)
const pageSize = 10

function loadBookings() {
  const isOverstayed = statusFilter.value === 'overstayed'
  store.fetchBookings(
    page.value,
    pageSize,
    isOverstayed ? undefined : (statusFilter.value === 'all' ? undefined : statusFilter.value as BookingStatus),
    isOverstayed ? true : undefined,
    filterFrom.value || undefined,
    filterTo.value || undefined,
  )
}

onMounted(loadBookings)
watch(page, loadBookings)
watch([filterFrom, filterTo], () => { page.value = 1; loadBookings() })

function setStatus(val: string | null) {
  if (!val) return
  statusFilter.value = val as BookingStatus | 'all' | 'overstayed'
  page.value = 1
  loadBookings()
}

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / pageSize)))

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.bookings
  return store.bookings.filter(b =>
    b.client_name.toLowerCase().includes(q) ||
    b.room_name.toLowerCase().includes(q),
  )
})

const statusConfig: Record<BookingStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending:     { label: 'Pending',     variant: 'outline' },
  confirmed:   { label: 'Confirmed',   variant: 'default' },
  checked_in:  { label: 'Checked In',  variant: 'secondary' },
  checked_out: { label: 'Checked Out', variant: 'secondary' },
  cancelled:   { label: 'Cancelled',   variant: 'destructive' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function nights(b: Booking) {
  const diff = new Date(b.check_out).getTime() - new Date(b.check_in).getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

function openCreate() {
  selectedBooking.value = null
  dialogOpen.value = true
}

function openEdit(booking: Booking) {
  selectedBooking.value = booking
  dialogOpen.value = true
}

function confirmDelete(booking: Booking) {
  bookingToDelete.value = booking
  deleteDialogOpen.value = true
}

function openOverstayDialog(booking: Booking) {
  overstayBooking.value = booking
  overstayDialogOpen.value = true
}

async function handleDelete() {
  if (!bookingToDelete.value) return
  deleting.value = true
  const name = bookingToDelete.value.client_name
  try {
    await store.deleteBooking(bookingToDelete.value.id)
    toast.success(`Booking for ${name} deleted.`)
  } catch {
    toast.error('Failed to delete booking.')
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    bookingToDelete.value = null
  }
}

function allowedTransitions(booking: Booking): BookingStatus[] {
  switch (booking.status) {
    case 'pending':    return ['confirmed', 'cancelled']
    case 'confirmed':  return ['checked_in', 'cancelled']
    case 'checked_in': return ['checked_out']
    default:           return []
  }
}

function isStatusItemDisabled(booking: Booking, key: string): boolean {
  return key !== booking.status && !allowedTransitions(booking).includes(key as BookingStatus)
}

async function handleStatusChange(booking: Booking, status: unknown) {
  if (typeof status !== 'string') return
  const next = status as BookingStatus
  if (!allowedTransitions(booking).includes(next)) return
  try {
    const now = new Date().toISOString()
    if (next === 'checked_in') {
      await store.updateBooking(booking.id, { check_in: now })
    } else if (next === 'checked_out') {
      await store.updateBooking(booking.id, { check_out: now })
    }
    await store.updateStatus(booking.id, next)
    toast.success(`Booking status updated to ${statusConfig[next].label}.`)
  } catch {
    toast.error('Failed to update booking status.')
  }
}

async function handleClearOverstayed() {
  if (!overstayBooking.value) return
  clearingOverstay.value = true
  try {
    await store.clearOverstayed(overstayBooking.value.id)
    toast.success(`Overstayed flag cleared for ${overstayBooking.value.client_name}.`)
    overstayDialogOpen.value = false
    overstayBooking.value = null
  } catch {
    toast.error('Failed to clear overstayed flag.')
  } finally {
    clearingOverstay.value = false
  }
}
</script>

<template>
  <DashboardHeader title="Bookings" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="relative w-52">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input v-model="search" placeholder="Search bookings..." class="pl-9" />
        </div>
        <Select :model-value="statusFilter" @update:model-value="(v) => setStatus(v as string | null)">
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
            <SelectItem value="overstayed">
              <span class="flex items-center gap-1.5">
                <CircleAlert class="size-3.5 text-amber-500" />
                Overstayed
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        <div class="flex items-center gap-2">
          <Popover v-model:open="fromOpen">
            <PopoverTrigger as-child>
              <button
                type="button"
                class="h-9 min-w-36 rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                :class="!filterFrom && 'text-muted-foreground'"
              >
                <CalendarIcon class="size-4 shrink-0" />
                {{ filterFrom ? formatDisplayDate(filterFrom) : 'From date' }}
              </button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0" align="start">
              <Calendar v-model="fromDate" layout="month-and-year" :max-value="toDate ?? maxDate" class="rounded-md" />
            </PopoverContent>
          </Popover>

          <span class="text-muted-foreground text-sm">→</span>

          <Popover v-model:open="toOpen">
            <PopoverTrigger as-child>
              <button
                type="button"
                class="h-9 min-w-36 rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                :class="!filterTo && 'text-muted-foreground'"
              >
                <CalendarIcon class="size-4 shrink-0" />
                {{ filterTo ? formatDisplayDate(filterTo) : 'To date' }}
              </button>
            </PopoverTrigger>
            <PopoverContent class="w-auto p-0" align="start">
              <Calendar v-model="toDate" layout="month-and-year" :min-value="fromDate" :max-value="maxDate" class="rounded-md" />
            </PopoverContent>
          </Popover>

          <Button
            v-if="filterFrom || filterTo"
            variant="ghost" size="sm"
            @click="filterFrom = ''; filterTo = ''; page = 1; loadBookings()"
          >
            Clear
          </Button>
        </div>
      </div>

      <Button @click="openCreate">
        <Plus class="size-4 mr-2" />
        New Booking
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>Booking #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Check-In</TableHead>
            <TableHead>Check-Out</TableHead>
            <TableHead>Nights</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Total (ZMW)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 5" :key="i">
              <TableCell colspan="10">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="filtered.length === 0">
            <TableRow>
              <TableCell colspan="10" class="py-16 text-center text-muted-foreground">
                {{ store.bookings.length === 0 ? 'No bookings yet.' : 'No bookings match your filters.' }}
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow v-for="booking in filtered" :key="booking.id">
              <TableCell class="font-mono text-sm">{{ booking.booking_number }}</TableCell>
              <TableCell>
                <div class="font-medium">{{ booking.client_name }}</div>
                <div class="text-xs text-muted-foreground">
                  <span v-if="booking.corporate_client_name">{{ booking.corporate_client_name }}</span>
                  <span v-else class="capitalize">{{ booking.client_type }}</span>
                </div>
              </TableCell>
              <TableCell>{{ booking.room_name }}</TableCell>
              <TableCell>{{ formatDate(booking.check_in) }}</TableCell>
              <TableCell>{{ formatDate(booking.check_out) }}</TableCell>
              <TableCell>{{ nights(booking) }}</TableCell>
              <TableCell>{{ booking.guests }}</TableCell>
              <TableCell class="font-medium">{{ booking.total_amount.toLocaleString() }}</TableCell>
              <TableCell>
                <Select
                  :model-value="booking.status"
                  :disabled="allowedTransitions(booking).length === 0"
                  @update:model-value="(v) => handleStatusChange(booking, v)"
                >
                  <SelectTrigger class="h-7 text-xs w-32 px-2" :class="allowedTransitions(booking).length === 0 ? 'opacity-50 cursor-not-allowed' : ''">
                    <Badge :variant="statusConfig[booking.status].variant" class="text-xs">
                      {{ statusConfig[booking.status].label }}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="(cfg, key) in statusConfig"
                      :key="key"
                      :value="key"
                      class="text-xs"
                      :disabled="isStatusItemDisabled(booking, key)"
                    >
                      {{ cfg.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end items-center gap-1">
                  <button
                    v-if="booking.overstayed"
                    type="button"
                    class="size-8 flex items-center justify-center rounded-md text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                    title="Overstay details"
                    @click="openOverstayDialog(booking)"
                  >
                    <CircleAlert class="size-4" />
                  </button>
                  <Button
                    variant="ghost" size="icon" class="size-8"
                    :title="booking.status === 'checked_out' || booking.status === 'cancelled' ? 'View booking' : 'Edit booking'"
                    @click="openEdit(booking)"
                  >
                    <Eye v-if="booking.status === 'checked_out' || booking.status === 'cancelled'" class="size-4" />
                    <Pencil v-else class="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(booking)">
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
        <span>{{ store.total }} booking{{ store.total !== 1 ? 's' : '' }}</span>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" class="size-8" :disabled="page <= 1" @click="page--">
            <ChevronLeft class="size-4" />
          </Button>
          <span>{{ page }} / {{ totalPages }}</span>
          <Button variant="outline" size="icon" class="size-8" :disabled="page >= totalPages" @click="page++">
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Booking create/edit dialog -->
  <BookingDialog
    v-model:open="dialogOpen"
    :booking="selectedBooking"
    @saved="dialogOpen = false"
  />

  <!-- Overstay confirmation dialog -->
  <Dialog v-model:open="overstayDialogOpen">
    <DialogContent class="max-w-md gap-0 p-0 overflow-hidden">
      <!-- Header -->
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="text-primary text-lg font-semibold">Confirm Guest Overstay</DialogTitle>
      </DialogHeader>

      <div v-if="overstayBooking" class="px-6 py-5 space-y-4">
        <!-- Description -->
        <p class="text-sm text-muted-foreground leading-relaxed">
          Our records indicate that <strong class="text-foreground">{{ overstayBooking.client_name }}</strong>
          in <strong class="text-foreground">{{ overstayBooking.room_name }}</strong> has exceeded their
          scheduled checkout date. Would you like to confirm this overstay?
        </p>

        <!-- Details card -->
        <div class="rounded-xl border bg-muted/30 p-4 space-y-3">
          <!-- Guest name row -->
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CircleAlert class="size-4 text-primary" />
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guest Name</p>
              <p class="text-sm font-semibold text-foreground">{{ overstayBooking.client_name }}</p>
            </div>
          </div>

          <div class="border-t pt-3 grid grid-cols-2 gap-3">
            <!-- Room -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Room</p>
              <p class="text-sm font-medium">{{ overstayBooking.room_name }}</p>
            </div>
            <!-- Scheduled check-out -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Scheduled Out</p>
              <p class="text-sm font-medium text-destructive">{{ formatDate(overstayBooking.check_out) }}</p>
            </div>
            <!-- Booking # -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Booking #</p>
              <p class="text-sm font-mono">{{ overstayBooking.booking_number }}</p>
            </div>
            <!-- Nights -->
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Nights Booked</p>
              <p class="text-sm font-medium">{{ nights(overstayBooking) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer — full-width stacked buttons -->
      <div class="px-6 pb-6 pt-2 flex flex-col gap-2">
        <Button
          v-if="canClearOverstayed"
          class="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white"
          :disabled="clearingOverstay"
          @click="handleClearOverstayed"
        >
          Confirm Overstay
        </Button>
        <Button
          variant="ghost"
          class="w-full py-5 text-primary hover:bg-primary/5"
          :disabled="clearingOverstay"
          @click="overstayDialogOpen = false"
        >
          Cancel
        </Button>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Delete confirmation dialog -->
  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Booking</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete the booking for
          <strong>{{ bookingToDelete?.client_name }}</strong> in
          <strong>{{ bookingToDelete?.room_name }}</strong>?
          This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="handleDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
