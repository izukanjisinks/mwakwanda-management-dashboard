<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import {
  ScanLine, CheckCircle2, XCircle, AlertTriangle, ShieldAlert, Ban, WifiOff, Lock,
} from 'lucide-vue-next'
import { useMealSessionsStore } from '@/stores/mealSessions'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/services/api/auth'
import { getApiError } from '@/utils/errors'
import { MEAL_PERIODS } from '@/constants/meals'
import type { MealCollectionResult, MealCollectionResultType } from '@/types/meal-collection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

const route = useRoute()
const router = useRouter()
const store = useMealSessionsStore()
const authStore = useAuthStore()

const sessionId = computed(() => String(route.params.sessionId))
const loading = ref(true)

function mealPeriodLabel(value: string) {
  return MEAL_PERIODS.find(p => p.value === value)?.label ?? value
}

// ── Fullscreen lock ────────────────────────────────────────────────────────────
// Browsers only allow requestFullscreen() from within a user-gesture call
// stack, so the "Launch Kiosk Mode" button on the staff console requests it
// before navigating here. This is a best-effort backup for cases where that
// didn't stick (e.g. a bookmarked/refreshed URL) — the on-screen fallback
// button below covers the rest, since a real click always counts as a gesture.
const isFullscreen = ref(false)

async function enterFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
  } catch {
    // Ignored — most likely blocked for lacking a user gesture right now.
  }
  isFullscreen.value = !!document.fullscreenElement
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
  // A resident hitting Escape exits fullscreen — pages can't prevent that
  // (browser security restriction), so the best available response is to
  // snap straight back in, short of a staff-authorized exit.
  if (!isFullscreen.value && !exitAuthorized.value) enterFullscreen()
}

function onBeforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault()
  e.returnValue = ''
}

// ── Keep the collect input focused at all times ───────────────────────────────
// A resident tapping blank space, the window regaining focus, or the exit
// dialog closing can all steal focus away from the field an RFID reader types
// into. Blur/window-focus handlers catch the common cases immediately; the
// watchdog interval is a defensive backstop for anything they miss.
function refocusIfIdle() {
  if (exitDialogOpen.value) return
  if (loading.value || !store.activeSession || store.activeSession.status !== 'open') return
  const el = inputRef.value?.$el as HTMLInputElement | undefined
  if (el && document.activeElement !== el) el.focus()
}

function handleInputBlur() {
  nextTick(refocusIfIdle)
}

let refocusWatchdog: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  loading.value = true
  try {
    await store.loadSessionForCollection(sessionId.value)
    await nextTick()
    focusInput()
  } finally {
    loading.value = false
  }
  enterFullscreen()
  document.addEventListener('fullscreenchange', onFullscreenChange)
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('focus', refocusIfIdle)
  refocusWatchdog = setInterval(refocusIfIdle, 1000)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  window.removeEventListener('beforeunload', onBeforeUnload)
  window.removeEventListener('focus', refocusIfIdle)
  if (refocusWatchdog) clearInterval(refocusWatchdog)
})

// ── Password-gated exit ────────────────────────────────────────────────────────
// Verifies the current staff member's password by attempting a real login
// with it (discarding the result) rather than mutating the active session —
// there's no lighter "verify only" endpoint today. Assumes re-authenticating
// doesn't invalidate the token already in use.
const exitAuthorized = ref(false)
const exitDialogOpen = ref(false)
const exitPassword = ref('')
const exitPasswordRef = ref<InstanceType<typeof Input> | null>(null)
const exitError = ref('')
const exitVerifying = ref(false)
let resolveExit: ((ok: boolean) => void) | null = null

function promptExit(): Promise<boolean> {
  exitPassword.value = ''
  exitError.value = ''
  exitDialogOpen.value = true
  return new Promise((resolve) => { resolveExit = resolve })
}

