<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, ArrowRight } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type BookingStatus = 'Checked-In' | 'Pending' | 'Checked-Out' | 'Cancelled'
type RoomType = 'Deluxe' | 'Standard' | 'Suite' | 'Cabin'

interface Booking {
  id: string
  guestName: string
  roomType: RoomType
  roomNumber: string
  duration: string
  checkIn: string
  checkOut: string
  status: BookingStatus
}

const bookings: Booking[] = [
  { id: 'LG-B00108', guestName: 'Angus Copper', roomType: 'Deluxe', roomNumber: 'Room 101', duration: '3 nights', checkIn: 'June 19, 2028', checkOut: 'June 22, 2028', status: 'Checked-In' },
  { id: 'LG-B00109', guestName: 'Catherine Loop', roomType: 'Standard', roomNumber: 'Room 202', duration: '2 nights', checkIn: 'June 19, 2028', checkOut: 'June 21, 2028', status: 'Checked-In' },
  { id: 'LG-B00110', guestName: 'Edgar Irving', roomType: 'Suite', roomNumber: 'Room 303', duration: '5 nights', checkIn: 'June 19, 2028', checkOut: 'June 24, 2028', status: 'Pending' },
  { id: 'LG-B00111', guestName: 'Ice B. Holland', roomType: 'Standard', roomNumber: 'Room 105', duration: '4 nights', checkIn: 'June 19, 2028', checkOut: 'June 23, 2028', status: 'Checked-In' },
  { id: 'LG-B00112', guestName: 'Maria Fontaine', roomType: 'Cabin', roomNumber: 'Cabin 07', duration: '7 nights', checkIn: 'June 18, 2028', checkOut: 'June 25, 2028', status: 'Checked-Out' },
  { id: 'LG-B00113', guestName: 'Thomas Reed', roomType: 'Deluxe', roomNumber: 'Room 210', duration: '1 night', checkIn: 'June 19, 2028', checkOut: 'June 20, 2028', status: 'Cancelled' },
]

const roomTypeColors: Record<RoomType, string> = {
  Deluxe: 'bg-primary text-primary-foreground',
  Standard: 'bg-secondary text-secondary-foreground',
  Suite: 'bg-accent text-accent-foreground',
  Cabin: 'bg-chart-3/20 text-foreground',
}

const statusColors: Record<BookingStatus, string> = {
  'Checked-In': 'bg-accent/20 text-accent border-accent/30',
  'Pending': 'bg-chart-3/20 text-chart-3 border-chart-3/30',
  'Checked-Out': 'bg-muted text-muted-foreground border-border',
  'Cancelled': 'bg-destructive/20 text-destructive border-destructive/30',
}

const search = ref('')
const statusFilter = ref('all')

const filtered = computed(() => bookings.filter(b => {
  const matchesSearch = search.value === '' ||
    b.guestName.toLowerCase().includes(search.value.toLowerCase()) ||
    b.id.toLowerCase().includes(search.value.toLowerCase())
  const matchesStatus = statusFilter.value === 'all' ||
    b.status.toLowerCase().replace('-', '') === statusFilter.value
  return matchesSearch && matchesStatus
}).slice(0, 4))
</script>

<template>
  <Card class="flex flex-col">
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Booking List</CardTitle>
      <CardAction class="flex items-center gap-2">
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="search"
            placeholder="Search guest, booking..."
            class="h-8 w-[200px] pl-8 text-xs"
          />
        </div>
        <Select v-model="statusFilter">
          <SelectTrigger class="h-8 w-[110px] text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="checkedin">Checked-In</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="checkedout">Checked-Out</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </CardAction>
    </CardHeader>

    <CardContent class="px-0">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead class="pl-6">Booking ID</TableHead>
            <TableHead>Guest Name</TableHead>
            <TableHead>Room Type</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Check-In / Check-Out</TableHead>
            <TableHead class="pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="booking in filtered" :key="booking.id">
            <TableCell class="pl-6 font-medium">{{ booking.id }}</TableCell>
            <TableCell>{{ booking.guestName }}</TableCell>
            <TableCell>
              <Badge variant="secondary" :class="cn('text-xs', roomTypeColors[booking.roomType])">
                {{ booking.roomType }}
              </Badge>
            </TableCell>
            <TableCell>{{ booking.roomNumber }}</TableCell>
            <TableCell>{{ booking.duration }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ booking.checkIn }} — {{ booking.checkOut }}
            </TableCell>
            <TableCell class="pr-6">
              <Badge variant="outline" :class="cn('text-xs', statusColors[booking.status])">
                {{ booking.status }}
              </Badge>
            </TableCell>
          </TableRow>
          <TableRow v-if="filtered.length === 0">
            <TableCell colspan="7" class="h-24 text-center text-muted-foreground">
              No bookings found.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>

    <CardFooter class="p-0 shrink-0">
      <Button
        variant="ghost"
        class="w-full rounded-t-none border-t h-10 text-sm text-muted-foreground hover:text-foreground gap-2"
      >
        View All Bookings
        <ArrowRight class="size-4" />
      </Button>
    </CardFooter>
  </Card>
</template>
