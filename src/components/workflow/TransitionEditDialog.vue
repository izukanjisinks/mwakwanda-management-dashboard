<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-vue-next'
import type { WorkflowTransition, WorkflowStep } from '@/types/workflow'

const props = defineProps<{
  open: boolean
  transition?: WorkflowTransition | null
  steps: WorkflowStep[]
  // Pre-filled when connecting two nodes in the editor
  fromStepId?: string
  toStepId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [payload: { from_step_id: string; to_step_id: string; action_name: string; condition_type: 'always' | 'equals' | 'not_equals'; condition_value: string }]
}>()

const saving = ref(false)
const error = ref('')

const isEdit = computed(() => !!props.transition)

const form = ref({
  from_step_id: '',
  to_step_id: '',
  action_name: '',
  condition_type: 'always' as 'always' | 'equals' | 'not_equals',
  condition_value: '',
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  if (props.transition) {
    form.value = {
      from_step_id: props.transition.from_step_id,
      to_step_id: props.transition.to_step_id,
      action_name: props.transition.action_name,
      condition_type: props.transition.condition_type,
      condition_value: props.transition.condition_value,
    }
  } else {
    form.value = {
      from_step_id: props.fromStepId ?? '',
      to_step_id: props.toStepId ?? '',
      action_name: '',
      condition_type: 'always',
      condition_value: '',
    }
  }
})

function handleSave() {
  error.value = ''
  if (!form.value.from_step_id) { error.value = 'From step is required.'; return }
  if (!form.value.to_step_id) { error.value = 'To step is required.'; return }
  if (form.value.from_step_id === form.value.to_step_id) { error.value = 'From and To steps must be different.'; return }
  if (!form.value.action_name.trim()) { error.value = 'Action name is required.'; return }

  saving.value = true
  try {
    emit('save', { ...form.value })
    emit('update:open', false)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit Transition' : 'Add Transition' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Update this transition\'s action and conditions.' : 'Define how the workflow moves between steps.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <!-- From Step -->
        <div class="grid gap-2">
          <Label>From Step *</Label>
          <Select v-model="form.from_step_id" :disabled="!!fromStepId && !isEdit">
            <SelectTrigger>
              <SelectValue placeholder="Select step" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="step in steps" :key="step.id" :value="step.id">
                {{ step.step_name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- To Step -->
        <div class="grid gap-2">
          <Label>To Step *</Label>
          <Select v-model="form.to_step_id" :disabled="!!toStepId && !isEdit">
            <SelectTrigger>
              <SelectValue placeholder="Select step" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="step in steps" :key="step.id" :value="step.id">
                {{ step.step_name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Action Name -->
        <div class="grid gap-2">
          <Label for="action_name">Action Name *</Label>
          <Input id="action_name" v-model="form.action_name" placeholder="e.g. Approve, Reject, Check In" />
          <p class="text-xs text-muted-foreground">The button label staff will see when actioning a task.</p>
        </div>

        <!-- Condition Type -->
        <div class="grid gap-2">
          <Label>Condition</Label>
          <Select v-model="form.condition_type">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="always">Always — transition always applies</SelectItem>
              <SelectItem value="equals">Equals — only when value matches</SelectItem>
              <SelectItem value="not_equals">Not Equals — only when value does not match</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Condition Value -->
        <div v-if="form.condition_type !== 'always'" class="grid gap-2">
          <Label for="condition_value">Condition Value *</Label>
          <Input id="condition_value" v-model="form.condition_value" placeholder="Value to compare against" />
        </div>
      </form>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="saving" @click="handleSave">
          <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
          {{ isEdit ? 'Save Changes' : 'Add Transition' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
