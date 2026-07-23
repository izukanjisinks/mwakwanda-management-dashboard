<script setup lang="ts">
import { ref, computed } from 'vue'
import { VisXYContainer, VisGroupedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DashboardBilledVsCollectedPoint } from '@/types/dashboard'

const props = defineProps<{
  data: DashboardBilledVsCollectedPoint[]
}>()

const showTable = ref(false)

function fmtMonth(m: string) {
  const parts = m.split('-')
  const year = Number(parts[0] ?? 0)
  const month = Number(parts[1] ?? 1)
  return new Date(year, month - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
}

const totalBilled = computed(() => props.data.reduce((sum, d) => sum + d.billed, 0))
const totalCollected = computed(() => props.data.reduce((sum, d) => sum + d.collected, 0))

const x = (_: DashboardBilledVsCollectedPoint, i: number) => i
const ys = [(d: DashboardBilledVsCollectedPoint) => d.billed, (d: DashboardBilledVsCollectedPoint) => d.collected]
const colors = ['var(--color-primary)', 'var(--color-chart-3)']
const xTickFormat = (i: number) => fmtMonth(props.data[i]?.month ?? '')
const yTickFormat = (v: number) => `${(v / 1000).toFixed(0)}K`
const tooltipTemplate = (d: DashboardBilledVsCollectedPoint) => `
  <div class="text-xs font-medium mb-1">${fmtMonth(d.month)}</div>
  <div class="text-xs">Billed: <strong>ZMW ${d.billed.toLocaleString()}</strong></div>
  <div class="text-xs">Collected: <strong>ZMW ${d.collected.toLocaleString()}</strong></div>
`
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <div>
        <CardTitle class="text-base font-medium">Billed vs. Collected</CardTitle>
        <div class="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <div class="flex items-center gap-1.5">
            <div class="size-2 rounded-sm bg-primary" />
            <span>Billed</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="size-2 rounded-sm bg-chart-3" />
            <span>Collected</span>
          </div>
        </div>
      </div>
      <CardAction>
        <Button variant="outline" size="sm" class="h-7 text-xs" @click="showTable = !showTable">
          {{ showTable ? 'Chart view' : 'Table view' }}
        </Button>
      </CardAction>
    </CardHeader>

    <CardContent>
      <div class="mb-2 flex items-baseline gap-3">
        <span class="text-2xl font-semibold">ZMW {{ totalCollected.toLocaleString() }}</span>
        <span class="text-xs text-muted-foreground">Collected of ZMW {{ totalBilled.toLocaleString() }} billed</span>
      </div>

      <div v-if="data.length === 0" class="flex items-center justify-center h-50 text-sm text-muted-foreground">
        No invoice data available.
      </div>
      <div v-else-if="showTable" class="max-h-50 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead class="text-right">Billed (ZMW)</TableHead>
              <TableHead class="text-right">Collected (ZMW)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="d in data" :key="d.month">
              <TableCell>{{ fmtMonth(d.month) }}</TableCell>
              <TableCell class="text-right">{{ d.billed.toLocaleString() }}</TableCell>
              <TableCell class="text-right">{{ d.collected.toLocaleString() }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <VisXYContainer v-else :data="data" :height="200">
        <VisGroupedBar
          :x="x"
          :y="ys"
          :color="colors"
          :rounded-corners="4"
          :bar-padding="0.15"
          :group-padding="0.05"
        />
        <VisAxis
          type="x"
          :x="x"
          :tick-format="xTickFormat"
          :tick-line="false"
          :domain-line="false"
          :grid-line="false"
        />
        <VisAxis
          type="y"
          :num-ticks="4"
          :tick-format="yTickFormat"
          :tick-line="false"
          :domain-line="false"
        />
        <VisCrosshair :template="tooltipTemplate" />
        <VisTooltip />
      </VisXYContainer>
    </CardContent>
  </Card>
</template>
