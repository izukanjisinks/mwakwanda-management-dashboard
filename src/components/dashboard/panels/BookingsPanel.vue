<script setup lang="ts">
import RevenueChart from '@/components/dashboard/RevenueChart.vue'
import ReservationsChart from '@/components/dashboard/ReservationsChart.vue'
import BookingTable from '@/components/dashboard/BookingTable.vue'
import AttentionTile from '@/components/dashboard/AttentionTile.vue'
import { AlarmClock, Inbox } from 'lucide-vue-next'
import type { DashboardBookings } from '@/types/dashboard'

defineProps<{
  data: DashboardBookings | null
  loading: boolean
}>()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Needs Attention -->
    <!-- <div>
      <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Needs Attention</h2>
      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <AttentionTile
          label="Overstaying Guests"
          :value="data?.overstaying_guests ?? 0"
          detail="Past checkout"
          :icon="AlarmClock"
          severity="critical"
          :to="{ name: 'rooms', query: { filter: 'overstaying' } }"
        />
        <AttentionTile
          label="Pending Approvals"
          :value="data?.pending_approvals ?? 0"
          detail="Booking requests awaiting review"
          :icon="Inbox"
          severity="warning"
          :to="{ name: 'workflow-tasks' }"
        />
      </div>
    </div> -->

    <!-- Trends -->
    <div>
      <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends</h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <RevenueChart :data="data?.revenue_by_month ?? []" />
        <ReservationsChart :data="data?.reservations_breakdown ?? { booked: 0, pending: 0, cancelled: 0 }" />
      </div>
    </div>

    <!-- Recent bookings -->
    <BookingTable :bookings="data?.recent_bookings ?? []" />
  </div>
</template>
