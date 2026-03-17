<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Sparkles, BedDouble, CheckCircle2, Clock, AlertCircle, CalendarClock } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useCleaningStore } from '@/stores/cleaning'
import { useRoomsStore } from '@/stores/rooms'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import type { CleaningFrequency } from '@/types/cleaning'

const authStore = useAuthStore()
const cleaningStore = useCleaningStore()
const roomsStore = useRoomsStore()

onMounted(() => {
  cleaningStore.init()
  roomsStore.fetchRooms()
})

// Derive a greeting based on current hour
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
})

// Scheduled start times per frequency — mock schedule
const scheduleTime: Record<CleaningFrequency, string> = {
  daily:          '07:00 AM',
  every_2_days:   '08:00 AM',
  weekly:         '09:00 AM',
  after_checkout: 'After guest checkout',
}

// Assignments for the logged-in cleaner
const myAssignments = computed(() =>
  cleaningStore.assignments.filter(a => a.staff_id === authStore.user?.id)
)

// Enrich with room data
const myRooms = computed(() =>
  myAssignments.value
    .map(a => ({ ...a, room: roomsStore.rooms.find(r => r.id === a.room_id) }))
    .filter(a => !!a.room)
)

const urgent = computed(() =>
  myRooms.value.filter(a => a.room?.status === 'not_ready')
)

const upNext = computed(() =>
  myRooms.value.filter(a => a.room?.status !== 'not_ready')
)

const statusConfig: Record<string, { label: string; bgClass: string; dotClass: string }> = {
  available: { label: 'Available',    bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dotClass: 'bg-emerald-500' },
  occupied:  { label: 'Occupied',     bgClass: 'bg-blue-50 text-blue-700 border-blue-200',           dotClass: 'bg-blue-500' },
  reserved:  { label: 'Reserved',     bgClass: 'bg-amber-50 text-amber-700 border-amber-200',        dotClass: 'bg-amber-500' },
  not_ready: { label: 'Needs Clean',  bgClass: 'bg-rose-50 text-rose-700 border-rose-200',           dotClass: 'bg-rose-500' },
}

const typeLabel: Record<string, string> = {
  single: 'Single', double: 'Double', suite: 'Suite', cabin: 'Cabin', conference: 'Conference',
}
</script>

<template>
  <DashboardHeader :title="`${greeting}, ${authStore.user?.full_name?.split(' ')[0] ?? 'there'} 👋`" />

  <div class="flex flex-col items-center gap-8 p-6 pb-12">
    <div class="w-full max-w-2xl flex flex-col gap-6">

      <!-- Stat cards -->
      <div class="grid grid-cols-3 gap-4">
        <div class="rounded-2xl border bg-card px-5 py-5 flex flex-col gap-1">
          <p class="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Assigned</p>
          <p class="text-3xl font-bold">{{ myRooms.length }}</p>
          <p class="text-xs text-muted-foreground">rooms</p>
        </div>
        <div class="rounded-2xl border bg-rose-50 border-rose-200 px-5 py-5 flex flex-col gap-1">
          <p class="text-xs text-rose-600 font-medium uppercase tracking-wide">Urgent</p>
          <p class="text-3xl font-bold text-rose-600">{{ urgent.length }}</p>
          <p class="text-xs text-rose-500">needs cleaning now</p>
        </div>
        <div class="rounded-2xl border bg-emerald-50 border-emerald-200 px-5 py-5 flex flex-col gap-1">
          <p class="text-xs text-emerald-600 font-medium uppercase tracking-wide">All Clear</p>
          <p class="text-3xl font-bold text-emerald-600">{{ myRooms.length - urgent.length }}</p>
          <p class="text-xs text-emerald-600">up to date</p>
        </div>
      </div>

      <!-- Urgent section -->
      <div v-if="urgent.length > 0" class="rounded-2xl border border-rose-200 bg-rose-50/50 overflow-hidden">
        <div class="px-5 py-4 border-b border-rose-200 flex items-center gap-2">
          <AlertCircle class="size-4 text-rose-600" />
          <h2 class="font-semibold text-sm text-rose-700">Needs Cleaning Now</h2>
        </div>
        <div class="divide-y divide-rose-100">
          <div
            v-for="a in urgent"
            :key="a.room_id"
            class="flex items-center justify-between px-5 py-4"
          >
            <div class="flex items-center gap-4">
              <div class="flex items-center justify-center size-11 rounded-xl bg-rose-100 shrink-0">
                <BedDouble class="size-5 text-rose-600" />
              </div>
              <div>
                <p class="font-semibold text-sm">{{ a.room?.name }}</p>
                <p class="text-xs text-muted-foreground mt-0.5">
                  {{ typeLabel[a.room!.type] }} · {{ a.room?.capacity }} guest{{ a.room!.capacity === 1 ? '' : 's' }}
                </p>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1.5">
              <span class="text-xs font-medium px-2.5 py-1 rounded-full border" :class="statusConfig[a.room!.status].bgClass">
                <span class="inline-block size-1.5 rounded-full mr-1.5 align-middle" :class="statusConfig[a.room!.status].dotClass" />
                {{ statusConfig[a.room!.status].label }}
              </span>
              <div class="flex items-center gap-1 text-xs text-rose-500">
                <Clock class="size-3" />
                {{ scheduleTime[a.frequency] }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Upcoming / scheduled section -->
      <div class="rounded-2xl border bg-card overflow-hidden">
        <div class="px-5 py-4 border-b flex items-center gap-2">
          <CalendarClock class="size-4 text-muted-foreground" />
          <h2 class="font-semibold text-sm">Upcoming Assignments</h2>
        </div>

        <div v-if="upNext.length === 0 && myRooms.length === 0" class="py-16 text-center text-muted-foreground text-sm">
          No rooms assigned to you yet.
        </div>
        <div v-else-if="upNext.length === 0" class="py-10 text-center text-muted-foreground text-sm">
          All assignments need immediate attention — see above.
        </div>

        <div v-else class="divide-y">
          <div
            v-for="a in upNext"
            :key="a.room_id"
            class="flex items-center justify-between px-5 py-4"
          >
            <div class="flex items-center gap-4">
              <div class="flex items-center justify-center size-11 rounded-xl bg-muted shrink-0">
                <BedDouble class="size-5 text-muted-foreground" />
              </div>
              <div>
                <p class="font-semibold text-sm">{{ a.room?.name }}</p>
                <p class="text-xs text-muted-foreground mt-0.5">
                  {{ typeLabel[a.room!.type] }} · {{ a.room?.capacity }} guest{{ a.room!.capacity === 1 ? '' : 's' }}
                </p>
              </div>
            </div>
            <div class="flex flex-col items-end gap-1.5">
              <span class="text-xs font-medium px-2.5 py-1 rounded-full border" :class="statusConfig[a.room!.status].bgClass">
                <span class="inline-block size-1.5 rounded-full mr-1.5 align-middle" :class="statusConfig[a.room!.status].dotClass" />
                {{ statusConfig[a.room!.status].label }}
              </span>
              <div class="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock class="size-3" />
                {{ scheduleTime[a.frequency] }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tip -->
      <div class="rounded-2xl border bg-muted/40 px-5 py-4 flex items-start gap-3 text-sm text-muted-foreground">
        <CheckCircle2 class="size-4 mt-0.5 shrink-0 text-emerald-600" />
        <p>Rooms marked <strong class="text-foreground">Needs Clean</strong> are the highest priority. Once done, notify the front desk to update the room status.</p>
      </div>

    </div>
  </div>
</template>
