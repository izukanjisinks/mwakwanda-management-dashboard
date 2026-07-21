<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { bookingApi } from '@/services/api/bookings'
import { invoiceApi } from '@/services/api/invoices'
import { roomApi } from '@/services/api/room'
import { individualClientApi, corporateClientApi } from '@/services/api/clients'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { effectiveInvoiceStatus } from '@/utils/invoices'
import type { Booking } from '@/types/booking'
import type { Invoice } from '@/types/invoice'
import type { Room } from '@/types/room'
import type { IndividualClient, CorporateClient } from '@/types/client'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VisSingleContainer, VisDonut, VisXYContainer, VisGroupedBar, VisAxis, VisTooltip } from '@unovis/vue'
import CorporateBillingTab from '@/components/reports/CorporateBillingTab.vue'

type Tab = 'overview' | 'corporate-billing'
const activeTab = ref<Tab>('overview')

const branchFilterStore = useBranchFilterStore()

// Overview KPIs/charts need the ENTIRE dataset, not one paginated page — the
// shared bookings/invoices/rooms/clients stores default to small page sizes
// (10-100) sized for their own table pages, which silently truncated every
// figure on this tab. Fetch directly here instead, same convention already
// used by the sibling Corporate Billing tab (page_size: 1000, no store).
const allBookings = ref<Booking[]>([])
const allInvoices = ref<Invoice[]>([])
const allRooms = ref<Room[]>([])
const allIndividualClients = ref<IndividualClient[]>([])
const allCorporateClients = ref<CorporateClient[]>([])
// Room Type Revenue / Top Rooms need each booking's room assignment, which
// only the single-booking detail endpoint returns — the list endpoint above
// doesn't include it. Tracked separately since this fan-out is the slow part
// of the load; the KPIs/status donuts above don't need to wait on it.
const loadingRoomBreakdown = ref(false)

async function loadOverviewData() {
  const branch_id = branchFilterStore.apiBranchId
  const [bookingsRes, invoicesRes, roomsRes, individualRes, corporateRes] = await Promise.all([
    bookingApi.list({ page: 1, page_size: 1000, branch_id }),
    invoiceApi.list({ page: 1, page_size: 1000, branch_id }),
    roomApi.list({ page: 1, page_size: 1000, branch_id }),
    individualClientApi.list({ page: 1, page_size: 1000 }),
    corporateClientApi.list({ page: 1, page_size: 1000 }),
  ])
  allBookings.value = bookingsRes.data ?? []
  allInvoices.value = invoicesRes.data ?? []
  allRooms.value = roomsRes.data ?? []
  allIndividualClients.value = individualRes.data ?? []
  allCorporateClients.value = corporateRes.data ?? []

  loadingRoomBreakdown.value = true
  try {
    allBookings.value = await Promise.all(allBookings.value.map(b => bookingApi.get(b.id)))
  } catch {
    // Keep the list-level bookings already assigned above — KPIs and status
    // donuts still work fine without per-booking room assignment detail.
  } finally {
    loadingRoomBreakdown.value = false
  }
}

onMounted(loadOverviewData)
watch(() => branchFilterStore.selectedBranchId, loadOverviewData)

// ── KPIs ──────────────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const bookings = allBookings.value
  const invoices = allInvoices.value
  const totalRevenue = invoices.filter(i => effectiveInvoiceStatus(i) === 'paid').reduce((s, i) => s + i.total_amount, 0)
  const outstanding = invoices.filter(i => effectiveInvoiceStatus(i) === 'issued' || effectiveInvoiceStatus(i) === 'overdue').reduce((s, i) => s + i.total_amount, 0)
  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length
  const totalClients = allIndividualClients.value.length + allCorporateClients.value.length

  return { totalRevenue, outstanding, activeBookings, totalClients }
})

// ── Booking status breakdown ───────────────────────────────────────────────────
type Seg = { label: string; value: number; color: string }

const bookingSegments = computed<Seg[]>(() => {
  const b = allBookings.value
  return [
    { label: 'Confirmed',   value: b.filter(x => x.status === 'confirmed').length,   color: 'var(--color-primary)' },
    { label: 'Checked In',  value: b.filter(x => x.status === 'checked_in').length,  color: 'var(--color-accent)' },
    { label: 'Checked Out', value: b.filter(x => x.status === 'checked_out').length, color: 'var(--color-chart-3)' },
    { label: 'Pending',     value: b.filter(x => x.status === 'pending').length,     color: 'var(--color-chart-5)' },
    { label: 'Cancelled',   value: b.filter(x => x.status === 'cancelled').length,   color: 'var(--color-destructive)' },
  ].filter(s => s.value > 0)
})

const totalBookings = computed(() => bookingSegments.value.reduce((s, x) => s + x.value, 0))

