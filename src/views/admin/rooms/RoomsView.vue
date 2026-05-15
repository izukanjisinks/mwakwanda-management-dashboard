<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Sparkles, Images } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useRoomsStore } from '@/stores/rooms'
import { useAuthStore } from '@/stores/auth'
import type { Room } from '@/types/room'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import RoomDialog from '@/components/rooms/RoomDialog.vue'
import RoomCleaningSheet from '@/components/rooms/RoomCleaningSheet.vue'
import RoomImageDialog from '@/components/rooms/RoomImageDialog.vue'
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
const authStore = useAuthStore()

const isReadOnly = computed(() => authStore.userRole === 'cleaner')

const dialogOpen = ref(false)
const selectedRoom = ref<Room | null>(null)
const cleaningSheetOpen = ref(false)
const cleaningRoom = ref<Room | null>(null)
const deleteDialogOpen = ref(false)
const roomToDelete = ref<Room | null>(null)
const imageDialogOpen = ref(false)
const imageRoom = ref<Room | null>(null)
const search = ref('')
const deleting = ref(false)

const page = ref(1)
const pageSize = 10

function loadRooms() {
  store.fetchRooms(page.value, pageSize)
}

onMounted(loadRooms)
watch(page, loadRooms)

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / pageSize)))

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.rooms
  return store.rooms.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.type.toLowerCase().includes(q),
  )
})

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
  } catch (err) {
    toast.error(getApiError(err, 'Failed to delete room.'))
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    roomToDelete.value = null
  }
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
      <Button v-if="!isReadOnly" @click="openCreate">
        <Plus class="size-4 mr-2" />
        Add Room
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/30">
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
            <TableRow v-for="room in filtered" :key="room.id">
              <TableCell class="font-medium">{{ room.name }}</TableCell>
              <TableCell>{{ typeLabel[room.type] ?? room.type }}</TableCell>
              <TableCell>{{ room.capacity }} guest{{ room.capacity === 1 ? '' : 's' }}</TableCell>
              <TableCell>ZMW {{ room.price_per_night.toLocaleString() }}</TableCell>
              <TableCell>
                <Badge :variant="room.is_available ? 'default' : 'secondary'">
                  {{ room.is_available ? 'In Service' : 'Out of Service' }}
                </Badge>
              </TableCell>
              <TableCell>
                <div class="flex flex-wrap gap-1 max-w-xs">
                  <Badge v-for="amenity in room.amenities.slice(0, 3)" :key="amenity" variant="secondary" class="text-xs">
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
                  <Button variant="ghost" size="icon" class="size-8 text-muted-foreground hover:text-foreground" title="Upload images" @click="imageRoom = room; imageDialogOpen = true">
                    <Images class="size-4" />
                  </Button>
                  <template v-if="!isReadOnly">
                    <Button variant="ghost" size="icon" class="size-8" @click="openEdit(room)">
                      <Pencil class="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(room)">
                      <Trash2 class="size-4" />
                    </Button>
                  </template>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
        <span>{{ store.total }} room{{ store.total !== 1 ? 's' : '' }}</span>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" class="size-8" :disabled="page <= 1" @click="page--">
            <ChevronLeft class="size-4" />
          </Button>
          <span>{{ page }} / {{ totalPages }}</span>
          <Button variant="outline" size="icon" class="size-8" :disabled="page >= totalPages" @click="page++">
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>

  <RoomImageDialog v-model:open="imageDialogOpen" :room="imageRoom" />
  <RoomCleaningSheet v-model:open="cleaningSheetOpen" :room="cleaningRoom" />
  <RoomDialog v-model:open="dialogOpen" :room="selectedRoom" @saved="dialogOpen = false" />

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
        <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="handleDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
