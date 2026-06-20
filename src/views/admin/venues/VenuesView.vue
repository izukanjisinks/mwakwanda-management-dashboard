<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Images } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useVenuesStore } from '@/stores/venues'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { Venue } from '@/types/venue'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import VenueDialog from '@/components/venues/VenueDialog.vue'
import VenueImageDialog from '@/components/venues/VenueImageDialog.vue'
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

const store = useVenuesStore()
const authStore = useAuthStore()
const branchFilterStore = useBranchFilterStore()

const isReadOnly = computed(() => authStore.userRole === 'cleaner')

const dialogOpen = ref(false)
const selectedVenue = ref<Venue | null>(null)
const deleteDialogOpen = ref(false)
const venueToDelete = ref<Venue | null>(null)
const imageDialogOpen = ref(false)
const imageVenue = ref<Venue | null>(null)
const search = ref('')
const deleting = ref(false)

const page = ref(1)
const pageSize = 10

function loadVenues() {
  store.fetchVenues(page.value, pageSize)
}

onMounted(loadVenues)
watch(page, loadVenues)
watch(() => branchFilterStore.selectedBranchId, () => { page.value = 1; loadVenues() })

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / pageSize)))

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.venues
  return store.venues.filter(v =>
    v.name.toLowerCase().includes(q) ||
    v.venue_type.toLowerCase().includes(q),
  )
})

function openCreate() {
  selectedVenue.value = null
  dialogOpen.value = true
}

function openEdit(venue: Venue) {
  selectedVenue.value = venue
  dialogOpen.value = true
}

function confirmDelete(venue: Venue) {
  venueToDelete.value = venue
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!venueToDelete.value) return
  deleting.value = true
  const name = venueToDelete.value.name
  try {
    await store.deleteVenue(venueToDelete.value.id)
    toast.success(`${name} deleted.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to delete venue.'))
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    venueToDelete.value = null
  }
}

const typeLabel: Record<string, string> = {
  conference_hall: 'Conference Hall',
  event_space: 'Event Space',
  boardroom: 'Boardroom',
  outdoor: 'Outdoor',
  dining: 'Dining',
}

function rateLabel(venue: Venue): string {
  const basis = venue.rate_type === 'hourly' ? 'hr' : 'day'
  return `ZMW ${venue.base_rate.toLocaleString()} / ${basis}`
}
</script>

<template>
  <DashboardHeader title="Venues" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative max-w-xs w-full">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input v-model="search" placeholder="Search venues..." class="pl-9" />
      </div>
      <Button v-if="!isReadOnly" @click="openCreate">
        <Plus class="size-4 mr-2" />
        Add Venue
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>Venue</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Hire Rate</TableHead>
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
                {{ store.venues.length === 0 ? 'No venues yet. Add one to get started.' : 'No venues match your search.' }}
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow v-for="venue in filtered" :key="venue.id">
              <TableCell class="font-medium">{{ venue.name }}</TableCell>
              <TableCell>{{ typeLabel[venue.venue_type] ?? venue.venue_type }}</TableCell>
              <TableCell>{{ venue.capacity }} {{ venue.capacity === 1 ? 'person' : 'people' }}</TableCell>
              <TableCell>{{ rateLabel(venue) }}</TableCell>
              <TableCell>
                <Badge :variant="venue.is_available ? 'default' : 'secondary'">
                  {{ venue.is_available ? 'In Service' : 'Out of Service' }}
                </Badge>
              </TableCell>
              <TableCell>
                <div class="flex flex-wrap gap-1 max-w-xs">
                  <Badge v-for="amenity in venue.amenities.slice(0, 3)" :key="amenity" variant="secondary" class="text-xs">
                    {{ amenity }}
                  </Badge>
                  <Badge v-if="venue.amenities.length > 3" variant="outline" class="text-xs">
                    +{{ venue.amenities.length - 3 }}
                  </Badge>
                </div>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" class="size-8 text-muted-foreground hover:text-foreground" title="Upload images" @click="imageVenue = venue; imageDialogOpen = true">
                    <Images class="size-4" />
                  </Button>
                  <template v-if="!isReadOnly">
                    <Button variant="ghost" size="icon" class="size-8" @click="openEdit(venue)">
                      <Pencil class="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(venue)">
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
        <span>{{ store.total }} venue{{ store.total !== 1 ? 's' : '' }}</span>
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

  <VenueImageDialog v-model:open="imageDialogOpen" :venue="imageVenue" />
  <VenueDialog v-model:open="dialogOpen" :venue="selectedVenue" @saved="dialogOpen = false" />

  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Venue</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete <strong>{{ venueToDelete?.name }}</strong>?
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