function cancelExit() {
  exitDialogOpen.value = false
  resolveExit?.(false)
  resolveExit = null
  nextTick(focusInput)
}

async function confirmExit() {
  if (!authStore.user?.email || !exitPassword.value) return
  exitVerifying.value = true
  exitError.value = ''
  try {
    const result = await authApi.login({
      email: authStore.user.email,
      password: exitPassword.value,
      org_id: authStore.user.org_id,
    })
    if ('requires_org_selection' in result && result.requires_org_selection) {
      exitError.value = 'Could not verify — please try again.'
      return
    }
    exitDialogOpen.value = false
    resolveExit?.(true)
    resolveExit = null
  } catch {
    exitError.value = 'Incorrect password.'
    exitPassword.value = ''
    await nextTick()
    ;(exitPasswordRef.value?.$el as HTMLInputElement | undefined)?.focus()
  } finally {
    exitVerifying.value = false
  }
}

// Every way out of this screen — the exit button, browser back, or any other
// navigation — funnels through here, so there's exactly one gate to bypass.
onBeforeRouteLeave(async () => {
  if (exitAuthorized.value) return true
  const ok = await promptExit()
  if (!ok) return false
  exitAuthorized.value = true
  if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
  return true
})

function requestExit() {
  router.push({ name: 'meal-session-collect', params: { sessionId: sessionId.value } })
}

// ── Collect input ──────────────────────────────────────────────────────────────
const inputValue = ref('')
const inputRef = ref<InstanceType<typeof Input> | null>(null)
const lastResult = ref<MealCollectionResult | null>(null)
let resultTimer: ReturnType<typeof setTimeout> | null = null

function focusInput() {
  // Input.vue's root element is the <input> itself, so $el is already the field.
  const el = inputRef.value?.$el as HTMLInputElement | undefined
  el?.focus()
}

function showResult(result: MealCollectionResult) {
  lastResult.value = result
  if (resultTimer) clearTimeout(resultTimer)
  resultTimer = setTimeout(() => { lastResult.value = null }, 4000)
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
    showResult(result)
  } catch (err) {
    // A rapid double-scan just gets silently swallowed by the store's
    // debounce — no need to alarm the resident over it.
    if (!getApiError(err, '').includes('Duplicate entry ignored')) {
      showResult({ result: 'not_found', message: 'Please try again or ask a staff member for help.' })
    }
  } finally {
    await nextTick()
    focusInput()
  }
}

// ── Result presentation (resident-facing wording) ──────────────────────────────
const resultConfig: Record<MealCollectionResultType, { tone: 'green' | 'blue' | 'red' | 'amber' | 'gray'; icon: typeof CheckCircle2; heading: string; detail: string }> = {
  matched:          { tone: 'green', icon: CheckCircle2, heading: 'Enjoy your meal!', detail: '' },
  provisional:      { tone: 'blue',  icon: WifiOff,      heading: 'Recorded',         detail: "We're offline right now — this will sync automatically." },
  ambiguous:        { tone: 'amber', icon: AlertTriangle, heading: 'Please See Staff', detail: "We couldn't confirm your room." },
  not_found:        { tone: 'red',   icon: XCircle,      heading: 'Not Recognized',   detail: 'Please try again or ask a staff member for help.' },
  not_permitted:    { tone: 'amber', icon: ShieldAlert,  heading: 'Not Permitted',    detail: "This card can't be used here." },
  session_not_open: { tone: 'gray',  icon: Ban,          heading: 'Closed Right Now', detail: 'Please check back soon.' },
}

const toneClasses: Record<string, string> = {
  green: 'bg-green-600',
  blue:  'bg-blue-600',
  red:   'bg-red-600',
  amber: 'bg-amber-600',
  gray:  'bg-neutral-700',
}
</script>

