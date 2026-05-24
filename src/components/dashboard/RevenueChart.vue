<script setup lang="ts">
import { computed } from 'vue'
import { VisXYContainer, VisArea, VisAxis, VisLine, VisCrosshair, VisTooltip } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DataPoint = { month: string; revenue: number }

const props = defineProps<{
  data: DataPoint[]
}>()

function fmtMonth(m: string) {
  const [year, month] = m.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

// Pad to at least 2 points so Unovis can render a line
const data = computed<DataPoint[]>(() => {
  const raw = props.data ?? []
  if (raw.length === 0) return []
  if (raw.length === 1) return [{ month: raw[0].month, revenue: 0 }, raw[0]]
  return raw
})

const totalRevenue = computed(() =>
  (props.data ?? []).reduce((sum, d) => sum + d.revenue, 0),
)

const x = (_: DataPoint, i: number) => i
const y = (d: DataPoint) => d.revenue
const xTickFormat = (i: number) => fmtMonth(data.value[i]?.month ?? '')
const yTickFormat = (v: number) => `ZMW ${(v / 1000).toFixed(0)}K`
const tooltipTemplate = (d: DataPoint) => `<div class="text-xs font-medium">${fmtMonth(d.month)}: ZMW ${d.revenue.toLocaleString()}</div>`
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Revenue</CardTitle>
    </CardHeader>
    <CardContent>
      <div class="mb-2 flex items-baseline gap-2">
        <span class="text-2xl font-semibold">ZMW {{ totalRevenue.toLocaleString() }}</span>
        <span class="text-xs text-muted-foreground">Total Revenue</span>
      </div>
      <div v-if="data.length === 0" class="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        No revenue data available.
      </div>
      <VisXYContainer v-else :data="data" :height="200">
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
