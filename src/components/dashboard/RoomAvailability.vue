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
  { label: 'Occupied', value: props.occupied, color: 'var(--color-primary)' },
  { label: 'Reserved', value: props.reserved, color: 'var(--color-chart-3)' },
  { label: 'Available', value: props.available, color: 'var(--color-accent)' },
  { label: 'Not Ready', value: props.notReady, color: 'var(--color-muted-foreground)' },
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
    <CardContent>
      <div class="flex items-center gap-6">
        <!-- Donut chart -->
        <div class="shrink-0">
          <VisSingleContainer :data="segments" :height="180" :width="180">
            <VisDonut :value="value" :color="color" :arc-width="36" />
            <VisTooltip :template="tooltipTemplate" />
          </VisSingleContainer>
        </div>

        <!-- Legend -->
        <div class="flex flex-col gap-3 flex-1">
          <div
            v-for="seg in segments"
            :key="seg.label"
            class="flex items-center justify-between gap-2"
          >
            <div class="flex items-center gap-2">
              <div class="size-3 rounded-sm shrink-0" :style="{ backgroundColor: seg.color }" />
              <span class="text-sm text-muted-foreground">{{ seg.label }}</span>
            </div>
            <div class="flex items-baseline gap-1">
              <span class="text-lg font-semibold">{{ seg.value }}</span>
              <span class="text-xs text-muted-foreground">{{ ((seg.value / total) * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
