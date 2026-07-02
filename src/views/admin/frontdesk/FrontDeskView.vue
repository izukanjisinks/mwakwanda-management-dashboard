<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  BedDouble, CalendarDays, LogIn, LogOut, RefreshCw,
  Theater, AlertTriangle, Monitor, Users, Clock,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { bookingApi } from '@/services/api/bookings'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { getApiError } from '@/utils/errors'
import type { Booking, BookingRoomAssignment } from '@/types/booking'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const branchFilter = useBranchFilterStore()

const loading    = ref(false)
const occupied   = ref<Booking[]>([])   // checked_in accommodation (with assignments)
const confirmed  = ref<Booking[]>([])   // confirmed accommodation (with assignments — for arrivals)
const events     = ref<Booking[]>([])   // checked_in event bookings (with events[])

const today = new Date().toISOString().split('T')[0]

// ── Derived lists ─────────────────────────────────────────────────────────────

const arrivingToday = computed(() =>
  confirmed.value.filter(b => b.assignments?.some(a => a.check_in === today)),
)

const departingToday = computed(() =>
  occupied.value.filter(b => b.assignments?.some(a => a.check_out === today)),
)

// Next 3 days, excluding today
const arrivingSoon = computed(() => {
  const d3 = new Date(today)
  d3.setDate(d3.getDate() + 3)
  const max = d3.toISOString().split('T')[0]
  return confirmed.value.filter(b =>
    b.assignments?.some(a => a.check_in > today && a.check_in <= max),
  )
})

// ── Data fetching ─────────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  try {
    const bid = branchFilter.apiBranchId
    // Three parallel list fetches first
    const [occRes, conRes, evRes] = await Promise.all([
      bookingApi.list({ status: 'checked_in',  booking_type: 'accommodation', page_size: 100, branch_id: bid }),
      bookingApi.list({ status: 'confirmed',   booking_type: 'accommodation', page_size: 100, branch_id: bid }),
      bookingApi.list({ status: 'checked_in',  booking_type: 'event',         page_size: 50,  branch_id: bid }),
    ])
    // Fetch full details in parallel batches to get assignments / events[]
    const [occFull, conFull, evFull] = await Promise.all([
      Promise.all(occRes.data.map(b => bookingApi.get(b.id))),
      Promise.all(conRes.data.map(b => bookingApi.get(b.id))),
      Promise.all(evRes.data.map(b => bookingApi.get(b.id))),
    ])
    occupied.value  = occFull
    confirmed.value = conFull
    events.value    = evFull
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load front desk data.'))
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => branchFilter.selectedBranchId, load)

// ── Helpers ───────────────────────────────────────────────────────────────────

