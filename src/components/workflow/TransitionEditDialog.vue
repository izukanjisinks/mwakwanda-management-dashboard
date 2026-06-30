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
import { useRolesStore } from '@/stores/roles'

const props = defineProps<{
  open: boolean
  transition?: WorkflowTransition | null
  steps: WorkflowStep[]
  fromStepId?: string
  toStepId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [payload: { from_step_id: string; to_step_id: string; action_name: string; allowed_roles: string[] }]
}>()

const rolesStore = useRolesStore()
const saving = ref(false)
const error = ref('')

const isEdit = computed(() => !!props.transition)

const EXCLUDED_ROLES = ['cleaner', 'guest', 'admin']
const selectableRoles = computed(() => rolesStore.roles.filter(r => !EXCLUDED_ROLES.includes(r.name)))

const form = ref({
  from_step_id: '',
  to_step_id: '',
  action_name: '',
  allowed_roles: [] as string[],
})

watch(() => props.open, async (open) => {
  if (!open) return
  error.value = ''
  rolesStore.fetchRoles()
  if (props.transition) {
    form.value = {
      from_step_id: props.transition.from_step_id,
      to_step_id: props.transition.to_step_id,
      action_name: props.transition.action_name,
      allowed_roles: [...props.transition.allowed_roles],
    }
  } else {
    form.value = {
      from_step_id: props.fromStepId ?? '',
      to_step_id: props.toStepId ?? '',
      action_name: '',
      allowed_roles: [],
    }
  }
})

function toggleRole(role: string) {
  if (form.value.allowed_roles.includes(role)) {
    form.value.allowed_roles = form.value.allowed_roles.filter(r => r !== role)
  } else {
    form.value.allowed_roles.push(role)
  }
}

function handleSave() {
  error.value = ''
  if (!form.value.from_step_id) { error.value = 'From step is required.'; return }
  if (!form.value.to_step_id) { error.value = 'To step is required.'; return }
  if (form.value.from_step_id === form.value.to_step_id) { error.value = 'From and To steps must be different.'; return }
  if (!form.value.action_name.trim()) { error.value = 'Action name is required.'; return }
  if (form.value.allowed_roles.length === 0) { error.value = 'At least one role must be allowed.'; return }

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
          {{ isEdit ? 'Update this transition\'s action and allowed roles.' : 'Define how the workflow moves between steps.' }}
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
            <SelectTrigger class="w-full">
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
            <SelectTrigger class="w-full">
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

        <!-- Allowed Roles -->
        <div class="grid gap-2">
          <Label>Allowed Roles *</Label>
          <div class="flex flex-wrap gap-2">
            <Loader2 v-if="rolesStore.loading" class="size-4 animate-spin text-muted-foreground" />
            <button
              v-for="role in selectableRoles"
              :key="role.id"
              type="button"
              :class="[
                'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                form.allowed_roles.includes(role.name)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-muted',
              ]"
              @click="toggleRole(role.name)"
            >
              {{ rolesStore.getRoleLabel(role.name) }}
            </button>
          </div>
          <p class="text-xs text-muted-foreground">Roles that can trigger this transition.</p>
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
