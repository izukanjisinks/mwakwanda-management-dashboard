<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Clock, CheckCheck, XCircle, InboxIcon, ChevronRight, ChevronLeft,
  User, Building2, BedDouble, Theater, UtensilsCrossed,
} from 'lucide-vue-next'
import type { WorkflowTask } from '@/types/workflow'
import { useWorkflowStore } from '@/stores/workflow'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilterStore } from '@/stores/branchFilter'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const router = useRouter()
const store = useWorkflowStore()
const auth = useAuthStore()
const branchFilter = useBranchFilterStore()

// Top-level scope: my own inbox vs every task in the (branch-scoped) org.
const scope = ref<'mine' | 'all'>('mine')
// Secondary status filter (maps to backend "active" / "completed" groups).
const activeTab = ref<'active' | 'completed'>('active')
const page = ref(1)
const pageSize = 12

const currentUserId = computed(() => auth.user?.user_id ?? '')
// Admin and branch admin can act on any task regardless of assignment.
const canActOnAny = computed(() =>
  auth.userRole === 'admin' || auth.userRole === 'branch_admin',
)

const loading = computed(() => (scope.value === 'mine' ? store.tasksLoading : store.allTasksLoading))
const displayedTasks = computed(() => (scope.value === 'mine' ? store.tasks : store.allTasks))
const total = computed(() => (scope.value === 'mine' ? store.tasksTotal : store.allTasksTotal))
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

// In the "All Tasks" view a user may only open/action tasks assigned to them
// (unless they're an admin / branch admin). Their own inbox is always actionable.
function canAct(task: { assigned_to: string }) {
  if (scope.value === 'mine') return true
  return canActOnAny.value || task.assigned_to === currentUserId.value
}

const VIEWED_KEY = 'workflow_viewed_tasks'
const viewedIds = ref<Set<string>>(new Set(JSON.parse(localStorage.getItem(VIEWED_KEY) ?? '[]')))

function isNew(taskId: string) {
  return !viewedIds.value.has(taskId)
}

function openTask(taskId: string) {
  viewedIds.value.add(taskId)
  localStorage.setItem(VIEWED_KEY, JSON.stringify([...viewedIds.value]))
  router.push({ name: 'workflow-task-detail', params: { id: taskId } })
}

function load() {
  if (scope.value === 'mine') store.fetchTasks(activeTab.value, page.value, pageSize)
  else store.fetchAllTasks(activeTab.value, page.value, pageSize)
}

onMounted(load)
watch(page, load)
watch(scope, () => { page.value = 1; load() })
watch(activeTab, () => { page.value = 1; load() })
// Re-fetch when the global branch filter changes (only affects the All Tasks view).
watch(() => branchFilter.selectedBranchId, () => {
  if (scope.value === 'all') { page.value = 1; load() }
})

