<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search, CreditCard, BedDouble, UtensilsCrossed, Calendar, RefreshCw, CheckCircle2, Clock, XCircle } from 'lucide-vue-next'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

// ── Types ─────────────────────────────────────────────────────────────────────
type MealPeriod = 'breakfast' | 'lunch' | 'dinner'
type CollectionStatus = 'collected' | 'pending' | 'missed'

interface MealCollectionEvent {
  id: string
  rfid_card_id: string
  room_number: string
  occupant_name: string
  meal_period: MealPeriod
  collection_date: string
  collection_time?: string
  status: CollectionStatus
  served_by?: string
  notes?: string
}

// ── Demo data (replaced by API when backend RFID integration is live) ─────────
const today = new Date().toISOString().split('T')[0]
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

const DEMO_EVENTS: MealCollectionEvent[] = [
  { id: '1',  rfid_card_id: 'RFC-0021', room_number: '101', occupant_name: 'Chanda Mutale',     meal_period: 'breakfast', collection_date: today,     collection_time: '07:12', status: 'collected', served_by: 'Grace M.' },
  { id: '2',  rfid_card_id: 'RFC-0034', room_number: '102', occupant_name: 'John Banda',        meal_period: 'breakfast', collection_date: today,     collection_time: '07:45', status: 'collected', served_by: 'Grace M.' },
  { id: '3',  rfid_card_id: 'RFC-0056', room_number: '103', occupant_name: 'Mwamba Tembo',      meal_period: 'breakfast', collection_date: today,     collection_time: undefined, status: 'missed',    notes: 'Guest checked out early' },
  { id: '4',  rfid_card_id: 'RFC-0021', room_number: '101', occupant_name: 'Chanda Mutale',     meal_period: 'lunch',     collection_date: today,     collection_time: '12:30', status: 'collected', served_by: 'James K.' },
  { id: '5',  rfid_card_id: 'RFC-0034', room_number: '102', occupant_name: 'John Banda',        meal_period: 'lunch',     collection_date: today,     collection_time: undefined, status: 'pending' },
  { id: '6',  rfid_card_id: 'RFC-0078', room_number: '201', occupant_name: 'Lusaka Corp Guest', meal_period: 'lunch',     collection_date: today,     collection_time: '13:05', status: 'collected', served_by: 'James K.' },
  { id: '7',  rfid_card_id: 'RFC-0090', room_number: '202', occupant_name: 'Chiputa Nkonde',    meal_period: 'lunch',     collection_date: today,     collection_time: undefined, status: 'pending' },
  { id: '8',  rfid_card_id: 'RFC-0021', room_number: '101', occupant_name: 'Chanda Mutale',     meal_period: 'dinner',    collection_date: today,     collection_time: undefined, status: 'pending' },
  { id: '9',  rfid_card_id: 'RFC-0034', room_number: '102', occupant_name: 'John Banda',        meal_period: 'dinner',    collection_date: today,     collection_time: undefined, status: 'pending' },
  { id: '10', rfid_card_id: 'RFC-0078', room_number: '201', occupant_name: 'Lusaka Corp Guest', meal_period: 'dinner',    collection_date: today,     collection_time: undefined, status: 'pending' },
  { id: '11', rfid_card_id: 'RFC-0021', room_number: '101', occupant_name: 'Chanda Mutale',     meal_period: 'breakfast', collection_date: yesterday,  collection_time: '07:20', status: 'collected', served_by: 'Grace M.' },
  { id: '12', rfid_card_id: 'RFC-0034', room_number: '102', occupant_name: 'John Banda',        meal_period: 'breakfast', collection_date: yesterday,  collection_time: '08:02', status: 'collected', served_by: 'Grace M.' },
  { id: '13', rfid_card_id: 'RFC-0034', room_number: '102', occupant_name: 'John Banda',        meal_period: 'lunch',     collection_date: yesterday,  collection_time: '12:55', status: 'collected', served_by: 'James K.' },
  { id: '14', rfid_card_id: 'RFC-0034', room_number: '102', occupant_name: 'John Banda',        meal_period: 'dinner',    collection_date: yesterday,  collection_time: '19:10', status: 'collected', served_by: 'James K.' },
  { id: '15', rfid_card_id: 'RFC-0056', room_number: '103', occupant_name: 'Mwamba Tembo',      meal_period: 'dinner',    collection_date: yesterday,  collection_time: undefined, status: 'missed', notes: 'No-show' },
]

