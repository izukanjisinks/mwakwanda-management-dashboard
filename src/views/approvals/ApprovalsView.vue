<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { workflowApi } from '@/services/api/workflow'
import type { WorkflowTask } from '@/types/workflow'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClipboardCheck, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-vue-next'
import TaskActionDialog from '@/components/approvals/TaskActionDialog.vue'

const tasks = ref<WorkflowTask[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const statusFilter = ref<'all' | 'pending' | 'in_progress' | 'completed' | 'skipped'>('all')

// Dialog state
const showActionDialog = ref(false)
const selectedTask = ref<WorkflowTask | null>(null)
const selectedAction = ref<'approve' | 'reject' | null>(null)

const filteredTasks = computed(() => {
  if (statusFilter.value === 'all') {
    return tasks.value
  }
  return tasks.value.filter(task => task.status === statusFilter.value)
})

async function loadTasks() {
  loading.value = true
  error.value = null
  try {
    const response = await workflowApi.getMyTasks()
    tasks.value = response.tasks ?? []
  } catch (err) {
    console.error('Failed to load tasks:', err)
    error.value = 'Failed to load tasks'
  } finally {
    loading.value = false
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'pending':
      return 'secondary'
    case 'in_progress':
      return 'default'
    case 'completed':
      return 'default'
    case 'skipped':
      return 'outline'
    default:
      return 'secondary'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending':
      return Clock
    case 'in_progress':
      return Loader2
    case 'completed':
      return CheckCircle
    case 'skipped':
      return XCircle
    default:
      return Clock
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDueDate(dateString: string) {
  const dueDate = new Date(dateString)
  const now = new Date()
  const isOverdue = dueDate < now

  return {
    formatted: dueDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    isOverdue,
  }
}

function handleApproveClick(task: WorkflowTask) {
  selectedTask.value = task
  selectedAction.value = 'approve'
  showActionDialog.value = true
}

function handleRejectClick(task: WorkflowTask) {
  selectedTask.value = task
  selectedAction.value = 'reject'
  showActionDialog.value = true
}

async function handleConfirmAction() {
  if (!selectedTask.value || !selectedAction.value) return

  loading.value = true
  error.value = null

  try {
    // Map UI action to backend action
    // For approve, use "review" as required by the transition dialog
    // For reject, use "submit" (or you can adjust based on your workflow configuration)
    const actionName = selectedAction.value === 'approve' ? 'review' : 'submit'

    await workflowApi.processTaskAction(selectedTask.value.instance_id, {
      action: actionName,
      comments: selectedAction.value === 'approve'
        ? 'Task approved'
        : 'Task rejected',
    })

    // Reload tasks after successful action
    await loadTasks()
  } catch (err) {
    console.error('Failed to perform action:', err)
    error.value = `Failed to ${selectedAction.value} task. Please try again.`
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTasks()
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ClipboardCheck class="w-8 h-8 text-primary" />
          My Approvals
        </h1>
        <p class="text-muted-foreground mt-1">
          Tasks assigned to you that are running through workflows
        </p>
      </div>
      <Button @click="loadTasks" variant="outline" :disabled="loading">
        <Loader2 v-if="loading" class="w-4 h-4 mr-2 animate-spin" />
        Refresh
      </Button>
    </div>

    <!-- Filter Tabs -->
    <div class="flex gap-2 border-b">
      <button
        @click="statusFilter = 'all'"
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          statusFilter === 'all'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        ]"
      >
        All
      </button>
      <button
        @click="statusFilter = 'pending'"
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          statusFilter === 'pending'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        ]"
      >
        Pending
      </button>
      <button
        @click="statusFilter = 'in_progress'"
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          statusFilter === 'in_progress'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        ]"
      >
        In Progress
      </button>
      <button
        @click="statusFilter = 'completed'"
        :class="[
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          statusFilter === 'completed'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        ]"
      >
        Completed
      </button>
    </div>

    <!-- Error State -->
    <div v-if="error" class="rounded-lg border border-destructive bg-destructive/10 p-4">
      <p class="text-sm text-destructive">{{ error }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading && tasks.length === 0" class="flex items-center justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading && filteredTasks.length === 0" class="rounded-lg border border-dashed p-12">
      <div class="flex flex-col items-center justify-center text-center">
        <CheckCircle class="w-12 h-12 text-muted-foreground mb-4" />
        <h3 class="text-lg font-semibold">No tasks found</h3>
        <p class="text-sm text-muted-foreground mt-1">
          {{ statusFilter === 'all' ? 'You have no assigned tasks' : `You have no ${statusFilter} tasks` }}
        </p>
      </div>
    </div>

    <!-- Tasks Table -->
    <div v-else class="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Step Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Assigned Date</TableHead>
            <TableHead>Instance ID</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="task in filteredTasks" :key="task.id">
            <TableCell class="font-medium">{{ task.step_name }}</TableCell>
            <TableCell>
              <Badge :variant="getStatusBadgeVariant(task.status)">
                <component :is="getStatusIcon(task.status)" class="w-3 h-3 mr-1" />
                {{ task.status }}
              </Badge>
            </TableCell>
            <TableCell>
              <span :class="{ 'text-destructive font-medium': formatDueDate(task.due_date).isOverdue }">
                {{ formatDueDate(task.due_date).formatted }}
                <span v-if="formatDueDate(task.due_date).isOverdue" class="text-xs ml-1">(Overdue)</span>
              </span>
            </TableCell>
            <TableCell class="text-muted-foreground">
              {{ formatDate(task.created_at) }}
            </TableCell>
            <TableCell>
              <code class="text-xs bg-muted px-1.5 py-0.5 rounded">
                {{ task.instance_id.slice(0, 8) }}...
              </code>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex gap-2 justify-end">
                <Button
                  v-if="task.status === 'pending'"
                  size="sm"
                  variant="default"
                  @click="handleApproveClick(task)"
                >
                  <CheckCircle class="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  v-if="task.status === 'pending'"
                  size="sm"
                  variant="outline"
                  @click="handleRejectClick(task)"
                >
                  <XCircle class="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  v-if="task.status === 'completed'"
                  size="sm"
                  variant="outline"
                  disabled
                >
                  Completed
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Summary -->
    <div v-if="tasks.length > 0" class="flex items-center gap-6 text-sm text-muted-foreground">
      <span>Total tasks: {{ tasks.length }}</span>
      <span>Pending: {{ tasks.filter(t => t.status === 'pending').length }}</span>
      <span>In Progress: {{ tasks.filter(t => t.status === 'in_progress').length }}</span>
      <span>Completed: {{ tasks.filter(t => t.status === 'completed').length }}</span>
    </div>

    <!-- Action Confirmation Dialog -->
    <TaskActionDialog
      :open="showActionDialog"
      :task="selectedTask"
      :action="selectedAction"
      @update:open="(val) => showActionDialog = val"
      @confirm="handleConfirmAction"
    />
  </div>
</template>
