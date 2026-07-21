<script setup lang="ts">
import { ref, computed } from 'vue'
import { VisXYContainer, VisArea, VisAxis, VisLine, VisCrosshair, VisTooltip } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type DataPoint = { month: string; revenue: number }

const props = defineProps<{
  data: DataPoint[]
}>()

const showTable = ref(false)

function fmtMonth(m: string) {
  const parts = m.split('-')
  const year = Number(parts[0] ?? 0)
  const month = Number(parts[1] ?? 1)
  return new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

function prevMonth(m: string) {
  const parts = m.split('-')
  const year = Number(parts[0] ?? 0)
  const month = Number(parts[1] ?? 1)
  const d = new Date(year, month - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Pad to at least 2 points so Unovis can render a line
const data = computed<DataPoint[]>(() => {
  const raw = props.data ?? []
  const first = raw[0]
  if (!first) return []
  if (raw.length === 1) return [{ month: prevMonth(first.month), revenue: 0 }, first]
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
      <CardAction>
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="showTable = !showTable">
          {{ showTable ? 'Chart view' : 'Table view' }}
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent>
      <div class="mb-2 flex items-baseline gap-2">
        <span class="text-2xl font-semibold">ZMW {{ totalRevenue.toLocaleString() }}</span>
        <span class="text-xs text-muted-foreground">Total Revenue</span>
      </div>
      <div v-if="data.length === 0" class="flex items-center justify-center h-50 text-sm text-muted-foreground">
        No revenue data available.
      </div>
      <div v-else-if="showTable" class="max-h-50 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead class="text-right">Revenue (ZMW)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="d in props.data" :key="d.month">
              <TableCell>{{ fmtMonth(d.month) }}</TableCell>
              <TableCell class="text-right">{{ d.revenue.toLocaleString() }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
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
