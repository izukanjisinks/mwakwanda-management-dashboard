<script setup lang="ts">
import { ref } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle } from 'lucide-vue-next'
import type { WorkflowTask } from '@/types/workflow'

const props = defineProps<{
  open: boolean
  task: WorkflowTask | null
  action: 'approve' | 'reject' | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [action: string, comments: string]
}>()

const comments = ref('')
const processing = ref(false)

function handleConfirm() {
  if (!props.action) return
  processing.value = true
  try {
    emit('confirm', props.action, comments.value)
  } finally {
    processing.value = false
    comments.value = ''
    emit('update:open', false)
  }
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <CheckCircle2 v-if="action === 'approve'" class="size-5 text-emerald-500" />
          <XCircle v-else-if="action === 'reject'" class="size-5 text-destructive" />
          {{ action === 'approve' ? 'Approve Booking' : 'Reject Booking' }}
        </DialogTitle>
        <DialogDescription>
          {{ action === 'approve'
            ? 'Confirm approval to move this booking to the next step.'
            : 'Confirm rejection to send this booking back or cancel the process.'
          }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="task" class="flex flex-col gap-4 py-2">
        <!-- Task summary -->
        <div class="rounded-lg border bg-muted/30 divide-y text-sm">
          <div class="grid grid-cols-2 gap-x-4 px-4 py-3">
            <div>
              <p class="text-xs text-muted-foreground mb-0.5">From</p>
              <p class="font-medium">{{ task.task_details?.sender_details?.sender_name || '—' }}</p>
              <Badge variant="outline" class="text-[10px] capitalize mt-0.5">
                {{ task.task_details?.sender_details?.department || '—' }}
              </Badge>
            </div>
            <div>
              <p class="text-xs text-muted-foreground mb-0.5">Step</p>
              <p class="font-medium">{{ task.step_name }}</p>
            </div>
          </div>
          <div v-if="task.task_details?.task_description" class="px-4 py-3">
            <p class="text-xs text-muted-foreground mb-0.5">Description</p>
            <p class="text-sm">{{ task.task_details.task_description }}</p>
          </div>
          <div v-if="task.due_date" class="px-4 py-3">
            <p class="text-xs text-muted-foreground mb-0.5">Due Date</p>
            <p class="font-medium">{{ fmt(task.due_date) }}</p>
          </div>
        </div>

        <!-- Comments -->
        <div class="grid gap-2">
          <Label for="comments">Comments {{ action === 'reject' ? '*' : '(optional)' }}</Label>
          <textarea
            id="comments"
            v-model="comments"
            rows="3"
            :placeholder="action === 'approve' ? 'Add any notes for the record...' : 'Explain the reason for rejection...'"
            class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="processing" @click="emit('update:open', false)">Cancel</Button>
        <Button
          :variant="action === 'reject' ? 'destructive' : 'default'"
          :disabled="processing"
          @click="handleConfirm"
        >
          <Loader2 v-if="processing" class="size-4 animate-spin mr-2" />
          {{ action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
