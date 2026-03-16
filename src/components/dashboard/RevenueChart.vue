<script setup lang="ts">
import { ref, computed } from 'vue'
import { VisXYContainer, VisArea, VisAxis, VisLine, VisCrosshair, VisTooltip } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type DataPoint = { month: string; revenue: number }

const allData: Record<string, DataPoint[]> = {
  '6months': [
    { month: 'Dec', revenue: 186000 },
    { month: 'Jan', revenue: 205000 },
    { month: 'Feb', revenue: 237000 },
    { month: 'Mar', revenue: 315060 },
    { month: 'Apr', revenue: 209000 },
    { month: 'May', revenue: 284000 },
  ],
  '3months': [
    { month: 'Mar', revenue: 315060 },
    { month: 'Apr', revenue: 209000 },
    { month: 'May', revenue: 284000 },
  ],
  '1year': [
    { month: 'Jun', revenue: 178000 },
    { month: 'Jul', revenue: 192000 },
    { month: 'Aug', revenue: 210000 },
    { month: 'Sep', revenue: 198000 },
    { month: 'Oct', revenue: 220000 },
    { month: 'Nov', revenue: 245000 },
    { month: 'Dec', revenue: 186000 },
    { month: 'Jan', revenue: 205000 },
    { month: 'Feb', revenue: 237000 },
    { month: 'Mar', revenue: 315060 },
    { month: 'Apr', revenue: 209000 },
    { month: 'May', revenue: 284000 },
  ],
}

const period = ref('6months')
const data = computed(() => allData[period.value])
const totalRevenue = computed(() => data.value[data.value.length - 1].revenue)

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
      <CardAction>
        <Select v-model="period">
          <SelectTrigger class="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="1year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </CardAction>
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
