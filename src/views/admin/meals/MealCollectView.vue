<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, ScanLine, CheckCircle2, XCircle, AlertTriangle, Ban, ShieldAlert, Clock, CreditCard, WifiOff, RefreshCw, Maximize2,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useMealSessionsStore } from '@/stores/mealSessions'
import { getApiError } from '@/utils/errors'
import { MEAL_PERIODS } from '@/constants/meals'
import type { MealCollectionResult, MealCollectionResultType } from '@/types/meal-collection'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const route = useRoute()
const router = useRouter()
const store = useMealSessionsStore()

const sessionId = computed(() => String(route.params.sessionId))
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    await store.loadSessionForCollection(sessionId.value)
    await nextTick()
    focusInput()
  } finally {
    loading.value = false
  }
})

function mealPeriodLabel(value: string) {
  return MEAL_PERIODS.find(p => p.value === value)?.label ?? value
}

function goBack() {
  router.push({ name: 'meal-sessions' })
}

// Requests fullscreen synchronously within this click handler — browsers
// only grant fullscreen from a live user gesture, and that context can be
// lost by the time the kiosk route's own onMounted fires after navigation.
async function launchKiosk() {
  try {
    await document.documentElement.requestFullscreen()
  } catch {
    // Ignored — the kiosk screen has its own "Tap to enter fullscreen" fallback.
  }
  router.push({ name: 'meal-session-kiosk', params: { sessionId: sessionId.value } })
}

// ── Collect input ──────────────────────────────────────────────────────────────
const inputValue = ref('')
const inputRef = ref<InstanceType<typeof Input> | null>(null)
const lastResult = ref<MealCollectionResult | null>(null)

function focusInput() {
  // Input.vue's root element is the <input> itself, so $el is already the field.
  const el = inputRef.value?.$el as HTMLInputElement | undefined
  el?.focus()
}

async function submitCollect() {
  const value = inputValue.value.trim()
  if (!value || store.collectLoading) return
  inputValue.value = ''
  try {
    const result = await store.collect({
      input: value,
      idempotency_key: crypto.randomUUID(),
      client_collected_at: new Date().toISOString(),
    })
    lastResult.value = result
  } catch (err) {
    toast.error(getApiError(err, 'Failed to process collection.'))
  } finally {
    await nextTick()
    focusInput()
  }
}

// ── Result panel presentation ──────────────────────────────────────────────────
const resultConfig: Record<MealCollectionResultType, { tone: 'green' | 'blue' | 'red' | 'amber' | 'gray'; icon: typeof CheckCircle2; heading: string }> = {
  matched:          { tone: 'green', icon: CheckCircle2, heading: 'Charged' },
  provisional:      { tone: 'blue',  icon: WifiOff,      heading: 'Recorded — Pending Sync' },
  ambiguous:        { tone: 'amber', icon: AlertTriangle, heading: 'Multiple Matches' },
  not_found:        { tone: 'red',   icon: XCircle,      heading: 'Not Found' },
  not_permitted:    { tone: 'amber', icon: ShieldAlert,  heading: 'Not Permitted' },
  session_not_open: { tone: 'gray',  icon: Ban,          heading: 'Session Not Open' },
}

const toneClasses: Record<string, string> = {
  green: 'bg-green-50 border-green-300 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300',
  blue:  'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300',
  red:   'bg-red-50 border-red-300 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300',
  amber: 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300',
  gray:  'bg-muted border-border text-muted-foreground',
}

const resultBadge: Record<'matched' | 'provisional', { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  matched:     { label: 'Charged',      variant: 'secondary' },
  provisional: { label: 'Pending Sync', variant: 'outline' },
}

