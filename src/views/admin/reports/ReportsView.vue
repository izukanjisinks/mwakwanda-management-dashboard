<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBookingsStore } from '@/stores/bookings'
import { useInvoicesStore } from '@/stores/invoices'
import { useRoomsStore } from '@/stores/rooms'
import { useIndividualClientsStore, useCorporateClientsStore } from '@/stores/clients'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { VisSingleContainer, VisDonut, VisXYContainer, VisGroupedBar, VisAxis, VisTooltip } from '@unovis/vue'

const bookingsStore = useBookingsStore()
const invoicesStore = useInvoicesStore()
const roomsStore = useRoomsStore()
const individualStore = useIndividualClientsStore()
const corporateStore = useCorporateClientsStore()

onMounted(() => {
  bookingsStore.fetchBookings()
  invoicesStore.fetchInvoices()
  roomsStore.fetchRooms()
  individualStore.fetchClients()
  corporateStore.fetchClients()
})

// ── KPIs ──────────────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const bookings = bookingsStore.bookings
  const invoices = invoicesStore.invoices
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0)
  const outstanding = invoices.filter(i => i.status === 'issued' || i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0)
  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length
  const totalClients = individualStore.clients.length + corporateStore.clients.length

  return { totalRevenue, outstanding, activeBookings, totalClients }
})

// ── Booking status breakdown ───────────────────────────────────────────────────
type Seg = { label: string; value: number; color: string }

const bookingSegments = computed<Seg[]>(() => {
  const b = bookingsStore.bookings
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
  const inv = invoicesStore.invoices
  return [
    { label: 'Paid',      value: inv.filter(x => x.status === 'paid').length,      color: 'var(--color-accent)' },
    { label: 'Issued',    value: inv.filter(x => x.status === 'issued').length,    color: 'var(--color-primary)' },
    { label: 'Overdue',   value: inv.filter(x => x.status === 'overdue').length,   color: 'var(--color-destructive)' },
    { label: 'Draft',     value: inv.filter(x => x.status === 'draft').length,     color: 'var(--color-muted-foreground)' },
    { label: 'Cancelled', value: inv.filter(x => x.status === 'cancelled').length, color: 'var(--color-chart-3)' },
  ].filter(s => s.value > 0)
})

const totalInvoices = computed(() => invoiceSegments.value.reduce((s, x) => s + x.value, 0))

// ── Room type revenue ─────────────────────────────────────────────────────────
const roomTypeRevenue = computed(() => {
  const map: Record<string, number> = {}
  bookingsStore.bookings.forEach(b => {
    const room = roomsStore.rooms.find(r => r.id === b.room_id)
    if (!room) return
    map[room.type] = (map[room.type] ?? 0) + b.total_amount
  })
  return Object.entries(map).map(([type, revenue]) => ({ type, revenue }))
})

// ── Top rooms by bookings ─────────────────────────────────────────────────────
const topRooms = computed(() => {
  const map: Record<string, { name: string; count: number; revenue: number }> = {}
  bookingsStore.bookings.forEach(b => {
    if (!map[b.room_name]) map[b.room_name] = { name: b.room_name, count: 0, revenue: 0 }
    map[b.room_name].count++
    map[b.room_name].revenue += b.total_amount
  })
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5)
})

// ── Client type split ─────────────────────────────────────────────────────────
const clientSplit = computed(() => ({
  individual: individualStore.clients.length,
  corporate: corporateStore.clients.length,
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

  <div class="flex flex-col gap-6 p-6">

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
    <Card v-if="roomTypeRevenue.length > 0">
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
    <Card v-if="topRooms.length > 0">
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
