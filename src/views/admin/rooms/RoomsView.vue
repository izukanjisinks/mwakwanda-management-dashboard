<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Sparkles, Images,
  Hotel, BedDouble, Phone, CalendarDays, AlertTriangle, RefreshCw, Users, FileText,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useRoomsStore } from '@/stores/rooms'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { roomApi } from '@/services/api/room'
import { bookingApi } from '@/services/api/bookings'
import type { Room } from '@/types/room'
import type { Booking } from '@/types/booking'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import RoomDialog from '@/components/rooms/RoomDialog.vue'
import RoomCleaningSheet from '@/components/rooms/RoomCleaningSheet.vue'
import RoomImageDialog from '@/components/rooms/RoomImageDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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

const router = useRouter()
const route = useRoute()
const store = useRoomsStore()
const authStore = useAuthStore()
const branchFilterStore = useBranchFilterStore()

const isReadOnly = computed(() => authStore.userRole === 'cleaner')

const typeLabel: Record<string, string> = {
  single: 'Single',
  double: 'Double',
  suite: 'Suite',
  cabin: 'Cabin',
  conference: 'Conference',
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

type RoomsTab = 'rooms' | 'status'

function initialTab(): RoomsTab {
  const q = route.query.filter
  // Deep-link support: landing with ?filter=... (e.g. from the dashboard's
  // "Overstaying Guests" tile) opens straight into the Room Status tab.
  return typeof q === 'string' ? 'status' : 'rooms'
}

const activeTab = ref<RoomsTab>(initialTab())

watch(activeTab, (tab) => {
  if (tab === 'status' && roomCards.value.length === 0) fetchRoomStatus()
})

// ── Rooms tab ────────────────────────────────────────────────────────────────

const dialogOpen = ref(false)
const selectedRoom = ref<Room | null>(null)
const cleaningSheetOpen = ref(false)
const cleaningRoom = ref<Room | null>(null)
const deleteDialogOpen = ref(false)
const roomToDelete = ref<Room | null>(null)
const imageDialogOpen = ref(false)
const imageRoom = ref<Room | null>(null)
const search = ref('')
const deleting = ref(false)

const page = ref(1)
const pageSize = 10

function loadRooms() {
  store.fetchRooms(page.value, pageSize)
}

onMounted(loadRooms)
watch(page, loadRooms)
watch(() => branchFilterStore.selectedBranchId, () => { page.value = 1; loadRooms() })

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / pageSize)))

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.rooms
  return store.rooms.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.type.toLowerCase().includes(q),
  )
})

function openCreate() {
  selectedRoom.value = null
  dialogOpen.value = true
}

function openEdit(room: Room) {
  selectedRoom.value = room
  dialogOpen.value = true
}

