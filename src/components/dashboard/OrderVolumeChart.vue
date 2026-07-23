<script setup lang="ts">
import { ref, computed } from 'vue'
import { VisXYContainer, VisGroupedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { DashboardOrderVolumePoint } from '@/types/dashboard'

const props = defineProps<{
  data: DashboardOrderVolumePoint[]
}>()

const showTable = ref(false)

const total = computed(() => props.data.reduce((sum, d) => sum + d.kitchen + d.bar, 0))

const x = (_: DashboardOrderVolumePoint, i: number) => i
const ys = [(d: DashboardOrderVolumePoint) => d.kitchen, (d: DashboardOrderVolumePoint) => d.bar]
const colors = ['var(--color-primary)', 'var(--color-chart-3)']
const xTickFormat = (i: number) => props.data[i]?.day ?? ''
const tooltipTemplate = (d: DashboardOrderVolumePoint) => `
  <div class="text-xs font-medium mb-1">${d.day}</div>
  <div class="text-xs">Kitchen: <strong>${d.kitchen}</strong></div>
  <div class="text-xs">Bar: <strong>${d.bar}</strong></div>
`
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <div>
        <CardTitle class="text-base font-medium">Order Volume</CardTitle>
        <div class="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <div class="flex items-center gap-1.5">
            <div class="size-2 rounded-sm bg-primary" />
            <span>Kitchen</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="size-2 rounded-sm bg-chart-3" />
            <span>Bar</span>
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
      <div class="mb-2 flex items-baseline gap-2">
        <span class="text-2xl font-semibold">{{ total }}</span>
        <span class="text-xs text-muted-foreground">Total Orders (7 days)</span>
      </div>

      <div v-if="data.length === 0" class="flex items-center justify-center h-50 text-sm text-muted-foreground">
        No order data available.
      </div>
      <div v-else-if="showTable" class="max-h-50 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead class="text-right">Kitchen</TableHead>
              <TableHead class="text-right">Bar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="d in data" :key="d.day">
              <TableCell>{{ d.day }}</TableCell>
              <TableCell class="text-right">{{ d.kitchen }}</TableCell>
              <TableCell class="text-right">{{ d.bar }}</TableCell>
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
          :tick-line="false"
          :domain-line="false"
        />
        <VisCrosshair :template="tooltipTemplate" />
        <VisTooltip />
      </VisXYContainer>
    </CardContent>
  </Card>
</template>
