<script setup lang="ts">
import { computed } from 'vue'
import { VisXYContainer, VisArea, VisAxis, VisLine, VisCrosshair, VisTooltip } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DataPoint = { month: string; revenue: number }

const props = defineProps<{
  data: DataPoint[]
}>()

const data = computed(() => props.data ?? [])
const totalRevenue = computed(() => data.value.length ? data.value[data.value.length - 1].revenue : 0)

const x = (_: DataPoint, i: number) => i
const y = (d: DataPoint) => d.revenue
const xTickFormat = (i: number) => data.value[i]?.month ?? ''
const yTickFormat = (v: number) => `$${(v / 1000).toFixed(0)}K`
const tooltipTemplate = (d: DataPoint) => `<div class="text-xs font-medium">$${d.revenue.toLocaleString()}</div>`
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Revenue</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="mb-2 flex items-baseline gap-2">
        <span class="text-2xl font-semibold">${{ totalRevenue.toLocaleString() }}</span>
        <span class="text-xs text-muted-foreground">Total Revenue</span>
      </div>
      <VisXYContainer :data="data" :height="200">
        <VisArea :x="x" :y="y" color="var(--color-primary)" :opacity="0.15" />
        <VisLine :x="x" :y="y" color="var(--color-primary)" />
        <VisAxis type="x" :tick-format="xTickFormat" />
        <VisAxis type="y" :tick-format="yTickFormat" />
        <VisCrosshair :template="tooltipTemplate" />
        <VisTooltip />
      </VisXYContainer>
    </CardContent>
  </Card>
</template>
