<script setup lang="ts">
import OrderVolumeChart from '@/components/dashboard/OrderVolumeChart.vue'
import OrdersByStationChart from '@/components/dashboard/OrdersByStationChart.vue'
import RecentOrdersTable from '@/components/dashboard/RecentOrdersTable.vue'
import type { DashboardOrders } from '@/types/dashboard'

defineProps<{
  data: DashboardOrders | null
  loading: boolean
}>()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Trends -->
    <div>
      <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends</h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <OrderVolumeChart :data="data?.volume_by_day ?? []" />
        <OrdersByStationChart :data="data?.by_station ?? { kitchen: 0, bar: 0, bakery: 0, grill: 0 }" />
      </div>
    </div>

    <!-- Recent orders -->
    <RecentOrdersTable :orders="data?.recent_orders ?? []" />
  </div>
</template>
