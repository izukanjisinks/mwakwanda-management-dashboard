<script setup lang="ts">
import { computed, inject } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, Position } from '@vue-flow/core'
import type { WorkflowTransition } from '@/stores/workflow'

const props = defineProps<{
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: any
  targetPosition: any
  data: WorkflowTransition
  markerEnd?: string
  sourceHandleId?: string
  targetHandleId?: string
}>()

// Inject the edit handler from parent WorkflowEditor
const openTransitionEdit = inject<(id: string, data: WorkflowTransition) => void>('openTransitionEdit')

const path = computed(() => {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    curvature: 0.25,
  })
  return edgePath
})

const labelPosition = computed(() => {
  // Position label with slight offset to avoid overlap
  const yDiff = props.targetY - props.sourceY
  const baseY = (props.sourceY + props.targetY) / 2
  const offsetY = yDiff > 0 ? 10 : -10

  return {
    x: (props.sourceX + props.targetX) / 2,
    y: baseY + offsetY,
  }
})

function handleEditClick(event: MouseEvent) {
  // Blur the button to release focus before opening dialog
  // This prevents aria-hidden focus conflicts with VueFlow viewport
  if (event.target instanceof HTMLElement) {
    event.target.blur()
  }

  // Call the injected handler to open the centralized dialog
  if (openTransitionEdit) {
    openTransitionEdit(props.id, props.data)
  }
}
</script>

<template>
  <g>
    <BaseEdge
      :id="id"
      :path="path"
      :marker-end="markerEnd"
      class="stroke-2 stroke-gray-400"
    />
    <EdgeLabelRenderer>
      <div
        :style="{
          position: 'absolute',
          transform: `translate(-50%, -50%) translate(${labelPosition.x}px,${labelPosition.y}px)`,
          pointerEvents: 'all',
        }"
        class="nodrag nopan"
      >
        <button
          @click="handleEditClick"
          class="px-2 py-1 text-xs bg-white dark:bg-gray-800 rounded shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 border font-medium"
        >
          {{ data?.actionName || data?.name || 'Click to edit' }}
        </button>
      </div>
    </EdgeLabelRenderer>
  </g>
</template>