const todayLabel = new Date().toLocaleDateString('en-GB', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
})

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtShort(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function nightsLeft(checkOut?: string): number {
  if (!checkOut) return 9999
  const diff = (new Date(checkOut).getTime() - new Date(today).getTime()) / 86400000
  return Math.round(diff)
}

function assignmentRowClass(b: Booking, a: BookingRoomAssignment) {
  if (b.overstayed || nightsLeft(a.check_out) < 0) return 'bg-red-50 dark:bg-red-950/20'
  if (nightsLeft(a.check_out) === 0) return 'bg-amber-50 dark:bg-amber-950/20'
  return ''
}

// All assignments for display — fall back to an empty-placeholder if somehow missing
function assignmentsFor(b: Booking): BookingRoomAssignment[] {
  return b.assignments?.length
    ? b.assignments
    : [{ id: '', booking_id: b.id, room_id: '', check_in: '', check_out: '', status: '', created_at: '', updated_at: '' }]
}
</script>

<template>
<div>
  <DashboardHeader title="Front Desk">
    <template #actions>
      <Button variant="outline" size="sm" :disabled="loading" @click="load">
        <RefreshCw class="size-3.5 mr-1.5" :class="{ 'animate-spin': loading }" />
        Refresh
      </Button>
    </template>
  </DashboardHeader>

  <div class="flex flex-col gap-6 p-6">

    <!-- Date + loading indicator -->
    <div class="flex items-center gap-2 text-sm text-muted-foreground">
      <CalendarDays class="size-4 shrink-0" />
      <span>{{ todayLabel }}</span>
      <span v-if="loading" class="ml-2 text-xs text-primary animate-pulse">Loading…</span>
    </div>

    <!-- Skeleton on first load -->
    <div v-if="loading && !occupied.length" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="h-24 rounded-xl bg-muted animate-pulse" />
    </div>

    <template v-else>

      <!-- ── Stat cards ───────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">

        <div class="rounded-xl border bg-card p-5 flex flex-col gap-1">
          <div class="flex items-center justify-between mb-1">
            <p class="text-xs text-muted-foreground">Occupied Rooms</p>
            <BedDouble class="size-4 text-muted-foreground" />
          </div>
          <p class="text-3xl font-bold tabular-nums">{{ occupied.length }}</p>
          <p v-if="occupied.filter(b => b.overstayed).length" class="text-xs text-red-600 flex items-center gap-1 mt-0.5">
            <AlertTriangle class="size-3" />
            {{ occupied.filter(b => b.overstayed).length }} overstayed
          </p>
          <p v-else class="text-xs text-muted-foreground mt-0.5">rooms checked in</p>
        </div>

        <div class="rounded-xl border bg-card p-5 flex flex-col gap-1">
          <div class="flex items-center justify-between mb-1">
            <p class="text-xs text-muted-foreground">Arriving Today</p>
            <LogIn class="size-4 text-muted-foreground" />
          </div>
          <p class="text-3xl font-bold tabular-nums">{{ arrivingToday.length }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">
            <template v-if="arrivingSoon.length">+{{ arrivingSoon.length }} in next 3 days</template>
            <template v-else>confirmed bookings</template>
          </p>
        </div>

        <div class="rounded-xl border bg-card p-5 flex flex-col gap-1">
          <div class="flex items-center justify-between mb-1">
            <p class="text-xs text-muted-foreground">Departing Today</p>
            <LogOut class="size-4 text-muted-foreground" />
          </div>
          <p class="text-3xl font-bold tabular-nums">{{ departingToday.length }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">rooms checking out</p>
        </div>

        <div class="rounded-xl border bg-card p-5 flex flex-col gap-1">
          <div class="flex items-center justify-between mb-1">
            <p class="text-xs text-muted-foreground">Active Events</p>
            <Theater class="size-4 text-muted-foreground" />
          </div>
          <p class="text-3xl font-bold tabular-nums">{{ events.length }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">event bookings</p>
        </div>

      </div>

      <!-- ── Main grid ─────────────────────────────────────────────────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Occupied rooms rack (left 2/3) -->
        <div class="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
          <div class="flex items-center gap-2 px-5 py-3.5 border-b bg-muted/30">
            <BedDouble class="size-4 text-primary" />
            <h2 class="font-semibold">Occupied Rooms</h2>
            <Badge variant="secondary" class="ml-auto">{{ occupied.length }}</Badge>
          </div>

          <div v-if="occupied.length === 0" class="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <BedDouble class="size-10 opacity-25" />
            <p class="text-sm">No rooms currently occupied.</p>
          </div>

          <div v-else class="overflow-x-auto">
            <!-- Column headers -->
            <div class="grid grid-cols-12 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/20 border-b">
              <div class="col-span-4">Guest</div>
              <div class="col-span-3">Room</div>
              <div class="col-span-2">Check-In</div>
              <div class="col-span-2">Check-Out</div>
              <div class="col-span-1 text-right">Nights</div>
            </div>

            <div class="divide-y">
              <template v-for="b in occupied" :key="b.id">
                <div
                  v-for="(a, ai) in assignmentsFor(b)"
                  :key="a.id || ai"
                  class="grid grid-cols-12 px-5 py-3 text-sm items-start"
                  :class="assignmentRowClass(b, a)"
                >
                  <!-- Guest name -->
                  <div class="col-span-4">
                    <template v-if="ai === 0">
                      <p class="font-medium leading-snug truncate">{{ b.booker_name }}</p>
                      <p v-if="b.company_name" class="text-xs text-muted-foreground truncate">{{ b.company_name }}</p>
                      <div class="flex items-center gap-1 mt-0.5">
                        <span v-if="b.overstayed" class="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-100 dark:bg-red-950/50 rounded px-1.5 py-0.5">
                          <AlertTriangle class="size-2.5" /> Overstayed
                        </span>
                        <span v-else-if="b.booker_type === 'corporate'" class="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded px-1.5 py-0.5 font-medium">Corporate</span>
                      </div>
                    </template>
                    <template v-else>
                      <!-- Individual guest within a corporate booking -->
                      <p class="font-medium text-sm leading-snug truncate pl-3 border-l border-blue-200 dark:border-blue-800">
                        {{ a.attendee_name || '—' }}
                      </p>
                      <p v-if="b.company_name" class="text-xs text-blue-600 dark:text-blue-400 truncate pl-3">
                        {{ b.company_name }}
                      </p>
                    </template>
                  </div>

                  <!-- Room -->
                  <div class="col-span-3">
                    <p class="font-medium">{{ a.room_name || '—' }}</p>
                  </div>

                  <!-- Check-in -->
                  <div class="col-span-2 text-sm text-muted-foreground pt-0.5">{{ fmtShort(a.check_in) }}</div>

                  <!-- Check-out -->
                  <div
                    class="col-span-2 text-sm pt-0.5"
                    :class="nightsLeft(a.check_out) <= 0 ? 'text-amber-600 font-medium' : 'text-muted-foreground'"
                  >
                    {{ fmtShort(a.check_out) }}
                  </div>

                  <!-- Nights left -->
                  <div class="col-span-1 text-right tabular-nums text-sm pt-0.5">
                    <span
                      v-if="a.check_out"
                      :class="{
                        'text-red-600 font-semibold': nightsLeft(a.check_out) < 0,
                        'text-amber-600 font-medium': nightsLeft(a.check_out) === 0,
                        'text-foreground':            nightsLeft(a.check_out) > 0,
                      }"
                    >
                      {{ nightsLeft(a.check_out) < 0 ? `+${Math.abs(nightsLeft(a.check_out))}` : nightsLeft(a.check_out) }}
                    </span>
                    <span v-else class="text-muted-foreground">—</span>
                  </div>
                </div>
              </template>
            </div>

            <!-- Legend -->
            <div class="flex items-center gap-4 px-5 py-2.5 border-t text-[11px] text-muted-foreground bg-muted/10">
              <span class="flex items-center gap-1.5"><span class="inline-block size-2.5 rounded-sm bg-amber-200 dark:bg-amber-800" /> Departing today</span>
              <span class="flex items-center gap-1.5"><span class="inline-block size-2.5 rounded-sm bg-red-200 dark:bg-red-900" /> Overstayed</span>
              <span class="ml-auto">Nights = nights remaining from today</span>
            </div>
          </div>
        </div>

        <!-- Right panel -->
        <div class="flex flex-col gap-4">

          <!-- Arriving Today -->
          <div class="rounded-xl border bg-card overflow-hidden">
            <div class="flex items-center gap-2 px-4 py-3 border-b bg-green-50 dark:bg-green-950/20">
              <LogIn class="size-4 text-green-600 dark:text-green-400" />
              <h3 class="font-semibold text-sm text-green-800 dark:text-green-300">Arriving Today</h3>
              <span class="ml-auto text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/60 rounded-full px-2 py-0.5">
                {{ arrivingToday.length }}
              </span>
            </div>
            <div v-if="arrivingToday.length === 0" class="px-4 py-5 text-center text-xs text-muted-foreground">
              No arrivals today.
            </div>
            <div v-else class="divide-y">
              <div v-for="b in arrivingToday" :key="b.id" class="px-4 py-3">
                <div class="flex items-start justify-between gap-2">
                  <p class="font-medium text-sm truncate">{{ b.booker_name }}</p>
                  <span v-if="b.booker_type === 'corporate'" class="shrink-0 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded px-1.5 py-0.5 font-medium">Corporate</span>
                </div>
                <p v-if="b.company_name" class="text-xs text-muted-foreground">{{ b.company_name }}</p>
                <!-- Individual attendees for corporate bookings -->
                <template v-if="b.booker_type === 'corporate' && b.assignments?.some(a => a.check_in === today && a.attendee_name)">
                  <div class="mt-1.5 flex flex-col gap-0.5">
                    <div
                      v-for="a in b.assignments?.filter(a => a.check_in === today)"
                      :key="a.id"
                      class="flex items-center gap-1.5 text-xs"
                    >
                      <BedDouble class="size-3 shrink-0 text-muted-foreground" />
                      <span class="truncate text-foreground">{{ a.attendee_name || b.booker_name }}</span>
                      <span class="text-muted-foreground shrink-0">· {{ a.room_name || '—' }}</span>
                    </div>
                  </div>
                </template>
                <!-- Simple room list for individual bookings -->
                <template v-else>
                  <div class="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    <span
                      v-for="a in b.assignments?.filter(a => a.check_in === today)"
                      :key="a.id"
                      class="text-xs text-muted-foreground"
                    >
                      {{ a.room_name || '—' }}
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Departing Today -->
          <div class="rounded-xl border bg-card overflow-hidden">
            <div class="flex items-center gap-2 px-4 py-3 border-b bg-amber-50 dark:bg-amber-950/20">
              <LogOut class="size-4 text-amber-600 dark:text-amber-400" />
              <h3 class="font-semibold text-sm text-amber-800 dark:text-amber-300">Departing Today</h3>
              <span class="ml-auto text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 rounded-full px-2 py-0.5">
                {{ departingToday.length }}
              </span>
            </div>
            <div v-if="departingToday.length === 0" class="px-4 py-5 text-center text-xs text-muted-foreground">
              No departures today.
            </div>
            <div v-else class="divide-y">
              <div v-for="b in departingToday" :key="b.id" class="px-4 py-3">
                <div class="flex items-start justify-between gap-2">
                  <p class="font-medium text-sm truncate">{{ b.booker_name }}</p>
                  <span v-if="b.booker_type === 'corporate'" class="shrink-0 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded px-1.5 py-0.5 font-medium">Corporate</span>
                </div>
                <p v-if="b.company_name" class="text-xs text-muted-foreground">{{ b.company_name }}</p>
                <!-- Individual attendees for corporate bookings -->
                <template v-if="b.booker_type === 'corporate' && b.assignments?.some(a => a.check_out === today && a.attendee_name)">
                  <div class="mt-1.5 flex flex-col gap-0.5">
                    <div
                      v-for="a in b.assignments?.filter(a => a.check_out === today)"
                      :key="a.id"
                      class="flex items-center gap-1.5 text-xs"
                    >
                      <BedDouble class="size-3 shrink-0 text-muted-foreground" />
                      <span class="truncate text-foreground">{{ a.attendee_name || b.booker_name }}</span>
                      <span class="text-muted-foreground shrink-0">· {{ a.room_name || '—' }}</span>
                    </div>
                  </div>
                </template>
                <!-- Simple room list for individual bookings -->
                <template v-else>
                  <div class="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                    <span
                      v-for="a in b.assignments?.filter(a => a.check_out === today)"
                      :key="a.id"
                      class="text-xs text-muted-foreground"
                    >
                      {{ a.room_name || '—' }}
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Active Events -->
          <div class="rounded-xl border bg-card overflow-hidden">
            <div class="flex items-center gap-2 px-4 py-3 border-b bg-violet-50 dark:bg-violet-950/20">
              <Theater class="size-4 text-violet-600 dark:text-violet-400" />
              <h3 class="font-semibold text-sm text-violet-800 dark:text-violet-300">Active Events</h3>
              <span class="ml-auto text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/60 rounded-full px-2 py-0.5">
                {{ events.length }}
              </span>
            </div>
            <div v-if="events.length === 0" class="px-4 py-5 text-center text-xs text-muted-foreground">
              No active events.
            </div>
            <div v-else class="divide-y">
              <div v-for="b in events" :key="b.id" class="px-4 py-3">
                <p class="font-medium text-sm truncate">{{ b.booker_name }}</p>
                <p v-if="b.company_name" class="text-xs text-muted-foreground">{{ b.company_name }}</p>
                <template v-if="b.events?.length">
                  <div v-for="e in b.events" :key="e.id" class="mt-1 text-xs text-muted-foreground flex items-start gap-1.5">
                    <Theater class="size-3 mt-0.5 shrink-0 text-violet-500" />
                    <span>
                      {{ e.venue_name || '—' }}
                      <span v-if="e.start_time"> · {{ e.start_time }}<template v-if="e.end_time">–{{ e.end_time }}</template></span>
                      <span v-if="e.pax_count"> · {{ e.pax_count }} pax</span>
                    </span>
                  </div>
                </template>
                <p v-else-if="b.venue_name" class="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Theater class="size-3 text-violet-500" /> {{ b.venue_name }}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ── Arriving Soon ───────────────────────────────────────────────────── -->
      <div v-if="arrivingSoon.length" class="rounded-xl border bg-card overflow-hidden">
        <div class="flex items-center gap-2 px-5 py-3.5 border-b bg-muted/30">
          <Clock class="size-4 text-primary" />
          <h2 class="font-semibold">Arriving Soon</h2>
          <span class="text-sm text-muted-foreground">next 3 days</span>
          <Badge variant="secondary" class="ml-auto">{{ arrivingSoon.length }}</Badge>
        </div>

        <div class="overflow-x-auto">
          <div class="grid grid-cols-12 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/20 border-b">
            <div class="col-span-4">Guest</div>
            <div class="col-span-3">Room</div>
            <div class="col-span-2 flex items-center gap-1"><Users class="size-3" /> Type</div>
            <div class="col-span-2">Check-In</div>
            <div class="col-span-1">Check-Out</div>
          </div>

          <div class="divide-y">
            <template v-for="b in arrivingSoon" :key="b.id">
              <div
                v-for="(a, ai) in assignmentsFor(b)"
                :key="a.id || ai"
                class="grid grid-cols-12 px-5 py-3 text-sm items-start"
              >
                <div class="col-span-4">
                  <template v-if="ai === 0">
                    <p class="font-medium leading-snug truncate">{{ b.booker_name }}</p>
                    <p v-if="b.company_name" class="text-xs text-muted-foreground truncate">{{ b.company_name }}</p>
                  </template>
                  <p v-else class="text-xs text-muted-foreground pl-3 border-l truncate">{{ a.attendee_name || '—' }}</p>
                </div>
                <div class="col-span-3 font-medium">{{ a.room_name || '—' }}</div>
                <div class="col-span-2 text-xs text-muted-foreground capitalize pt-0.5">
                  {{ b.booker_type }}
                </div>
                <div class="col-span-2 text-muted-foreground">{{ fmt(a.check_in) }}</div>
                <div class="col-span-1 text-muted-foreground">{{ fmtShort(a.check_out) }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>

    </template>
  </div>
</div>
</template>
