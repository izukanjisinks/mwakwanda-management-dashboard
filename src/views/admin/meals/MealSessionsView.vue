<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Clock, UtensilsCrossed, Play, Square, Ban, RotateCcw, Save, ScanLine, Trash2, Plus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useMealSessionsStore } from '@/stores/mealSessions'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { MEAL_PERIODS, WEEKDAYS } from '@/constants/meals'
import { getApiError } from '@/utils/errors'
import type { MealSessionStatus, MealType, MealSession } from '@/types/meal-collection'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import MealSessionDialog from '@/components/meals/MealSessionDialog.vue'

const store = useMealSessionsStore()
const branchFilterStore = useBranchFilterStore()
const router = useRouter()
const confirmDialog = useConfirmDialog()

const statusFilter = ref<MealSessionStatus | 'all'>('all')
const mealPeriodFilter = ref<MealType | 'all'>('all')

const statusTabs: Array<{ value: MealSessionStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const statusConfig: Record<MealSessionStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  scheduled: { label: 'Scheduled', variant: 'outline' },
  open:      { label: 'Open',      variant: 'default' },
  closed:    { label: 'Closed',    variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

function loadSessions() {
  store.fetchSessions({
    status: statusFilter.value === 'all' ? undefined : statusFilter.value,
    meal_period: mealPeriodFilter.value === 'all' ? undefined : mealPeriodFilter.value,
  })
}

onMounted(loadSessions)
watch(() => branchFilterStore.selectedBranchId, loadSessions)
watch([statusFilter, mealPeriodFilter], loadSessions)

function mealPeriodLabel(value: string) {
  return MEAL_PERIODS.find(p => p.value === value)?.label ?? value
}

function daysLabel(days: MealSession['days_of_week']) {
  if (days.length === 7) return 'Every day'
  const order = WEEKDAYS.map(d => d.value)
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  return sorted.map(d => WEEKDAYS.find(w => w.value === d)?.label ?? d).join(', ')
}

const transitioningId = ref<string | null>(null)

async function transition(id: string, status: MealSessionStatus) {
  transitioningId.value = id
  try {
    await store.setStatus(id, status)
    toast.success(`Session marked ${status}.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to update session status.'))
  } finally {
    transitioningId.value = null
  }
}

async function removeSession(session: MealSession) {
  const confirmed = await confirmDialog.confirm({
    title: 'Delete session?',
    description: `This permanently removes the "${mealPeriodLabel(session.meal_period)}" collect session. This cannot be undone.`,
    confirmText: 'Delete',
    variant: 'destructive',
  })
  if (!confirmed) return
  transitioningId.value = session.id
  try {
    await store.deleteSession(session.id)
    toast.success('Session deleted.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to delete session.'))
  } finally {
    transitioningId.value = null
  }
}

// ── Grace period inline editor ────────────────────────────────────────────────
const graceDrafts = ref<Record<string, number>>({})
const savingGraceId = ref<string | null>(null)

function graceValue(id: string, current: number) {
  return graceDrafts.value[id] ?? current
}
function graceDirty(id: string, current: number) {
  return id in graceDrafts.value && graceDrafts.value[id] !== current
}

async function saveGracePeriod(id: string) {
  const minutes = graceDrafts.value[id]
  if (minutes === undefined) return
  savingGraceId.value = id
  try {
    await store.setGracePeriod(id, minutes)
    delete graceDrafts.value[id]
    toast.success('Grace period updated.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to update grace period.'))
  } finally {
    savingGraceId.value = null
  }
}

const totalCount = computed(() => store.sessions.length)

// ── Create / edit dialog ─────────────────────────────────────────────────────
const dialogOpen = ref(false)
const editingSession = ref<MealSession | null>(null)

function openCreateDialog() {
  editingSession.value = null
  dialogOpen.value = true
}
function openEditDialog(session: MealSession) {
  editingSession.value = session
  dialogOpen.value = true
}
</script>

<template>
  <DashboardHeader title="Resident Meal Collection" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          type="button"
          :class="[
            'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            statusFilter === tab.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="statusFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="flex items-center gap-2">
        <Select :model-value="mealPeriodFilter" @update:model-value="(v) => mealPeriodFilter = v as MealType | 'all'">
          <SelectTrigger class="w-36">
            <SelectValue placeholder="All meal types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Meal Types</SelectItem>
            <SelectItem v-for="p in MEAL_PERIODS" :key="p.value" :value="p.value">{{ p.label }}</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" @click="openCreateDialog">
          <Plus class="size-4 mr-1" /> New Session
        </Button>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <div v-if="store.sessionsLoading" class="flex flex-col gap-2 p-4">
        <div v-for="i in 5" :key="i" class="h-12 rounded-lg bg-muted animate-pulse" />
      </div>

      <div v-else-if="store.sessionsError" class="flex flex-col items-center justify-center py-24 text-center gap-3">
        <p class="text-destructive text-sm">{{ store.sessionsError }}</p>
        <Button variant="outline" size="sm" @click="loadSessions">Try Again</Button>
      </div>

      <div v-else-if="store.sessions.length === 0" class="flex flex-col items-center justify-center py-24 text-center gap-3">
        <UtensilsCrossed class="size-10 text-muted-foreground/40" />
        <p class="text-muted-foreground">No meal collect sessions found.</p>
        <Button size="sm" variant="outline" @click="openCreateDialog">
          <Plus class="size-4 mr-1" /> New Session
        </Button>
      </div>

      <Table v-else>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>Meal Period</TableHead>
            <TableHead>Buffet Type</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Grace Period</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="session in store.sessions" :key="session.id">
            <TableCell>
              <button class="font-medium text-sm hover:underline text-left" @click="openEditDialog(session)">
                {{ mealPeriodLabel(session.meal_period) }}
              </button>
            </TableCell>
            <TableCell class="text-sm">{{ session.buffet_name ?? '—' }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock class="size-3.5 shrink-0" />
                <span>{{ daysLabel(session.days_of_week) }} · {{ session.start_time }}–{{ session.end_time }}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge :variant="statusConfig[session.status].variant">{{ statusConfig[session.status].label }}</Badge>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-1.5">
                <Input
                  type="number" min="0"
                  :model-value="graceValue(session.id, session.grace_period_minutes)"
                  @update:model-value="(v) => graceDrafts[session.id] = Number(v)"
                  class="h-8 w-16 text-sm"
                />
                <span class="text-xs text-muted-foreground">min</span>
                <Button
                  v-if="graceDirty(session.id, session.grace_period_minutes)"
                  size="icon" variant="ghost" class="size-7"
                  :disabled="savingGraceId === session.id"
                  @click="saveGracePeriod(session.id)"
                >
                  <Save class="size-3.5" />
                </Button>
              </div>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-1.5">
                <Button
                  v-if="session.status === 'scheduled'"
                  size="sm" variant="outline" class="h-7 text-xs"
                  :disabled="transitioningId === session.id"
                  @click="transition(session.id, 'open')"
                >
                  <Play class="size-3.5 mr-1" /> Open
                </Button>
                <Button
                  v-if="session.status === 'open'"
                  size="sm" variant="outline" class="h-7 text-xs"
                  :disabled="transitioningId === session.id"
                  @click="transition(session.id, 'closed')"
                >
                  <Square class="size-3.5 mr-1" /> Close
                </Button>
                <Button
                  v-if="session.status === 'open'"
                  size="sm" class="h-7 text-xs"
                  @click="router.push({ name: 'meal-session-collect', params: { sessionId: session.id } })"
                >
                  <ScanLine class="size-3.5 mr-1" /> Collect
                </Button>
                <Button
                  v-if="session.status === 'scheduled' || session.status === 'open'"
                  size="sm" variant="ghost" class="h-7 text-xs text-muted-foreground hover:text-destructive"
                  :disabled="transitioningId === session.id"
                  @click="transition(session.id, 'cancelled')"
                >
                  <Ban class="size-3.5 mr-1" /> Cancel
                </Button>
                <Button
                  v-if="session.status === 'closed' || session.status === 'cancelled'"
                  size="sm" variant="outline" class="h-7 text-xs"
                  :disabled="transitioningId === session.id"
                  @click="transition(session.id, 'scheduled')"
                >
                  <RotateCcw class="size-3.5 mr-1" /> Reopen
                </Button>
                <Button
                  v-if="session.status === 'closed' || session.status === 'cancelled'"
                  size="icon" variant="ghost" class="size-7 text-muted-foreground hover:text-destructive"
                  :disabled="transitioningId === session.id"
                  @click="removeSession(session)"
                >
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div v-if="!store.sessionsLoading && store.sessions.length > 0" class="px-6 py-3 border-t text-sm text-muted-foreground">
        {{ totalCount }} session{{ totalCount !== 1 ? 's' : '' }}
      </div>
    </div>
  </div>

  <MealSessionDialog
    :open="dialogOpen"
    :session="editingSession"
    @update:open="dialogOpen = $event"
  />
</template>
