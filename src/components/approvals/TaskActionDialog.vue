<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertTriangle, User, Briefcase, Building } from 'lucide-vue-next'
import type { WorkflowTask } from '@/types/workflow'

const props = defineProps<{
  open: boolean
  task: WorkflowTask | null
  action: 'approve' | 'reject' | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
}>()

const dialogConfig = computed(() => {
  if (props.action === 'approve') {
    return {
      title: 'Approve Task',
      icon: CheckCircle,
      iconClass: 'w-12 h-12 text-green-500',
      description: 'You are about to approve this task. This action will move the workflow to the next step.',
      confirmText: 'Yes, Approve',
      confirmVariant: 'default' as const,
      details: [
        { label: 'Step Name', value: props.task?.step_name },
        { label: 'Instance ID', value: props.task?.instance_id.slice(0, 13) + '...' },
        { label: 'Due Date', value: props.task?.due_date ? new Date(props.task.due_date).toLocaleDateString() : '' },
      ],
    }
  } else if (props.action === 'reject') {
    return {
      title: 'Reject Task',
      icon: XCircle,
      iconClass: 'w-12 h-12 text-red-500',
      description: 'You are about to reject this task. This may prevent the workflow from proceeding or route it differently.',
      confirmText: 'Yes, Reject',
      confirmVariant: 'destructive' as const,
      details: [
        { label: 'Step Name', value: props.task?.step_name },
        { label: 'Instance ID', value: props.task?.instance_id.slice(0, 13) + '...' },
        { label: 'Due Date', value: props.task?.due_date ? new Date(props.task.due_date).toLocaleDateString() : '' },
      ],
    }
  }
  return null
})

function handleConfirm() {
  emit('confirm')
  emit('update:open', false)
}

function handleCancel() {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-3">
          <component
            v-if="dialogConfig"
            :is="dialogConfig.icon"
            :class="dialogConfig.iconClass"
          />
          <span>{{ dialogConfig?.title }}</span>
        </DialogTitle>
        <DialogDescription class="pt-2">
          {{ dialogConfig?.description }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="dialogConfig && task" class="grid gap-4 py-4">
        <!-- Request Information -->
        <div v-if="task.task_details" class="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
          <h4 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <Briefcase class="w-4 h-4" />
            Request Information
          </h4>
          <p class="text-sm text-foreground">
            {{ task.task_details.task_description }}
          </p>
          <div class="grid grid-cols-2 gap-3 pt-2 border-t border-primary/10">
            <div class="text-xs">
              <span class="text-muted-foreground">Request Type:</span>
              <p class="font-medium capitalize mt-0.5">
                {{ task.task_details.task_type.replace(/_/g, ' ') }}
              </p>
            </div>
            <div class="text-xs">
              <span class="text-muted-foreground">Request ID:</span>
              <p class="font-medium mt-0.5">
                {{ task.task_details.task_id.slice(0, 8) }}...
              </p>
            </div>
          </div>
        </div>

        <!-- Requester Information -->
        <div v-if="task.task_details?.sender_details" class="rounded-lg border bg-muted/50 p-4 space-y-3">
          <h4 class="text-sm font-semibold text-foreground flex items-center gap-2">
            <User class="w-4 h-4" />
            Requester Information
          </h4>
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <User class="w-4 h-4 text-muted-foreground" />
              <span class="font-medium">{{ task.task_details.sender_details.sender_name }}</span>
            </div>
            <div v-if="task.task_details.sender_details.position" class="flex items-center gap-2 text-sm">
              <Briefcase class="w-4 h-4 text-muted-foreground" />
              <span class="text-muted-foreground">{{ task.task_details.sender_details.position }}</span>
            </div>
            <div v-if="task.task_details.sender_details.department" class="flex items-center gap-2 text-sm">
              <Building class="w-4 h-4 text-muted-foreground" />
              <span class="text-muted-foreground">{{ task.task_details.sender_details.department }}</span>
            </div>
          </div>
        </div>

        <!-- Workflow Details -->
        <div class="rounded-lg border bg-muted/50 p-4 space-y-3">
          <h4 class="text-sm font-semibold text-foreground mb-3">Workflow Details</h4>
          <div
            v-for="detail in dialogConfig.details"
            :key="detail.label"
            class="flex justify-between items-center text-sm"
          >
            <span class="text-muted-foreground">{{ detail.label }}:</span>
            <span class="font-medium">{{ detail.value }}</span>
          </div>
        </div>

        <!-- Warning Box -->
        <div
          v-if="action === 'reject'"
          class="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-4"
        >
          <AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
          <div class="text-sm">
            <p class="font-medium text-amber-900 dark:text-amber-100">
              Important Notice
            </p>
            <p class="text-amber-800 dark:text-amber-200 mt-1">
              Rejecting this task may affect the workflow progression. Make sure you want to proceed with this action.
            </p>
          </div>
        </div>

        <!-- Info Box for Approval -->
        <div
          v-if="action === 'approve'"
          class="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950 p-4"
        >
          <CheckCircle class="w-5 h-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
          <div class="text-sm">
            <p class="font-medium text-blue-900 dark:text-blue-100">
              Approval Confirmation
            </p>
            <p class="text-blue-800 dark:text-blue-200 mt-1">
              Approving this task will advance the workflow to the next step and notify relevant parties.
            </p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleCancel">
          Cancel
        </Button>
        <Button
          v-if="dialogConfig"
          :variant="dialogConfig.confirmVariant"
          @click="handleConfirm"
        >
          <component :is="dialogConfig.icon" class="w-4 h-4 mr-2" />
          {{ dialogConfig.confirmText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
