<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRoomsStore } from '@/stores/rooms'
import { CalendarCheck, LogIn, LogOut, DollarSign } from 'lucide-vue-next'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import RoomAvailability from '@/components/dashboard/RoomAvailability.vue'
import RevenueChart from '@/components/dashboard/RevenueChart.vue'
import ReservationsChart from '@/components/dashboard/ReservationsChart.vue'
import BookingPlatformChart from '@/components/dashboard/BookingPlatformChart.vue'
import BookingTable from '@/components/dashboard/BookingTable.vue'
import OverallRating from '@/components/dashboard/OverallRating.vue'
import TaskList from '@/components/dashboard/TaskList.vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'

const authStore = useAuthStore()
const roomsStore = useRoomsStore()

onMounted(() => {
  if (authStore.userRole === 'admin') {
    roomsStore.fetchRooms()
  }
})

const roomData = computed(() => ({
  occupied: roomsStore.summary.occupied,
  reserved: roomsStore.summary.reserved,
  available: roomsStore.summary.available,
  notReady: roomsStore.summary.not_ready,
}))
</script>

<template>
  <!-- Admin Dashboard -->
  <template v-if="authStore.userRole === 'admin'">
    <DashboardHeader title="Dashboard" />

    <div class="flex flex-1 gap-6 p-6">
      <!-- Main content -->
      <div class="flex flex-1 flex-col gap-6 min-w-0">
        <!-- Stat cards -->
        <div class="grid gap-4 sm:grid-cols-3">
          <StatCard title="New Bookings" :value="840" :change="8.7" :icon="CalendarCheck" />
          <StatCard title="Check-In" :value="231" :change="3.56" :icon="LogIn" icon-color="bg-accent/10 text-accent" />
          <StatCard title="Check-Out" :value="124" :change="-1.06" :icon="LogOut" icon-color="bg-chart-3/10 text-chart-3" />
          <!-- <StatCard title="Total Revenue" value="$123,980" :change="5.7" :icon="DollarSign" icon-color="bg-chart-4/10 text-chart-4" /> -->
        </div>

        <!-- Charts row 1 -->
        <div class="grid gap-6 lg:grid-cols-2">
          <RoomAvailability v-bind="roomData" />
          <RevenueChart />
        </div>

        <!-- Charts row 2 -->
        <div class="grid gap-6">
          <ReservationsChart />
          <!-- <BookingPlatformChart /> -->
        </div>

        <!-- Booking table -->
        <BookingTable />
      </div>

      <!-- Right sidebar -->
      <aside class="hidden w-80 shrink-0 flex-col gap-6 xl:flex self-stretch">
        <OverallRating />
        <!-- <TaskList /> -->
        <ActivityFeed />
      </aside>
    </div>
  </template>

  <!-- Client Dashboard -->
  <template v-else>
    <DashboardHeader title="My Dashboard" />
    <div class="flex flex-col gap-6 p-6 max-w-3xl">
      <div class="grid gap-4 sm:grid-cols-3">
        <StatCard title="Active Bookings" :value="2" :icon="CalendarCheck" />
        <StatCard title="Check-In" :value="1" :icon="LogIn" icon-color="bg-accent/10 text-accent" />
        <StatCard title="Invoices Due" :value="1" :icon="DollarSign" icon-color="bg-chart-4/10 text-chart-4" />
      </div>
    </div>
  </template>
</template>
