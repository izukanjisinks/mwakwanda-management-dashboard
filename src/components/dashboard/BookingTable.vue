<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, ArrowRight } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardAction, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import type { DashboardRecentBooking } from '@/types/dashboard'

const props = defineProps<{
  bookings: DashboardRecentBooking[]
}>()

const statusColors: Record<string, string> = {
  'confirmed':   'bg-accent/20 text-accent border-accent/30',
  'checked_in':  'bg-accent/20 text-accent border-accent/30',
  'pending':     'bg-chart-3/20 text-chart-3 border-chart-3/30',
  'checked_out': 'bg-muted text-muted-foreground border-border',
  'cancelled':   'bg-destructive/20 text-destructive border-destructive/30',
}

const search = ref('')

const filtered = computed(() => props.bookings.filter(b => {
  return search.value === '' ||
    b.client_name.toLowerCase().includes(search.value.toLowerCase()) ||
    b.id.toLowerCase().includes(search.value.toLowerCase())
}))
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
      </CardAction>
    </CardHeader>

    <CardContent class="px-0">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead class="pl-6">Booking ID</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Room Type</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Check-In / Check-Out</TableHead>
            <TableHead class="pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="booking in filtered" :key="booking.id">
            <TableCell class="pl-6 font-medium">{{ booking.id }}</TableCell>
            <TableCell>{{ booking.client_name }}</TableCell>
            <TableCell>
              <Badge variant="secondary" class="text-xs capitalize">
                {{ booking.room_type }}
              </Badge>
            </TableCell>
            <TableCell>{{ booking.room_name }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ booking.check_in }} — {{ booking.check_out }}
            </TableCell>
            <TableCell class="pr-6">
              <Badge variant="outline" :class="cn('text-xs capitalize', statusColors[booking.status] ?? '')">
                {{ booking.status.replace('_', ' ') }}
              </Badge>
            </TableCell>
          </TableRow>
          <TableRow v-if="filtered.length === 0">
            <TableCell colspan="6" class="h-24 text-center text-muted-foreground">
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
