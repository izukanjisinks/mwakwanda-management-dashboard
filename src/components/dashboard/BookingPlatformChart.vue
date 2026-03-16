<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisTooltip } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Platform = { platform: string; value: number; color: string }

const chartData: Platform[] = [
  { platform: 'Direct Booking', value: 61, color: 'var(--color-primary)' },
  { platform: 'Booking.com', value: 12, color: 'var(--color-chart-3)' },
  { platform: 'Agoda', value: 11, color: 'var(--color-accent)' },
  { platform: 'Airbnb', value: 9, color: 'var(--color-chart-4)' },
  { platform: 'Hotels.com', value: 5, color: 'var(--color-chart-5)' },
  { platform: 'Others', value: 2, color: 'var(--color-muted-foreground)' },
]

const value = (d: Platform) => d.value
const color = (d: Platform) => d.color
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Booking by Platform</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="flex items-center gap-6">
        <!-- Donut chart -->
        <div class="size-[180px] shrink-0">
          <VisSingleContainer :height="180" :width="180">
            <VisDonut :data="chartData" :value="value" :color="color" :arc-width="30" />
            <VisTooltip />
          </VisSingleContainer>
        </div>

        <!-- Legend -->
        <div class="flex flex-col gap-2">
          <div
            v-for="item in chartData"
            :key="item.platform"
            class="flex items-center gap-2"
          >
            <div class="size-3 rounded-sm" :style="{ backgroundColor: item.color }" />
            <span class="text-sm font-medium">{{ item.value }}%</span>
            <span class="text-xs text-muted-foreground">{{ item.platform }}</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
