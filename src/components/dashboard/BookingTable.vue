<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

import type { DashboardRecentBooking } from '@/types/dashboard'

const props = defineProps<{
  bookings: DashboardRecentBooking[]
}>()

// The dashboard's recent-bookings summary has no per-booking overstay flag,
// unlike the full Booking type — approximated the same way as the rest of
// this redesign (check_out date passed while still checked in). This misses
// a booking whose checkout the nightly auto-extend job has already pushed
// forward, same caveat as the Needs Attention / Room Status overstay counts.
function effectiveStatus(b: DashboardRecentBooking): string {
  if (b.status === 'checked_in' && new Date(b.check_out) < new Date(new Date().toDateString())) {
    return 'overstaying'
  }
  return b.status
}

const statusMeta: Record<string, { label: string; classes: string }> = {
  confirmed:    { label: 'Confirmed',   classes: 'bg-primary/10 text-primary' },
  checked_in:   { label: 'Checked In',  classes: 'bg-accent/10 text-accent' },
  checked_out:  { label: 'Checked Out', classes: 'bg-muted text-muted-foreground' },
  pending:      { label: 'Pending',     classes: 'bg-chart-3/10 text-chart-3' },
  cancelled:    { label: 'Cancelled',   classes: 'bg-destructive/10 text-destructive' },
  overstaying:  { label: 'Overstaying', classes: 'bg-destructive/10 text-destructive' },
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

const rows = computed(() => props.bookings)
</script>

<template>
  <Card class="flex flex-col">
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Recent Bookings</CardTitle>
      <CardAction>
        <RouterLink
          :to="{ name: 'admin-bookings' }"
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
            <TableHead class="pl-6">Booking</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Rooms/Venues</TableHead>
            <TableHead>Stay</TableHead>
            <TableHead class="pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="booking in rows" :key="booking.id">
            <TableCell class="pl-6 font-mono text-sm text-muted-foreground">{{ booking.booking_number }}</TableCell>
            <TableCell>
              <div class="font-medium">{{ booking.client_name }}</div>
              <div class="text-xs text-muted-foreground capitalize">{{ booking.booker_type }}</div>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground capitalize">
              {{ booking.venue_name || `${booking.room_type} · ${booking.room_name}` }}
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ fmtDate(booking.check_in) }} → {{ fmtDate(booking.check_out) }}
            </TableCell>
            <TableCell class="pr-6">
              <span
                :class="cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                  statusMeta[effectiveStatus(booking)]?.classes ?? 'bg-muted text-muted-foreground',
                )"
              >
                <span class="size-1.5 rounded-full bg-current" />
                {{ statusMeta[effectiveStatus(booking)]?.label ?? booking.status.replace('_', ' ') }}
              </span>
            </TableCell>
          </TableRow>
          <TableRow v-if="rows.length === 0">
            <TableCell colspan="5" class="h-24 text-center text-muted-foreground">
              No bookings found.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
