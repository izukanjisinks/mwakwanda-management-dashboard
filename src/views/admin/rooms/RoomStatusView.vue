<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BedDouble, Phone, CalendarDays, AlertTriangle, RefreshCw, Search, Users, FileText } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { roomApi } from '@/services/api/room'
import { bookingApi } from '@/services/api/bookings'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { getApiError } from '@/utils/errors'
import type { Room } from '@/types/room'
import type { Booking } from '@/types/booking'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const router = useRouter()
const branchFilterStore = useBranchFilterStore()

function goToBooking(bookingId: string) {
  router.push({ name: 'admin-bookings', query: { bookingId } })
}

const typeLabel: Record<string, string> = {
  single: 'Single',
  double: 'Double',
  suite: 'Suite',
  cabin: 'Cabin',
  conference: 'Conference',
}

// ── Data ─────────────────────────────────────────────────────────────────────

const rooms = ref<Room[]>([])
const bookings = ref<Booking[]>([]) // full detail (assignments + attendees), post fan-out
const loading = ref(false)
// True only until the very first fetch settles — drives the full-page skeleton.
// Later refreshes just show the "Updating…" indicator instead, on top of the
// last-known data, rather than blanking the grid every cycle.
const initialLoading = ref(true)

// Keeps paging through while the server reports more rows than we've collected —
// a fixed page_size guess would silently drop guests off a live status board.
async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<{ data: T[] | null; total: number }>,
): Promise<T[]> {
  const pageSize = 100
  let page = 1
  let all: T[] = []
  for (;;) {
    const res = await fetchPage(page, pageSize)
    const batch = res.data ?? []
    all = all.concat(batch)
    if (batch.length === 0 || all.length >= res.total) break
    page++
  }
  return all
}

async function fetchRoomStatus() {
  loading.value = true
  try {
    const [roomsData, confirmed, checkedIn] = await Promise.all([
      fetchAllPages<Room>((page, page_size) =>
        roomApi.list({ page, page_size, branch_id: branchFilterStore.apiBranchId })),
      fetchAllPages<Booking>((page, page_size) =>
        bookingApi.list({ status: 'confirmed', page, page_size, branch_id: branchFilterStore.apiBranchId })),
      fetchAllPages<Booking>((page, page_size) =>
        bookingApi.list({ status: 'checked_in', page, page_size, branch_id: branchFilterStore.apiBranchId })),
    ])

    // No bulk "rooms + current occupants" endpoint exists — fan out to full
    // booking detail (assignments + attendees) for every active booking, same
    // pattern as KitchenView/BarView's Promise.all(getOrder) fan-out.
    const summaries = [...confirmed, ...checkedIn]
    const bookingsData = await Promise.all(summaries.map(b => bookingApi.get(b.id)))

    // Commit together — assigning rooms before bookings resolve would briefly
    // render every room as free while occupancy data is still in flight.
    rooms.value = roomsData
    bookings.value = bookingsData
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load room status.'))
  } finally {
    loading.value = false
    initialLoading.value = false
  }
}

// ── Room roster assembly ─────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  d.setHours(0, 0, 0, 0)
  return d
}
const today = computed(() => startOfDay(new Date()))

interface RoomOccupant {
  assignmentId: string
  bookingId: string
  bookingNumber: string
  name: string
  phone?: string
  checkOut: string
  isOverstaying: boolean
}

interface RoomCard {
  room: Room
  occupants: RoomOccupant[]
}

const roomCards = computed<RoomCard[]>(() => {
  const cards = new Map<string, RoomCard>(rooms.value.map(r => [r.id, { room: r, occupants: [] }]))

  for (const booking of bookings.value) {
    const attendeeById = new Map((booking.attendees ?? []).map(a => [a.id, a]))
    for (const a of booking.assignments ?? []) {
      // 'checked_in' = physically in the room right now — the same status
      // BookingsView.vue already branches on to show its own check-out action.
      if (a.status !== 'checked_in') continue
      const card = cards.get(a.room_id)
      if (!card) continue

      const attendee = attendeeById.get(a.attendee_id ?? '')
      // Overstay has two signals: the assignment's own date (works until the
      // "Overstay Management" nightly job auto-extends it forward), and the
      // booking-level flag (durable, but can't pinpoint who in a shared room —
      // so a booking flagged overstayed marks all its current occupants).
      const dateOverstay = startOfDay(new Date(a.check_out)) < today.value
      card.occupants.push({
        assignmentId: a.id,
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        name: attendee?.full_name ?? a.attendee_name ?? '—',
        phone: attendee?.phone,
        checkOut: a.check_out,
        isOverstaying: dateOverstay || booking.overstayed,
      })
    }
  }
  return [...cards.values()]
})

