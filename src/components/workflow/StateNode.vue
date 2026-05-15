<script setup lang="ts">
import { computed, inject } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { Pencil, Trash2 } from 'lucide-vue-next'
import type { WorkflowStep } from '@/types/workflow'

const props = defineProps<{
  data: { step: WorkflowStep }
  selected?: boolean
}>()

const editStep = inject<(step: WorkflowStep) => void>('editStep')
const deleteStep = inject<(step: WorkflowStep) => void>('deleteStep')

const step = computed(() => props.data.step)

const typeConfig = computed(() => {
  if (step.value.initial) {
    return {
      label: 'Start',
      classes: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
      badge: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50',
    }
  }
  if (step.value.final) {
    return {
      label: 'End',
      classes: 'border-rose-500 bg-rose-50 dark:bg-rose-950/40',
      badge: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-900/50',
    }
  }
  return {
    label: 'Step',
    classes: 'border-amber-500 bg-amber-50 dark:bg-amber-950/40',
    badge: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/50',
  }
})
</script>

<template>
  <div
    :class="[
      'relative group px-4 py-3 shadow-md rounded-lg border-2 min-w-40 transition-all',
      typeConfig.classes,
      selected ? 'ring-2 ring-primary ring-offset-2' : '',
    ]"
  >
    <!-- Target handle (left) — receives incoming connections -->
    <Handle
      type="target"
      :position="Position.Left"
      class="w-3! h-3! bg-gray-400! border-2! border-white!"
    />

    <!-- Node content -->
    <div class="flex flex-col gap-1.5">
      <span :class="['text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded self-start', typeConfig.badge]">
        {{ typeConfig.label }}
      </span>
      <p class="font-semibold text-sm text-foreground leading-tight">{{ step.step_name }}</p>
    </div>

    <!-- Source handle (right) — sends outgoing connections -->
    <Handle
      type="source"
      :position="Position.Right"
      class="w-3! h-3! bg-gray-400! border-2! border-white!"
    />

    <!-- Hover action buttons -->
    <div class="absolute -top-3 -right-3 hidden group-hover:flex gap-1 z-10">
      <button
        class="size-7 rounded-full bg-background border border-border shadow flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
        @click.stop="editStep?.(step)"
        title="Edit step"
      >
        <Pencil class="size-3.5" />
      </button>
      <button
        class="size-7 rounded-full bg-background border border-border shadow flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
        @click.stop="deleteStep?.(step)"
        title="Delete step"
      >
        <Trash2 class="size-3.5" />
      </button>
    </div>
  </div>
</template>
