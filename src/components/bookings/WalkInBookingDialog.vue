<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CalendarDate, type DateValue } from '@internationalized/date'
import { CalendarIcon, Loader2, BedDouble } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { bookingApi } from '@/services/api/bookings'
import { roomApi } from '@/services/api/room'
import { getApiError } from '@/utils/errors'
import type { Room } from '@/types/room'
import type { Booking } from '@/types/booking'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [booking: Booking]
}>()

const maxDate = new CalendarDate(2035, 1, 1)

const form = ref({
  booker_name: '',
  booker_email: '',
  booker_phone: '',
  identification_card: '',
  check_in: '',
  check_out: '',
  room_id: '',
  special_requests: '',
})

const saving = ref(false)
const rooms = ref<Room[]>([])
const roomsLoading = ref(false)
const fromOpen = ref(false)
const toOpen = ref(false)

function reset() {
  form.value = {
    booker_name: '', booker_email: '', booker_phone: '', identification_card: '',
    check_in: '', check_out: '', room_id: '', special_requests: '',
  }
  rooms.value = []
}

watch(() => props.open, (isOpen) => { if (isOpen) reset() })

// ── Date helpers ──────────────────────────────────────────────────────────────
function toCalendarDate(iso: string): DateValue | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  if (y === undefined || m === undefined || d === undefined) return undefined
  return new CalendarDate(y, m, d)
}
function fromCalendarDate(dv: DateValue): string {
  return `${dv.year}-${String(dv.month).padStart(2, '0')}-${String(dv.day).padStart(2, '0')}`
}
function displayDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const checkInDate = computed({
  get: () => toCalendarDate(form.value.check_in),
  set: (dv) => { if (dv) { form.value.check_in = fromCalendarDate(dv); fromOpen.value = false } },
})
const checkOutDate = computed({
  get: () => toCalendarDate(form.value.check_out),
  set: (dv) => { if (dv) { form.value.check_out = fromCalendarDate(dv); toOpen.value = false } },
})

// Reload available rooms whenever the date range is complete
watch([() => form.value.check_in, () => form.value.check_out], async ([ci, co]) => {
  form.value.room_id = ''
  rooms.value = []
  if (!ci || !co || co <= ci) return
  roomsLoading.value = true
  try {
    rooms.value = await roomApi.listAvailable({ check_in: ci, check_out: co }) ?? []
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load available rooms.'))
  } finally {
    roomsLoading.value = false
  }
})

const selectedRoom = computed(() => rooms.value.find(r => r.id === form.value.room_id))

const nights = computed(() => {
  if (!form.value.check_in || !form.value.check_out) return 0
  const diff = new Date(form.value.check_out).getTime() - new Date(form.value.check_in).getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
})

const estimatedTotal = computed(() =>
  selectedRoom.value ? selectedRoom.value.price_per_night * nights.value : 0,
)

const canSubmit = computed(() =>
  form.value.booker_name.trim() !== '' &&
  form.value.check_in !== '' &&
  form.value.check_out !== '' &&
  form.value.check_out > form.value.check_in &&
  form.value.room_id !== '' &&
  !saving.value,
)

