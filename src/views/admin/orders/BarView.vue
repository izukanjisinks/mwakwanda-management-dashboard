<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  RefreshCw,
  Clock,
  Martini,
  CheckCircle2,
  ArrowRight,
  BedDouble,
  ShoppingBag,
  AlertTriangle,
} from 'lucide-vue-next'
import { menusApi } from '@/services/api/menus'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { hasBarItems, isBarItem } from '@/utils/orders'
import type { Order } from '@/types/menu'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const branchFilter = useBranchFilterStore()

// ── Data ─────────────────────────────────────────────────────────────────────

const orders = ref<Order[]>([])
const loading = ref(false)

async function fetchOrders() {
  loading.value = true
  try {
    const res = await menusApi.listOrders({
      status: 'open',
      page: 1,
      page_size: 200,
      branch_id: branchFilter.apiBranchId,
    })
    const list = res.data ?? []

    // Fan out to individual order endpoints to get full details including items
    const detailed = await Promise.all(list.map(o => menusApi.getOrder(o.id)))
    const incomingMap = new Map(detailed.map(o => [o.id, o]))

    orders.value = orders.value.filter(o => incomingMap.has(o.id))

    for (const o of detailed) {
      const idx = orders.value.findIndex(e => e.id === o.id)
      if (idx !== -1) {
        orders.value[idx] = o
      } else {
        orders.value.push(o)
      }
    }
  } finally {
    loading.value = false
  }
}

// ── Bar status ───────────────────────────────────────────────────────────────
// Tracked independently from kitchen_status on the same order — finishing
// the food doesn't finish the drink, and vice versa. See utils/orders.ts.

type BarStatus = 'new' | 'preparing' | 'ready'
const servedIds = ref<Set<string>>(new Set())
const advancing = ref<Set<string>>(new Set())

function getStatus(order: Order): BarStatus {
  return order.bar_status ?? 'new'
}

async function advance(orderId: string) {
  const order = orders.value.find(o => o.id === orderId)
  if (!order) return
  const current = getStatus(order)

  if (current === 'ready') {
    servedIds.value = new Set(servedIds.value).add(orderId)
    return
  }

  const next: BarStatus = current === 'new' ? 'preparing' : 'ready'
  advancing.value = new Set(advancing.value).add(orderId)
  try {
    const updated = await menusApi.updateBarStatus(orderId, next)
    const idx = orders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) orders.value[idx] = updated
  } finally {
    advancing.value = new Set([...advancing.value].filter(id => id !== orderId))
  }
}

// ── Confirmation dialog ───────────────────────────────────────────────────────

const pendingOrder = ref<Order | null>(null)

function requestAdvance(order: Order) {
  pendingOrder.value = order
}

function confirmAdvance() {
  if (pendingOrder.value) {
    advance(pendingOrder.value.id)
    pendingOrder.value = null
  }
}

function cancelAdvance() {
  pendingOrder.value = null
}

const confirmTitle = computed(() => {
  if (!pendingOrder.value) return ''
  const s = getStatus(pendingOrder.value)
  if (s === 'new')       return 'Start Preparing?'
  if (s === 'preparing') return 'Mark as Ready?'
  return 'Mark as Served?'
})

const confirmDescription = computed(() => {
  if (!pendingOrder.value) return ''
  const num = pendingOrder.value.order_number
  const s = getStatus(pendingOrder.value)
  if (s === 'new')       return `Move order ${num} from New to Preparing?`
  if (s === 'preparing') return `Mark order ${num} as ready to serve?`
  return `Confirm order ${num} has been served and remove it from the board.`
})

const confirmLabel = computed(() => {
  if (!pendingOrder.value) return 'Confirm'
  const s = getStatus(pendingOrder.value)
  if (s === 'new')       return 'Start Preparing'
  if (s === 'preparing') return 'Mark Ready'
  return 'Mark Served'
})

// ── Type filter ───────────────────────────────────────────────────────────────