function statusConfig(status: string) {
  switch (status) {
    case 'pending':     return { label: 'Pending',     variant: 'secondary' as const,    icon: Clock }
    case 'in_progress': return { label: 'In Progress', variant: 'default' as const,      icon: Clock }
    case 'completed':   return { label: 'Completed',   variant: 'outline' as const,      icon: CheckCheck }
    case 'rejected':    return { label: 'Rejected',    variant: 'destructive' as const,  icon: XCircle }
    default:            return { label: status,        variant: 'secondary' as const,    icon: Clock }
  }
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function clientType(task: WorkflowTask): 'corporate' | 'individual' | null {
  const t = task.task_details?.task_type
  if (t === 'corporate_booking') return 'corporate'
  if (t === 'booking') return 'individual'
  return null
}

function bookingCategory(task: WorkflowTask): 'accommodation' | 'event' | 'meals' | null {
  const text = [
    task.task_details?.task_description ?? '',
    task.step_name ?? '',
  ].join(' ').toLowerCase()
  if (text.includes('accommodation') || text.includes('room')) return 'accommodation'
  if (text.includes('event') || text.includes('conference') || text.includes('venue')) return 'event'
  if (text.includes('meal') || text.includes('meals') || text.includes('catering')) return 'meals'
  return null
}
</script>

<template>
  <div>
  <DashboardHeader title="Task Inbox" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Scope toggle: My Tasks / All Tasks -->
    <div class="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="scope === 'mine' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="scope = 'mine'"
      >
        My Tasks
      </button>
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="scope === 'all' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="scope = 'all'"
      >
        All Tasks
      </button>
    </div>

    <!-- Secondary filter: Active / Completed -->
    <div class="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === 'active' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'active'"
      >
        Active
      </button>
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === 'completed' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'completed'"
      >
        Completed
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-48 rounded-xl bg-muted animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="displayedTasks.length === 0" class="py-24 flex flex-col items-center text-center text-muted-foreground">
      <InboxIcon class="size-12 mb-4 opacity-30" />
      <p class="font-medium">{{ activeTab === 'active' ? 'No pending tasks' : 'No completed tasks' }}</p>
      <p class="text-sm mt-1">
        {{ activeTab === 'active' ? 'All booking requests have been actioned.' : 'Completed tasks will appear here.' }}
      </p>
    </div>

    <!-- Task cards -->
    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="task in displayedTasks"
          :key="task.id"
          class="relative rounded-xl border bg-card p-5 flex flex-col gap-4 transition-colors"
          :class="canAct(task) ? 'cursor-pointer hover:border-primary/40' : 'opacity-90'"
          @click="canAct(task) && openTask(task.id)"
        >
          <!-- New chip -->
          <span
            v-if="activeTab === 'active' && canAct(task) && isNew(task.id)"
            class="absolute -top-2 -right-2 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500 text-white shadow-sm"
          >
            New
          </span>

          <!-- Header -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-xs text-muted-foreground mb-0.5">Step</p>
              <p class="font-semibold">{{ task.step_name }}</p>
              <div class="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                <Clock class="size-3 shrink-0" />
                <span>{{ fmtDateTime(task.created_at) }}</span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <Badge :variant="statusConfig(task.status).variant" class="capitalize">
                {{ statusConfig(task.status).label }}
              </Badge>
              <ChevronRight class="size-4 text-muted-foreground" />
            </div>
          </div>

          <!-- Booking type badges -->
          <div class="flex items-center gap-1.5 flex-wrap -mt-1">
            <!-- Corporate / Individual -->
            <span
              v-if="clientType(task) === 'corporate'"
              class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            >
              <Building2 class="size-3 shrink-0" />
              Corporate
            </span>
            <span
              v-else-if="clientType(task) === 'individual'"
              class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
            >
              <User class="size-3 shrink-0" />
              Individual
            </span>

            <!-- Accommodation / Event / Meals -->
            <span
              v-if="bookingCategory(task) === 'accommodation'"
              class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
            >
              <BedDouble class="size-3 shrink-0" />
              Accommodation
            </span>
            <span
              v-else-if="bookingCategory(task) === 'event'"
              class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800"
            >
              <Theater class="size-3 shrink-0" />
              Event
            </span>
            <span
              v-else-if="bookingCategory(task) === 'meals'"
              class="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
            >
              <UtensilsCrossed class="size-3 shrink-0" />
              Meals
            </span>
          </div>

          <!-- Assignee label (All Tasks scope) -->
          <div v-if="scope === 'all'" class="flex items-center gap-1.5 -mt-1">
            <User class="size-3.5 text-muted-foreground" />
            <span class="text-xs text-muted-foreground">Assigned to</span>
            <Badge variant="outline" class="text-xs">
              {{ task.assignee_name || '—' }}
              <span v-if="task.assigned_to === currentUserId" class="ml-1 text-primary">(You)</span>
            </Badge>
          </div>

          <!-- Task details -->
          <div class="rounded-lg bg-muted/40 divide-y text-sm">
            <div v-if="task.task_details?.task_description" class="px-3 py-2">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Description</p>
              <p class="text-sm">{{ task.task_details.task_description }}</p>
            </div>

            <div class="grid grid-cols-2 px-3 py-2 gap-x-4">
              <div>
                <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">From</p>
                <p class="font-medium truncate">{{ task.task_details?.sender_details?.sender_name || '—' }}</p>
              </div>
              <div>
                <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Type</p>
                <p class="capitalize">{{ task.task_details?.task_type || '—' }}</p>
              </div>
            </div>

            <div v-if="task.due_date" class="px-3 py-2">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Due Date</p>
              <div class="flex items-center gap-1.5 text-xs">
                <Clock class="size-3.5" />
                {{ fmt(task.due_date) }}
              </div>
            </div>

            <div v-if="task.completed_at" class="px-3 py-2">
              <p class="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Completed</p>
              <p class="text-xs">{{ fmt(task.completed_at) }}</p>
            </div>
          </div>

          <!-- View Details / read-only notice -->
          <div class="pt-1 border-t mt-auto">
            <Button
              v-if="canAct(task)"
              size="sm"
              variant="outline"
              class="w-full"
              @click.stop="openTask(task.id)"
            >
              View Details
            </Button>
            <p v-else class="text-xs text-muted-foreground text-center py-1.5">
              Assigned to another staff member
            </p>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex items-center justify-between text-sm text-muted-foreground">
        <span>{{ total }} task{{ total !== 1 ? 's' : '' }}</span>
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
    </template>
  </div>
  </div>

</template>
