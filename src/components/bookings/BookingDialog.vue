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
import { Loader2 } from 'lucide-vue-next'
import { useBookingsStore } from '@/stores/bookings'
import { useRoomsStore } from '@/stores/rooms'
import { useIndividualClientsStore } from '@/stores/clients'
import { useCorporateClientsStore } from '@/stores/clients'
import type { Booking, BookingPayload, ClientType } from '@/types/booking'

const props = defineProps<{
  open: boolean
  booking?: Booking | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [booking: Booking]
}>()

const bookingsStore = useBookingsStore()
const roomsStore = useRoomsStore()
const individualStore = useIndividualClientsStore()
const corporateStore = useCorporateClientsStore()

const saving = ref(false)
const error = ref('')

const isEdit = computed(() => !!props.booking)

const form = ref({
  room_id: '' as number | '',
  client_type: 'individual' as ClientType,
  client_id: '' as number | '',
  check_in: '',
  check_out: '',
  guests: 1,
  special_requests: '',
})

const clientOptions = computed(() => {
  if (form.value.client_type === 'individual') {
    return individualStore.clients.map(c => ({ id: c.id, label: c.full_name }))
  }
  return corporateStore.clients.map(c => ({ id: c.id, label: c.company_name }))
})

const availableRooms = computed(() =>
  roomsStore.rooms.filter(r => r.status === 'available' || (isEdit.value && r.id === props.booking?.room_id))
)

const nights = computed(() => {
  if (!form.value.check_in || !form.value.check_out) return 0
  const diff = new Date(form.value.check_out).getTime() - new Date(form.value.check_in).getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
})

const selectedRoom = computed(() => roomsStore.rooms.find(r => r.id === form.value.room_id))

const estimatedTotal = computed(() => {
  if (!selectedRoom.value || nights.value === 0) return 0
  return selectedRoom.value.price_per_night * nights.value
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''

  // Ensure stores are populated
  if (roomsStore.rooms.length === 0) roomsStore.fetchRooms()
  if (individualStore.clients.length === 0) individualStore.fetchClients()
  if (corporateStore.clients.length === 0) corporateStore.fetchClients()

  if (props.booking) {
    form.value = {
      room_id: props.booking.room_id,
      client_type: props.booking.client_type,
      client_id: props.booking.client_id,
      check_in: props.booking.check_in,
      check_out: props.booking.check_out,
      guests: props.booking.guests,
      special_requests: props.booking.special_requests ?? '',
    }
  } else {
    form.value = {
      room_id: '',
      client_type: 'individual',
      client_id: '',
      check_in: '',
      check_out: '',
      guests: 1,
      special_requests: '',
    }
  }
})

// Reset client when type changes
watch(() => form.value.client_type, () => {
  form.value.client_id = ''
})

const today = new Date().toISOString().split('T')[0]

async function handleSave() {
  error.value = ''
  if (!form.value.room_id) { error.value = 'Please select a room.'; return }
  if (!form.value.client_id) { error.value = 'Please select a client.'; return }
  if (!form.value.check_in) { error.value = 'Check-in date is required.'; return }
  if (!form.value.check_out) { error.value = 'Check-out date is required.'; return }
  if (nights.value === 0) { error.value = 'Check-out must be after check-in.'; return }
  if (form.value.guests < 1) { error.value = 'At least 1 guest is required.'; return }

  saving.value = true
  try {
    const payload: BookingPayload = {
      room_id: form.value.room_id as number,
      client_id: form.value.client_id as number,
      client_type: form.value.client_type,
      check_in: form.value.check_in,
      check_out: form.value.check_out,
      guests: form.value.guests,
      special_requests: form.value.special_requests || undefined,
    }

    let saved: Booking
    if (isEdit.value && props.booking) {
      saved = await bookingsStore.updateBooking(props.booking.id, payload)
    } else {
      saved = await bookingsStore.createBooking(payload)
    }
    emit('saved', saved)
    emit('update:open', false)
  } catch (err: any) {
    error.value = err?.error?.message ?? 'Failed to save booking.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit Booking' : 'New Booking' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Update the booking details below.' : 'Fill in the details to create a new booking.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <!-- Error -->
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <!-- Room -->
        <div class="grid gap-2">
          <Label>Room *</Label>
          <Select v-model="form.room_id">
            <SelectTrigger>
              <SelectValue placeholder="Select a room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="room in availableRooms" :key="room.id" :value="room.id">
                {{ room.name }} — {{ room.type }} · ZMW {{ room.price_per_night.toLocaleString() }}/night
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Client Type & Client -->
        <div class="grid gap-2">
          <Label>Client Type *</Label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              :class="[
                'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                form.client_type === 'individual'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-muted',
              ]"
              @click="form.client_type = 'individual'"
            >
              Individual
            </button>
            <button
              type="button"
              :class="[
                'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                form.client_type === 'corporate'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-muted',
              ]"
              @click="form.client_type = 'corporate'"
            >
              Corporate
            </button>
          </div>
        </div>

        <div class="grid gap-2">
          <Label>{{ form.client_type === 'individual' ? 'Client' : 'Company' }} *</Label>
          <Select v-model="form.client_id">
            <SelectTrigger>
              <SelectValue :placeholder="form.client_type === 'individual' ? 'Select client' : 'Select company'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="c in clientOptions" :key="c.id" :value="c.id">
                {{ c.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="check_in">Check-In *</Label>
            <Input id="check_in" v-model="form.check_in" type="date" :min="today" />
          </div>
          <div class="grid gap-2">
            <Label for="check_out">Check-Out *</Label>
            <Input id="check_out" v-model="form.check_out" type="date" :min="form.check_in || today" />
          </div>
        </div>

        <!-- Guests -->
        <div class="grid gap-2">
          <Label for="guests">Number of Guests *</Label>
          <Input
            id="guests"
            v-model.number="form.guests"
            type="number"
            min="1"
            :max="selectedRoom?.capacity"
            placeholder="1"
          />
          <p v-if="selectedRoom" class="text-xs text-muted-foreground">
            Max capacity: {{ selectedRoom.capacity }} guest{{ selectedRoom.capacity === 1 ? '' : 's' }}
          </p>
        </div>

        <!-- Estimated total -->
        <div v-if="estimatedTotal > 0" class="rounded-lg bg-muted/50 border px-4 py-3 flex items-center justify-between text-sm">
          <span class="text-muted-foreground">{{ nights }} night{{ nights === 1 ? '' : 's' }} × ZMW {{ selectedRoom?.price_per_night.toLocaleString() }}</span>
          <span class="font-semibold">ZMW {{ estimatedTotal.toLocaleString() }}</span>
        </div>

        <!-- Special Requests -->
        <div class="grid gap-2">
          <Label for="special_requests">Special Requests</Label>
          <textarea
            id="special_requests"
            v-model="form.special_requests"
            rows="2"
            placeholder="Any special requests or notes..."
            class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>
      </form>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">
          Cancel
        </Button>
        <Button :disabled="saving" @click="handleSave">
          <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
          {{ isEdit ? 'Save Changes' : 'Create Booking' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
