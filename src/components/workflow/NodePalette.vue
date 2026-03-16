<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const stateTypes = [
  { type: 'initial', label: 'Initial State', color: 'bg-emerald-500' },
  { type: 'middle', label: 'Middle State', color: 'bg-blue-500' },
  { type: 'final', label: 'Final State', color: 'bg-red-500' },
]

function onDragStart(event: DragEvent, stateType: string) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('application/vueflow', stateType)
  event.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <Card class="w-64">
    <CardHeader>
      <CardTitle class="text-base">State Palette</CardTitle>
    </CardHeader>
    <CardContent class="space-y-2">
      <p class="text-xs text-muted-foreground mb-3">
        Drag and drop states onto the canvas
      </p>

      <div
        v-for="state in stateTypes"
        :key="state.type"
        draggable="true"
        @dragstart="(e) => onDragStart(e, state.type)"
        class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-move hover:bg-accent transition-colors"
      >
        <div :class="[state.color, 'w-4 h-4 rounded']"></div>
        <span class="text-sm font-medium">{{ state.label }}</span>
      </div>

      <div class="pt-4 border-t mt-4">
        <p class="text-xs font-semibold mb-2">Legend:</p>
        <ul class="text-xs text-muted-foreground space-y-1">
          <li>• <span class="text-emerald-600 dark:text-emerald-400">Initial</span>: Entry points</li>
          <li>• <span class="text-blue-600 dark:text-blue-400">Middle</span>: Processing states</li>
          <li>• <span class="text-red-600 dark:text-red-400">Final</span>: End states</li>
        </ul>
      </div>
    </CardContent>
  </Card>
</template>
