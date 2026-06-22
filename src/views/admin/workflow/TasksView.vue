<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Clock, CheckCheck, InboxIcon, ChevronRight } from 'lucide-vue-next'
import { useWorkflowStore } from '@/stores/workflow'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const router = useRouter()

const store = useWorkflowStore()

const activeTab = ref<'active' | 'completed'>('active')

const displayedTasks = computed(() =>
  activeTab.value === 'active' ? store.pendingTasks : store.completedTasks,
)

onMounted(() => store.fetchTasks())

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
</script>

<template>
  <div>
  <DashboardHeader title="Task Inbox" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Tabs -->
    <div class="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === 'active' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'active'"
      >
        Active
        <span v-if="store.pendingTasks.length" class="ml-0.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
          {{ store.pendingTasks.length }}
        </span>
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
    <div v-if="store.tasksLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="task in displayedTasks"
        :key="task.id"
        class="rounded-xl border bg-card p-5 flex flex-col gap-4 cursor-pointer hover:border-primary/40 transition-colors"
        @click="router.push({ name: 'workflow-task-detail', params: { id: task.id } })"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-xs text-muted-foreground mb-0.5">Step</p>
            <p class="font-semibold">{{ task.step_name }}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <Badge :variant="statusConfig(task.status).variant" class="capitalize">
              {{ statusConfig(task.status).label }}
            </Badge>
            <ChevronRight class="size-4 text-muted-foreground" />
          </div>
        </div>

        <!-- Task details -->
        <div class="rounded-lg bg-muted/40 divide-y text-sm">
          <!-- Description -->
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

        <!-- View Details -->
        <div class="pt-1 border-t mt-auto">
          <Button
            size="sm"
            variant="outline"
            class="w-full"
            @click.stop="router.push({ name: 'workflow-task-detail', params: { id: task.id } })"
          >
            View Details
          </Button>
        </div>
      </div>
    </div>
  </div>
  </div>

</template>