function confirmDelete(room: Room) {
  roomToDelete.value = room
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!roomToDelete.value) return
  deleting.value = true
  const name = roomToDelete.value.name
  try {
    await store.deleteRoom(roomToDelete.value.id)
    toast.success(`${name} deleted.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to delete room.'))
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    roomToDelete.value = null
  }
}

// ── Room Status tab ──────────────────────────────────────────────────────────

function goToBooking(bookingId: string) {
  router.push({ name: 'admin-bookings', query: { bookingId } })
}

const statusRooms = ref<Room[]>([])
const statusBookings = ref<Booking[]>([]) // full detail (assignments + attendees), post fan-out
const statusLoading = ref(false)
// True only until the very first fetch settles — drives the full-page skeleton.
// Later refreshes just show the "Updating…" indicator instead, on top of the
// last-known data, rather than blanking the grid every cycle.
const statusInitialLoading = ref(true)

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
  statusLoading.value = true
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
    statusRooms.value = roomsData
    statusBookings.value = bookingsData
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load room status.'))
  } finally {
    statusLoading.value = false
    statusInitialLoading.value = false
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
  const cards = new Map<string, RoomCard>(statusRooms.value.map(r => [r.id, { room: r, occupants: [] }]))

  for (const booking of statusBookings.value) {
    const attendeeById = new Map((booking.attendees ?? []).map(a => [a.id, a]))
    for (const a of booking.assignments ?? []) {
      // 'checked_in' = physically in the room right now — the same status
      // the Bookings page already branches on to show its own check-out action.
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

type StatusFilter = 'all' | 'occupied' | 'free' | 'overstaying'
const VALID_FILTERS: StatusFilter[] = ['all', 'occupied', 'free', 'overstaying']

// Lets dashboard tiles (e.g. "Overstaying Guests") deep-link straight into a
// pre-filtered board via ?filter=overstaying, same pattern as the bookingId
// deep-link on the Bookings page.
function initialStatusFilter(): StatusFilter {
  const q = route.query.filter
  return typeof q === 'string' && VALID_FILTERS.includes(q as StatusFilter) ? (q as StatusFilter) : 'all'
}

const statusFilter = ref<StatusFilter>(initialStatusFilter())
const statusSearch = ref('')

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Rooms' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'free', label: 'Free' },
  { value: 'overstaying', label: 'Overstaying' },
]

const visibleCards = computed(() => {
  let list = roomCards.value
  const q = statusSearch.value.toLowerCase().trim()
  if (q) {
    list = list.filter(c =>
      c.room.name.toLowerCase().includes(q) ||
      c.occupants.some(o => o.name.toLowerCase().includes(q)),
    )
  }
  if (statusFilter.value === 'occupied')    return list.filter(isOccupied)
  if (statusFilter.value === 'free')        return list.filter(isFree)
  if (statusFilter.value === 'overstaying') return list.filter(isOverstaying)
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

// ── Manual refresh (Room Status tab only) ─────────────────────────────────────
// No auto-polling — the board only fetches when the tab is opened, the branch
// filter changes, or the user explicitly clicks refresh.

function manualRefresh() {
  fetchRoomStatus()
}

watch(() => branchFilterStore.selectedBranchId, () => {
  if (activeTab.value === 'status') fetchRoomStatus()
})

onMounted(() => {
  if (activeTab.value === 'status') fetchRoomStatus()
})
</script>

<template>
  <div>
  <DashboardHeader title="Rooms" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Tabs -->
    <div class="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === 'rooms' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'rooms'"
      >
        <Hotel class="size-4" />
        Rooms
      </button>
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === 'status' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'status'"
      >
        <BedDouble class="size-4" />
        Room Status
      </button>
    </div>

    <!-- ─── Rooms tab ─────────────────────────────────────────────────────── -->
    <template v-if="activeTab === 'rooms'">
      <!-- Toolbar -->
      <div class="flex items-center justify-between gap-4">
        <div class="relative max-w-xs w-full">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input v-model="search" placeholder="Search rooms..." class="pl-9" />
        </div>
        <Button v-if="!isReadOnly" @click="openCreate">
          <Plus class="size-4 mr-2" />
          Add Room
        </Button>
      </div>

      <!-- Table -->
      <div class="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow class="bg-muted/30">
              <TableHead>Room</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Price / Night</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amenities</TableHead>
              <TableHead class="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="store.loading">
              <TableRow v-for="i in 5" :key="i">
                <TableCell colspan="7">
                  <div class="h-4 rounded bg-muted animate-pulse" />
                </TableCell>
              </TableRow>
            </template>

            <template v-else-if="filtered.length === 0">
              <TableRow>
                <TableCell colspan="7" class="py-16 text-center text-muted-foreground">
                  {{ store.rooms.length === 0 ? 'No rooms yet. Add one to get started.' : 'No rooms match your search.' }}
                </TableCell>
              </TableRow>
            </template>

            <template v-else>
              <TableRow v-for="room in filtered" :key="room.id">
                <TableCell class="font-medium">{{ room.name }}</TableCell>
                <TableCell>{{ typeLabel[room.type] ?? room.type }}</TableCell>
                <TableCell>{{ room.capacity }} guest{{ room.capacity === 1 ? '' : 's' }}</TableCell>
                <TableCell>ZMW {{ room.price_per_night.toLocaleString() }}</TableCell>
                <TableCell>
                  <Badge :variant="room.is_available ? 'default' : 'secondary'">
                    {{ room.is_available ? 'In Service' : 'Out of Service' }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div class="flex flex-wrap gap-1 max-w-xs">
                    <Badge v-for="amenity in room.amenities.slice(0, 3)" :key="amenity" variant="secondary" class="text-xs">
                      {{ amenity }}
                    </Badge>
                    <Badge v-if="room.amenities.length > 3" variant="outline" class="text-xs">
                      +{{ room.amenities.length - 3 }}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" class="size-8 text-muted-foreground hover:text-foreground" title="Cleaning assignments" @click="cleaningRoom = room; cleaningSheetOpen = true">
                      <Sparkles class="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" class="size-8 text-muted-foreground hover:text-foreground" title="Upload images" @click="imageRoom = room; imageDialogOpen = true">
                      <Images class="size-4" />
                    </Button>
                    <template v-if="!isReadOnly">
                      <Button variant="ghost" size="icon" class="size-8" @click="openEdit(room)">
                        <Pencil class="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(room)">
                        <Trash2 class="size-4" />
                      </Button>
                    </template>
                  </div>
                </TableCell>
              </TableRow>
            </template>
          </TableBody>
        </Table>

        <!-- Pagination -->
        <div class="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
          <span>{{ store.total }} room{{ store.total !== 1 ? 's' : '' }}</span>
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
    </template>

    <!-- ─── Room Status tab ───────────────────────────────────────────────── -->
    <template v-else>
      <div class="flex flex-col gap-4">
        <!-- Toolbar -->
        <div class="flex items-center gap-3 flex-wrap">
          <div class="relative w-64">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input v-model="statusSearch" placeholder="Search room or guest…" class="pl-9" />
          </div>
          <Select :model-value="statusFilter" @update:model-value="(v) => statusFilter = v as StatusFilter">
            <SelectTrigger class="w-44">
              <SelectValue placeholder="All Rooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="f in statusFilterOptions" :key="f.value" :value="f.value">
                {{ f.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <button
            class="size-9 flex items-center justify-center rounded-md border hover:bg-muted transition-colors ml-auto"
            title="Refresh"
            @click="manualRefresh"
          >
            <RefreshCw class="size-4" :class="statusLoading ? 'animate-spin' : ''" />
          </button>
        </div>

        <!-- Room grid -->
        <div>
          <div v-if="statusInitialLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
    </template>
  </div>

  <RoomImageDialog v-model:open="imageDialogOpen" :room="imageRoom" />
  <RoomCleaningSheet v-model:open="cleaningSheetOpen" :room="cleaningRoom" />
  <RoomDialog v-model:open="dialogOpen" :room="selectedRoom" @saved="dialogOpen = false" />

  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Room</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete <strong>{{ roomToDelete?.name }}</strong>?
          This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="handleDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  </div>
</template>