async function handleSubmit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    const booking = await bookingApi.createIndividual({
      booker_name: form.value.booker_name.trim(),
      booker_email: form.value.booker_email.trim() || undefined,
      booker_phone: form.value.booker_phone.trim() || undefined,
      identification_card: form.value.identification_card.trim() || undefined,
      room_id: form.value.room_id,
      check_in: form.value.check_in,
      check_out: form.value.check_out,
      special_requests: form.value.special_requests.trim() || undefined,
    })
    toast.success(`Booking created for ${booking.booker_name}.`)
    emit('saved', booking)
    emit('update:open', false)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to create booking.'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>New Walk-In Booking</DialogTitle>
        <DialogDescription>
          Create a confirmed booking on behalf of a walk-in guest.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4 py-2 max-h-[65vh] overflow-y-auto px-1">
        <!-- Guest details -->
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <Label class="text-xs">Guest Name <span class="text-destructive">*</span></Label>
            <Input v-model="form.booker_name" placeholder="e.g. Grace Zulu" class="mt-1" />
          </div>
          <div>
            <Label class="text-xs">Email</Label>
            <Input v-model="form.booker_email" type="email" placeholder="guest@email.com" class="mt-1" />
          </div>
          <div>
            <Label class="text-xs">Phone</Label>
            <Input v-model="form.booker_phone" placeholder="0977000000" class="mt-1" />
          </div>
          <div class="col-span-2">
            <Label class="text-xs">ID / Passport</Label>
            <Input v-model="form.identification_card" placeholder="NRC or passport number" class="mt-1" />
          </div>
        </div>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <Label class="text-xs">Check-In <span class="text-destructive">*</span></Label>
            <Popover v-model:open="fromOpen">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                  :class="!form.check_in && 'text-muted-foreground'"
                >
                  <CalendarIcon class="size-4 shrink-0" />
                  {{ form.check_in ? displayDate(form.check_in) : 'Select date' }}
                </button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <Calendar v-model="checkInDate" layout="month-and-year" :max-value="checkOutDate ?? maxDate" />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label class="text-xs">Check-Out <span class="text-destructive">*</span></Label>
            <Popover v-model:open="toOpen">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                  :class="!form.check_out && 'text-muted-foreground'"
                  :disabled="!form.check_in"
                >
                  <CalendarIcon class="size-4 shrink-0" />
                  {{ form.check_out ? displayDate(form.check_out) : 'Select date' }}
                </button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <Calendar v-model="checkOutDate" layout="month-and-year" :min-value="checkInDate" :max-value="maxDate" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <!-- Room -->
        <div>
          <Label class="text-xs">Room <span class="text-destructive">*</span></Label>
          <div v-if="!form.check_in || !form.check_out" class="mt-1 text-xs text-muted-foreground rounded-md border border-dashed px-3 py-3 text-center">
            Select check-in and check-out dates to see available rooms.
          </div>
          <div v-else-if="roomsLoading" class="mt-1 flex items-center gap-2 text-xs text-muted-foreground px-3 py-3">
            <Loader2 class="size-3.5 animate-spin" /> Loading available rooms…
          </div>
          <div v-else-if="rooms.length === 0" class="mt-1 text-xs text-amber-600 rounded-md border border-amber-300 px-3 py-3 text-center">
            No rooms available for these dates.
          </div>
          <div v-else class="mt-1 grid grid-cols-1 gap-2 max-h-44 overflow-y-auto">
            <button
              v-for="room in rooms"
              :key="room.id"
              type="button"
              class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors"
              :class="form.room_id === room.id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-muted/40'"
              @click="form.room_id = room.id"
            >
              <div class="flex items-center gap-2">
                <BedDouble class="size-4 text-muted-foreground" />
                <div>
                  <p class="font-medium">{{ room.name }}</p>
                  <p class="text-xs text-muted-foreground capitalize">{{ room.type }} · cap. {{ room.capacity }}</p>
                </div>
              </div>
              <span class="text-xs font-medium">ZMW {{ room.price_per_night.toLocaleString() }}/night</span>
            </button>
          </div>
        </div>

        <!-- Special requests -->
        <div>
          <Label class="text-xs">Special Requests</Label>
          <Textarea v-model="form.special_requests" placeholder="Any special requirements…" class="mt-1 resize-none" rows="2" />
        </div>

        <!-- Estimate -->
        <div v-if="selectedRoom && nights > 0" class="rounded-lg bg-muted/40 px-4 py-3 flex items-center justify-between text-sm">
          <span class="text-muted-foreground">{{ nights }} night{{ nights !== 1 ? 's' : '' }} × ZMW {{ selectedRoom.price_per_night.toLocaleString() }}</span>
          <span class="font-semibold">ZMW {{ estimatedTotal.toLocaleString() }}</span>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="!canSubmit" @click="handleSubmit">
          <Loader2 v-if="saving" class="size-4 mr-2 animate-spin" />
          Create Booking
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
