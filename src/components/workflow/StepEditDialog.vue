<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, X } from 'lucide-vue-next'
import type { WorkflowStep } from '@/types/workflow'
import type { StepType } from '@/types/workflow'

const props = defineProps<{
  open: boolean
  step?: WorkflowStep | null
  workflowId: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [payload: { step_name: string; step_type: StepType; allowed_roles: string[]; requires_all_approvers: boolean; min_approvals: number; step_order: number }]
}>()

const saving = ref(false)
const error = ref('')

const AVAILABLE_ROLES = ['admin', 'manager', 'receptionist']

const form = ref({
  step_name: '',
  step_type: 'middle' as StepType,
  step_order: 1,
  allowed_roles: [] as string[],
  requires_all_approvers: false,
  min_approvals: 1,
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  if (props.step) {
    form.value = {
      step_name: props.step.step_name,
      step_type: props.step.step_type,
      step_order: props.step.step_order,
      allowed_roles: [...props.step.allowed_roles],
      requires_all_approvers: props.step.requires_all_approvers,
      min_approvals: props.step.min_approvals,
    }
  } else {
    form.value = { step_name: '', step_type: 'middle', step_order: 1, allowed_roles: [], requires_all_approvers: false, min_approvals: 1 }
  }
})

function toggleRole(role: string) {
  if (form.value.allowed_roles.includes(role)) {
    form.value.allowed_roles = form.value.allowed_roles.filter(r => r !== role)
  } else {
    form.value.allowed_roles.push(role)
  }
}

const isEdit = computed(() => !!props.step)

async function handleSave() {
  error.value = ''
  if (!form.value.step_name.trim()) { error.value = 'Step name is required.'; return }
  if (form.value.allowed_roles.length === 0) { error.value = 'At least one role must be allowed.'; return }
  if (form.value.min_approvals < 1) { error.value = 'Minimum approvals must be at least 1.'; return }

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

        <!-- Step Type -->
        <div class="grid gap-2">
          <Label>Step Type *</Label>
          <Select v-model="form.step_type">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="initial">Initial — starting point of the workflow</SelectItem>
              <SelectItem value="middle">Middle — intermediate review/action step</SelectItem>
              <SelectItem value="final">Final — workflow completion step</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Step Order -->
        <div class="grid gap-2">
          <Label for="step_order">Step Order *</Label>
          <Input id="step_order" v-model.number="form.step_order" type="number" min="1" placeholder="1" />
          <p class="text-xs text-muted-foreground">Lower numbers appear earlier in the flow.</p>
        </div>

        <!-- Allowed Roles -->
        <div class="grid gap-2">
          <Label>Allowed Roles *</Label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="role in AVAILABLE_ROLES"
              :key="role"
              type="button"
              :class="[
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors capitalize',
                form.allowed_roles.includes(role)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-muted',
              ]"
              @click="toggleRole(role)"
            >
              {{ role }}
            </button>
          </div>
          <p class="text-xs text-muted-foreground">Staff with these roles can action tasks at this step.</p>
        </div>

        <!-- Approvals -->
        <div class="grid gap-2">
          <Label for="min_approvals">Minimum Approvals *</Label>
          <Input id="min_approvals" v-model.number="form.min_approvals" type="number" min="1" placeholder="1" />
        </div>

        <!-- Requires all -->
        <div class="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p class="text-sm font-medium">Require All Approvers</p>
            <p class="text-xs text-muted-foreground">All assigned staff must approve before moving forward.</p>
          </div>
          <button
            type="button"
            :class="[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              form.requires_all_approvers ? 'bg-primary' : 'bg-input',
            ]"
            @click="form.requires_all_approvers = !form.requires_all_approvers"
          >
            <span
              :class="[
                'pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg transition-transform',
                form.requires_all_approvers ? 'translate-x-5' : 'translate-x-0',
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