type TypeFilter = 'all' | 'in_house' | 'walk_in'
const typeFilter = ref<TypeFilter>('all')

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: 'all',      label: 'All Orders' },
  { value: 'in_house', label: 'In-House'   },
  { value: 'walk_in',  label: 'Walk-In'    },
]

// Build a sortable ms timestamp for an order:
//   scheduled orders → scheduled date + serving_time (or midnight if no time)
//   unscheduled (walk-in) → created_at, so they sort among themselves naturally
// Within the same primary key, created_at breaks the tie.
function orderSortKey(order: Order): number {
  if (order.scheduled_for) {
    const date = order.scheduled_for.slice(0, 10) // YYYY-MM-DD
    const time = order.serving_time ? `T${order.serving_time}:00` : 'T00:00:00'
    return new Date(`${date}${time}`).getTime()
  }
  return new Date(order.created_at).getTime()
}

const visibleOrders = computed(() =>
  orders.value
    .filter(o => !servedIds.value.has(o.id))
    .filter(o => typeFilter.value === 'all' || o.type === typeFilter.value)
    // Orders with nothing for the bar to pour have no business on this board —
    // they belong on the kitchen's instead.
    .filter(o => hasBarItems(o))
    .sort((a, b) => {
      const diff = orderSortKey(a) - orderSortKey(b)
      if (diff !== 0) return diff
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }),
)

const newOrders       = computed(() => visibleOrders.value.filter(o => getStatus(o) === 'new'))
const preparingOrders = computed(() => visibleOrders.value.filter(o => getStatus(o) === 'preparing'))
const readyOrders     = computed(() => visibleOrders.value.filter(o => getStatus(o) === 'ready'))

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasAllergyNote(note?: string) {
  if (!note) return false
  return /allerg|intoleran|gluten|nut|dairy|vegan|halal|kosher/i.test(note)
}

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function ageLabel(iso: string): string {
  const m = minutesAgo(iso)
  if (m < 1) return 'Just now'
  if (m === 1) return '1 min ago'
  return `${m} min ago`
}

function ageColor(iso: string): string {
  const m = minutesAgo(iso)
  if (m >= 20) return 'text-destructive'
  if (m >= 10) return 'text-amber-500 dark:text-amber-400'
  return 'text-muted-foreground'
}

function ageBg(iso: string): string {
  const m = minutesAgo(iso)
  if (m >= 20) return 'border-destructive/50 bg-destructive/5'
  if (m >= 10) return 'border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20'
  return 'border-border bg-card'
}

function itemName(oi: Order['items'][number]): string {
  return oi.item_name ?? oi.menu_item?.name ?? `Item ${oi.menu_item_id.slice(0, 6)}`
}

function guestLabel(order: Order): string {
  if (order.room_name) return order.room_name
  if (order.client_name) return order.client_name
  return ''
}

interface AggregatedItem { key: string; name: string; notes?: string; quantity: number; isBar: boolean }

function aggregateItems(items: Order['items']): AggregatedItem[] {
  const map = new Map<string, AggregatedItem>()
  for (const oi of items) {
    const name = itemName(oi)
    const key = `${name}||${oi.notes ?? ''}`
    if (map.has(key)) {
      map.get(key)!.quantity += oi.quantity
    } else {
      map.set(key, { key, name, notes: oi.notes, quantity: oi.quantity, isBar: isBarItem(oi) })
    }
  }
  return [...map.values()]
}

function formatServingDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function mealPeriodClass(period: string): string {
  switch (period.toLowerCase()) {
    case 'breakfast': return 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
    case 'brunch':    return 'bg-lime-100 text-lime-800 border border-lime-300 dark:bg-lime-900/40 dark:text-lime-300 dark:border-lime-700'
    case 'lunch':     return 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700'
    case 'dinner':    return 'bg-violet-100 text-violet-800 border border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700'
    case 'supper':    return 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700'
    default:          return 'bg-teal-100 text-teal-800 border border-teal-300 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700'
  }
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
      fetchOrders()
      countdown.value = REFRESH_INTERVAL
    }
  }, 1000)
}

