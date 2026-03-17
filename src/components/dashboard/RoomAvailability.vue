<script setup lang="ts">
import { computed } from 'vue'
import { VisSingleContainer, VisDonut, VisTooltip } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps<{
  occupied: number
  reserved: number
  available: number
  notReady: number
}>()

type Segment = { label: string; value: number; color: string }

const segments = computed<Segment[]>(() => [
  { label: 'Occupied',  value: props.occupied,  color: 'var(--color-primary)' },
  { label: 'Reserved',  value: props.reserved,  color: 'var(--color-chart-3)' },
  { label: 'Available', value: props.available, color: 'var(--color-accent)' },
  { label: 'Not Ready', value: props.notReady,  color: 'var(--color-muted-foreground)' },
])

const total = computed(() => props.occupied + props.reserved + props.available + props.notReady)

const value = (d: Segment) => d.value
const color = (d: Segment) => d.color
const tooltipTemplate = (d: Segment) =>
  `<div class="text-xs font-medium">${d.label}: <strong>${d.value}</strong></div>`
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Room Availability</CardTitle>
    </CardHeader>
    <CardContent class="flex flex-col items-center gap-6">

      <!-- Donut chart centered -->
      <div :style="{
        '--vis-donut-central-label-font-size': '1.75rem',
        '--vis-donut-central-label-font-weight': '700',
        '--vis-donut-central-label-text-color': 'var(--foreground)',
        '--vis-donut-central-sub-label-text-color': 'var(--muted-foreground)',
      }">
        <VisSingleContainer :data="segments" :height="200" :width="200">
          <VisDonut
            :value="value"
            :color="color"
            :arc-width="38"
            :central-label="String(total)"
            central-sub-label="Rooms"
          />
          <VisTooltip :template="tooltipTemplate" />
        </VisSingleContainer>
      </div>

      <!-- Legend -->
      <div class="grid grid-cols-2 gap-x-8 gap-y-2.5 w-full">
        <div
          v-for="seg in segments"
          :key="seg.label"
          class="flex items-center justify-between gap-2"
        >
          <div class="flex items-center gap-2">
            <div class="size-2.5 rounded-sm shrink-0" :style="{ backgroundColor: seg.color }" />
            <span class="text-sm text-muted-foreground">{{ seg.label }}</span>
          </div>
          <div class="flex items-baseline gap-1">
            <span class="text-sm font-semibold">{{ seg.value }}</span>
            <span class="text-xs text-muted-foreground">{{ total > 0 ? ((seg.value / total) * 100).toFixed(0) : 0 }}%</span>
          </div>
        </div>
      </div>

    </CardContent>
  </Card>
</template>
