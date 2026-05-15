<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { CheckCircle2, XCircle, Clock, CheckCheck, InboxIcon } from 'lucide-vue-next'
import { useWorkflowStore } from '@/stores/workflow'
import type { WorkflowTask } from '@/types/workflow'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import TaskActionDialog from '@/components/workflow/TaskActionDialog.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const store = useWorkflowStore()

const activeTab = ref<'active' | 'completed'>('active')
const actionDialog = ref(false)
const selectedTask = ref<WorkflowTask | null>(null)
const dialogAction = ref<'approve' | 'reject' | null>(null)

const displayedTasks = computed(() =>
  activeTab.value === 'active' ? store.pendingTasks : store.completedTasks,
)

onMounted(() => store.fetchTasks())

function openAction(task: WorkflowTask, action: 'approve' | 'reject') {
  selectedTask.value = task
  dialogAction.value = action
  actionDialog.value = true
}

async function handleConfirm(action: string, comments: string) {
  if (!selectedTask.value) return
  const payload = { action, comments: comments || undefined }
  console.log('[processTask] instance_id:', selectedTask.value.instance_id, 'payload:', payload)
  try {
    await store.processTask(selectedTask.value.instance_id, payload)
    console.log('[processTask] success')
    toast.success(action === 'approve' ? 'Booking approved.' : 'Booking rejected.')
    actionDialog.value = false
    selectedTask.value = null
  } catch (err) {
    console.error('[processTask] error', err)
    toast.error('Failed to process task.')
  }
}

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
  <DashboardHeader title="Task Inbox" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Tabs -->
    <div class="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
      <button
        :class="[
          'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
          activeTab === 'active'
            ? 'bg-background shadow text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="activeTab = 'active'"
      >
        Active
        <span v-if="store.pendingTasks.length" class="ml-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
          {{ store.pendingTasks.length }}
        </span>
      </button>
      <button
        :class="[
          'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
          activeTab === 'completed'
            ? 'bg-background shadow text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        ]"
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
        class="rounded-xl border bg-card p-5 flex flex-col gap-4"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-xs text-muted-foreground mb-0.5">Step</p>
            <p class="font-semibold">{{ task.step_name }}</p>
          </div>
          <Badge :variant="statusConfig(task.status).variant" class="shrink-0 capitalize">
            {{ statusConfig(task.status).label }}
          </Badge>
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

        <!-- Action buttons (active only) -->
        <div v-if="activeTab === 'active'" class="flex gap-2 pt-1 border-t mt-auto">
          <Button
            variant="outline"
            size="sm"
            class="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5"
            @click="openAction(task, 'reject')"
          >
            <XCircle class="size-4 mr-1.5" />
            Reject
          </Button>
          <Button size="sm" class="flex-1" @click="openAction(task, 'approve')">
            <CheckCircle2 class="size-4 mr-1.5" />
            Approve
          </Button>
        </div>
      </div>
    </div>
  </div>

  <TaskActionDialog
    v-model:open="actionDialog"
    :task="selectedTask"
    :action="dialogAction"
    @confirm="handleConfirm"
  />
</template>
