<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { CalendarCheck, LogIn, LogOut, DollarSign } from 'lucide-vue-next'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import BookingsPanel from '@/components/dashboard/panels/BookingsPanel.vue'
import OrdersPanel from '@/components/dashboard/panels/OrdersPanel.vue'
import InvoicesPanel from '@/components/dashboard/panels/InvoicesPanel.vue'

const authStore = useAuthStore()
const dashboardStore = useDashboardStore()
const branchFilterStore = useBranchFilterStore()
const router = useRouter()

const STAFF_ROLES = ['admin', 'branch_admin', 'manager', 'receptionist']

// Tabs under "Today's Operations" — each fetches its own data only when
// selected (or on first load, for the default tab), instead of every panel's
// data being fetched simultaneously on mount.
const opsTabs = [
  { value: 'bookings', label: 'Bookings' },
  { value: 'orders', label: 'Orders' },
  { value: 'invoices', label: 'Invoices' },
] as const
type OpsTab = (typeof opsTabs)[number]['value']
const activeOpsTab = ref<OpsTab>('bookings')

function fetchForTab(tab: OpsTab) {
  if (tab === 'bookings') dashboardStore.fetchBookings()
  else if (tab === 'orders') dashboardStore.fetchOrders()
  else if (tab === 'invoices') dashboardStore.fetchInvoices()
}

function selectTab(tab: OpsTab) {
  activeOpsTab.value = tab
  fetchForTab(tab)
}

function loadDashboard() {
  if (!STAFF_ROLES.includes(authStore.userRole ?? '')) return
  dashboardStore.fetchSummary()
  fetchForTab(activeOpsTab.value)
}

onMounted(() => {
  if (authStore.userRole === 'cleaner') {
    router.replace({ name: 'cleaner-dashboard' })
    return
  }
  loadDashboard()
})

watch(() => branchFilterStore.selectedBranchId, loadDashboard)
</script>

<template>
  <!-- Staff Dashboard -->
  <template v-if="STAFF_ROLES.includes(authStore.userRole ?? '')">
    <DashboardHeader title="Dashboard" />

    <div class="flex flex-1 gap-6 p-6">
      <!-- Main content -->
      <div class="flex flex-1 flex-col gap-6 min-w-0 w-full">

        <!-- Always-loaded summary -->
        <div>
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Operations</h2>

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard size="lg" title="Check-In Today" :value="dashboardStore.summary?.checkins_today ?? 0" :icon="LogIn" icon-color="bg-accent/10 text-accent" />
            <StatCard size="lg" title="Check-Out Today" :value="dashboardStore.summary?.checkouts_today ?? 0" :icon="LogOut" icon-color="bg-chart-3/10 text-chart-3" />
            <StatCard size="lg" title="New Bookings (Month)" :value="dashboardStore.summary?.new_bookings_this_month ?? 0" :icon="CalendarCheck" />
          </div>

          <!-- Tabs -->
          <div class="flex items-center gap-1 bg-muted rounded-lg p-1 w-full mt-4">
            <button
              v-for="tab in opsTabs"
              :key="tab.value"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
              :class="activeOpsTab === tab.value ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="selectTab(tab.value)"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Tab panels — each fetches only when selected -->
        <BookingsPanel v-if="activeOpsTab === 'bookings'" :data="dashboardStore.bookings" :loading="dashboardStore.bookingsLoading" />
        <OrdersPanel v-else-if="activeOpsTab === 'orders'" :data="dashboardStore.orders" :loading="dashboardStore.ordersLoading" />
        <InvoicesPanel v-else-if="activeOpsTab === 'invoices'" :data="dashboardStore.invoices" :loading="dashboardStore.invoicesLoading" />
      </div>
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