// ── State ─────────────────────────────────────────────────────────────────────
const loading = ref(false)
const events = ref<MealCollectionEvent[]>([])
const search = ref('')
const dateFilter = ref(today)
const periodFilter = ref<MealPeriod | 'all'>('all')
const statusFilter = ref<CollectionStatus | 'all'>('all')

onMounted(() => {
  loadEvents()
})

function loadEvents() {
  loading.value = true
  setTimeout(() => {
    events.value = DEMO_EVENTS
    loading.value = false
  }, 400)
}

// ── Filtering + stats ─────────────────────────────────────────────────────────
const filtered = computed(() => {
  return events.value.filter(e => {
    if (dateFilter.value && e.collection_date !== dateFilter.value) return false
    if (periodFilter.value !== 'all' && e.meal_period !== periodFilter.value) return false
    if (statusFilter.value !== 'all' && e.status !== statusFilter.value) return false
    const q = search.value.toLowerCase()
    if (q && !e.occupant_name.toLowerCase().includes(q) && !e.rfid_card_id.toLowerCase().includes(q) && !e.room_number.includes(q)) return false
    return true
  })
})

const todayStats = computed(() => {
  const todayEvents = events.value.filter(e => e.collection_date === today)
  return {
    total:     todayEvents.length,
    collected: todayEvents.filter(e => e.status === 'collected').length,
    pending:   todayEvents.filter(e => e.status === 'pending').length,
    missed:    todayEvents.filter(e => e.status === 'missed').length,
  }
})

// ── Config ────────────────────────────────────────────────────────────────────
const periodConfig: Record<MealPeriod, { label: string; time: string }> = {
  breakfast: { label: 'Breakfast', time: '06:00–09:00' },
  lunch:     { label: 'Lunch',     time: '12:00–14:00' },
  dinner:    { label: 'Dinner',    time: '18:00–21:00' },
}

const statusConfig: Record<CollectionStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  collected: { label: 'Collected', variant: 'secondary' },
  pending:   { label: 'Pending',   variant: 'outline' },
  missed:    { label: 'Missed',    variant: 'destructive' },
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Mark collected (demo — would call PATCH /meal-tracking/{id}/collect) ─────
function markCollected(event: MealCollectionEvent) {
  event.status = 'collected'
  event.collection_time = new Date().toTimeString().slice(0, 5)
}
</script>

