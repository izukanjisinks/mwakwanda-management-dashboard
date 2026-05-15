<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'
import type { WorkflowStep } from '@/types/workflow'

const props = defineProps<{
  open: boolean
  step?: WorkflowStep | null
  workflowId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [payload: { step_name: string; step_order: number; initial: boolean; final: boolean }]
}>()

const saving = ref(false)
const error = ref('')

const form = ref({
  step_name: '',
  step_order: 1,
  initial: false,
  final: false,
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  if (props.step) {
    form.value = {
      step_name: props.step.step_name,
      step_order: props.step.step_order,
      initial: props.step.initial,
      final: props.step.final,
    }
  } else {
    form.value = { step_name: '', step_order: 1, initial: false, final: false }
  }
})

const isEdit = computed(() => !!props.step)

async function handleSave() {
  error.value = ''
  if (!form.value.step_name.trim()) { error.value = 'Step name is required.'; return }
  if (form.value.initial && form.value.final) { error.value = 'A step cannot be both initial and final.'; return }

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
        <DialogTitle>{{ isEdit ? 'Edit Step' : 'Add Step' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Modify this workflow step\'s configuration.' : 'Add a new step to the workflow.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <!-- Step Name -->
        <div class="grid gap-2">
          <Label for="step_name">Step Name *</Label>
          <Input id="step_name" v-model="form.step_name" placeholder="e.g. Manager Review" />
        </div>

        <!-- Step Order -->
        <div class="grid gap-2">
          <Label for="step_order">Step Order *</Label>
          <Input id="step_order" v-model.number="form.step_order" type="number" min="1" placeholder="1" />
          <p class="text-xs text-muted-foreground">Lower numbers appear earlier in the flow.</p>
        </div>

        <!-- Initial toggle -->
        <div class="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p class="text-sm font-medium">Initial Step</p>
            <p class="text-xs text-muted-foreground">This is the starting point of the workflow.</p>
          </div>
          <button
            type="button"
            :class="[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              form.initial ? 'bg-primary' : 'bg-input',
            ]"
            @click="form.initial = !form.initial"
          >
            <span
              :class="[
                'pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg transition-transform',
                form.initial ? 'translate-x-5' : 'translate-x-0',
              ]"
            />
          </button>
        </div>

        <!-- Final toggle -->
        <div class="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p class="text-sm font-medium">Final Step</p>
            <p class="text-xs text-muted-foreground">This step completes the workflow.</p>
          </div>
          <button
            type="button"
            :class="[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              form.final ? 'bg-primary' : 'bg-input',
            ]"
            @click="form.final = !form.final"
          >
            <span
              :class="[
                'pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg transition-transform',
                form.final ? 'translate-x-5' : 'translate-x-0',
              ]"
            />
          </button>
        </div>
      </form>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="saving" @click="handleSave">
          <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
          {{ isEdit ? 'Save Changes' : 'Add Step' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
