<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Sparkles } from 'lucide-vue-next'
import { usePagination } from '@/composables/usePagination'
import { toast } from 'vue-sonner'
import { useRoomsStore } from '@/stores/rooms'
import type { Room } from '@/types/room'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import RoomDialog from '@/components/rooms/RoomDialog.vue'
import RoomCleaningSheet from '@/components/rooms/RoomCleaningSheet.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

const store = useRoomsStore()

const dialogOpen = ref(false)
const selectedRoom = ref<Room | null>(null)
const cleaningSheetOpen = ref(false)
const cleaningRoom = ref<Room | null>(null)
const deleteDialogOpen = ref(false)
const roomToDelete = ref<Room | null>(null)
const search = ref('')
const deleting = ref(false)

onMounted(() => {
  store.fetchRooms()
})

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.rooms
  return store.rooms.filter(
    r =>
      r.name.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q),
  )
})

const { page, totalPages, paginated, prev, next, goTo, pageNumbers } = usePagination(filtered)

function openCreate() {
  selectedRoom.value = null
  dialogOpen.value = true
}

function openEdit(room: Room) {
  selectedRoom.value = room
  dialogOpen.value = true
}

function confirmDelete(room: Room) {
  roomToDelete.value = room
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!roomToDelete.value) return
  deleting.value = true
  const name = roomToDelete.value.name
  try {
    await store.deleteRoom(roomToDelete.value.id)
    toast.success(`${name} deleted.`)
  } catch {
    toast.error('Failed to delete room.')
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    roomToDelete.value = null
  }
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  available: 'default',
  occupied: 'secondary',
  reserved: 'outline',
  not_ready: 'destructive',
}

const statusLabel: Record<string, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  not_ready: 'Not Ready',
}

const typeLabel: Record<string, string> = {
  single: 'Single',
  double: 'Double',
  suite: 'Suite',
  cabin: 'Cabin',
  conference: 'Conference',
}
</script>

<template>
  <DashboardHeader title="Rooms" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative max-w-xs w-full">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input v-model="search" placeholder="Search rooms..." class="pl-9" />
      </div>
      <Button @click="openCreate">
        <Plus class="size-4 mr-2" />
        Add Room
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Room</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Price / Night</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amenities</TableHead>
            <TableHead class="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 5" :key="i">
              <TableCell colspan="7">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="filtered.length === 0">
            <TableRow>
              <TableCell colspan="7" class="py-16 text-center text-muted-foreground">
                {{ store.rooms.length === 0 ? 'No rooms yet. Add one to get started.' : 'No rooms match your search.' }}
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow v-for="room in paginated" :key="room.id">
              <TableCell class="font-medium">{{ room.name }}</TableCell>
              <TableCell>{{ typeLabel[room.type] ?? room.type }}</TableCell>
              <TableCell>{{ room.capacity }} guest{{ room.capacity === 1 ? '' : 's' }}</TableCell>
              <TableCell>ZMW {{ room.price_per_night.toLocaleString() }}</TableCell>
              <TableCell>
                <Badge :variant="statusVariant[room.status] ?? 'outline'">
                  {{ statusLabel[room.status] ?? room.status }}
                </Badge>
              </TableCell>
              <TableCell>
                <div class="flex flex-wrap gap-1 max-w-xs">
                  <Badge
                    v-for="amenity in room.amenities.slice(0, 3)"
                    :key="amenity"
                    variant="secondary"
                    class="text-xs"
                  >
                    {{ amenity }}
                  </Badge>
                  <Badge v-if="room.amenities.length > 3" variant="outline" class="text-xs">
                    +{{ room.amenities.length - 3 }}
                  </Badge>
                </div>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" class="size-8 text-muted-foreground hover:text-foreground" title="Cleaning assignments" @click="cleaningRoom = room; cleaningSheetOpen = true">
                    <Sparkles class="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-8" @click="openEdit(room)">
                    <Pencil class="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(room)">
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-10 py-3 border-t text-sm">
        <p class="text-muted-foreground">Page {{ page }} of {{ totalPages }}</p>
        <div class="flex items-center gap-1">
          <button
            class="size-8 flex items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page === 1"
            @click="prev"
          ><ChevronLeft class="size-4" /></button>
          <template v-for="p in pageNumbers" :key="p">
            <span v-if="p === '...'" class="px-1 text-muted-foreground">…</span>
            <button
              v-else
              :class="['size-8 flex items-center justify-center rounded-md border text-sm', p === page ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted']"
              @click="goTo(p as number)"
            >{{ p }}</button>
          </template>
          <button
            class="size-8 flex items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page === totalPages"
            @click="next"
          ><ChevronRight class="size-4" /></button>
        </div>
      </div>
    </div>
  </div>

  <RoomCleaningSheet
    v-model:open="cleaningSheetOpen"
    :room="cleaningRoom"
  />

  <!-- Create / Edit dialog -->
  <RoomDialog
    v-model:open="dialogOpen"
    :room="selectedRoom"
    @saved="dialogOpen = false"
  />

  <!-- Delete confirmation -->
  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Room</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete <strong>{{ roomToDelete?.name }}</strong>?
          This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">
          Cancel
        </Button>
        <Button
          variant="destructive"
          :disabled="deleting"
          @click="handleDelete"
        >
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