// ── Invoice status breakdown ──────────────────────────────────────────────────
const invoiceSegments = computed<Seg[]>(() => {
  const inv = allInvoices.value
  return [
    { label: 'Paid',      value: inv.filter(x => effectiveInvoiceStatus(x) === 'paid').length,      color: 'var(--color-accent)' },
    { label: 'Issued',    value: inv.filter(x => effectiveInvoiceStatus(x) === 'issued').length,    color: 'var(--color-primary)' },
    { label: 'Overdue',   value: inv.filter(x => effectiveInvoiceStatus(x) === 'overdue').length,   color: 'var(--color-destructive)' },
    { label: 'Draft',     value: inv.filter(x => effectiveInvoiceStatus(x) === 'draft').length,     color: 'var(--color-muted-foreground)' },
    { label: 'Cancelled', value: inv.filter(x => effectiveInvoiceStatus(x) === 'cancelled').length, color: 'var(--color-chart-3)' },
  ].filter(s => s.value > 0)
})

const totalInvoices = computed(() => invoiceSegments.value.reduce((s, x) => s + x.value, 0))

// ── Room type revenue ─────────────────────────────────────────────────────────
// Room data now lives on the booking's room assignments (a corporate booking can
// span several rooms); attribute the booking's total to its lead room's type.
const roomTypeRevenue = computed(() => {
  const map: Record<string, number> = {}
  allBookings.value.forEach(b => {
    const roomId = b.assignments?.[0]?.room_id
    const room = allRooms.value.find(r => r.id === roomId)
    if (!room) return
    map[room.type] = (map[room.type] ?? 0) + b.total_amount
  })
  return Object.entries(map).map(([type, revenue]) => ({ type, revenue }))
})

// ── Top rooms by bookings ─────────────────────────────────────────────────────
const topRooms = computed(() => {
  const map: Record<string, { name: string; count: number; revenue: number }> = {}
  allBookings.value.forEach(b => {
    const roomName = b.assignments?.[0]?.room_name
    if (!roomName) return
    if (!map[roomName]) map[roomName] = { name: roomName, count: 0, revenue: 0 }
    map[roomName].count++
    map[roomName].revenue += b.total_amount
  })
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5)
})

// ── Client type split ─────────────────────────────────────────────────────────
const clientSplit = computed(() => ({
  individual: allIndividualClients.value.length,
  corporate: allCorporateClients.value.length,
}))

// Unovis helpers
const segValue = (d: Seg) => d.value
const segColor = (d: Seg) => d.color
const segTooltip = (d: Seg) => `<div class="text-xs font-medium">${d.label}: <strong>${d.value}</strong></div>`

const barX = (_: { type: string; revenue: number }, i: number) => i
const barY = (d: { type: string; revenue: number }) => d.revenue
const barColors = ['var(--color-primary)']
const barTooltip = (d: { type: string; revenue: number }) =>
  `<div class="text-xs font-medium capitalize">${d.type}: <strong>ZMW ${d.revenue.toLocaleString()}</strong></div>`
const tickFormat = (_: number, i: number) => {
  const item = roomTypeRevenue.value[i]
  return item ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : ''
}
</script>