<template>
  <div class="min-h-screen w-full flex flex-col bg-background relative overflow-hidden select-none" @contextmenu.prevent>
    <!-- Header -->
    <div class="flex items-center justify-between px-8 py-6">
      <div>
        <p class="text-xs font-semibold text-muted-foreground tracking-widest uppercase">{{ authStore.user?.org_name || 'Meal Collection' }}</p>
        <p v-if="store.activeSession" class="text-lg font-bold">
          {{ mealPeriodLabel(store.activeSession.meal_period) }}<span v-if="store.activeSession.buffet_name"> · {{ store.activeSession.buffet_name }}</span>
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div v-if="!store.isOnline" class="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 rounded-full px-3 py-1">
          <WifiOff class="size-3.5" /> Offline
        </div>
        <button
          type="button"
          class="text-xs text-muted-foreground/40 hover:text-muted-foreground flex items-center gap-1 px-2 py-1 rounded transition-colors"
          @click="requestExit"
        >
          <Lock class="size-3" /> Staff Exit
        </button>
      </div>
    </div>

    <!-- Main -->
    <div class="flex-1 flex flex-col items-center justify-center gap-8 px-6 text-center">
      <p v-if="loading" class="text-muted-foreground">Loading…</p>

      <template v-else-if="!store.activeSession">
        <XCircle class="size-16 text-muted-foreground/40" />
        <p class="text-2xl font-semibold text-muted-foreground">Session not found</p>
      </template>

      <template v-else-if="store.activeSession.status !== 'open'">
        <Ban class="size-16 text-muted-foreground/40" />
        <p class="text-3xl font-bold text-muted-foreground">Not Open Right Now</p>
        <p class="text-lg text-muted-foreground">Please check back at the scheduled time.</p>
      </template>

      <template v-else>
        <ScanLine class="size-20 text-primary" />
        <h1 class="text-5xl sm:text-6xl font-extrabold tracking-tight">Scan to Collect Meal</h1>
        <p class="text-xl text-muted-foreground">Tap your card, or type your ID below and press Enter</p>

        <Input
          ref="inputRef"
          v-model="inputValue"
          type="password"
          autocomplete="off"
          placeholder="• • • • •"
          class="h-20 w-full max-w-md text-center text-3xl tracking-[0.5em] rounded-2xl border-2 border-primary ring-4 ring-primary/30"
          autofocus
          :disabled="store.collectLoading"
          @keyup.enter="submitCollect"
          @blur="handleInputBlur"
        />

        <button v-if="!isFullscreen" type="button" class="text-sm text-muted-foreground underline underline-offset-4" @click="enterFullscreen">
          Tap to enter fullscreen
        </button>
      </template>
    </div>

    <!-- Result overlay -->
    <div
      v-if="lastResult"
      class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white text-center px-6"
      :class="toneClasses[resultConfig[lastResult.result].tone]"
    >
      <component :is="resultConfig[lastResult.result].icon" class="size-24" />
      <h2 class="text-5xl font-extrabold">{{ resultConfig[lastResult.result].heading }}</h2>
      <p v-if="resultConfig[lastResult.result].detail" class="text-xl opacity-90 max-w-md">{{ resultConfig[lastResult.result].detail }}</p>
    </div>
  </div>

  <!-- Exit password dialog -->
  <Dialog :open="exitDialogOpen" @update:open="(v) => !v && cancelExit()">
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Staff Verification</DialogTitle>
        <DialogDescription>Enter your password to leave kiosk mode.</DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-1.5">
        <Label class="text-xs">Password</Label>
        <Input
          ref="exitPasswordRef"
          v-model="exitPassword"
          type="password"
          placeholder="Password"
          autofocus
          :disabled="exitVerifying"
          @keyup.enter="confirmExit"
        />
        <p v-if="exitError" class="text-sm text-destructive mt-1">{{ exitError }}</p>
      </div>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="exitVerifying" @click="cancelExit">Cancel</Button>
        <Button :disabled="!exitPassword || exitVerifying" @click="confirmExit">Confirm</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
