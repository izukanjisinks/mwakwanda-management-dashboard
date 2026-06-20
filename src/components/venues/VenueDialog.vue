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
import { useVenuesStore } from '@/stores/venues'
import type { Venue, VenueType, VenueRateType } from '@/types/venue'

const props = defineProps<{
  open: boolean
  venue?: Venue | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [venue: Venue]
}>()

const store = useVenuesStore()
const saving = ref(false)
const error = ref('')
const amenityInput = ref('')

const isEdit = computed(() => !!props.venue)

const availabilityModel = computed({
  get: () => form.value.is_available ? 'true' : 'false',
  set: (v: string) => { form.value.is_available = v === 'true' },
})

const form = ref({
  name: '',
  venue_type: 'conference_hall' as VenueType,
  capacity: 1,
  base_rate: 0,
  rate_type: 'daily' as VenueRateType,
  floor: '',
  area_sqm: 0,
  is_available: true,
  notes: '',
  amenities: [] as string[],
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  amenityInput.value = ''
  if (props.venue) {
    form.value = {
      name: props.venue.name,
      venue_type: props.venue.venue_type,
      capacity: props.venue.capacity,
      base_rate: props.venue.base_rate,
      rate_type: props.venue.rate_type,
      floor: props.venue.floor ?? '',
      area_sqm: props.venue.area_sqm ?? 0,
      is_available: props.venue.is_available,
      notes: props.venue.notes ?? '',
      amenities: [...props.venue.amenities],
    }
  } else {
    form.value = {
      name: '',
      venue_type: 'conference_hall',
      capacity: 1,
      base_rate: 0,
      rate_type: 'daily',
      floor: '',
      area_sqm: 0,
      is_available: true,
      notes: '',
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
  if (!form.value.name.trim()) { error.value = 'Venue name is required.'; return }
  if (form.value.base_rate < 0) { error.value = 'Rate cannot be negative.'; return }
  if (form.value.capacity < 1) { error.value = 'Capacity must be at least 1.'; return }

  // Drop area_sqm when zero — it's optional.
  const payload = { ...form.value }
  if (!payload.area_sqm) delete (payload as Partial<typeof payload>).area_sqm

  saving.value = true
  try {
    let saved: Venue
    if (isEdit.value && props.venue) {
      saved = await store.updateVenue(props.venue.id, payload)
    } else {
      saved = await store.createVenue(payload)
    }
    toast.success(isEdit.value ? 'Venue updated successfully.' : 'Venue added successfully.')
    emit('saved', saved)
    emit('update:open', false)
  } catch (err: any) {
    error.value = err?.error?.message ?? 'Failed to save venue.'
    toast.error(error.value)
  } finally {
    saving.value = false
  }
}

const venueTypes: { value: VenueType; label: string }[] = [
  { value: 'conference_hall', label: 'Conference Hall' },
  { value: 'event_space', label: 'Event Space' },
  { value: 'boardroom', label: 'Boardroom' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'dining', label: 'Dining' },
]

const rateTypes: { value: VenueRateType; label: string }[] = [
  { value: 'daily', label: 'Per Day' },
  { value: 'hourly', label: 'Per Hour' },
]
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit Venue' : 'Add New Venue' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Update the venue details below.' : 'Fill in the details to add a new venue.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <!-- Error -->
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <!-- Name -->
        <div class="grid gap-2">
          <Label for="name">Venue Name *</Label>
          <Input id="name" v-model="form.name" placeholder="e.g. Main Hall" />
        </div>

        <!-- Type & Status -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label>Venue Type *</Label>
            <Select v-model="form.venue_type">
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in venueTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-2">
            <Label>Service Status *</Label>
            <Select v-model="availabilityModel">
              <SelectTrigger>
                <SelectValue placeholder="Select availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">In Service</SelectItem>
                <SelectItem value="false">Out of Service</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Capacity & Rate -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="capacity">Capacity (people) *</Label>
            <Input id="capacity" v-model.number="form.capacity" type="number" min="1" placeholder="50" />
          </div>

          <div class="grid gap-2">
            <Label for="rate">Hire Rate (ZMW) *</Label>
            <Input id="rate" v-model.number="form.base_rate" type="number" min="0" placeholder="5000" />
          </div>
        </div>

        <!-- Rate type & Floor -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label>Rate Basis *</Label>
            <Select v-model="form.rate_type">
              <SelectTrigger>
                <SelectValue placeholder="Select basis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="t in rateTypes" :key="t.value" :value="t.value">
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-2">
            <Label for="floor">Floor / Location</Label>
            <Input id="floor" v-model="form.floor" placeholder="e.g. Ground floor" />
          </div>
        </div>

        <!-- Area -->
        <div class="grid gap-2">
          <Label for="area">Area (m²)</Label>
          <Input id="area" v-model.number="form.area_sqm" type="number" min="0" placeholder="120" />
        </div>

        <!-- Notes -->
        <div class="grid gap-2">
          <Label for="notes">Notes</Label>
          <textarea
            id="notes"
            v-model="form.notes"
            rows="3"
            placeholder="Brief description of the venue..."
            class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        <!-- Amenities -->
        <div class="grid gap-2">
          <Label>Amenities</Label>
          <div class="flex gap-2">
            <Input
              v-model="amenityInput"
              placeholder="e.g. Projector"
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
          {{ isEdit ? 'Save Changes' : 'Add Venue' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