function daysOverdue(checkOut: string): number {
  const diff = today.value.getTime() - startOfDay(new Date(checkOut)).getTime()
  return Math.max(0, Math.round(diff / 86400000))
}

// ── Filtering / summary ──────────────────────────────────────────────────────

const isFree         = (c: RoomCard) => c.occupants.length === 0 && c.room.is_available
const isOutOfService  = (c: RoomCard) => !c.room.is_available
const isOccupied      = (c: RoomCard) => c.occupants.length > 0
const isOverstaying   = (c: RoomCard) => c.occupants.some(o => o.isOverstaying)

const freeCount         = computed(() => roomCards.value.filter(isFree).length)
const occupiedCount     = computed(() => roomCards.value.filter(isOccupied).length)
const outOfServiceCount = computed(() => roomCards.value.filter(isOutOfService).length)
const overstayCount     = computed(() => roomCards.value.reduce((n, c) => n + c.occupants.filter(o => o.isOverstaying).length, 0))

type ViewFilter = 'all' | 'occupied' | 'free' | 'overstaying'
const filter = ref<ViewFilter>('all')
const search = ref('')

const filterOptions: { value: ViewFilter; label: string }[] = [
  { value: 'all', label: 'All Rooms' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'free', label: 'Free' },
  { value: 'overstaying', label: 'Overstaying' },
]

const visibleCards = computed(() => {
  let list = roomCards.value
  const q = search.value.toLowerCase().trim()
  if (q) {
    list = list.filter(c =>
      c.room.name.toLowerCase().includes(q) ||
      c.occupants.some(o => o.name.toLowerCase().includes(q)),
    )
  }
  if (filter.value === 'occupied')    return list.filter(isOccupied)
  if (filter.value === 'free')        return list.filter(isFree)
  if (filter.value === 'overstaying') return list.filter(isOverstaying)
  return list
})

function cardAccentClass(card: RoomCard): string {
  if (isOverstaying(card)) return 'border-destructive/50 bg-destructive/5'
  if (isOutOfService(card)) return 'border-dashed bg-muted/20'
  if (isOccupied(card)) return 'border-border bg-card'
  return 'border-emerald-300/60 bg-emerald-50/50 dark:bg-emerald-950/10'
}

function fmt(d?: string): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Auto-refresh ──────────────────────────────────────────────────────────────

const REFRESH_INTERVAL = 30
const countdown = ref(REFRESH_INTERVAL)
let refreshTimer: ReturnType<typeof setInterval> | null = null
let clockTimer:   ReturnType<typeof setInterval> | null = null

function startRefreshTimer() {
  countdown.value = REFRESH_INTERVAL
  refreshTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      fetchRoomStatus()
      countdown.value = REFRESH_INTERVAL
    }
  }, 1000)
}

function manualRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  fetchRoomStatus()
  startRefreshTimer()
}

