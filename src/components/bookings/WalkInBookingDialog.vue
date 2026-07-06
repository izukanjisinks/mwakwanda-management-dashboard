<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { CalendarDate, type DateValue } from '@internationalized/date'
import {
  CalendarIcon, Loader2, BedDouble, MapPin, Users, Clock, UtensilsCrossed, User,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { bookingApi } from '@/services/api/bookings'
import { roomApi } from '@/services/api/room'
import { venueApi } from '@/services/api/venue'
import { getApiError } from '@/utils/errors'
import type { Room } from '@/types/room'
import type { Venue } from '@/types/venue'
import type { Booking } from '@/types/booking'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [booking: Booking]
}>()

// ── Booking type toggle ───────────────────────────────────────────────────────
type BookingType = 'accommodation' | 'event'
const bookingType = ref<BookingType>('accommodation')

const maxDate = new CalendarDate(2035, 1, 1)

// ── Guest info (shared by both types) ────────────────────────────────────────
const guest = ref({ name: '', email: '', phone: '', id_number: '' })

// ── Accommodation form ────────────────────────────────────────────────────────
const acc = ref({ check_in: '', check_out: '', room_id: '', special_requests: '' })
const fromOpen = ref(false)
const toOpen   = ref(false)
const rooms        = ref<Room[]>([])
const roomsLoading = ref(false)

function toCalDate(iso: string): DateValue | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new CalendarDate(y, m, d)
}
function fromCalDate(dv: DateValue) {
  return `${dv.year}-${String(dv.month).padStart(2, '0')}-${String(dv.day).padStart(2, '0')}`
}
function displayDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const checkInDate = computed({
  get: () => toCalDate(acc.value.check_in),
  set: (dv) => { if (dv) { acc.value.check_in = fromCalDate(dv); fromOpen.value = false } },
})
const checkOutDate = computed({
  get: () => toCalDate(acc.value.check_out),
  set: (dv) => { if (dv) { acc.value.check_out = fromCalDate(dv); toOpen.value = false } },
})

