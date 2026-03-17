<script setup lang="ts">
import { computed, inject } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@vue-flow/core'
import { Pencil, Trash2 } from 'lucide-vue-next'
import type { WorkflowTransition } from '@/types/workflow'

const props = defineProps<{
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: any
  targetPosition: any
  data: { transition: WorkflowTransition }
  markerEnd?: string
  selected?: boolean
}>()

const openTransitionEdit = inject<(id: string, transition: WorkflowTransition) => void>('openTransitionEdit')
const deleteTransition = inject<(transition: WorkflowTransition) => void>('deleteTransition')

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

const labelPos = computed(() => ({
  x: (props.sourceX + props.targetX) / 2,
  y: (props.sourceY + props.targetY) / 2,
}))

function handleEditClick(event: MouseEvent) {
  if (event.target instanceof HTMLElement) event.target.blur()
  openTransitionEdit?.(props.id, props.data.transition)
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
          transform: `translate(-50%, -50%) translate(${labelPos.x}px, ${labelPos.y}px)`,
          pointerEvents: 'all',
        }"
        class="group nodrag nopan"
      >
        <div
          :class="[
            'flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium shadow-sm bg-background transition-colors',
            selected ? 'border-primary text-primary' : 'border-border text-foreground',
          ]"
        >
          <span>{{ data.transition.action_name }}</span>
          <div class="hidden group-hover:flex items-center gap-0.5 ml-1">
            <button
              class="size-4 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              @click.stop="handleEditClick"
              title="Edit transition"
            >
              <Pencil class="size-3" />
            </button>
            <button
              class="size-4 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              @click.stop="deleteTransition?.(data.transition)"
              title="Delete transition"
            >
              <Trash2 class="size-3" />
            </button>
          </div>
        </div>
      </div>
    </EdgeLabelRenderer>
  </g>
</template>
