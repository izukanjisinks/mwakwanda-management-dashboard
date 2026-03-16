<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, X, Plus } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useRoomsStore } from '@/stores/rooms'
import type { Room, RoomType, RoomStatus } from '@/types/room'

const props = defineProps<{
  open: boolean
  room?: Room | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [room: Room]
}>()

const store = useRoomsStore()
const saving = ref(false)
const error = ref('')
const amenityInput = ref('')

const isEdit = computed(() => !!props.room)

const form = ref({
  name: '',
  type: 'single' as RoomType,
  capacity: 1,
  price_per_night: 0,
  status: 'available' as RoomStatus,
  description: '',
  amenities: [] as string[],
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  amenityInput.value = ''
  if (props.room) {
    form.value = {
      name: props.room.name,
      type: props.room.type,
      capacity: props.room.capacity,
      price_per_night: props.room.price_per_night,
      status: props.room.status,
      description: props.room.description ?? '',
      amenities: [...props.room.amenities],
    }
  } else {
    form.value = {
      name: '',
      type: 'single',
      capacity: 1,
      price_per_night: 0,
      status: 'available',
      description: '',
      amenities: [],
    }
  }
})

function addAmenity() {
  const val = amenityInput.value.trim()
  if (val && !form.value.amenities.includes(val)) {
    form.value.amenities.push(val)
  }
  amenityInput.value = ''
}

function removeAmenity(amenity: string) {
  form.value.amenities = form.value.amenities.filter(a => a !== amenity)
}

function handleAmenityKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    addAmenity()
  }
}

async function handleSave() {
  error.value = ''
  if (!form.value.name.trim()) { error.value = 'Room name is required.'; return }
  if (form.value.price_per_night <= 0) { error.value = 'Price must be greater than 0.'; return }
  if (form.value.capacity < 1) { error.value = 'Capacity must be at least 1.'; return }

  saving.value = true
  try {
    let saved: Room
    if (isEdit.value && props.room) {
      saved = await store.updateRoom(props.room.id, form.value)
    } else {
      saved = await store.createRoom(form.value)
    }
    toast.success(isEdit.value ? 'Room updated successfully.' : 'Room added successfully.')
    emit('saved', saved)
    emit('update:open', false)
  } catch (err: any) {
    error.value = err?.error?.message ?? 'Failed to save room.'
    toast.error(error.value)
  } finally {
    saving.value = false
  }
}

const roomTypes: { value: RoomType; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'double', label: 'Double' },
  { value: 'suite', label: 'Suite' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'conference', label: 'Conference' },
]

const roomStatuses: { value: RoomStatus; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'not_ready', label: 'Not Ready' },
]
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit Room' : 'Add New Room' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Update the room details below.' : 'Fill in the details to add a new room.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <!-- Error -->
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <!-- Name -->
        <div class="grid gap-2">
          <Label for="name">Room Name *</Label>
          <Input id="name" v-model="form.name" placeholder="e.g. Room 101" />
        </div>

        <!-- Type & Status -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label>Room Type *</Label>
            <Select v-model="form.type">
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in roomTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-2">
            <Label>Status *</Label>
            <Select v-model="form.status">
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="s in roomStatuses" :key="s.value" :value="s.value">
                  {{ s.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Capacity & Price -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="capacity">Capacity (guests) *</Label>
            <Input id="capacity" v-model.number="form.capacity" type="number" min="1" placeholder="2" />
          </div>

          <div class="grid gap-2">
            <Label for="price">Price per Night (ZMW) *</Label>
            <Input id="price" v-model.number="form.price_per_night" type="number" min="0" placeholder="1200" />
          </div>
        </div>

        <!-- Description -->
        <div class="grid gap-2">
          <Label for="description">Description</Label>
          <textarea
            id="description"
            v-model="form.description"
            rows="3"
            placeholder="Brief description of the room..."
            class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        <!-- Amenities -->
        <div class="grid gap-2">
          <Label>Amenities</Label>
          <div class="flex gap-2">
            <Input
              v-model="amenityInput"
              placeholder="e.g. Wi-Fi"
              @keydown="handleAmenityKeydown"
            />
            <Button type="button" variant="outline" size="icon" @click="addAmenity">
              <Plus class="size-4" />
            </Button>
          </div>
          <div v-if="form.amenities.length > 0" class="flex flex-wrap gap-2 mt-1">
            <Badge
              v-for="amenity in form.amenities"
              :key="amenity"
              variant="secondary"
              class="gap-1 pr-1"
            >
              {{ amenity }}
              <button type="button" @click="removeAmenity(amenity)" class="ml-1 hover:text-destructive transition-colors">
                <X class="size-3" />
              </button>
            </Badge>
          </div>
        </div>
      </form>

      <DialogFooter class="gap-2">
        <Button variant="outline" @click="emit('update:open', false)" :disabled="saving">
          Cancel
        </Button>
        <Button @click="handleSave" :disabled="saving">
          <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
          {{ isEdit ? 'Save Changes' : 'Add Room' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