<template>
<div>
  <DashboardHeader title="Meal Tracking" />

  <div class="flex flex-col gap-6 p-6">

    <!-- Today summary cards -->
    <div class="grid gap-4 sm:grid-cols-4">
      <div class="rounded-xl border bg-card px-5 py-4">
        <p class="text-xs text-muted-foreground">Today's Meals</p>
        <p class="text-2xl font-semibold mt-1">{{ todayStats.total }}</p>
      </div>
      <div class="rounded-xl border bg-card px-5 py-4">
        <p class="text-xs text-muted-foreground">Collected</p>
        <p class="text-2xl font-semibold mt-1 text-green-600 dark:text-green-400">{{ todayStats.collected }}</p>
      </div>
      <div class="rounded-xl border bg-card px-5 py-4">
        <p class="text-xs text-muted-foreground">Pending</p>
        <p class="text-2xl font-semibold mt-1">{{ todayStats.pending }}</p>
      </div>
      <div class="rounded-xl border bg-card px-5 py-4">
        <p class="text-xs text-muted-foreground">Missed</p>
        <p class="text-2xl font-semibold mt-1 text-destructive">{{ todayStats.missed }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative max-w-xs w-full">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input v-model="search" placeholder="Search by name, room, RFID…" class="pl-9" />
      </div>

      <div class="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar class="size-4" />
        <input
          v-model="dateFilter"
          type="date"
          :max="today"
          class="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <Select :model-value="periodFilter" @update:model-value="(v) => periodFilter = v as MealPeriod | 'all'">
        <SelectTrigger class="w-36">
          <SelectValue placeholder="All periods" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Periods</SelectItem>
          <SelectItem value="breakfast">Breakfast</SelectItem>
          <SelectItem value="lunch">Lunch</SelectItem>
          <SelectItem value="dinner">Dinner</SelectItem>
        </SelectContent>
      </Select>

      <Select :model-value="statusFilter" @update:model-value="(v) => statusFilter = v as CollectionStatus | 'all'">
        <SelectTrigger class="w-36">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="collected">Collected</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="missed">Missed</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" class="ml-auto" @click="loadEvents">
        <RefreshCw class="size-4 mr-2" :class="loading ? 'animate-spin' : ''" />
        Refresh
      </Button>
    </div>

    <!-- Date heading -->
    <p class="text-sm text-muted-foreground -mb-3">
      Showing results for <strong class="text-foreground">{{ fmtDate(dateFilter) }}</strong>
    </p>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>RFID Card</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Occupant</TableHead>
            <TableHead>Period</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Served By</TableHead>
            <TableHead class="w-24 text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="loading">
            <TableRow v-for="i in 6" :key="i">
              <TableCell colspan="8"><div class="h-4 rounded bg-muted animate-pulse" /></TableCell>
            </TableRow>
          </template>

          <template v-else-if="filtered.length === 0">
            <TableRow>
              <TableCell colspan="8" class="py-16 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <UtensilsCrossed class="size-8 opacity-30" />
                  <p class="text-sm">No meal events match your filters.</p>
                </div>
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow
              v-for="event in filtered"
              :key="event.id"
              :class="event.status === 'missed' ? 'opacity-60' : ''"
            >
              <!-- RFID -->
              <TableCell>
                <div class="flex items-center gap-1.5">
                  <CreditCard class="size-3.5 text-primary shrink-0" />
                  <span class="font-mono text-sm">{{ event.rfid_card_id }}</span>
                </div>
              </TableCell>

              <!-- Room -->
              <TableCell>
                <div class="flex items-center gap-1.5 text-sm">
                  <BedDouble class="size-3.5 text-muted-foreground shrink-0" />
                  {{ event.room_number }}
                </div>
              </TableCell>

              <!-- Occupant -->
              <TableCell class="font-medium">{{ event.occupant_name }}</TableCell>

              <!-- Period -->
              <TableCell>
                <div class="flex flex-col">
                  <span class="text-sm">{{ periodConfig[event.meal_period].label }}</span>
                  <span class="text-xs text-muted-foreground">{{ periodConfig[event.meal_period].time }}</span>
                </div>
              </TableCell>

              <!-- Time -->
              <TableCell>
                <div class="flex items-center gap-1 text-sm">
                  <Clock v-if="!event.collection_time" class="size-3.5 text-muted-foreground" />
                  <span v-if="event.collection_time" class="font-mono">{{ event.collection_time }}</span>
                  <span v-else class="text-muted-foreground text-xs">—</span>
                </div>
              </TableCell>

              <!-- Status -->
              <TableCell>
                <div class="flex items-center gap-1.5">
                  <CheckCircle2 v-if="event.status === 'collected'" class="size-3.5 text-green-600 dark:text-green-400 shrink-0" />
                  <Clock v-else-if="event.status === 'pending'" class="size-3.5 text-muted-foreground shrink-0" />
                  <XCircle v-else class="size-3.5 text-destructive shrink-0" />
                  <Badge :variant="statusConfig[event.status].variant" class="text-xs">
                    {{ statusConfig[event.status].label }}
                  </Badge>
                </div>
                <p v-if="event.notes" class="text-xs text-muted-foreground mt-0.5 max-w-[140px] truncate" :title="event.notes">
                  {{ event.notes }}
                </p>
              </TableCell>

              <!-- Served by -->
              <TableCell class="text-sm text-muted-foreground">
                {{ event.served_by || '—' }}
              </TableCell>

              <!-- Action -->
              <TableCell class="text-right">
                <Button
                  v-if="event.status === 'pending'"
                  variant="outline"
                  size="sm"
                  class="text-xs h-7"
                  @click="markCollected(event)"
                >
                  Mark Collected
                </Button>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>

      <!-- Footer count -->
      <div class="px-6 py-3 border-t text-sm text-muted-foreground">
        {{ filtered.length }} event{{ filtered.length !== 1 ? 's' : '' }}
        <span v-if="filtered.length !== events.length"> of {{ events.length }} total</span>
      </div>
    </div>

  </div>
</div>
</template>
