<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
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
import type { WorkflowTransition } from '@/stores/workflow'

const props = defineProps<{
  open: boolean
  transitionData?: WorkflowTransition | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [data: Partial<WorkflowTransition>]
}>()

const actionOptions = [
  { value: 'submit', label: 'Submit' },
  { value: 'review', label: 'Review' },
]

const conditionTypes = [
  { value: 'always', label: 'Always' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
]

const formData = ref<{
  actionName: string
  conditionType: string
  conditionValue: string
}>({
  actionName: '',
  conditionType: 'always',
  conditionValue: '',
})

const isFormReady = ref(false)

// Watch both transitionData and open state to reset form when dialog opens
watch([() => props.transitionData, () => props.open], async ([newData, isOpen]) => {
  console.log('TransitionEditDialog watcher fired - isOpen:', isOpen, 'newData:', newData)
  console.log('Before: isFormReady:', isFormReady.value)

  if (isOpen) {
    // First set form not ready
    isFormReady.value = false

    // Wait for next tick to ensure any pending renders are done
    await nextTick()

    // Reset form with data or defaults
    formData.value = {
      actionName: newData?.actionName || newData?.name || '',
      conditionType: newData?.conditionType || 'always',
      conditionValue: newData?.conditionValue || '',
    }

    console.log('Form data populated:', formData.value)

    // Wait another tick before marking ready
    await nextTick()
    isFormReady.value = true
    console.log('After: isFormReady:', isFormReady.value)
  } else {
    isFormReady.value = false
    console.log('Dialog closed, isFormReady set to false')
  }
}, { immediate: true })

function handleSave() {
  emit('save', {
    name: formData.value.actionName,
    actionName: formData.value.actionName,
    conditionType: formData.value.conditionType,
    conditionValue: formData.value.conditionValue,
  })
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
        <DialogTitle>Edit Transition</DialogTitle>
        <DialogDescription>
          Configure transition action and conditions
        </DialogDescription>
      </DialogHeader>

      <div v-if="isFormReady" class="grid gap-4 py-4">
        <!-- Action Name -->
        <div class="grid gap-2">
          <Label for="action-name">Action Name</Label>
          <select
            id="action-name"
            v-model="formData.actionName"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="" disabled>Select an action</option>
            <option
              v-for="action in actionOptions"
              :key="action.value"
              :value="action.value"
            >
              {{ action.label }}
            </option>
          </select>
          <p class="text-xs text-muted-foreground">
            The action that triggers this transition
          </p>
        </div>

        <!-- Condition Type -->
        <div class="grid gap-2">
          <Label>Condition Type</Label>
          <div class="flex flex-col gap-2">
            <label
              v-for="type in conditionTypes"
              :key="type.value"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="radio"
                :value="type.value"
                v-model="formData.conditionType"
                class="w-4 h-4"
              />
              <span class="text-sm">{{ type.label }}</span>
            </label>
          </div>
          <p class="text-xs text-muted-foreground">
            When should this transition be allowed?
          </p>
        </div>

        <!-- Condition Value -->
        <div v-if="formData.conditionType !== 'always'" class="grid gap-2">
          <Label for="condition-value">Condition Value</Label>
          <input
            id="condition-value"
            v-model="formData.conditionValue"
            type="text"
            placeholder="Enter condition value"
            class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p class="text-xs text-muted-foreground">
            The value to check against
          </p>
        </div>
      </div>
      <div v-else class="grid gap-4 py-4">
        <p class="text-sm text-muted-foreground">Loading...</p>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose">
          Cancel
        </Button>
        <Button @click="handleSave" :disabled="!formData.actionName.trim()">
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
