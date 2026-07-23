<script setup lang="ts">
import { computed } from 'vue'
import { VisSingleContainer, VisDonut, VisTooltip } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardOrdersByStation } from '@/types/dashboard'

type Segment = { label: string; value: number; color: string }

const props = defineProps<{
  data: DashboardOrdersByStation
}>()

const chartData = computed<Segment[]>(() => [
  { label: 'Kitchen', value: props.data.kitchen, color: 'var(--color-primary)' },
  { label: 'Bar', value: props.data.bar, color: 'var(--color-chart-3)' },
  { label: 'Bakery', value: props.data.bakery, color: 'var(--color-accent)' },
  { label: 'Grill', value: props.data.grill, color: 'var(--color-muted-foreground)' },
])

const total = computed(() => chartData.value.reduce((sum, s) => sum + s.value, 0))

const value = (d: Segment) => d.value
const color = (d: Segment) => d.color

function pct(v: number) {
  return total.value > 0 ? Math.round((v / total.value) * 100) : 0
}
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Orders by Station</CardTitle>
    </CardHeader>
    <CardContent>
      <div v-if="total === 0" class="flex items-center justify-center h-45 text-sm text-muted-foreground">
        No open orders.
      </div>
      <div v-else class="flex flex-col items-center gap-6">
        <!-- Donut chart -->
        <div class="relative size-45">
          <VisSingleContainer :height="180" :width="180">
            <VisDonut :data="chartData" :value="value" :color="color" :arc-width="30" />
            <VisTooltip />
          </VisSingleContainer>
          <!-- Center total -->
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span class="text-2xl font-semibold tracking-tight">{{ total }}</span>
            <span class="text-xs text-muted-foreground">Orders</span>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <div
            v-for="item in chartData"
            :key="item.label"
            class="flex items-center gap-2"
          >
            <div class="size-3 rounded-sm" :style="{ backgroundColor: item.color }" />
            <span class="text-sm font-medium tabular-nums">{{ item.value }}</span>
            <span class="text-xs text-muted-foreground">{{ item.label }}</span>
            <span class="text-xs text-muted-foreground/70">({{ pct(item.value) }}%)</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