const currentTime = ref('')
function updateClock() {
  currentTime.value = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

watch(() => branchFilterStore.selectedBranchId, fetchRoomStatus)

onMounted(() => {
  updateClock()
  fetchRoomStatus()
  startRefreshTimer()
  clockTimer = setInterval(updateClock, 1000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (clockTimer)   clearInterval(clockTimer)
})
</script>

<template>
<div>
  <DashboardHeader title="Room Status" />

  <div class="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">

    <!-- ── Status bar ──────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-end px-5 py-2.5 border-b bg-card shrink-0 gap-4 text-sm text-muted-foreground flex-wrap">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-emerald-500 inline-block" />
          {{ freeCount }} free
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-sky-500 inline-block" />
          {{ occupiedCount }} occupied
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-muted-foreground inline-block" />
          {{ outOfServiceCount }} out of service
        </span>
        <span class="flex items-center gap-1.5" :class="overstayCount > 0 && 'text-destructive font-medium'">
          <span class="size-2 rounded-full bg-destructive inline-block" />
          {{ overstayCount }} overstaying
        </span>
      </div>
      <div class="h-4 w-px bg-border hidden sm:block" />
      <span class="font-mono tabular-nums text-foreground font-medium">{{ currentTime }}</span>
      <div class="flex items-center gap-1.5">
        <span v-if="loading" class="flex items-center gap-1.5 text-xs text-primary font-medium">
          <span class="size-1.5 rounded-full bg-primary animate-pulse" /> Updating…
        </span>
        <span v-else class="text-xs">{{ countdown }}s</span>
        <button
          class="size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          @click="manualRefresh"
        >
          <RefreshCw class="size-3.5" :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>
    </div>

    <!-- ── Toolbar ─────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between gap-3 p-4 flex-wrap shrink-0">
      <div class="relative flex-1 min-w-[220px] max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input v-model="search" placeholder="Search room or guest…" class="pl-9" />
      </div>
      <div class="flex gap-1">
        <button
          v-for="f in filterOptions"
          :key="f.value"
          class="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          :class="filter === f.value
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'"
          @click="filter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- ── Room grid ───────────────────────────────────────────────────────── -->
    <div class="flex-1 overflow-auto px-4 pb-4">
      <div v-if="initialLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="i in 8" :key="i" class="h-40 rounded-xl bg-muted animate-pulse" />
      </div>

      <div v-else-if="visibleCards.length === 0" class="flex flex-col items-center justify-center py-24 text-center gap-3 text-muted-foreground">
        <BedDouble class="size-9 text-muted-foreground/30" />
        <p class="text-sm">No rooms match.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="card in visibleCards"
          :key="card.room.id"
          class="rounded-xl border flex flex-col overflow-hidden"
          :class="cardAccentClass(card)"
        >
          <!-- Header -->
          <div class="px-4 pt-3.5 pb-3 flex items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="font-bold text-sm truncate">{{ card.room.name }}</p>
              <p class="text-xs text-muted-foreground">{{ typeLabel[card.room.type] ?? card.room.type }}</p>
            </div>
            <div class="flex flex-col items-end gap-1 shrink-0">
              <Badge v-if="isOutOfService(card)" variant="secondary" class="text-[10px]">Out of Service</Badge>
              <Badge variant="outline" class="text-[10px] gap-1">
                <Users class="size-2.5" /> {{ card.occupants.length }}/{{ card.room.capacity }}
              </Badge>
            </div>
          </div>

          <!-- Free -->
          <div v-if="card.occupants.length === 0" class="flex-1 flex flex-col items-center justify-center py-8 gap-1 text-muted-foreground border-t">
            <p class="text-sm font-medium">Free</p>
            <p class="text-xs">Ready for booking</p>
          </div>

          <!-- Occupants -->
          <div v-else class="border-t divide-y">
            <div v-for="occ in card.occupants" :key="occ.assignmentId" class="px-4 py-3 flex flex-col gap-1">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold truncate">{{ occ.name }}</p>
                <Badge v-if="occ.isOverstaying" variant="destructive" class="text-[10px] gap-1 shrink-0">
                  <AlertTriangle class="size-2.5" /> Overstaying
                </Badge>
              </div>
              <p class="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone class="size-3 shrink-0" /> {{ occ.phone || 'No phone on file' }}
              </p>
              <p class="text-xs flex items-center gap-1.5" :class="occ.isOverstaying ? 'text-destructive font-medium' : 'text-muted-foreground'">
                <CalendarDays class="size-3 shrink-0" />
                <span v-if="occ.isOverstaying">Due out {{ fmt(occ.checkOut) }} · {{ daysOverdue(occ.checkOut) }} day{{ daysOverdue(occ.checkOut) !== 1 ? 's' : '' }} overdue</span>
                <span v-else>Checking out {{ fmt(occ.checkOut) }}</span>
              </p>
              <button
                type="button"
                class="text-xs text-primary hover:underline flex items-center gap-1.5 w-fit"
                @click="goToBooking(occ.bookingId)"
              >
                <FileText class="size-3 shrink-0" /> {{ occ.bookingNumber }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
</template>
