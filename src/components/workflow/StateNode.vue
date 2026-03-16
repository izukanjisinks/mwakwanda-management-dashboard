<script setup lang="ts">
import { computed, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { useWorkflowStore } from '@/stores/workflow'
import { Edit2, Trash2 } from 'lucide-vue-next'
import type { WorkflowState } from '@/stores/workflow'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useResultDialog } from '@/composables/useResultDialog'

// @ts-ignore - Vue SFC component
import StepEditDialog from './StepEditDialog.vue'

const props = defineProps<{
  id: string
  data: WorkflowState
}>()

const workflowStore = useWorkflowStore()
const { confirm } = useConfirmDialog()
const { showError } = useResultDialog()
const isHovered = ref(false)
const showEditDialog = ref(false)

const stateTypeColor = computed(() => {
  switch (props.data.stateType) {
    case 'initial':
      return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950'
    case 'middle':
      return 'border-blue-500 bg-blue-50 dark:bg-blue-950'
    case 'final':
      return 'border-red-500 bg-red-50 dark:bg-red-950'
    default:
      return 'border-gray-500 bg-gray-50 dark:bg-gray-950'
  }
})

function handleEdit() {
  showEditDialog.value = true
}

async function handleSave(data: Partial<WorkflowState>) {
  // Update local state first
  workflowStore.updateNodeData(props.id, data)

  // Determine if this is a new step (temporary ID) or existing step (UUID)
  const isNewStep = props.id.startsWith('node-')

  try {
    if (isNewStep && workflowStore.currentWorkflow) {
      // Create new step in backend
      const stepData: WorkflowState = {
        ...props.data,
        ...data,
      } as WorkflowState

      await workflowStore.createStep(workflowStore.currentWorkflow.id, stepData)
    } else if (!isNewStep) {
      // Update existing step in backend
      await workflowStore.updateStep(props.id, data)
    }
  } catch (err) {
    console.error('Failed to save step:', err)
    showError('Failed to Save Step', 'Failed to save step. Please try again.')
  }
}

async function handleDelete() {
  const confirmed = await confirm({
    title: `Delete "${props.data.name}"?`,
    description: 'This state will be removed from the workflow.',
    confirmText: 'Delete',
    variant: 'destructive',
  })
  if (confirmed) {
    workflowStore.removeNode(props.id)
  }
}
</script>

<template>
  <div
    class="relative px-4 py-3 shadow-md rounded-lg border-2 min-w-[150px] transition-all"
    :class="stateTypeColor"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Source Handle (left) -->
    <Handle
      type="target"
      :position="Position.Left"
      class="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
    />

    <!-- Content -->
    <div class="flex flex-col gap-1">
      <div class="font-semibold text-sm">{{ data.name }}</div>
      <div class="text-xs text-muted-foreground capitalize">{{ data.stateType }}</div>

      <!-- Show allowed roles if present -->
      <div v-if="data.allowedRoles && data.allowedRoles.length > 0" class="text-xs text-muted-foreground mt-1 pt-1 border-t">
        <div class="font-medium mb-0.5">Allowed Roles:</div>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="role in data.allowedRoles"
            :key="role"
            class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-[10px]"
          >
            {{ role.replace(/_/g, ' ') }}
          </span>
        </div>
      </div>
    </div>

    <!-- Action Buttons (show on hover) -->
    <div
      v-if="isHovered"
      class="absolute -top-2 -right-2 flex gap-1"
    >
      <button
        @click="handleEdit"
        class="p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 border"
      >
        <Edit2 class="size-3" />
      </button>
      <button
        @click="handleDelete"
        class="p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-red-100 dark:hover:bg-red-900 border"
      >
        <Trash2 class="size-3" />
      </button>
    </div>

    <!-- Target Handle (right) -->
    <Handle
      type="source"
      :position="Position.Right"
      class="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
    />

    <!-- Edit Dialog -->
    <StepEditDialog
      :open="showEditDialog"
      :step-data="data"
      @update:open="(val) => showEditDialog = val"
      @save="handleSave"
    />
  </div>
</template>