watch([() => acc.value.check_in, () => acc.value.check_out], async ([ci, co]) => {
  acc.value.room_id = ''
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

const selectedRoom = computed(() => rooms.value.find(r => r.id === acc.value.room_id))
const nights = computed(() => {
  if (!acc.value.check_in || !acc.value.check_out) return 0
  return Math.max(0, Math.round(
    (new Date(acc.value.check_out).getTime() - new Date(acc.value.check_in).getTime()) / 86400000,
  ))
})
const accTotal = computed(() => (selectedRoom.value?.price_per_night ?? 0) * nights.value)

// ── Event form ────────────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { value: 'conference',  label: 'Conference / Meeting' },
  { value: 'workshop',    label: 'Workshop / Training' },
  { value: 'wedding',     label: 'Wedding' },
  { value: 'birthday',    label: 'Birthday / Celebration' },
  { value: 'cocktail',    label: 'Cocktail / Reception' },
  { value: 'gala_dinner', label: 'Gala Dinner' },
  { value: 'other',       label: 'Other' },
]
const VENUE_TYPE_LABELS: Record<string, string> = {
  conference_hall: 'Conference Hall',
  event_space:     'Event Space',
  boardroom:       'Boardroom',
  outdoor:         'Outdoor',
  dining:          'Dining',
}

const evt = ref({
  event_type: '',
  venue_id: '',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  pax_count: '',
  catering_required: false,
  notes: '',
})
const startOpen     = ref(false)
const endOpen       = ref(false)
const venues        = ref<Venue[]>([])
const venuesLoading = ref(false)

const startDateVal = computed({
  get: () => toCalDate(evt.value.start_date),
  set: (dv) => { if (dv) { evt.value.start_date = fromCalDate(dv); startOpen.value = false } },
})
const endDateVal = computed({
  get: () => toCalDate(evt.value.end_date),
  set: (dv) => { if (dv) { evt.value.end_date = fromCalDate(dv); endOpen.value = false } },
})

watch([() => evt.value.start_date, () => evt.value.end_date], async ([sd, ed]) => {
  evt.value.venue_id = ''
  venues.value = []
  if (!sd || !ed || ed < sd) return
  venuesLoading.value = true
  try {
    const res = await venueApi.list({ is_available: true, from: sd, to: ed })
    venues.value = res.data ?? []
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load available venues.'))
  } finally {
    venuesLoading.value = false
  }
})

const selectedVenue = computed(() => venues.value.find(v => v.id === evt.value.venue_id))
const eventDays = computed(() => {
  if (!evt.value.start_date || !evt.value.end_date) return 0
  return Math.max(1, Math.round(
    (new Date(evt.value.end_date).getTime() - new Date(evt.value.start_date).getTime()) / 86400000,
  ) + 1)
})
const eventTotal = computed(() => {
  const v = selectedVenue.value
  if (!v) return 0
  if (v.rate_type === 'daily') return v.base_rate * eventDays.value
  if (evt.value.start_time && evt.value.end_time) {
    const [sh, sm] = evt.value.start_time.split(':').map(Number)
    const [eh, em] = evt.value.end_time.split(':').map(Number)
    const hrs = Math.max(1, (eh! * 60 + em! - sh! * 60 - sm!) / 60)
    return v.base_rate * hrs * eventDays.value
  }
  return v.base_rate * eventDays.value
})

// ── State / validation ────────────────────────────────────────────────────────
const saving = ref(false)

const canSubmit = computed(() => {
  if (!guest.value.name.trim() || saving.value) return false
  if (bookingType.value === 'accommodation') {
    return (
      acc.value.check_in !== '' &&
      acc.value.check_out !== '' &&
      acc.value.check_out > acc.value.check_in &&
      acc.value.room_id !== ''
    )
  }
  return (
    evt.value.event_type !== '' &&
    evt.value.venue_id !== '' &&
    evt.value.start_date !== '' &&
    evt.value.end_date !== '' &&
    evt.value.end_date >= evt.value.start_date &&
    Number(evt.value.pax_count) > 0
  )
})

function reset() {
  bookingType.value = 'accommodation'
  guest.value = { name: '', email: '', phone: '', id_number: '' }
  acc.value   = { check_in: '', check_out: '', room_id: '', special_requests: '' }
  evt.value   = { event_type: '', venue_id: '', start_date: '', end_date: '', start_time: '', end_time: '', pax_count: '', catering_required: false, notes: '' }
  rooms.value  = []
  venues.value = []
}

watch(() => props.open, (isOpen) => { if (isOpen) reset() })

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    let booking: Booking
    if (bookingType.value === 'accommodation') {
      booking = await bookingApi.createIndividual({
        booker_name:       guest.value.name.trim(),
        booker_email:      guest.value.email.trim()     || undefined,
        booker_phone:      guest.value.phone.trim()     || undefined,
        identification_card: guest.value.id_number.trim() || undefined,
        room_id:           acc.value.room_id,
        check_in:          acc.value.check_in,
        check_out:         acc.value.check_out,
        special_requests:  acc.value.special_requests.trim() || undefined,
      })
    } else {
      booking = await bookingApi.createIndividualEvent({
        booker_name:       guest.value.name.trim(),
        booker_email:      guest.value.email.trim()     || undefined,
        booker_phone:      guest.value.phone.trim()     || undefined,
        identification_card: guest.value.id_number.trim() || undefined,
        event_type:        evt.value.event_type,
        venue_id:          evt.value.venue_id,
        start_date:        evt.value.start_date,
        end_date:          evt.value.end_date,
        start_time:        evt.value.start_time || undefined,
        end_time:          evt.value.end_time   || undefined,
        pax_count:         Number(evt.value.pax_count),
        catering_required: evt.value.catering_required,
        special_requests:  evt.value.notes.trim() || undefined,
      })
    }
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
    <DialogContent class="max-w-xl">
      <DialogHeader>
        <DialogTitle>New Walk-In Booking</DialogTitle>
        <DialogDescription>Create a confirmed booking on behalf of a walk-in guest.</DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4 py-1 max-h-[72vh] overflow-y-auto px-1">

        <!-- Booking type selector -->
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-colors"
            :class="bookingType === 'accommodation'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'"
            @click="bookingType = 'accommodation'"
          >
            <BedDouble class="size-6" />
            Accommodation
          </button>
          <button
            type="button"
            class="flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-colors"
            :class="bookingType === 'event'
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'"
            @click="bookingType = 'event'"
          >
            <MapPin class="size-6" />
            Event
          </button>
        </div>

        <!-- ── Guest info ──────────────────────────────────────────────────── -->
        <div class="rounded-lg border p-4 flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <User class="size-3.5 text-muted-foreground" />
            <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guest Information</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2">
              <Label class="text-xs">Full Name <span class="text-destructive">*</span></Label>
              <Input v-model="guest.name" placeholder="e.g. Grace Zulu" class="mt-1" />
            </div>
            <div>
              <Label class="text-xs">Email</Label>
              <Input v-model="guest.email" type="email" placeholder="guest@email.com" class="mt-1" />
            </div>
            <div>
              <Label class="text-xs">Phone</Label>
              <Input v-model="guest.phone" placeholder="0977000000" class="mt-1" />
            </div>
            <div class="col-span-2">
              <Label class="text-xs">ID / Passport</Label>
              <Input v-model="guest.id_number" placeholder="NRC or passport number" class="mt-1" />
            </div>
          </div>
        </div>

        <!-- ── Accommodation fields ────────────────────────────────────────── -->
        <template v-if="bookingType === 'accommodation'">
          <div class="rounded-lg border p-4 flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <BedDouble class="size-3.5 text-muted-foreground" />
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stay Details</span>
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
                      :class="!acc.check_in && 'text-muted-foreground'"
                    >
                      <CalendarIcon class="size-4 shrink-0" />
                      {{ acc.check_in ? displayDate(acc.check_in) : 'Select date' }}
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
                      :class="!acc.check_out && 'text-muted-foreground'"
                      :disabled="!acc.check_in"
                    >
                      <CalendarIcon class="size-4 shrink-0" />
                      {{ acc.check_out ? displayDate(acc.check_out) : 'Select date' }}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="checkOutDate" layout="month-and-year" :min-value="checkInDate" :max-value="maxDate" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <!-- Room picker -->
            <div>
              <Label class="text-xs">Room <span class="text-destructive">*</span></Label>
              <div v-if="!acc.check_in || !acc.check_out" class="mt-1 text-xs text-muted-foreground rounded-md border border-dashed px-3 py-3 text-center">
                Select check-in and check-out dates to see available rooms.
              </div>
              <div v-else-if="roomsLoading" class="mt-1 flex items-center gap-2 text-xs text-muted-foreground px-3 py-3">
                <Loader2 class="size-3.5 animate-spin" /> Loading available rooms…
              </div>
              <div v-else-if="rooms.length === 0" class="mt-1 text-xs text-amber-600 rounded-md border border-amber-300 px-3 py-3 text-center">
                No rooms available for these dates.
              </div>
              <div v-else class="mt-1 grid gap-2 max-h-44 overflow-y-auto">
                <button
                  v-for="room in rooms"
                  :key="room.id"
                  type="button"
                  class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                  :class="acc.room_id === room.id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-muted/40'"
                  @click="acc.room_id = room.id"
                >
                  <div class="flex items-center gap-2.5">
                    <BedDouble class="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p class="font-medium">{{ room.name }}</p>
                      <p class="text-xs text-muted-foreground capitalize">{{ room.type }} · cap. {{ room.capacity }}</p>
                    </div>
                  </div>
                  <span class="text-xs font-semibold shrink-0">ZMW {{ room.price_per_night.toLocaleString() }}/night</span>
                </button>
              </div>
            </div>

            <!-- Special requests -->
            <div>
              <Label class="text-xs">Special Requests</Label>
              <Textarea v-model="acc.special_requests" placeholder="Any special requirements…" class="mt-1 resize-none" rows="2" />
            </div>
          </div>

          <!-- Accommodation estimate -->
          <div v-if="selectedRoom && nights > 0" class="rounded-lg bg-muted/40 px-4 py-3 flex items-center justify-between text-sm">
            <span class="text-muted-foreground">{{ nights }} night{{ nights !== 1 ? 's' : '' }} × ZMW {{ selectedRoom.price_per_night.toLocaleString() }}/night</span>
            <span class="font-semibold">ZMW {{ accTotal.toLocaleString() }}</span>
          </div>
        </template>

        <!-- ── Event fields ────────────────────────────────────────────────── -->
        <template v-else>
          <div class="rounded-lg border p-4 flex flex-col gap-4">
            <div class="flex items-center gap-2">
              <MapPin class="size-3.5 text-muted-foreground" />
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event Details</span>
            </div>

            <!-- Event type -->
            <div>
              <Label class="text-xs">Event Type <span class="text-destructive">*</span></Label>
              <Select v-model="evt.event_type">
                <SelectTrigger class="mt-1">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="et in EVENT_TYPES" :key="et.value" :value="et.value">
                    {{ et.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Event dates -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="text-xs">Start Date <span class="text-destructive">*</span></Label>
                <Popover v-model:open="startOpen">
                  <PopoverTrigger as-child>
                    <button
                      type="button"
                      class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                      :class="!evt.start_date && 'text-muted-foreground'"
                    >
                      <CalendarIcon class="size-4 shrink-0" />
                      {{ evt.start_date ? displayDate(evt.start_date) : 'Select date' }}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="startDateVal" layout="month-and-year" :max-value="endDateVal ?? maxDate" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label class="text-xs">End Date <span class="text-destructive">*</span></Label>
                <Popover v-model:open="endOpen">
                  <PopoverTrigger as-child>
                    <button
                      type="button"
                      class="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                      :class="!evt.end_date && 'text-muted-foreground'"
                      :disabled="!evt.start_date"
                    >
                      <CalendarIcon class="size-4 shrink-0" />
                      {{ evt.end_date ? displayDate(evt.end_date) : 'Select date' }}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="endDateVal" layout="month-and-year" :min-value="startDateVal" :max-value="maxDate" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <!-- Start/end time -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="text-xs flex items-center gap-1">
                  <Clock class="size-3" /> Start Time
                </Label>
                <Input v-model="evt.start_time" type="time" class="mt-1" />
              </div>
              <div>
                <Label class="text-xs flex items-center gap-1">
                  <Clock class="size-3" /> End Time
                </Label>
                <Input v-model="evt.end_time" type="time" class="mt-1" />
              </div>
            </div>

            <!-- Venue picker -->
            <div>
              <Label class="text-xs">Venue <span class="text-destructive">*</span></Label>
              <div v-if="!evt.start_date || !evt.end_date" class="mt-1 text-xs text-muted-foreground rounded-md border border-dashed px-3 py-3 text-center">
                Select event dates to see available venues.
              </div>
              <div v-else-if="venuesLoading" class="mt-1 flex items-center gap-2 text-xs text-muted-foreground px-3 py-3">
                <Loader2 class="size-3.5 animate-spin" /> Loading available venues…
              </div>
              <div v-else-if="venues.length === 0" class="mt-1 text-xs text-amber-600 rounded-md border border-amber-300 px-3 py-3 text-center">
                No venues available for these dates.
              </div>
              <div v-else class="mt-1 grid gap-2 max-h-40 overflow-y-auto">
                <button
                  v-for="venue in venues"
                  :key="venue.id"
                  type="button"
                  class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                  :class="evt.venue_id === venue.id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'hover:bg-muted/40'"
                  @click="evt.venue_id = venue.id"
                >
                  <div class="flex items-center gap-2.5">
                    <MapPin class="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p class="font-medium">{{ venue.name }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ VENUE_TYPE_LABELS[venue.venue_type] ?? venue.venue_type }} · cap. {{ venue.capacity }}
                      </p>
                    </div>
                  </div>
                  <span class="text-xs font-semibold shrink-0">
                    ZMW {{ venue.base_rate.toLocaleString() }}/{{ venue.rate_type === 'daily' ? 'day' : 'hr' }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Attendees + catering -->
            <div class="grid grid-cols-2 gap-3 items-end">
              <div>
                <Label class="text-xs flex items-center gap-1">
                  <Users class="size-3" /> Expected Attendees <span class="text-destructive">*</span>
                </Label>
                <Input v-model="evt.pax_count" type="number" min="1" placeholder="e.g. 50" class="mt-1" />
              </div>
              <div class="pb-0.5">
                <label class="flex items-center gap-2 cursor-pointer text-sm select-none">
                  <Checkbox
                    :checked="evt.catering_required"
                    @update:checked="(v) => evt.catering_required = v"
                  />
                  <span class="flex items-center gap-1.5">
                    <UtensilsCrossed class="size-3.5 text-muted-foreground" />
                    Catering required
                  </span>
                </label>
              </div>
            </div>

            <!-- Notes -->
            <div>
              <Label class="text-xs">Notes / Special Requirements</Label>
              <Textarea v-model="evt.notes" placeholder="Equipment, layout, dietary requirements…" class="mt-1 resize-none" rows="2" />
            </div>
          </div>

          <!-- Event estimate -->
          <div v-if="selectedVenue && eventTotal > 0" class="rounded-lg bg-muted/40 px-4 py-3 flex flex-col gap-1 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">
                {{ selectedVenue.name }} ·
                {{ eventDays }} day{{ eventDays !== 1 ? 's' : '' }}
                <template v-if="selectedVenue.rate_type === 'hourly' && evt.start_time && evt.end_time">(hourly)</template>
              </span>
              <span class="font-semibold">ZMW {{ eventTotal.toLocaleString() }}</span>
            </div>
            <p class="text-xs text-muted-foreground">Estimate only — final price confirmed at approval.</p>
          </div>
        </template>

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