function manualRefresh() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  fetchOrders()
  startRefreshTimer()
}

const currentTime = ref('')
function updateClock() {
  currentTime.value = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

onMounted(() => {
  updateClock()
  fetchOrders()
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
  <DashboardHeader title="Bar Display">
    <template #actions>
      <div class="flex gap-1">
        <button
          v-for="tf in typeFilters"
          :key="tf.value"
          class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
          :class="typeFilter === tf.value
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'"
          @click="typeFilter = tf.value"
        >
          {{ tf.label }}
        </button>
      </div>
    </template>
  </DashboardHeader>

  <div class="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">

    <!-- ── Status bar ──────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-end px-5 py-2.5 border-b bg-card shrink-0 gap-4 text-sm text-muted-foreground">
      <div class="hidden sm:flex items-center gap-3">
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-sky-500 inline-block" />
          {{ newOrders.length }} new
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-amber-500 inline-block" />
          {{ preparingOrders.length }} preparing
        </span>
        <span class="flex items-center gap-1.5">
          <span class="size-2 rounded-full bg-green-500 inline-block" />
          {{ readyOrders.length }} ready
        </span>
      </div>
      <div class="h-4 w-px bg-border hidden sm:block" />
      <span class="font-mono tabular-nums text-foreground font-medium">{{ currentTime }}</span>
      <div class="flex items-center gap-1.5">
        <span class="text-xs">{{ countdown }}s</span>
        <button
          class="size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
          @click="manualRefresh"
        >
          <RefreshCw class="size-3.5" :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>
    </div>

    <!-- ── Board ──────────────────────────────────────────────────────────── -->
    <div class="flex-1 overflow-auto p-4">
      <div class="grid grid-cols-3 gap-4 min-h-full">

        <!-- ─── Column: New ───────────────────────────────────────────────── -->
        <div class="flex flex-col gap-3 min-w-0">
          <div class="flex items-center gap-2 px-1 pb-1 border-b-2 border-sky-400">
            <span class="size-2.5 rounded-full bg-sky-500" />
            <span class="text-sm font-semibold">New</span>
            <span class="ml-auto text-xs text-muted-foreground font-medium tabular-nums">{{ newOrders.length }}</span>
          </div>

          <div v-if="newOrders.length === 0 && !loading" class="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground/60">
            <CheckCircle2 class="size-8" />
            <p class="text-xs">No new orders</p>
          </div>

          <div
            v-for="order in newOrders"
            :key="order.id"
            class="rounded-xl border flex flex-col overflow-hidden"
            :class="ageBg(order.created_at)"
          >
            <!-- Header -->
            <div class="px-4 pt-3.5 pb-3">
              <div class="flex items-center gap-2">
                <p class="font-bold text-sm">{{ order.order_number }}</p>
                <Badge v-if="order.type === 'in_house'" variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <BedDouble class="size-2.5" /> In-House
                </Badge>
                <Badge v-else variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <ShoppingBag class="size-2.5" /> Walk-In
                </Badge>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span v-if="guestLabel(order)" class="text-xs font-medium text-foreground truncate">{{ guestLabel(order) }}</span>
                <span class="text-xs" :class="ageColor(order.created_at)">
                  <Clock class="size-3 inline-block mr-0.5 -mt-0.5" />{{ ageLabel(order.created_at) }}
                </span>
              </div>
              <div v-if="order.serving_time || order.meal_period || order.scheduled_for" class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                <span v-if="order.meal_period" class="text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize" :class="mealPeriodClass(order.meal_period)">{{ order.meal_period }}</span>
                <span v-if="order.serving_time" class="text-xs flex items-center gap-1">
                  <span class="text-muted-foreground">Serving time:</span>
                  <span class="font-semibold tabular-nums">{{ order.serving_time }}</span>
                </span>
                <span v-if="order.scheduled_for" class="text-xs flex items-center gap-1">
                  <span class="text-muted-foreground">Session date:</span>
                  <span class="font-semibold">{{ formatServingDate(order.scheduled_for) }}</span>
                </span>
              </div>
            </div>

            <!-- Allergy warning — always above items so the bartender sees it first -->
            <div
              v-if="order.notes && hasAllergyNote(order.notes)"
              class="mx-4 mb-2 rounded-md px-3 py-2 text-xs flex gap-2 items-start bg-red-50 border border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-700 dark:text-red-300"
            >
              <AlertTriangle class="size-3.5 shrink-0 mt-0.5" />
              <span>{{ order.notes }}</span>
            </div>

            <!-- Items — always visible -->
            <div class="border-t">
              <div class="px-4 py-3 flex flex-col gap-3">
                <div
                  v-for="ai in aggregateItems(order.items ?? [])"
                  :key="ai.key"
                  class="flex gap-3 items-start"
                  :class="!ai.isBar && 'opacity-40'"
                >
                  <span class="text-2xl font-black tabular-nums leading-none text-primary w-8 text-right shrink-0 mt-0.5">{{ ai.quantity }}</span>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <p class="font-semibold text-sm leading-snug flex items-center gap-1.5">
                      {{ ai.name }}
                      <span v-if="!ai.isBar" class="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground border rounded px-1 py-0.5 shrink-0">Kitchen</span>
                    </p>
                    <p v-if="ai.notes" class="text-xs text-muted-foreground italic mt-0.5">↳ {{ ai.notes }}</p>
                  </div>
                </div>
              </div>
              <!-- Non-allergy order notes -->
              <div
                v-if="order.notes && !hasAllergyNote(order.notes)"
                class="mx-4 mb-3 rounded-md px-3 py-2 text-xs flex gap-2 items-start bg-muted/60 text-muted-foreground"
              >
                <span>{{ order.notes }}</span>
              </div>
            </div>

            <!-- Action -->
            <div class="px-4 pb-4 pt-0">
              <Button size="sm" class="w-full gap-1.5" @click="requestAdvance(order)">
                <Martini class="size-3.5" />
                Start Preparing
                <ArrowRight class="size-3.5 ml-auto" />
              </Button>
            </div>
          </div>
        </div>

        <!-- ─── Column: Preparing ─────────────────────────────────────────── -->
        <div class="flex flex-col gap-3 min-w-0">
          <div class="flex items-center gap-2 px-1 pb-1 border-b-2 border-amber-400">
            <span class="size-2.5 rounded-full bg-amber-500" />
            <span class="text-sm font-semibold">Preparing</span>
            <span class="ml-auto text-xs text-muted-foreground font-medium tabular-nums">{{ preparingOrders.length }}</span>
          </div>

          <div v-if="preparingOrders.length === 0" class="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground/60">
            <Martini class="size-8" />
            <p class="text-xs">Nothing in progress</p>
          </div>

          <div
            v-for="order in preparingOrders"
            :key="order.id"
            class="rounded-xl border flex flex-col overflow-hidden border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/10"
          >
            <div class="px-4 pt-3.5 pb-3">
              <div class="flex items-center gap-2">
                <p class="font-bold text-sm">{{ order.order_number }}</p>
                <Badge v-if="order.type === 'in_house'" variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <BedDouble class="size-2.5" /> In-House
                </Badge>
                <Badge v-else variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <ShoppingBag class="size-2.5" /> Walk-In
                </Badge>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span v-if="guestLabel(order)" class="text-xs font-medium text-foreground truncate">{{ guestLabel(order) }}</span>
                <span class="text-xs" :class="ageColor(order.created_at)">
                  <Clock class="size-3 inline-block mr-0.5 -mt-0.5" />{{ ageLabel(order.created_at) }}
                </span>
              </div>
              <div v-if="order.serving_time || order.meal_period || order.scheduled_for" class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                <span v-if="order.meal_period" class="text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize" :class="mealPeriodClass(order.meal_period)">{{ order.meal_period }}</span>
                <span v-if="order.serving_time" class="text-xs flex items-center gap-1">
                  <span class="text-muted-foreground">Serving time:</span>
                  <span class="font-semibold tabular-nums">{{ order.serving_time }}</span>
                </span>
                <span v-if="order.scheduled_for" class="text-xs flex items-center gap-1">
                  <span class="text-muted-foreground">Session date:</span>
                  <span class="font-semibold">{{ formatServingDate(order.scheduled_for) }}</span>
                </span>
              </div>
            </div>

            <div
              v-if="order.notes && hasAllergyNote(order.notes)"
              class="mx-4 mb-2 rounded-md px-3 py-2 text-xs flex gap-2 items-start bg-red-50 border border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-700 dark:text-red-300"
            >
              <AlertTriangle class="size-3.5 shrink-0 mt-0.5" />
              <span>{{ order.notes }}</span>
            </div>

            <div class="border-t border-amber-200 dark:border-amber-800">
              <div class="px-4 py-3 flex flex-col gap-3">
                <div
                  v-for="ai in aggregateItems(order.items ?? [])"
                  :key="ai.key"
                  class="flex gap-3 items-start"
                  :class="!ai.isBar && 'opacity-40'"
                >
                  <span class="text-2xl font-black tabular-nums leading-none text-amber-600 dark:text-amber-400 w-8 text-right shrink-0 mt-0.5">{{ ai.quantity }}</span>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <p class="font-semibold text-sm leading-snug flex items-center gap-1.5">
                      {{ ai.name }}
                      <span v-if="!ai.isBar" class="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground border rounded px-1 py-0.5 shrink-0">Kitchen</span>
                    </p>
                    <p v-if="ai.notes" class="text-xs text-muted-foreground italic mt-0.5">↳ {{ ai.notes }}</p>
                  </div>
                </div>
              </div>
              <div
                v-if="order.notes && !hasAllergyNote(order.notes)"
                class="mx-4 mb-3 rounded-md px-3 py-2 text-xs flex gap-2 items-start bg-muted/60 text-muted-foreground"
              >
                <span>{{ order.notes }}</span>
              </div>
            </div>

            <div class="px-4 pb-4 pt-0">
              <Button size="sm" variant="outline" class="w-full gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/40" @click="requestAdvance(order)">
                <CheckCircle2 class="size-3.5" />
                Mark as Ready
                <ArrowRight class="size-3.5 ml-auto" />
              </Button>
            </div>
          </div>
        </div>

        <!-- ─── Column: Ready ─────────────────────────────────────────────── -->
        <div class="flex flex-col gap-3 min-w-0">
          <div class="flex items-center gap-2 px-1 pb-1 border-b-2 border-green-500">
            <span class="size-2.5 rounded-full bg-green-500" />
            <span class="text-sm font-semibold">Ready</span>
            <span class="ml-auto text-xs text-muted-foreground font-medium tabular-nums">{{ readyOrders.length }}</span>
          </div>

          <div v-if="readyOrders.length === 0" class="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground/60">
            <CheckCircle2 class="size-8" />
            <p class="text-xs">Nothing ready to serve</p>
          </div>

          <div
            v-for="order in readyOrders"
            :key="order.id"
            class="rounded-xl border flex flex-col overflow-hidden border-green-500/50 bg-green-50/40 dark:bg-green-950/10"
          >
            <div class="px-4 pt-3.5 pb-3">
              <div class="flex items-center gap-2">
                <p class="font-bold text-sm">{{ order.order_number }}</p>
                <Badge v-if="order.type === 'in_house'" variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <BedDouble class="size-2.5" /> In-House
                </Badge>
                <Badge v-else variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <ShoppingBag class="size-2.5" /> Walk-In
                </Badge>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span v-if="guestLabel(order)" class="text-xs font-medium text-foreground truncate">{{ guestLabel(order) }}</span>
                <span class="text-xs" :class="ageColor(order.created_at)">
                  <Clock class="size-3 inline-block mr-0.5 -mt-0.5" />{{ ageLabel(order.created_at) }}
                </span>
              </div>
              <div v-if="order.serving_time || order.meal_period || order.scheduled_for" class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                <span v-if="order.meal_period" class="text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize" :class="mealPeriodClass(order.meal_period)">{{ order.meal_period }}</span>
                <span v-if="order.serving_time" class="text-xs flex items-center gap-1">
                  <span class="text-muted-foreground">Serving time:</span>
                  <span class="font-semibold tabular-nums">{{ order.serving_time }}</span>
                </span>
                <span v-if="order.scheduled_for" class="text-xs flex items-center gap-1">
                  <span class="text-muted-foreground">Session date:</span>
                  <span class="font-semibold">{{ formatServingDate(order.scheduled_for) }}</span>
                </span>
              </div>
            </div>

            <div class="border-t border-green-200 dark:border-green-800">
              <div class="px-4 py-3 flex flex-col gap-3">
                <div
                  v-for="ai in aggregateItems(order.items ?? [])"
                  :key="ai.key"
                  class="flex gap-3 items-start"
                  :class="!ai.isBar && 'opacity-40'"
                >
                  <span class="text-2xl font-black tabular-nums leading-none text-green-600 dark:text-green-400 w-8 text-right shrink-0 mt-0.5 line-through">{{ ai.quantity }}</span>
                  <div class="min-w-0 flex-1 pt-0.5">
                    <p class="font-semibold text-sm leading-snug line-through text-muted-foreground flex items-center gap-1.5">
                      {{ ai.name }}
                      <span v-if="!ai.isBar" class="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground border rounded px-1 py-0.5 shrink-0 no-underline">Kitchen</span>
                    </p>
                    <p v-if="ai.notes" class="text-xs text-muted-foreground/60 italic mt-0.5">↳ {{ ai.notes }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="px-4 pb-4 pt-0">
              <Button size="sm" variant="outline" class="w-full gap-1.5 border-green-500 text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-950/40" @click="requestAdvance(order)">
                <CheckCircle2 class="size-3.5" />
                Served — Done
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>

  <!-- ── Advance confirmation dialog ────────────────────────────────────────── -->
  <Dialog :open="!!pendingOrder" @update:open="val => { if (!val) cancelAdvance() }">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>{{ confirmTitle }}</DialogTitle>
        <DialogDescription>{{ confirmDescription }}</DialogDescription>
      </DialogHeader>

      <div v-if="pendingOrder" class="rounded-lg border bg-muted/30 p-3 text-sm flex flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <span class="font-semibold">{{ pendingOrder.order_number }}</span>
          <Badge v-if="pendingOrder.type === 'in_house'" variant="outline" class="text-[10px] gap-1">
            <BedDouble class="size-2.5" /> In-House
          </Badge>
          <Badge v-else variant="outline" class="text-[10px] gap-1">
            <ShoppingBag class="size-2.5" /> Walk-In
          </Badge>
        </div>
        <p v-if="guestLabel(pendingOrder)" class="text-xs text-muted-foreground">{{ guestLabel(pendingOrder) }}</p>
        <div
          v-if="pendingOrder.notes && hasAllergyNote(pendingOrder.notes)"
          class="rounded-md px-3 py-2 text-xs flex gap-2 items-start bg-red-50 border border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-700 dark:text-red-300"
        >
          <AlertTriangle class="size-3.5 shrink-0 mt-0.5" />
          <span>{{ pendingOrder.notes }}</span>
        </div>
        <div class="mt-1 flex flex-col gap-1">
          <div
            v-for="ai in aggregateItems(pendingOrder.items ?? [])"
            :key="ai.key"
            class="flex items-baseline gap-2 text-xs"
          >
            <span class="font-bold tabular-nums w-5 text-right shrink-0 text-primary">{{ ai.quantity }}</span>
            <span class="font-medium">{{ ai.name }}</span>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" @click="cancelAdvance">Cancel</Button>
        <Button @click="confirmAdvance">{{ confirmLabel }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

</div>
</template>
