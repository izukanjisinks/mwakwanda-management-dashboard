<script setup lang="ts">
import { ref, computed } from 'vue'
import { VisXYContainer, VisGroupedBar, VisAxis } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DataPoint = { day: string; booked: number; cancelled: number }

const allData: Record<string, DataPoint[]> = {
  '7days': [
    { day: '12 Jun', booked: 65, cancelled: 8 },
    { day: '13 Jun', booked: 72, cancelled: 12 },
    { day: '14 Jun', booked: 58, cancelled: 5 },
    { day: '15 Jun', booked: 85, cancelled: 10 },
    { day: '16 Jun', booked: 92, cancelled: 7 },
    { day: '17 Jun', booked: 78, cancelled: 15 },
    { day: '18 Jun', booked: 88, cancelled: 9 },
  ],
  '14days': [
    { day: '5 Jun',  booked: 55, cancelled: 6 },
    { day: '6 Jun',  booked: 60, cancelled: 9 },
    { day: '7 Jun',  booked: 70, cancelled: 4 },
    { day: '8 Jun',  booked: 63, cancelled: 11 },
    { day: '9 Jun',  booked: 75, cancelled: 8 },
    { day: '10 Jun', booked: 68, cancelled: 13 },
    { day: '11 Jun', booked: 80, cancelled: 6 },
    { day: '12 Jun', booked: 65, cancelled: 8 },
    { day: '13 Jun', booked: 72, cancelled: 12 },
    { day: '14 Jun', booked: 58, cancelled: 5 },
    { day: '15 Jun', booked: 85, cancelled: 10 },
    { day: '16 Jun', booked: 92, cancelled: 7 },
    { day: '17 Jun', booked: 78, cancelled: 15 },
    { day: '18 Jun', booked: 88, cancelled: 9 },
  ],
}

const period = ref('7days')
const data = computed(() => allData[period.value] ?? allData['7days'])

const x = (_: DataPoint, i: number) => i
const ys = [(d: DataPoint) => d.booked, (d: DataPoint) => d.cancelled]
const colors = ['var(--color-primary)', 'var(--color-muted-foreground)']
const xTickFormat = (i: number) => data.value[i]?.day ?? ''
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
        <Select v-model="period">
          <SelectTrigger class="h-8 w-32.5 text-xs">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="14days">Last 14 Days</SelectItem>
          </SelectContent>
        </Select>
      </CardAction>
    </CardHeader>

    <CardContent>
      <VisXYContainer :data="data" :height="200">
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
        </VisXYContainer>
    </CardContent>
  </Card>
</template>
