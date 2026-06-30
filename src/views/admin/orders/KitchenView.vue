<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  RefreshCw,
  ChefHat,
  Clock,
  Flame,
  CheckCircle2,
  ArrowRight,
  BedDouble,
  ShoppingBag,
} from 'lucide-vue-next'
import { menusApi } from '@/services/api/menus'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { Order } from '@/types/menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const branchFilter = useBranchFilterStore()

// ── Data ─────────────────────────────────────────────────────────────────────

const orders = ref<Order[]>([])
const loading = ref(false)
const lastFetched = ref<Date | null>(null)

async function fetchOrders() {
  loading.value = true
  try {
    const res = await menusApi.listOrders({
      status: 'open',
      page: 1,
      page_size: 200,
      branch_id: branchFilter.apiBranchId,
    })
    const incoming = res.data ?? []
    const incomingMap = new Map(incoming.map(o => [o.id, o]))

    // Remove orders that no longer exist (closed externally)
    orders.value = orders.value.filter(o => incomingMap.has(o.id))

    // Update existing orders and add new ones
    const existingIds = new Set(orders.value.map(o => o.id))
    for (const o of incoming) {
      const idx = orders.value.findIndex(e => e.id === o.id)
      if (idx !== -1) {
        orders.value[idx] = o
      } else {
        orders.value.push(o)
      }
    }
    // Orders that disappeared should also be removed from kitchen status
    for (const [id] of kitchenStatus.value) {
      if (!incomingMap.has(id)) kitchenStatus.value.delete(id)
    }

    lastFetched.value = new Date()
  } finally {
    loading.value = false
  }
}

// ── Kitchen-local status ──────────────────────────────────────────────────────
// Tracks workflow state without any backend change.
// new → preparing → ready → (removed from board)

type KitchenStatus = 'new' | 'preparing' | 'ready'
const kitchenStatus = ref<Map<string, KitchenStatus>>(new Map())
const servedIds = ref<Set<string>>(new Set())

function getStatus(orderId: string): KitchenStatus {
  return kitchenStatus.value.get(orderId) ?? 'new'
}

function advance(orderId: string) {
  const current = getStatus(orderId)
  if (current === 'new') {
    kitchenStatus.value = new Map(kitchenStatus.value).set(orderId, 'preparing')
  } else if (current === 'preparing') {
    kitchenStatus.value = new Map(kitchenStatus.value).set(orderId, 'ready')
  } else if (current === 'ready') {
    servedIds.value = new Set(servedIds.value).add(orderId)
  }
}

// ── Type filter ───────────────────────────────────────────────────────────────
type TypeFilter = 'all' | 'in_house' | 'walk_in'
const typeFilter = ref<TypeFilter>('all')

const typeFilters: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'in_house', label: 'In-House' },
  { value: 'walk_in', label: 'Walk-In' },
]

const visibleOrders = computed(() =>
  orders.value
    .filter(o => !servedIds.value.has(o.id))
    .filter(o => typeFilter.value === 'all' || o.type === typeFilter.value)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
)

const newOrders = computed(() => visibleOrders.value.filter(o => getStatus(o.id) === 'new'))
const preparingOrders = computed(() => visibleOrders.value.filter(o => getStatus(o.id) === 'preparing'))
const readyOrders = computed(() => visibleOrders.value.filter(o => getStatus(o.id) === 'ready'))

// ── Auto-refresh ──────────────────────────────────────────────────────────────
const REFRESH_INTERVAL = 30
const countdown = ref(REFRESH_INTERVAL)
let refreshTimer: ReturnType<typeof setInterval> | null = null
let clockTimer: ReturnType<typeof setInterval> | null = null

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

