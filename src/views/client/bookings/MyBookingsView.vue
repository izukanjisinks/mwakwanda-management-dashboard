<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBookingsStore } from '@/stores/bookings'
import type { Booking, BookingStatus, BookingRoomAssignment } from '@/types/booking'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const store = useBookingsStore()

onMounted(() => store.fetchBookings())

// Clients only see their own bookings (filtered by auth user in real API; mock shows all)
const bookings = computed(() => store.bookings)

const statusConfig: Record<BookingStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending:     { label: 'Pending',     variant: 'outline' },
  confirmed:   { label: 'Confirmed',   variant: 'default' },
  checked_in:  { label: 'Checked In',  variant: 'secondary' },
  checked_out: { label: 'Checked Out', variant: 'secondary' },
  cancelled:   { label: 'Cancelled',   variant: 'destructive' },
}

// Room and stay dates now come from the booking's lead room assignment.
function leadAssignment(b: Booking): BookingRoomAssignment | undefined {
  return b.assignments?.[0]
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function nights(b: Booking): number | string {
  const a = leadAssignment(b)
  if (!a) return '—'
  const diff = new Date(a.check_out).getTime() - new Date(a.check_in).getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}
</script>

<template>
  <DashboardHeader title="My Bookings" />

  <div class="flex flex-col gap-6 p-6">
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Booking #</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Check-In</TableHead>
            <TableHead>Check-Out</TableHead>
            <TableHead>Nights</TableHead>
            <TableHead>Total (ZMW)</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 4" :key="i">
              <TableCell colspan="7">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="bookings.length === 0">
            <TableRow>
              <TableCell colspan="7" class="py-16 text-center text-muted-foreground">
                You have no bookings yet.
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow v-for="booking in bookings" :key="booking.id">
              <TableCell class="font-mono text-sm">{{ booking.booking_number }}</TableCell>
              <TableCell class="font-medium">{{ leadAssignment(booking)?.room_name || '—' }}</TableCell>
              <TableCell>{{ formatDate(leadAssignment(booking)?.check_in) }}</TableCell>
              <TableCell>{{ formatDate(leadAssignment(booking)?.check_out) }}</TableCell>
              <TableCell>{{ nights(booking) }}</TableCell>
              <TableCell class="font-medium">{{ booking.total_amount.toLocaleString() }}</TableCell>
              <TableCell>
                <Badge :variant="statusConfig[booking.status].variant">
                  {{ statusConfig[booking.status].label }}
                </Badge>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
