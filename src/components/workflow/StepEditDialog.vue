<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { WorkflowState } from '@/stores/workflow'

const props = defineProps<{
  open: boolean
  stepData?: WorkflowState | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [data: Partial<WorkflowState>]
}>()

const availableRoles = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
]

const formData = ref({
  name: '',
  stateType: 'middle' as 'initial' | 'middle' | 'final',
  allowedRoles: [] as string[],
  requiresAllApprovers: false,
  minApprovals: 1,
})

// Watch both stepData and open state to reset form when dialog opens
watch([() => props.stepData, () => props.open], ([newData, isOpen]) => {
  if (newData && isOpen) {
    formData.value = {
      name: newData.name,
      stateType: newData.stateType,
      allowedRoles: [...(newData.allowedRoles || [])],
      requiresAllApprovers: newData.requiresAllApprovers ?? false,
      minApprovals: newData.minApprovals ?? 1,
    }
  }
}, { immediate: true })


function handleSave() {
  emit('save', formData.value)
  emit('update:open', false)
}

function handleClose() {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Edit Step</DialogTitle>
        <DialogDescription>
          Configure step properties and allowed roles
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- Step Name -->
        <div class="grid gap-2">
          <Label for="step-name">Step Name</Label>
          <input
            id="step-name"
            v-model="formData.name"
            type="text"
            placeholder="e.g., Manager Approval"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <!-- State Type -->
        <div class="grid gap-2">
          <Label>State Type</Label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2">
              <input
                type="radio"
                value="initial"
                v-model="formData.stateType"
                class="w-4 h-4"
              />
              <span class="text-sm">Initial</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="radio"
                value="middle"
                v-model="formData.stateType"
                class="w-4 h-4"
              />
              <span class="text-sm">Middle</span>
            </label>
            <label class="flex items-center gap-2">
              <input
                type="radio"
                value="final"
                v-model="formData.stateType"
                class="w-4 h-4"
              />
              <span class="text-sm">Final</span>
            </label>
          </div>
        </div>

        <!-- Allowed Roles -->
        <div class="grid gap-2">
          <Label>Allowed Roles</Label>
          <p class="text-xs text-muted-foreground">
            Select which roles can act on this step
          </p>
          <div class="space-y-2">
            <label
              v-for="role in availableRoles"
              :key="role.value"
              class="flex items-center justify-between p-2 rounded-md border hover:bg-accent cursor-pointer"
            >
              <span class="text-sm">{{ role.label }}</span>
              <input
                type="checkbox"
                :value="role.value"
                v-model="formData.allowedRoles"
                class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </label>
          </div>
        </div>

        <!-- Selected Roles Preview -->
        <div v-if="formData.allowedRoles.length > 0" class="grid gap-2">
          <Label>Selected Roles:</Label>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="role in formData.allowedRoles"
              :key="role"
              class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
            >
              {{ availableRoles.find(r => r.value === role)?.label }}
            </span>
          </div>
        </div>

        <!-- Approval Settings -->
        <div v-if="formData.allowedRoles.length > 0">
          <!-- <Label>Approval Settings</Label> -->

          <!-- Requires All Approvers -->
          <!-- <div class="flex items-center justify-between p-2 rounded-md border">
            <div>
              <div class="text-sm font-medium">Require All Approvers</div>
              <div class="text-xs text-muted-foreground">All selected roles must approve</div>
            </div>
            <Switch
              v-model="formData.requiresAllApprovers"
            />
          </div> -->

          <!-- Minimum Approvals -->
          <!-- <div v-if="!formData.requiresAllApprovers" class="grid gap-2">
            <Label for="min-approvals">Minimum Approvals Required</Label>
            <input
              id="min-approvals"
              v-model.number="formData.minApprovals"
              type="number"
              min="1"
              :max="formData.allowedRoles.length"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p class="text-xs text-muted-foreground">
              Number of approvals needed (1-{{ formData.allowedRoles.length }})
            </p>
          </div> -->
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose">
          Cancel
        </Button>
        <Button @click="handleSave" :disabled="!formData.name.trim()">
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
