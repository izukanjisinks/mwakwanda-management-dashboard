<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { DateValue } from '@internationalized/date'
import { CalendarDate, getLocalTimeZone, today as getToday } from '@internationalized/date'
import { CalendarClock, UtensilsCrossed, ChevronLeft, ChevronRight, SlidersHorizontal, CalendarIcon, ArrowLeft } from 'lucide-vue-next'
import { auditLogsApi } from '@/services/api/audit-logs'
import type { AuditLog, OverstayedPayload, OrdersClosedPayload } from '@/types/audit-log'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
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

const todayDate = getToday(getLocalTimeZone())
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

const logs = ref<AuditLog[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = 10

const filterAction = ref('all')
const filterFrom = ref('')
const filterTo = ref('')

const totalPages = () => Math.max(1, Math.ceil(total.value / pageSize))

async function fetchLogs() {
  loading.value = true
  try {
    const res = await auditLogsApi.list({
      page: page.value,
      page_size: pageSize,
      action: filterAction.value === 'all' ? undefined : filterAction.value,
      from: filterFrom.value || undefined,
      to: filterTo.value || undefined,
    })
    logs.value = res.data ?? []
    total.value = res.total ?? 0
  } catch {
    logs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchLogs)

watch([filterAction, filterFrom, filterTo], () => {
  page.value = 1
  fetchLogs()
})

watch(page, fetchLogs)

function setPage(n: number) { page.value = n }

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function asOverstayed(log: AuditLog): OverstayedPayload {
  return log.payload as OverstayedPayload
}

function asOrdersClosed(log: AuditLog): OrdersClosedPayload {
  return log.payload as OrdersClosedPayload
}

const router = useRouter()
</script>

<template>
  <DashboardHeader title="System Logs" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Back -->
    <div>
      <Button variant="ghost" class="-ml-2" @click="router.push({ name: 'settings' })">
        <ArrowLeft class="size-4 mr-2" />
        Back to Settings
      </Button>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3 flex-wrap">
      <SlidersHorizontal class="size-4 text-muted-foreground shrink-0" />

      <Select v-model="filterAction">
        <SelectTrigger class="w-48">
          <SelectValue placeholder="All actions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All actions</SelectItem>
          <SelectItem value="booking.overstayed">booking.overstayed</SelectItem>
          <SelectItem value="orders.closed">orders.closed</SelectItem>
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
            <Calendar v-model="toDate" layout="month-and-year" :min-value="fromDate ?? todayDate" :max-value="maxDate" class="rounded-md" />
          </PopoverContent>
        </Popover>
      </div>

      <Button v-if="filterAction !== 'all' || filterFrom || filterTo" variant="ghost" size="sm"
        @click="filterAction = 'all'; filterFrom = ''; filterTo = ''">
        Clear
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <!-- Loading -->
      <div v-if="loading" class="flex flex-col gap-2 p-4">
        <div v-for="i in 6" :key="i" class="h-14 rounded-lg bg-muted animate-pulse" />
      </div>

      <!-- Empty -->
      <div v-else-if="logs.length === 0" class="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <SlidersHorizontal class="size-10 text-muted-foreground/40" />
        <p class="text-muted-foreground">No logs found.</p>
      </div>

      <!-- Rows -->
      <div v-else class="divide-y">
        <div
          v-for="log in logs"
          :key="log.id"
          class="flex items-start gap-4 px-6 py-4"
        >
          <!-- Icon -->
          <div
            :class="[
              'size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
              log.action === 'booking.overstayed' ? 'bg-amber-500/10' : 'bg-primary/10',
            ]"
          >
            <CalendarClock v-if="log.action === 'booking.overstayed'" class="size-4 text-amber-500" />
            <UtensilsCrossed v-else class="size-4 text-primary" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" class="font-mono text-xs">{{ log.action }}</Badge>
              <span class="text-xs text-muted-foreground">{{ log.actor_name }}</span>
            </div>

            <!-- booking.overstayed -->
            <template v-if="log.action === 'booking.overstayed'">
              <p class="text-sm mt-1">
                <span class="font-medium">{{ asOverstayed(log).client_name }}</span>
                in <span class="font-medium">{{ asOverstayed(log).room_name }}</span>
                <span class="text-muted-foreground"> · {{ asOverstayed(log).booking_number }}</span>
              </p>
              <p class="text-xs text-muted-foreground mt-0.5">
                Was due {{ asOverstayed(log).original_check_out }} — extended to {{ asOverstayed(log).extended_to }}
              </p>
            </template>

            <!-- orders.closed -->
            <template v-else-if="log.action === 'orders.closed'">
              <p class="text-sm mt-1">
                <span class="font-medium">{{ asOrdersClosed(log).orders_closed }}</span>
                order{{ asOrdersClosed(log).orders_closed !== 1 ? 's' : '' }} closed
              </p>
            </template>

            <!-- fallback -->
            <template v-else>
              <p class="text-sm mt-1 text-muted-foreground">{{ JSON.stringify(log.payload) }}</p>
            </template>
          </div>

          <!-- Timestamp -->
          <span class="text-xs text-muted-foreground shrink-0 mt-1">{{ formatTime(log.created_at) }}</span>
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
        <span>{{ total }} log{{ total !== 1 ? 's' : '' }}</span>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" class="size-8" :disabled="page <= 1" @click="setPage(page - 1)">
            <ChevronLeft class="size-4" />
          </Button>
          <span>{{ page }} / {{ totalPages() }}</span>
          <Button variant="outline" size="icon" class="size-8" :disabled="page >= totalPages()" @click="setPage(page + 1)">
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
