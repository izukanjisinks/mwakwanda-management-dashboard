<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { DashboardRecentOrder } from '@/types/dashboard'

defineProps<{
  orders: DashboardRecentOrder[]
}>()

const statusMeta: Record<DashboardRecentOrder['status'], { label: string; classes: string }> = {
  new:       { label: 'New',       classes: 'bg-muted text-muted-foreground' },
  preparing: { label: 'Preparing', classes: 'bg-chart-3/10 text-chart-3' },
  ready:     { label: 'Ready',     classes: 'bg-primary/10 text-primary' },
}

const stationMeta: Record<DashboardRecentOrder['station'], { label: string; classes: string }> = {
  kitchen: { label: 'Kitchen', classes: 'bg-primary/10 text-primary' },
  bar:     { label: 'Bar',     classes: 'bg-chart-3/10 text-chart-3' },
}

function ageLabel(m: number) {
  if (m < 1) return 'Just now'
  if (m === 1) return '1 min ago'
  if (m < 60) return `${m} min ago`
  const hours = Math.floor(m / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
</script>

<template>
  <Card class="flex flex-col">
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Recent Orders</CardTitle>
      <CardAction>
        <RouterLink
          :to="{ name: 'orders' }"
          class="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight class="size-3.5" />
        </RouterLink>
      </CardAction>
    </CardHeader>

    <CardContent class="px-0">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead class="pl-6">Order</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Station</TableHead>
            <TableHead class="text-right">Items</TableHead>
            <TableHead>Age</TableHead>
            <TableHead class="pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="order in orders" :key="order.id">
            <TableCell class="pl-6 font-mono text-sm text-muted-foreground">{{ order.order_number }}</TableCell>
            <TableCell class="font-medium">{{ order.guest }}</TableCell>
            <TableCell>
              <span
                :class="cn(
                  'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                  stationMeta[order.station].classes,
                )"
              >
                {{ stationMeta[order.station].label }}
              </span>
            </TableCell>
            <TableCell class="text-right tabular-nums">{{ order.items }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">{{ ageLabel(order.minutes_ago) }}</TableCell>
            <TableCell class="pr-6">
              <span
                :class="cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                  statusMeta[order.status].classes,
                )"
              >
                <span class="size-1.5 rounded-full bg-current" />
                {{ statusMeta[order.status].label }}
              </span>
            </TableCell>
          </TableRow>
          <TableRow v-if="orders.length === 0">
            <TableCell colspan="6" class="h-24 text-center text-muted-foreground">
              No open orders.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
