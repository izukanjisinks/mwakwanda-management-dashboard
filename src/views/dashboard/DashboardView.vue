<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { CalendarCheck, LogIn, LogOut, DollarSign, AlarmClock, Inbox, ChefHat, Martini, ReceiptText, BedDouble } from 'lucide-vue-next'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import AttentionTile from '@/components/dashboard/AttentionTile.vue'
import { Card, CardContent } from '@/components/ui/card'
import RevenueChart from '@/components/dashboard/RevenueChart.vue'
import ReservationsChart from '@/components/dashboard/ReservationsChart.vue'
import BookingTable from '@/components/dashboard/BookingTable.vue'
// import OverallRating from '@/components/dashboard/OverallRating.vue'
import ActivityFeed from '@/components/dashboard/ActivityFeed.vue'

const authStore = useAuthStore()
const dashboardStore = useDashboardStore()
const branchFilterStore = useBranchFilterStore()
const router = useRouter()

const STAFF_ROLES = ['admin', 'branch_admin', 'manager', 'receptionist']

function loadDashboard() {
  if (!STAFF_ROLES.includes(authStore.userRole ?? '')) return
  dashboardStore.fetchStats()
  dashboardStore.fetchNeedsAttention()
}

onMounted(() => {
  if (authStore.userRole === 'cleaner') {
    router.replace({ name: 'cleaner-dashboard' })
    return
  }
  loadDashboard()
})

watch(() => branchFilterStore.selectedBranchId, loadDashboard)

const roomSummary = computed(() => dashboardStore.stats?.room_summary)
const roomTotal = computed(() => {
  const r = roomSummary.value
  return (r?.occupied ?? 0) + (r?.reserved ?? 0) + (r?.available ?? 0) + (r?.not_ready ?? 0)
})
function roomPct(n: number) {
  return roomTotal.value > 0 ? (n / roomTotal.value) * 100 : 0
}
const statCards = computed(() => dashboardStore.stats?.stat_cards)
const revenueData = computed(() => dashboardStore.stats?.revenue_by_month ?? [])
const reservationsData = computed(() => dashboardStore.stats?.reservations_by_day ?? [])
const recentBookings = computed(() => dashboardStore.stats?.recent_bookings ?? [])
const needsAttention = computed(() => dashboardStore.needsAttention)
</script>

<template>
  <!-- Staff Dashboard -->
  <template v-if="STAFF_ROLES.includes(authStore.userRole ?? '')">
    <DashboardHeader title="Dashboard" />

    <div class="flex flex-1 gap-6 p-6">
      <!-- Main content -->
      <div class="flex flex-1 flex-col gap-6 min-w-0">

        <!-- Needs Attention -->
        <div>
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Needs Attention</h2>
          <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <AttentionTile
              label="Overstaying Guests"
              :value="needsAttention?.overstayingGuests ?? 0"
              detail="Past checkout"
              :icon="AlarmClock"
              severity="critical"
              :to="{ name: 'room-status', query: { filter: 'overstaying' } }"
            />
            <AttentionTile
              label="Pending Approvals"
              :value="needsAttention?.pendingApprovals ?? 0"
              detail="Booking requests awaiting review"
              :icon="Inbox"
              severity="warning"
              :to="{ name: 'workflow-tasks' }"
            />
            <AttentionTile
              label="Kitchen Backlog"
              :value="needsAttention?.kitchenBacklog ?? 0"
              detail="Open kitchen orders"
              :icon="ChefHat"
              severity="warning"
              :to="{ name: 'kitchen' }"
            />
            <AttentionTile
              label="Bar Backlog"
              :value="needsAttention?.barBacklog ?? 0"
              detail="Open bar orders"
              :icon="Martini"
              severity="warning"
              :to="{ name: 'bar' }"
            />
            <AttentionTile
              label="Invoices Overdue"
              :value="needsAttention?.invoicesOverdueCount ?? 0"
              :detail="needsAttention ? `ZMW ${needsAttention.invoicesOverdueAmount.toLocaleString()} outstanding` : undefined"
              :icon="ReceiptText"
              severity="critical"
              :to="{ name: 'admin-invoices' }"
            />
          </div>
        </div>

        <!-- Today's Operations -->
        <div>
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Operations</h2>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Check-In Today" :value="statCards?.checkins_today ?? 0" :icon="LogIn" icon-color="bg-accent/10 text-accent" />
            <StatCard title="Check-Out Today" :value="statCards?.checkouts_today ?? 0" :icon="LogOut" icon-color="bg-chart-3/10 text-chart-3" />

            <Card class="py-4">
              <CardContent class="px-4 flex flex-col gap-2">
                <div class="flex items-start justify-between">
                  <div class="flex flex-col gap-1">
                    <span class="text-sm text-muted-foreground">Rooms Occupied</span>
                    <span class="text-2xl font-semibold tracking-tight">
                      {{ roomSummary?.occupied ?? 0 }}<span class="text-sm font-normal text-muted-foreground">/{{ roomTotal }}</span>
                    </span>
                  </div>
                  <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BedDouble class="size-5" />
                  </div>
                </div>
                <div class="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <span class="h-full bg-primary" :style="{ width: roomPct(roomSummary?.occupied ?? 0) + '%' }" />
                  <span class="h-full bg-chart-3" :style="{ width: roomPct(roomSummary?.reserved ?? 0) + '%' }" />
                  <span class="h-full bg-accent" :style="{ width: roomPct(roomSummary?.available ?? 0) + '%' }" />
                  <span class="h-full bg-muted-foreground" :style="{ width: roomPct(roomSummary?.not_ready ?? 0) + '%' }" />
                </div>
                <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span class="flex items-center gap-1"><span class="size-1.5 rounded-full bg-primary inline-block" />Occupied</span>
                  <span class="flex items-center gap-1"><span class="size-1.5 rounded-full bg-chart-3 inline-block" />Reserved</span>
                  <span class="flex items-center gap-1"><span class="size-1.5 rounded-full bg-accent inline-block" />Available</span>
                  <span class="flex items-center gap-1"><span class="size-1.5 rounded-full bg-muted-foreground inline-block" />Not Ready</span>
                </div>
              </CardContent>
            </Card>

            <StatCard title="New Bookings (Month)" :value="statCards?.new_bookings_this_month ?? 0" :icon="CalendarCheck" />
          </div>
        </div>

        <!-- Trends -->
        <div>
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends</h2>
          <div class="grid gap-6 lg:grid-cols-2">
            <RevenueChart :data="revenueData" />
            <ReservationsChart :data="reservationsData" />
          </div>
        </div>

        <!-- Booking table -->
        <BookingTable :bookings="recentBookings" />
      </div>

      <!-- Right sidebar -->
      <aside class="hidden w-80 shrink-0 flex-col gap-6 xl:flex self-stretch">
        <!-- <OverallRating /> -->
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