// Live clock
const currentTime = ref('')
function updateClock() {
  currentTime.value = new Date().toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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
  if (clockTimer) clearInterval(clockTimer)
})

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  if (order.attendee_name) return order.attendee_name
  if (order.client_name) return order.client_name
  return '—'
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">

    <!-- ── Top bar ─────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between px-5 py-3 border-b bg-card shrink-0 gap-4">
      <!-- Left: title + type filter -->
      <div class="flex items-center gap-4 min-w-0">
        <div class="flex items-center gap-2 shrink-0">
          <ChefHat class="size-5 text-primary" />
          <h1 class="text-base font-bold tracking-tight">Kitchen Display</h1>
        </div>

        <!-- Type filter pills -->
        <div class="flex gap-1">
          <button
            v-for="tf in typeFilters"
            :key="tf.value"
            class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            :class="
              typeFilter === tf.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            "
            @click="typeFilter = tf.value"
          >
            {{ tf.label }}
          </button>
        </div>
      </div>

      <!-- Right: stats + clock + refresh -->
      <div class="flex items-center gap-4 shrink-0 text-sm text-muted-foreground">
        <!-- Live counts -->
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

        <!-- Clock -->
        <span class="font-mono tabular-nums text-foreground font-medium">{{ currentTime }}</span>

        <!-- Refresh -->
        <div class="flex items-center gap-1.5">
          <span class="text-xs">{{ countdown }}s</span>
          <button
            class="size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors"
            :title="loading ? 'Refreshing…' : 'Refresh now'"
            @click="manualRefresh"
          >
            <RefreshCw class="size-3.5" :class="loading ? 'animate-spin' : ''" />
          </button>
        </div>
      </div>
    </div>

    <!-- ── Board ──────────────────────────────────────────────────────────── -->
    <div class="flex-1 overflow-auto p-4">
      <div class="grid grid-cols-3 gap-4 min-h-full">

        <!-- ─── Column: New ───────────────────────────────────────────────── -->
        <div class="flex flex-col gap-3 min-w-0">
          <!-- Column header -->
          <div class="flex items-center gap-2 px-1 pb-1 border-b-2 border-sky-400">
            <span class="size-2.5 rounded-full bg-sky-500" />
            <span class="text-sm font-semibold">New</span>
            <span class="ml-auto text-xs text-muted-foreground font-medium tabular-nums">{{ newOrders.length }}</span>
          </div>

          <!-- Empty state -->
          <div v-if="newOrders.length === 0 && !loading" class="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground/60">
            <CheckCircle2 class="size-8" />
            <p class="text-xs">No new orders</p>
          </div>

          <!-- Cards -->
          <div
            v-for="order in newOrders"
            :key="order.id"
            class="rounded-xl border p-4 flex flex-col gap-3 transition-colors"
            :class="ageBg(order.created_at)"
          >
            <!-- Card header -->
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold text-sm truncate">{{ order.order_number }}</p>
                <p class="text-xs font-medium mt-0.5 truncate" :class="ageColor(order.created_at)">
                  <Clock class="size-3 inline-block mr-0.5 -mt-0.5" />{{ ageLabel(order.created_at) }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <Badge v-if="order.type === 'in_house'" variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <BedDouble class="size-2.5" /> In-House
                </Badge>
                <Badge v-else variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <ShoppingBag class="size-2.5" /> Walk-In
                </Badge>
                <span v-if="guestLabel(order) !== '—'" class="text-[10px] text-muted-foreground font-medium truncate max-w-24">
                  {{ guestLabel(order) }}
                </span>
              </div>
            </div>

            <!-- Items -->
            <div class="flex flex-col gap-1.5">
              <div
                v-for="oi in order.items"
                :key="oi.id"
                class="flex items-baseline gap-2"
              >
                <span class="text-base font-bold tabular-nums w-6 text-right shrink-0 text-primary">{{ oi.quantity }}</span>
                <span class="text-sm font-medium leading-snug">{{ itemName(oi) }}</span>
              </div>
            </div>

            <!-- Notes -->
            <p v-if="order.notes" class="text-xs text-muted-foreground bg-muted/60 rounded-md px-2 py-1.5 italic">
              "{{ order.notes }}"
            </p>

            <!-- Action -->
            <Button size="sm" class="w-full mt-1 gap-1.5" @click="advance(order.id)">
              <Flame class="size-3.5" />
              Start Preparing
              <ArrowRight class="size-3.5 ml-auto" />
            </Button>
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
            <Flame class="size-8" />
            <p class="text-xs">Nothing in progress</p>
          </div>

          <div
            v-for="order in preparingOrders"
            :key="order.id"
            class="rounded-xl border p-4 flex flex-col gap-3 border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/10"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold text-sm truncate">{{ order.order_number }}</p>
                <p class="text-xs font-medium mt-0.5 truncate" :class="ageColor(order.created_at)">
                  <Clock class="size-3 inline-block mr-0.5 -mt-0.5" />{{ ageLabel(order.created_at) }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <Badge v-if="order.type === 'in_house'" variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <BedDouble class="size-2.5" /> In-House
                </Badge>
                <Badge v-else variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <ShoppingBag class="size-2.5" /> Walk-In
                </Badge>
                <span v-if="guestLabel(order) !== '—'" class="text-[10px] text-muted-foreground font-medium truncate max-w-24">
                  {{ guestLabel(order) }}
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <div
                v-for="oi in order.items"
                :key="oi.id"
                class="flex items-baseline gap-2"
              >
                <span class="text-base font-bold tabular-nums w-6 text-right shrink-0 text-amber-600 dark:text-amber-400">{{ oi.quantity }}</span>
                <span class="text-sm font-medium leading-snug">{{ itemName(oi) }}</span>
              </div>
            </div>

            <p v-if="order.notes" class="text-xs text-muted-foreground bg-muted/60 rounded-md px-2 py-1.5 italic">
              "{{ order.notes }}"
            </p>

            <Button size="sm" variant="outline" class="w-full mt-1 gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-950/40" @click="advance(order.id)">
              <CheckCircle2 class="size-3.5" />
              Mark as Ready
              <ArrowRight class="size-3.5 ml-auto" />
            </Button>
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
            class="rounded-xl border p-4 flex flex-col gap-3 border-green-500/50 bg-green-50/40 dark:bg-green-950/10"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-bold text-sm truncate">{{ order.order_number }}</p>
                <p class="text-xs font-medium mt-0.5 truncate" :class="ageColor(order.created_at)">
                  <Clock class="size-3 inline-block mr-0.5 -mt-0.5" />{{ ageLabel(order.created_at) }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <Badge v-if="order.type === 'in_house'" variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <BedDouble class="size-2.5" /> In-House
                </Badge>
                <Badge v-else variant="outline" class="text-[10px] px-1.5 py-0 gap-1">
                  <ShoppingBag class="size-2.5" /> Walk-In
                </Badge>
                <span v-if="guestLabel(order) !== '—'" class="text-[10px] text-muted-foreground font-medium truncate max-w-24">
                  {{ guestLabel(order) }}
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <div
                v-for="oi in order.items"
                :key="oi.id"
                class="flex items-baseline gap-2"
              >
                <span class="text-base font-bold tabular-nums w-6 text-right shrink-0 text-green-600 dark:text-green-400">{{ oi.quantity }}</span>
                <span class="text-sm font-medium leading-snug line-through text-muted-foreground">{{ itemName(oi) }}</span>
              </div>
            </div>

            <p v-if="order.notes" class="text-xs text-muted-foreground bg-muted/60 rounded-md px-2 py-1.5 italic">
              "{{ order.notes }}"
            </p>

            <Button size="sm" variant="outline" class="w-full mt-1 gap-1.5 border-green-500 text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-950/40" @click="advance(order.id)">
              <CheckCircle2 class="size-3.5" />
              Served — Done
            </Button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>
