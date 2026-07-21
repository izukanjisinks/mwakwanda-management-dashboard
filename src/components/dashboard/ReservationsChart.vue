<script setup lang="ts">
import { ref, computed } from 'vue'
import { VisXYContainer, VisGroupedBar, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type DataPoint = { day: string; booked: number; cancelled: number }

const props = defineProps<{
  data: DataPoint[]
}>()

const showTable = ref(false)
const data = computed(() => props.data ?? [])

const x = (_: DataPoint, i: number) => i
const ys = [(d: DataPoint) => d.booked, (d: DataPoint) => d.cancelled]
const colors = ['var(--color-primary)', 'var(--color-muted-foreground)']
const xTickFormat = (i: number) => data.value[i]?.day ?? ''
const tooltipTemplate = (d: DataPoint) => `
  <div class="text-xs font-medium mb-1">${d.day}</div>
  <div class="text-xs">Booked: <strong>${d.booked}</strong></div>
  <div class="text-xs">Cancelled: <strong>${d.cancelled}</strong></div>
`
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <div>
        <CardTitle class="text-base font-medium">Reservations</CardTitle>
        <div class="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <div class="flex items-center gap-1.5">
            <div class="size-2 rounded-sm bg-primary" />
            <span>Booked</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="size-2 rounded-sm bg-muted-foreground" />
            <span>Cancelled</span>
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
      <div v-if="data.length === 0" class="flex items-center justify-center h-50 text-sm text-muted-foreground">
        No reservation data available.
      </div>
      <div v-else-if="showTable" class="max-h-50 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead class="text-right">Booked</TableHead>
              <TableHead class="text-right">Cancelled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="d in data" :key="d.day">
              <TableCell>{{ d.day }}</TableCell>
              <TableCell class="text-right">{{ d.booked }}</TableCell>
              <TableCell class="text-right">{{ d.cancelled }}</TableCell>
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