<template>
  <DashboardHeader title="Reports" />

  <!-- Tab bar -->
  <div class="border-b bg-background px-6">
    <nav class="flex gap-0">
      <button
        class="relative px-4 py-3 text-sm font-medium transition-colors focus:outline-none"
        :class="activeTab === 'overview'
          ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
          : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'overview'"
      >
        Overview
      </button>
      <button
        class="relative px-4 py-3 text-sm font-medium transition-colors focus:outline-none"
        :class="activeTab === 'corporate-billing'
          ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
          : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'corporate-billing'"
      >
        Corporate Billing
      </button>
    </nav>
  </div>

  <!-- Corporate Billing tab -->
  <div v-if="activeTab === 'corporate-billing'" class="p-6">
    <CorporateBillingTab />
  </div>

  <!-- Overview tab -->
  <div v-else class="flex flex-col gap-6 p-6">

    <!-- KPI Cards -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent class="pt-6">
          <p class="text-xs text-muted-foreground">Total Revenue Collected</p>
          <p class="text-2xl font-semibold mt-1">ZMW {{ kpis.totalRevenue.toLocaleString() }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <p class="text-xs text-muted-foreground">Outstanding Invoices</p>
          <p class="text-2xl font-semibold mt-1">ZMW {{ kpis.outstanding.toLocaleString() }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <p class="text-xs text-muted-foreground">Active Bookings</p>
          <p class="text-2xl font-semibold mt-1">{{ kpis.activeBookings }}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent class="pt-6">
          <p class="text-xs text-muted-foreground">Total Clients</p>
          <p class="text-2xl font-semibold mt-1">{{ kpis.totalClients }}</p>
          <p class="text-xs text-muted-foreground mt-1">
            {{ clientSplit.individual }} individual · {{ clientSplit.corporate }} corporate
          </p>
        </CardContent>
      </Card>
    </div>

    <!-- Charts row -->
    <div class="grid gap-6 lg:grid-cols-2">

      <!-- Booking status donut -->
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-base font-medium">Booking Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col items-center gap-6">
          <div :style="{
            '--vis-donut-central-label-font-size': '1.5rem',
            '--vis-donut-central-label-font-weight': '700',
            '--vis-donut-central-label-text-color': 'var(--foreground)',
            '--vis-donut-central-sub-label-text-color': 'var(--muted-foreground)',
          }">
            <VisSingleContainer :data="bookingSegments" :height="200" :width="200">
              <VisDonut :value="segValue" :color="segColor" :arc-width="36" :central-label="String(totalBookings)" central-sub-label="Bookings" />
              <VisTooltip :template="segTooltip" />
            </VisSingleContainer>
          </div>
          <div class="grid grid-cols-2 gap-x-8 gap-y-2 w-full">
            <div v-for="seg in bookingSegments" :key="seg.label" class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <div class="size-2.5 rounded-sm shrink-0" :style="{ backgroundColor: seg.color }" />
                <span class="text-sm text-muted-foreground">{{ seg.label }}</span>
              </div>
              <span class="text-sm font-semibold">{{ seg.value }}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Invoice status donut -->
      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-base font-medium">Invoice Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col items-center gap-6">
          <div :style="{
            '--vis-donut-central-label-font-size': '1.5rem',
            '--vis-donut-central-label-font-weight': '700',
            '--vis-donut-central-label-text-color': 'var(--foreground)',
            '--vis-donut-central-sub-label-text-color': 'var(--muted-foreground)',
          }">
            <VisSingleContainer :data="invoiceSegments" :height="200" :width="200">
              <VisDonut :value="segValue" :color="segColor" :arc-width="36" :central-label="String(totalInvoices)" central-sub-label="Invoices" />
              <VisTooltip :template="segTooltip" />
            </VisSingleContainer>
          </div>
          <div class="grid grid-cols-2 gap-x-8 gap-y-2 w-full">
            <div v-for="seg in invoiceSegments" :key="seg.label" class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <div class="size-2.5 rounded-sm shrink-0" :style="{ backgroundColor: seg.color }" />
                <span class="text-sm text-muted-foreground">{{ seg.label }}</span>
              </div>
              <span class="text-sm font-semibold">{{ seg.value }}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Revenue by room type bar chart -->
    <Card v-if="loadingRoomBreakdown">
      <CardHeader class="pb-2">
        <CardTitle class="text-base font-medium">Revenue by Room Type (ZMW)</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="h-55 rounded-md bg-muted animate-pulse" />
      </CardContent>
    </Card>
    <Card v-else-if="roomTypeRevenue.length > 0">
      <CardHeader class="pb-2">
        <CardTitle class="text-base font-medium">Revenue by Room Type (ZMW)</CardTitle>
      </CardHeader>
      <CardContent>
        <VisXYContainer :data="roomTypeRevenue" :height="220">
          <VisGroupedBar
            :x="barX"
            :y="[barY]"
            :color="barColors"
            :rounded-corners="4"
            :bar-padding="0.3"
            :group-padding="0"
          />
          <VisAxis
            type="x"
            :x="barX"
            :tick-format="tickFormat"
            :tick-values="roomTypeRevenue.map((_, i) => i)"
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
          <VisTooltip :template="barTooltip" />
        </VisXYContainer>
      </CardContent>
    </Card>

    <!-- Top rooms table -->
    <Card v-if="loadingRoomBreakdown">
      <CardHeader class="pb-2">
        <CardTitle class="text-base font-medium">Top Rooms by Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="h-40 rounded-md bg-muted animate-pulse" />
      </CardContent>
    </Card>
    <Card v-else-if="topRooms.length > 0">
      <CardHeader class="pb-2">
        <CardTitle class="text-base font-medium">Top Rooms by Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex flex-col gap-3">
          <div class="grid grid-cols-12 text-xs text-muted-foreground font-medium px-1 pb-1 border-b">
            <span class="col-span-1">#</span>
            <span class="col-span-5">Room</span>
            <span class="col-span-3 text-right">Bookings</span>
            <span class="col-span-3 text-right">Revenue (ZMW)</span>
          </div>
          <div
            v-for="(room, i) in topRooms"
            :key="room.name"
            class="grid grid-cols-12 text-sm px-1 py-1.5 rounded hover:bg-muted/50"
          >
            <span class="col-span-1 text-muted-foreground">{{ i + 1 }}</span>
            <span class="col-span-5 font-medium">{{ room.name }}</span>
            <span class="col-span-3 text-right">{{ room.count }}</span>
            <span class="col-span-3 text-right font-medium">{{ room.revenue.toLocaleString() }}</span>
          </div>
        </div>
      </CardContent>
    </Card>

  </div>

</template>