function logResultLabel(id: string) {
  return isPendingSync(id) ? resultBadge.provisional : resultBadge.matched
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// Client-queued collections get a synthetic `offline-{key}` id (see
// mealSessions store's recordOfflineCollection) — the clearest signal in this
// UI that a log entry hasn't round-tripped the server yet.
function isPendingSync(id: string) {
  return id.startsWith('offline-')
}

const syncNowLoading = ref(false)
async function syncNow() {
  syncNowLoading.value = true
  try {
    await store.syncPendingScans()
  } finally {
    syncNowLoading.value = false
  }
}
</script>

<template>
  <DashboardHeader :title="store.activeSession ? `Collect — ${mealPeriodLabel(store.activeSession.meal_period)}` : 'Collect'" />

  <div class="flex flex-col gap-6 p-6 max-w-3xl mx-auto w-full">
    <button type="button"
      class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      @click="goBack">
      <ArrowLeft class="size-4" />
      Back to Meal Sessions
    </button>

    <!-- Offline / pending sync banner -->
    <div v-if="!store.isOnline || store.pendingSyncCount > 0"
      class="rounded-xl border px-5 py-3 flex items-center gap-3"
      :class="!store.isOnline
        ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
        : 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300'">
      <WifiOff v-if="!store.isOnline" class="size-4 shrink-0" />
      <RefreshCw v-else class="size-4 shrink-0" :class="store.syncingOffline && 'animate-spin'" />
      <p class="text-sm flex-1">
        <span v-if="!store.isOnline">Offline — collections are recorded provisionally and queued locally.</span>
        <span v-else>Reconnected — syncing queued collections.</span>
        <span v-if="store.pendingSyncCount > 0"> {{ store.pendingSyncCount }} pending.</span>
      </p>
      <Button
        v-if="store.isOnline && store.pendingSyncCount > 0"
        size="sm" variant="outline" class="shrink-0 bg-background"
        :disabled="syncNowLoading || store.syncingOffline"
        @click="syncNow"
      >
        Sync Now
      </Button>
    </div>

    <div v-if="loading" class="h-40 rounded-xl bg-muted animate-pulse" />

    <template v-else-if="store.activeSession">
      <!-- Session summary -->
      <div class="rounded-xl border bg-card px-5 py-4 flex items-center justify-between">
        <div>
          <p class="font-semibold">{{ mealPeriodLabel(store.activeSession.meal_period) }}</p>
          <p class="text-sm text-muted-foreground">
            {{ store.activeSession.buffet_name ?? 'Buffet' }} · {{ store.activeSession.start_time }}–{{ store.activeSession.end_time }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <Button v-if="store.activeSession.status === 'open'" size="sm" variant="outline" @click="launchKiosk">
            <Maximize2 class="size-3.5 mr-1" /> Launch Kiosk Mode
          </Button>
          <Badge variant="default">Open</Badge>
        </div>
      </div>

      <!-- Blocking notice if not open -->
      <div v-if="store.activeSession.status !== 'open'" class="rounded-xl border border-dashed px-5 py-10 text-center text-muted-foreground">
        This session is <strong class="text-foreground">{{ store.activeSession.status }}</strong> — collection isn't available until it's opened.
      </div>

      <template v-else>
        <!-- Collect input -->
        <div class="rounded-xl border bg-card p-5 flex flex-col gap-3">
          <label class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Scan Card / Enter National ID</label>
          <div class="flex items-center gap-2">
            <ScanLine class="size-5 text-muted-foreground shrink-0" />
            <Input
              ref="inputRef"
              v-model="inputValue"
              placeholder="Scan RFID card, or type National ID / passport number and press Enter"
              class="text-base h-11"
              autofocus
              :disabled="store.collectLoading"
              @keyup.enter="submitCollect"
            />
          </div>
        </div>

        <!-- Result -->
        <div v-if="lastResult" class="rounded-xl border px-5 py-4 flex items-start gap-3" :class="toneClasses[resultConfig[lastResult.result].tone]">
          <component :is="resultConfig[lastResult.result].icon" class="size-5 shrink-0 mt-0.5" />
          <div class="flex-1 min-w-0">
            <p class="font-semibold">
              {{ resultConfig[lastResult.result].heading }}<span v-if="lastResult.resident"> — {{ lastResult.resident.full_name }}</span>
            </p>
            <p class="text-sm mt-0.5">{{ lastResult.message }}</p>
            <ul v-if="lastResult.candidates?.length" class="mt-2 flex flex-col gap-1">
              <li v-for="c in lastResult.candidates" :key="c.attendee_id" class="text-sm">
                {{ c.full_name }} — {{ c.room_name ?? 'Room —' }} ({{ c.booking_number ?? c.booking_id }})
              </li>
            </ul>
          </div>
        </div>

        <!-- Running log -->
        <div class="rounded-xl border bg-card overflow-hidden">
          <div class="px-5 py-3 border-b">
            <p class="text-sm font-semibold">Session Log</p>
          </div>
          <div v-if="store.activeCollections.length === 0" class="px-5 py-8 text-center text-sm text-muted-foreground">
            No collections yet.
          </div>
          <div v-else class="divide-y max-h-96 overflow-y-auto">
            <div v-for="c in store.activeCollections" :key="c.id" class="px-5 py-2.5 flex items-center gap-3 text-sm">
              <Clock class="size-3.5 text-muted-foreground shrink-0" />
              <span class="font-mono text-xs text-muted-foreground shrink-0 w-20">{{ fmtTime(c.collected_at) }}</span>
              <CreditCard class="size-3.5 text-muted-foreground shrink-0" />
              <span class="truncate shrink-0 max-w-40">{{ c.resident_name ?? c.card_uid ?? '—' }}</span>
              <span v-if="c.room_name" class="text-xs text-muted-foreground shrink-0">{{ c.room_name }}</span>
              <Badge :variant="logResultLabel(c.id).variant" class="shrink-0">{{ logResultLabel(c.id).label }}</Badge>
              <span v-if="c.amount" class="text-xs text-muted-foreground shrink-0">ZMW {{ c.amount.toLocaleString() }}</span>
              <span class="ml-auto text-xs text-muted-foreground shrink-0">{{ c.collected_by_name || c.collected_by }}</span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <div v-else class="rounded-xl border border-dashed px-5 py-10 text-center text-muted-foreground">
      Meal session not found.
    </div>
  </div>
</template>
