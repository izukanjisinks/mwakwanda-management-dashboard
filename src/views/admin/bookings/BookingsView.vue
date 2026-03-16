<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Search } from 'lucide-vue-next'
import { useBookingsStore } from '@/stores/bookings'
import type { Booking, BookingStatus } from '@/types/booking'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import BookingDialog from '@/components/bookings/BookingDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const store = useBookingsStore()

const dialogOpen = ref(false)
const selectedBooking = ref<Booking | null>(null)
const deleteDialogOpen = ref(false)
const bookingToDelete = ref<Booking | null>(null)
const search = ref('')
const statusFilter = ref<BookingStatus | 'all'>('all')
const deleting = ref(false)

onMounted(() => store.fetchBookings())

const filtered = computed(() => {
  let list = store.bookings
  if (statusFilter.value !== 'all') {
    list = list.filter(b => b.status === statusFilter.value)
  }
  const q = search.value.toLowerCase().trim()
  if (!q) return list
  return list.filter(b =>
    b.client_name.toLowerCase().includes(q) ||
    b.room_name.toLowerCase().includes(q),
  )
})

const statusConfig: Record<BookingStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending:     { label: 'Pending',     variant: 'outline' },
  confirmed:   { label: 'Confirmed',   variant: 'default' },
  checked_in:  { label: 'Checked In',  variant: 'secondary' },
  checked_out: { label: 'Checked Out', variant: 'secondary' },
  cancelled:   { label: 'Cancelled',   variant: 'destructive' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function nights(b: Booking) {
  const diff = new Date(b.check_out).getTime() - new Date(b.check_in).getTime()
  return Math.round(diff / (1000 * 60 * 60 * 24))
}

function openCreate() {
  selectedBooking.value = null
  dialogOpen.value = true
}

function openEdit(booking: Booking) {
  selectedBooking.value = booking
  dialogOpen.value = true
}

function confirmDelete(booking: Booking) {
  bookingToDelete.value = booking
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!bookingToDelete.value) return
  deleting.value = true
  try {
    await store.deleteBooking(bookingToDelete.value.id)
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    bookingToDelete.value = null
  }
}

async function handleStatusChange(booking: Booking, status: BookingStatus) {
  try {
    await store.updateStatus(booking.id, status)
  } catch {}
}
</script>

<template>
  <DashboardHeader title="Bookings" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="relative max-w-xs w-full">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input v-model="search" placeholder="Search bookings..." class="pl-9" />
        </div>
        <Select v-model="statusFilter">
          <SelectTrigger class="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button @click="openCreate">
        <Plus class="size-4 mr-2" />
        New Booking
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Check-In</TableHead>
            <TableHead>Check-Out</TableHead>
            <TableHead>Nights</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Total (ZMW)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 5" :key="i">
              <TableCell colspan="9">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="filtered.length === 0">
            <TableRow>
              <TableCell colspan="9" class="py-16 text-center text-muted-foreground">
                {{ store.bookings.length === 0 ? 'No bookings yet.' : 'No bookings match your filters.' }}
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow v-for="booking in filtered" :key="booking.id">
              <TableCell>
                <div class="font-medium">{{ booking.client_name }}</div>
                <div class="text-xs text-muted-foreground capitalize">{{ booking.client_type }}</div>
              </TableCell>
              <TableCell>{{ booking.room_name }}</TableCell>
              <TableCell>{{ formatDate(booking.check_in) }}</TableCell>
              <TableCell>{{ formatDate(booking.check_out) }}</TableCell>
              <TableCell>{{ nights(booking) }}</TableCell>
              <TableCell>{{ booking.guests }}</TableCell>
              <TableCell class="font-medium">{{ booking.total_amount.toLocaleString() }}</TableCell>
              <TableCell>
                <Select :model-value="booking.status" @update:model-value="(v) => handleStatusChange(booking, v as BookingStatus)">
                  <SelectTrigger class="h-7 text-xs w-32 px-2">
                    <Badge :variant="statusConfig[booking.status].variant" class="text-xs">
                      {{ statusConfig[booking.status].label }}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="(cfg, key) in statusConfig" :key="key" :value="key" class="text-xs">
                      {{ cfg.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" class="size-8" @click="openEdit(booking)">
                    <Pencil class="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(booking)">
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>
  </div>

  <BookingDialog
    v-model:open="dialogOpen"
    :booking="selectedBooking"
    @saved="dialogOpen = false"
  />

  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Booking</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete the booking for
          <strong>{{ bookingToDelete?.client_name }}</strong> in
          <strong>{{ bookingToDelete?.room_name }}</strong>?
          This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="handleDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
