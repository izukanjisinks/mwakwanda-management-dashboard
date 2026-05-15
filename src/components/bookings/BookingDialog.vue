<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { DateValue } from '@internationalized/date'
import { CalendarDate, getLocalTimeZone, today as getToday } from '@internationalized/date'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
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
import { ArrowRight, ArrowLeft, Check, Loader2, Plus, Trash2, ChevronDown, ChevronUp, UserPlus, Search, X, CalendarIcon } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useBookingsStore } from '@/stores/bookings'
import { useRoomsStore } from '@/stores/rooms'
import { individualClientApi, corporateClientApi } from '@/services/api/clients'
import { bookingApi } from '@/services/api/bookings'
import { roomApi } from '@/services/api/room'
import type { Room } from '@/types/room'
import type { Booking, BookingUpdatePayload, ClientType } from '@/types/booking'

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

const saving = ref(false)
const error = ref('')
const step = ref(1)

// ── Calendar helpers ──────────────────────────────────────────────────────────
const todayDate = getToday(getLocalTimeZone())
const maxDate = new CalendarDate(2035, 1, 1)

function toCalendarDate(iso: string): DateValue | undefined {
  if (!iso) return undefined
  const d = new Date(iso)
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function fromCalendarDate(dv: DateValue): string {
  return `${dv.year}-${String(dv.month).padStart(2, '0')}-${String(dv.day).padStart(2, '0')}`
}

// ── Step 1: client search ─────────────────────────────────────────────────────
const clientSearch = ref('')
const clientFound = ref(false)
const clientSearchLoading = ref(false)
const clientNotFound = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null

async function runClientSearch(query: string) {
  if (!query.trim()) {
    clientFound.value = false
    clientNotFound.value = false
    return
  }
  clientSearchLoading.value = true
  clientFound.value = false
  clientNotFound.value = false
  try {
    if (form.value.client_type === 'individual') {
      const client = await individualClientApi.lookup(query.trim())
      form.value.client_id = client.id
      form.value.full_name = client.full_name
      form.value.email = client.email
      form.value.phone = client.phone
      form.value.id_passport_number = client.id_passport_number
      clientFound.value = true
    } else {
      const res = await corporateClientApi.search(query.trim())
      const client = res[0]
      if (client) {
        form.value.client_id = client.id
        form.value.company_name = client.company_name
        form.value.contact_person = client.contact_person
        form.value.company_email = client.email
        form.value.company_phone = client.phone
        form.value.company_reg_number = client.company_reg_number
        form.value.industry = client.industry ?? ''
        clientFound.value = true
      } else {
        clientNotFound.value = true
        form.value.company_name = ''
        form.value.contact_person = ''
        form.value.company_email = ''
        form.value.company_phone = ''
        form.value.company_reg_number = ''
        form.value.industry = ''
      }
    }
  } catch {
    // 404 from individual lookup means no match
    clientNotFound.value = true
    form.value.client_id = ''
    form.value.full_name = ''
    form.value.email = ''
    form.value.phone = ''
    form.value.id_passport_number = ''
  } finally {
    clientSearchLoading.value = false
  }
}

function onClientSearchInput() {
  clientFound.value = false
  clientNotFound.value = false
  form.value.client_id = ''
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => runClientSearch(clientSearch.value), 500)
}

// Individual date picker open state
const checkInOpen = ref(false)
const checkOutOpen = ref(false)

const form = ref({
  client_type: 'individual' as ClientType,
  // Individual fields
  full_name: '',
  email: '',
  phone: '',
  id_type: 'nrc' as 'nrc' | 'passport',
  id_passport_number: '',
  notes: '',
  // Corporate fields
  company_name: '',
  contact_person: '',
  company_email: '',
  company_phone: '',
  company_reg_number: '',
  industry: '',
  // Shared (individual only — corporate guests have their own dates)
  check_in: '',
  check_out: '',
  special_requests: '',
  // API payload (edit mode)
  room_id: '',
  client_id: '',
  guests: 1,
})

// Computed DateValue wrappers for individual calendar
const checkInDate = computed({
  get: () => toCalendarDate(form.value.check_in),
  set: (dv) => {
    if (dv) { form.value.check_in = fromCalendarDate(dv); checkInOpen.value = false }
  },
})
const checkOutDate = computed({
  get: () => toCalendarDate(form.value.check_out),
  set: (dv) => {
    if (dv) { form.value.check_out = fromCalendarDate(dv); checkOutOpen.value = false }
  },
})

function clearClientSearch() {
  clientSearch.value = ''
  clientFound.value = false
  form.value.full_name = ''
  form.value.email = ''
  form.value.phone = ''
  form.value.id_type = 'nrc'
  form.value.id_passport_number = ''
  form.value.notes = ''
  form.value.company_name = ''
  form.value.contact_person = ''
  form.value.company_email = ''
  form.value.company_phone = ''
  form.value.company_reg_number = ''
  form.value.industry = ''
}

// ── Step 2: guest rows ────────────────────────────────────────────────────────
interface GuestRow {
  id: number
  full_name: string
  email: string
  phone: string
  id_type: 'nrc' | 'passport'
  id_number: string
  room_id: string
  check_in: string
  check_out: string
  collapsed: boolean
  checkInOpen: boolean
  checkOutOpen: boolean
  clientId: string
}

let guestSeq = 0
function makeGuest(): GuestRow {
  return {
    id: ++guestSeq,
    full_name: '', email: '', phone: '', id_type: 'nrc' as 'nrc' | 'passport', id_number: '',
    room_id: '', check_in: '', check_out: '',
    collapsed: false, checkInOpen: false, checkOutOpen: false,
    clientId: '',
  }
}

// ── Guest lookup (shared search bar in header) ────────────────────────────────
const guestLookupQuery = ref('')
const guestLookupLoading = ref(false)
const guestLookupNotFound = ref(false)
let guestLookupTimer: ReturnType<typeof setTimeout> | null = null

function onGuestLookupInput() {
  guestLookupNotFound.value = false
  guestLookupLoading.value = false
  if (guestLookupTimer) clearTimeout(guestLookupTimer)
  if (!guestLookupQuery.value.trim()) return
  guestLookupTimer = setTimeout(runGuestLookup, 500)
}

async function runGuestLookup() {
  const query = guestLookupQuery.value.trim()
  if (!query) return
  guestLookupLoading.value = true
  try {
    const client = await individualClientApi.lookup(query)
    const first = guests.value[0]
    const isBlank = first && !first.full_name && !first.email && !first.phone && !first.id_number && !first.room_id
    const guest = isBlank ? first : makeGuest()
    guest.full_name = client.full_name
    guest.email = client.email
    guest.phone = client.phone
    guest.id_number = client.id_passport_number
    guest.id_type = /^\d{6}\/\d{2}\/\d{1}$/.test(client.id_passport_number) ? 'nrc' : 'passport'
    guest.clientId = client.id
    if (!isBlank) guests.value.push(guest)
    guestLookupQuery.value = ''
  } catch {
    guestLookupNotFound.value = true
  } finally {
    guestLookupLoading.value = false
  }
}

const guests = ref<GuestRow[]>([makeGuest()])

const isEdit = computed(() => !!props.booking)

const availableRoomsByDate = ref<Room[]>([])
const availableRoomsLoading = ref(false)
const availableRoomsError = ref('')
const overlappingBookings = ref<Booking[]>([])
const overlappingBookingsLoading = ref(false)
const overlappingBookingsError = ref('')
const guestAvailableRooms = reactive<Record<number, Room[]>>({})
const guestAvailableRoomsLoading = reactive<Record<number, boolean>>({})
const guestAvailableRoomsError = reactive<Record<number, string>>({})

const availableRooms = computed(() =>
  roomsStore.rooms.filter(r => r.is_available || (isEdit.value && r.id === props.booking?.room_id)),
)

function datesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return new Date(startA) < new Date(endB) && new Date(startB) < new Date(endA)
}

function isRoomBlocked(roomId: string, checkIn: string, checkOut: string) {
  return overlappingBookings.value.some(booking =>
    booking.room_id === roomId &&
    booking.id !== props.booking?.id &&
    booking.status !== 'cancelled' &&
    datesOverlap(checkIn, checkOut, booking.check_in, booking.check_out),
  )
}

async function loadOverlappingBookings(checkIn: string, checkOut: string) {
  overlappingBookingsError.value = ''
  overlappingBookings.value = []

  if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
    return
  }

  overlappingBookingsLoading.value = true
  try {
    // No date filters here — the API's from/to typically filters by check_in range,
    // which would miss bookings that started before checkIn but overlap our window
    // (e.g. existing booking May 13–22 when creating a new booking May 14–21).
    // datesOverlap() inside isRoomBlocked() handles the accurate overlap check.
    const res = await bookingApi.list({ page: 1, page_size: 1000 })
    overlappingBookings.value = res.data ?? []
  } catch (err: any) {
    overlappingBookingsError.value = err?.error?.message ?? 'Failed to load overlapping bookings.'
    console.error('[booking] overlapping bookings error', err)
  } finally {
    overlappingBookingsLoading.value = false
  }
}

const individualAvailableRooms = computed(() => {
  if (!form.value.check_in || !form.value.check_out) {
    return isEdit.value && props.booking?.room_id
      ? roomsStore.rooms.filter(r => r.id === props.booking?.room_id)
      : []
  }

  const result = availableRoomsByDate.value.filter(room =>
    !isRoomBlocked(room.id, form.value.check_in, form.value.check_out),
  )
  if (isEdit.value && props.booking?.room_id && !result.some(r => r.id === props.booking?.room_id)) {
    const currentRoom = roomsStore.rooms.find(r => r.id === props.booking?.room_id)
    return currentRoom ? [...result, currentRoom] : result
  }

  return result
})

function getGuestAvailableRooms(guest: GuestRow): Room[] {
  const rooms = guestAvailableRooms[guest.id] ?? []
  if (guest.room_id && !rooms.some(r => r.id === guest.room_id)) {
    const currentRoom = roomsStore.rooms.find(r => r.id === guest.room_id)
    return currentRoom ? [...rooms, currentRoom] : rooms
  }
  return rooms
}

async function loadGuestAvailableRooms(guest: GuestRow) {
  guestAvailableRoomsError[guest.id] = ''
  const hasValidDates = guest.check_in && guest.check_out && new Date(guest.check_out) > new Date(guest.check_in)

  if (!hasValidDates) {
    guestAvailableRooms[guest.id] = []
    guestAvailableRoomsLoading[guest.id] = false
    if (!guest.check_in || !guest.check_out) {
      guest.room_id = ''
    }
    return
  }

  guestAvailableRoomsLoading[guest.id] = true
  try {
    const [rooms, bookingsRes] = await Promise.all([
      roomApi.listAvailable({ check_in: guest.check_in, check_out: guest.check_out }),
      bookingApi.list({ page: 1, page_size: 1000 }),
    ])
    const allBookings = bookingsRes.data ?? []
    // Filter out rooms that have a confirmed/active booking overlapping this guest's stay.
    // This catches bookings that started before guest.check_in (which the API's from/to
    // filter would otherwise miss).
    guestAvailableRooms[guest.id] = rooms.filter(room =>
      !allBookings.some(b =>
        b.room_id === room.id &&
        b.status !== 'cancelled' &&
        datesOverlap(guest.check_in, guest.check_out, b.check_in, b.check_out),
      ),
    )
    if (guest.room_id && !getGuestAvailableRooms(guest).some(r => r.id === guest.room_id)) {
      guest.room_id = ''
    }
  } catch (err: any) {
    guestAvailableRooms[guest.id] = []
    guestAvailableRoomsError[guest.id] = err?.error?.message ?? 'Failed to load rooms for this guest.'
    console.error('[booking] guest available rooms error', err)
  } finally {
    guestAvailableRoomsLoading[guest.id] = false
  }
}

watch([
  () => form.value.check_in,
  () => form.value.check_out,
], async ([checkIn, checkOut]) => {
  availableRoomsError.value = ''

  if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
    availableRoomsByDate.value = []
    if (!checkIn || !checkOut) {
      form.value.room_id = ''
    }
    return
  }

  availableRoomsLoading.value = true
  try {
    await loadOverlappingBookings(checkIn, checkOut)
    availableRoomsByDate.value = await roomApi.listAvailable({ check_in: checkIn, check_out: checkOut })
    if (form.value.room_id && !individualAvailableRooms.value.some(r => r.id === form.value.room_id)) {
      form.value.room_id = ''
    }
  } catch (err: any) {
    availableRoomsByDate.value = []
    availableRoomsError.value = err?.error?.message ?? 'Failed to load rooms for selected dates.'
    console.error('[booking] available rooms error', err)
  } finally {
    availableRoomsLoading.value = false
  }
}, { immediate: true })

const nights = computed(() => {
  if (!form.value.check_in || !form.value.check_out) return 0
  const diff = new Date(form.value.check_out).getTime() - new Date(form.value.check_in).getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
})

function guestNights(g: GuestRow): number {
  if (!g.check_in || !g.check_out) return 0
  const diff = new Date(g.check_out).getTime() - new Date(g.check_in).getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
}

function guestSubtotal(g: GuestRow): number {
  const room = roomsStore.rooms.find(r => r.id === g.room_id)
  return (room?.price_per_night ?? 0) * guestNights(g)
}

const individualTotal = computed(() => {
  const room = roomsStore.rooms.find(r => r.id === form.value.room_id)
  return (room?.price_per_night ?? 0) * nights.value
})

const corporateTotal = computed(() =>
  guests.value.reduce((sum, g) => sum + guestSubtotal(g), 0)
)

const steps = computed(() =>
  form.value.client_type === 'individual'
    ? [
        { number: 1, label: 'Booking Details' },
        { number: 2, label: 'Review & Confirm' },
      ]
    : [
        { number: 1, label: 'Booking Details' },
        { number: 2, label: 'Guest Assignments' },
        { number: 3, label: 'Review & Confirm' },
      ]
)

const totalSteps = computed(() => steps.value.length)
const isLastStep = computed(() => step.value === totalSteps.value)

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  step.value = 1
  guests.value = [makeGuest()]
  checkInOpen.value = false
  checkOutOpen.value = false

  if (roomsStore.rooms.length === 0) roomsStore.fetchRooms()

  clientSearch.value = ''
  clientFound.value = false

  if (props.booking) {
    form.value = {
      client_type: props.booking.client_type,
      full_name: '', email: '', phone: '', id_passport_number: '', notes: '',
      company_name: '', contact_person: '', company_email: '', company_phone: '',
      company_reg_number: '', industry: '',
      check_in: props.booking.check_in.slice(0, 10),
      check_out: props.booking.check_out.slice(0, 10),
      special_requests: props.booking.special_requests ?? '',
      room_id: props.booking.room_id,
      client_id: props.booking.client_id,
      guests: props.booking.guests,
    }
  } else {
    form.value = {
      client_type: 'individual',
      full_name: '', email: '', phone: '', id_passport_number: '', notes: '',
      company_name: '', contact_person: '', company_email: '', company_phone: '',
      company_reg_number: '', industry: '',
      check_in: '', check_out: '', special_requests: '',
      room_id: '', client_id: '', guests: 1,
    }
  }
})

watch(() => form.value.client_type, () => {
  clearClientSearch()
})

// ── Validation ────────────────────────────────────────────────────────────────
const NRC_PATTERN = /^\d{6}\/\d{2}\/\d{1}$/
const PASSPORT_PATTERN = /^[A-Z]{1,2}[0-9]{6,9}$/i

function validateIdNumber(type: 'nrc' | 'passport', value: string): string {
  if (!value.trim()) return ''
  if (type === 'nrc' && !NRC_PATTERN.test(value)) return 'Invalid NRC format. Expected: 123456/78/1'
  if (type === 'passport' && !PASSPORT_PATTERN.test(value.toUpperCase())) return 'Invalid passport format. Expected: AA123456 or A12345678'
  return ''
}

function validateStep1(): string {
  if (form.value.client_type === 'individual') {
    if (!form.value.full_name.trim()) return 'Full name is required.'
    const idErr = validateIdNumber(form.value.id_type, form.value.id_passport_number)
    if (idErr) return idErr
    if (!form.value.check_in) return 'Check-in date is required.'
    if (!form.value.check_out) return 'Check-out date is required.'
    if (nights.value === 0) return 'Check-out must be after check-in.'
  } else {
    if (!form.value.company_name.trim()) return 'Company name is required.'
  }
  return ''
}

function getRoomConflictError(guest: GuestRow): string {
  if (!guest.room_id || !guest.check_in || !guest.check_out) return ''
  const conflict = guests.value.find(g =>
    g.id !== guest.id &&
    g.room_id === guest.room_id &&
    g.check_in && g.check_out &&
    datesOverlap(guest.check_in, guest.check_out, g.check_in, g.check_out),
  )
  if (!conflict) return ''
  const room = roomsStore.rooms.find(r => r.id === guest.room_id)
  const name = conflict.full_name || 'another guest'
  return `${room?.name ?? 'This room'} is already assigned to ${name} for overlapping dates.`
}

function getFilteredGuestRooms(guest: GuestRow): Room[] {
  return getGuestAvailableRooms(guest).filter(room => {
    if (!guest.check_in || !guest.check_out) return true
    return !guests.value.some(
      g =>
        g.id !== guest.id &&
        g.room_id === room.id &&
        g.check_in && g.check_out &&
        datesOverlap(guest.check_in, guest.check_out, g.check_in, g.check_out),
    )
  })
}

function validateStep2(): string {
  for (const [i, g] of guests.value.entries()) {
    const label = g.full_name || `Guest ${i + 1}`
    const idErr = validateIdNumber(g.id_type, g.id_number)
    if (idErr) return `${label}: ${idErr}`
    const roomErr = getRoomConflictError(g)
    if (roomErr) return `${label}: ${roomErr}`
  }
  return ''
}

function goNext() {
  error.value = ''
  if (step.value === 1) {
    const err = validateStep1()
    if (err) { error.value = err; return }
    if (isEdit.value) { handleSave(); return }
  }
  if (isStep('guests')) {
    const err = validateStep2()
    if (err) { error.value = err; return }
  }
  if (step.value >= totalSteps.value) { handleSave(); return }
  step.value++
}

function goBack() {
  error.value = ''
  step.value--
}

function isStep(name: 'booking' | 'guests' | 'review') {
  if (form.value.client_type === 'individual') {
    return name === 'booking' ? step.value === 1 : name === 'review' ? step.value === 2 : false
  }
  return name === 'booking' ? step.value === 1 : name === 'guests' ? step.value === 2 : step.value === 3
}

// ── Guest helpers ─────────────────────────────────────────────────────────────
function addGuest() {
  guests.value.push(makeGuest())
  form.value.guests = guests.value.length
}

function removeGuest(id: number) {
  if (guests.value.length === 1) return
  guests.value = guests.value.filter(g => g.id !== id)
  form.value.guests = guests.value.length
  delete guestAvailableRooms[id]
  delete guestAvailableRoomsLoading[id]
  delete guestAvailableRoomsError[id]
}

function toggleGuest(id: number) {
  const g = guests.value.find(g => g.id === id)
  if (g) g.collapsed = !g.collapsed
}

function setGuestDate(guest: GuestRow, field: 'check_in' | 'check_out', dv: DateValue) {
  guest[field] = fromCalendarDate(dv)
  if (field === 'check_in') guest.checkInOpen = false
  else guest.checkOutOpen = false
  loadGuestAvailableRooms(guest)
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function handleSave() {
  saving.value = true
  try {
    let saved: Booking
    if (isEdit.value && props.booking) {
      const payload: BookingUpdatePayload = {
        check_in: form.value.check_in,
        check_out: form.value.check_out,
        guests: guests.value.length,
        special_requests: form.value.special_requests || undefined,
      }
      console.log('[booking] update payload', payload)
      saved = await bookingsStore.updateBooking(props.booking.id, payload)
    } else if (form.value.client_type === 'corporate') {
      const payload = {
        client_type: 'corporate',
        ...(form.value.client_id ? { client_id: form.value.client_id } : {
          client: {
            company_name: form.value.company_name,
            contact_person: form.value.contact_person,
            email: form.value.company_email,
            phone: form.value.company_phone,
            company_reg_number: form.value.company_reg_number,
            industry: form.value.industry || undefined,
          },
        }),
        guests: guests.value.map(g => ({
          ...(g.clientId
            ? { client_id: g.clientId }
            : {
                full_name: g.full_name,
                email: g.email || undefined,
                phone: g.phone || undefined,
                id_number: g.id_number || undefined,
              }
          ),
          room_id: g.room_id,
          check_in: new Date(g.check_in).toISOString(),
          check_out: new Date(g.check_out).toISOString(),
        })),
      }
      console.log('[booking] corporate create payload', JSON.stringify(payload, null, 2))
      saved = await bookingsStore.createBooking(payload as any)
    } else {
      const payload = {
        client_type: 'individual',
        ...(form.value.client_id ? { client_id: form.value.client_id } : {
          client: {
            full_name: form.value.full_name,
            email: form.value.email || undefined,
            phone: form.value.phone || undefined,
            id_passport_number: form.value.id_passport_number || undefined,
          },
        }),
        room_id: form.value.room_id,
        check_in: new Date(form.value.check_in).toISOString(),
        check_out: new Date(form.value.check_out).toISOString(),
        guests: 1,
      }
      console.log('[booking] individual create payload', JSON.stringify(payload, null, 2))
      saved = await bookingsStore.createBooking(payload as any)
    }
    toast.success(isEdit.value ? 'Booking updated successfully.' : 'Booking created successfully.')
    emit('saved', saved)
    emit('update:open', false)
  } catch (err: any) {
    console.error('[booking] save error', err)
    error.value = err?.error?.message ?? err?.message ?? 'Failed to save booking.'
    toast.error(error.value)
  } finally {
    saving.value = false
  }
}

function formatDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-3xl gap-0 p-0 overflow-hidden flex flex-col">
      <!-- Header + stepper -->
      <DialogHeader class="px-6 pt-5 pb-4 border-b shrink-0">
        <DialogTitle class="text-base font-semibold">
          {{ isEdit ? 'Edit Booking' : 'New Booking' }}
        </DialogTitle>

        <div v-if="!isEdit" class="flex items-center mt-4">
          <template v-for="(s, i) in steps" :key="s.number">
            <div class="flex flex-col items-center gap-1.5 shrink-0">
              <div
                :class="[
                  'size-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  step >= s.number ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground border border-border',
                ]"
              >
                <Check v-if="step > s.number" class="size-4" />
                <span v-else>{{ s.number }}</span>
              </div>
              <span :class="['text-xs whitespace-nowrap', step === s.number ? 'text-primary font-medium' : 'text-muted-foreground']">
                {{ s.label }}
              </span>
            </div>
            <div
              v-if="i < steps.length - 1"
              :class="['flex-1 h-px mx-2 mb-4 transition-colors', step > s.number ? 'bg-primary' : 'bg-border']"
            />
          </template>
        </div>
      </DialogHeader>

      <!-- Error banner -->
      <div v-if="error" class="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive shrink-0">
        {{ error }}
      </div>

      <!-- Fixed-height body -->
      <div class="h-120 overflow-y-auto">

        <!-- ── Step 1: Booking Details ──────────────────────────────────── -->
        <div v-if="step === 1" class="px-6 py-5 flex flex-col gap-5">
          <!-- Client type toggle -->
          <div class="grid gap-2">
            <Label>Client Type</Label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="t in [{ value: 'individual', label: 'Individual' }, { value: 'corporate', label: 'Corporate' }]"
                :key="t.value"
                type="button"
                :class="[
                  'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  form.client_type === t.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-input hover:bg-muted',
                ]"
                @click="form.client_type = t.value as ClientType"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Search input -->
          <div class="grid gap-2">
            <Label>Search Client</Label>
            <div class="relative">
              <Search v-if="!clientSearchLoading" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Loader2 v-else class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin pointer-events-none" />
              <Input
                v-model="clientSearch"
                :placeholder="form.client_type === 'individual' ? 'Search by NRC or passport number…' : 'Search by organisation name…'"
                class="pl-9 pr-9"
                @input="onClientSearchInput"
              />
              <button
                v-if="clientSearch"
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                @click="clearClientSearch"
              >
                <X class="size-4" />
              </button>
            </div>
            <p v-if="clientFound" class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Client found — details prefilled below.
            </p>
            <p v-else-if="clientNotFound" class="text-xs text-muted-foreground">
              No client found — fill in the details below to create one.
            </p>
          </div>

          <!-- Divider: Client Details -->
          <div class="flex items-center gap-3">
            <div class="flex-1 h-px bg-border" />
            <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client Details</span>
            <div class="flex-1 h-px bg-border" />
          </div>

          <!-- Individual fields -->
          <template v-if="form.client_type === 'individual'">
            <div class="grid gap-2">
              <Label>Full Name *</Label>
              <Input v-model="form.full_name" placeholder="e.g. John Banda" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="grid gap-2">
                <Label>Email</Label>
                <Input v-model="form.email" type="email" placeholder="john@example.com" />
              </div>
              <div class="grid gap-2">
                <Label>Phone</Label>
                <Input v-model="form.phone" type="tel" placeholder="+260 97x xxx xxx" />
              </div>
            </div>
            <div class="grid gap-2">
              <Label>Identity</Label>
              <div class="grid grid-cols-[1fr_2fr] gap-2">
                <Select v-model="form.id_type">
                  <SelectTrigger class="w-full">
                    <SelectValue :placeholder="form.id_type === 'nrc' ? 'NRC' : 'Passport'" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nrc">NRC</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  v-model="form.id_passport_number"
                  :placeholder="form.id_type === 'nrc' ? '123456/78/1' : 'AA123456'"
                />
              </div>
            </div>
          </template>

          <!-- Corporate fields -->
          <template v-else>
            <div class="grid gap-2">
              <Label>Company Name *</Label>
              <Input v-model="form.company_name" placeholder="e.g. Acme Corporation" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="grid gap-2">
                <Label>Contact Person</Label>
                <Input v-model="form.contact_person" placeholder="Full name" />
              </div>
              <div class="grid gap-2">
                <Label>Industry</Label>
                <Input v-model="form.industry" placeholder="e.g. Mining, Finance" />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="grid gap-2">
                <Label>Company Email</Label>
                <Input v-model="form.company_email" type="email" placeholder="info@company.com" />
              </div>
              <div class="grid gap-2">
                <Label>Company Phone</Label>
                <Input v-model="form.company_phone" type="tel" placeholder="+260 21x xxx xxx" />
              </div>
            </div>
            <div class="grid gap-2">
              <Label>Company Registration Number</Label>
              <Input v-model="form.company_reg_number" placeholder="e.g. 120043478" />
            </div>
          </template>

          <!-- Stay Details — individual only -->
          <template v-if="form.client_type === 'individual'">
            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-border" />
              <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stay Details</span>
              <div class="flex-1 h-px bg-border" />
            </div>

            <!-- Check-in / Check-out calendars -->
            <div class="grid grid-cols-2 gap-4">
              <div class="grid gap-2">
                <Label>Check-In *</Label>
                <Popover v-model:open="checkInOpen">
                  <PopoverTrigger as-child>
                    <button
                      type="button"
                      class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                      :class="!form.check_in && 'text-muted-foreground'"
                    >
                      <CalendarIcon class="size-4 shrink-0" />
                      {{ form.check_in ? formatDate(form.check_in) : 'Pick a date' }}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar
                      v-model="checkInDate"
                      layout="month-and-year"
                      :min-value="todayDate"
                      :max-value="maxDate"
                      class="rounded-md"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div class="grid gap-2">
                <Label>Check-Out *</Label>
                <Popover v-model:open="checkOutOpen">
                  <PopoverTrigger as-child>
                    <button
                      type="button"
                      class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                      :class="!form.check_out && 'text-muted-foreground'"
                    >
                      <CalendarIcon class="size-4 shrink-0" />
                      {{ form.check_out ? formatDate(form.check_out) : 'Pick a date' }}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar
                      v-model="checkOutDate"
                      layout="month-and-year"
                      :min-value="checkInDate ?? todayDate"
                      :max-value="maxDate"
                      class="rounded-md"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <!-- Room -->
            <div class="grid gap-2">
              <Label>Room *</Label>
              <Select v-model="form.room_id" :disabled="!form.check_in || !form.check_out || availableRoomsLoading">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="room in individualAvailableRooms" :key="room.id" :value="room.id">
                    <span class="flex items-center justify-between w-full gap-6">
                      <span>{{ room.name }}</span>
                      <span class="text-muted-foreground text-xs shrink-0">ZMW {{ room.price_per_night.toLocaleString() }}/night</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="!form.check_in || !form.check_out" class="text-xs text-muted-foreground">
                Choose check-in and check-out dates first to see available rooms.
              </p>
              <p v-else-if="availableRoomsLoading" class="text-xs text-muted-foreground">
                Loading available rooms...
              </p>
              <p v-else-if="individualAvailableRooms.length === 0" class="text-xs text-muted-foreground">
                No rooms are available for the selected dates.
              </p>
              <p v-if="availableRoomsError" class="text-xs text-destructive">
                {{ availableRoomsError }}
              </p>
            </div>
          </template>
        </div>

        <!-- ── Step 2: Guest Assignments (corporate only) ───────────────── -->
        <div v-else-if="isStep('guests')" class="px-6 py-5 flex flex-col gap-4">
          <!-- Corporate summary banner -->
          <div v-if="form.company_name" class="rounded-lg bg-muted/40 border px-4 py-3 text-sm">
            <p class="font-semibold">{{ form.company_name }}</p>
            <p v-if="form.contact_person || form.company_email" class="text-xs text-muted-foreground mt-0.5">
              {{ form.contact_person }}<span v-if="form.contact_person && form.company_email"> · </span>{{ form.company_email }}
            </p>
          </div>

          <!-- Guest list header -->
          <div class="flex items-center gap-3 shrink-0">
            <div class="flex items-center gap-2 text-sm font-medium shrink-0">
              <UserPlus class="size-4 text-muted-foreground" />
              <span>Guest List <span class="text-muted-foreground font-normal">({{ guests.length }})</span></span>
            </div>
            <div class="relative flex-1">
              <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                v-model="guestLookupQuery"
                placeholder="Look up by NRC or passport…"
                class="h-8 text-sm pl-8 pr-8"
                @input="onGuestLookupInput"
              />
              <Loader2 v-if="guestLookupLoading" class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
              <span v-else-if="guestLookupNotFound" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Not found</span>
            </div>
            <Button variant="outline" size="sm" class="shrink-0" @click="addGuest">
              <Plus class="size-3.5 mr-1.5" />
              Add Guest
            </Button>
          </div>

          <!-- Scrollable guest table -->
          <div class="rounded-xl border overflow-hidden flex flex-col">
            <!-- Table header -->
            <div class="grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] bg-muted/30 border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground shrink-0">
              <span>#</span>
              <span>Guest Name</span>
              <span>Room</span>
              <span>Stay</span>
              <span />
            </div>

            <!-- Scrollable rows -->
            <div class="overflow-y-auto max-h-64">
              <div
                v-for="(guest, idx) in guests"
                :key="guest.id"
                class="border-b last:border-b-0"
              >
                <!-- Collapse toggle row -->
                <button
                  type="button"
                  class="w-full grid grid-cols-[2rem_1fr_1fr_1fr_2.5rem] items-center px-4 py-3 hover:bg-muted/20 transition-colors text-left"
                  @click="toggleGuest(guest.id)"
                >
                  <span class="text-xs font-semibold text-muted-foreground">{{ idx + 1 }}</span>
                  <span class="text-sm font-medium truncate pr-2">{{ guest.full_name || 'Guest ' + (idx + 1) }}</span>
                  <span class="text-sm text-muted-foreground truncate pr-2">
                    {{ roomsStore.rooms.find(r => r.id === guest.room_id)?.name || '—' }}
                  </span>
                  <span class="text-xs text-muted-foreground truncate pr-2">
                    {{ guest.check_in ? formatDate(guest.check_in) : '—' }}
                    <template v-if="guest.check_out"> → {{ formatDate(guest.check_out) }}</template>
                  </span>
                  <span class="flex justify-end">
                    <component :is="guest.collapsed ? ChevronDown : ChevronUp" class="size-4 text-muted-foreground" />
                  </span>
                </button>

                <!-- Expanded fields -->
                <div v-if="!guest.collapsed" class="px-4 py-4 bg-muted/5 flex flex-col gap-3">
                  <!-- Guest details + identity in a shared 4-col grid -->
                  <div class="grid grid-cols-[1fr_1fr_1fr_2.5rem] gap-x-3 gap-y-2">
                    <!-- Row 1: name / email / phone / (delete placeholder) -->
                    <div class="grid gap-1">
                      <Label class="text-xs text-muted-foreground uppercase tracking-wider">Full Name</Label>
                      <Input v-model="guest.full_name" placeholder="Full name" class="h-8 text-sm" />
                    </div>
                    <div class="grid gap-1">
                      <Label class="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                      <Input v-model="guest.email" type="email" placeholder="Email" class="h-8 text-sm" />
                    </div>
                    <div class="grid gap-1">
                      <Label class="text-xs text-muted-foreground uppercase tracking-wider">Phone</Label>
                      <Input v-model="guest.phone" type="tel" placeholder="Phone" class="h-8 text-sm" />
                    </div>
                    <div />

                    <!-- Row 2: id-type / id-number (spans 2 cols) / delete -->
                    <div class="grid gap-1">
                      <Label class="text-xs text-muted-foreground uppercase tracking-wider">ID Type</Label>
                      <Select v-model="guest.id_type">
                        <SelectTrigger class="h-8 text-sm w-full">
                          <SelectValue :placeholder="guest.id_type === 'nrc' ? 'NRC' : 'Passport'" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nrc">NRC</SelectItem>
                          <SelectItem value="passport">Passport</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div class="col-span-2 grid gap-1">
                      <Label class="text-xs text-muted-foreground uppercase tracking-wider">ID Number</Label>
                      <Input
                        v-model="guest.id_number"
                        :placeholder="guest.id_type === 'nrc' ? '123456/78/1' : 'AA123456'"
                        class="h-8 text-sm"
                      />
                    </div>
                    <div class="flex items-end">
                      <button
                        type="button"
                        class="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                        :disabled="guests.length === 1"
                        @click="removeGuest(guest.id)"
                      >
                        <Trash2 class="size-4" />
                      </button>
                    </div>
                  </div>

                  <!-- Room + dates row -->
                  <div class="grid grid-cols-[1fr_1fr_1fr_2.5rem] gap-x-3">
                    <div class="grid gap-1">
                      <Label class="text-xs text-muted-foreground uppercase tracking-wider">Room</Label>
                      <Select v-model="guest.room_id" :disabled="!guest.check_in || !guest.check_out || guestAvailableRoomsLoading[guest.id]">
                        <SelectTrigger
                          class="h-8 text-sm w-full"
                          :class="{ 'border-destructive': !!getRoomConflictError(guest) }"
                        >
                          <SelectValue placeholder="Select a room" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="room in getFilteredGuestRooms(guest)" :key="room.id" :value="room.id">
                            <span class="flex items-center justify-between w-full gap-6">
                              <span>{{ room.name }}</span>
                              <span class="text-muted-foreground text-xs shrink-0">ZMW {{ room.price_per_night.toLocaleString() }}/night</span>
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p v-if="getRoomConflictError(guest)" class="text-xs text-destructive font-medium">
                        {{ getRoomConflictError(guest) }}
                      </p>
                      <p v-else-if="!guest.check_in || !guest.check_out" class="text-xs text-muted-foreground">
                        Enter this guest's check-in and check-out dates first.
                      </p>
                      <p v-else-if="guestAvailableRoomsLoading[guest.id]" class="text-xs text-muted-foreground">
                        Loading available rooms for this guest...
                      </p>
                      <p v-else-if="getFilteredGuestRooms(guest).length === 0" class="text-xs text-muted-foreground">
                        No available rooms for these dates.
                      </p>
                      <p v-if="guestAvailableRoomsError[guest.id]" class="text-xs text-destructive">
                        {{ guestAvailableRoomsError[guest.id] }}
                      </p>
                    </div>
                    <div class="grid gap-1">
                      <Label class="text-xs text-muted-foreground uppercase tracking-wider">Check-In</Label>
                      <Popover v-model:open="guest.checkInOpen">
                        <PopoverTrigger as-child>
                          <button
                            type="button"
                            class="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-left flex items-center gap-1.5 hover:bg-muted/40 transition-colors"
                            :class="!guest.check_in && 'text-muted-foreground'"
                          >
                            <CalendarIcon class="size-3.5 shrink-0" />
                            {{ guest.check_in ? formatDate(guest.check_in) : 'Pick date' }}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent class="w-auto p-0" align="start">
                          <Calendar
                            :model-value="toCalendarDate(guest.check_in)"
                            layout="month-and-year"
                            :min-value="todayDate"
                            :max-value="maxDate"
                            class="rounded-md"
                            @update:model-value="(dv) => dv && setGuestDate(guest, 'check_in', dv)"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div class="grid gap-1">
                      <Label class="text-xs text-muted-foreground uppercase tracking-wider">Check-Out</Label>
                      <Popover v-model:open="guest.checkOutOpen">
                        <PopoverTrigger as-child>
                          <button
                            type="button"
                            class="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-left flex items-center gap-1.5 hover:bg-muted/40 transition-colors"
                            :class="!guest.check_out && 'text-muted-foreground'"
                          >
                            <CalendarIcon class="size-3.5 shrink-0" />
                            {{ guest.check_out ? formatDate(guest.check_out) : 'Pick date' }}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent class="w-auto p-0" align="start">
                          <Calendar
                            :model-value="toCalendarDate(guest.check_out)"
                            layout="month-and-year"
                            :min-value="toCalendarDate(guest.check_in) ?? todayDate"
                            :max-value="maxDate"
                            class="rounded-md"
                            @update:model-value="(dv) => dv && setGuestDate(guest, 'check_out', dv)"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Review & Confirm (individual: step 2, corporate: step 3) ── -->
        <div v-else-if="isStep('review')" class="px-6 py-5 flex flex-col gap-4">
          <!-- Booking summary -->
          <div class="rounded-xl border overflow-hidden">
            <div class="bg-muted/30 px-4 py-2.5 border-b">
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Booking Details</p>
            </div>
            <div class="divide-y text-sm">
              <!-- Individual -->
              <template v-if="form.client_type === 'individual'">
                <div class="flex justify-between px-4 py-2.5">
                  <span class="text-muted-foreground">Name</span>
                  <span class="font-medium">{{ form.full_name || '—' }}</span>
                </div>
                <div v-if="form.email" class="flex justify-between px-4 py-2.5">
                  <span class="text-muted-foreground">Email</span>
                  <span class="font-medium">{{ form.email }}</span>
                </div>
                <div v-if="form.phone" class="flex justify-between px-4 py-2.5">
                  <span class="text-muted-foreground">Phone</span>
                  <span class="font-medium">{{ form.phone }}</span>
                </div>
                <div v-if="form.id_passport_number" class="flex justify-between px-4 py-2.5">
                  <span class="text-muted-foreground">NRC / Passport</span>
                  <span class="font-medium">{{ form.id_passport_number }}</span>
                </div>
                <div class="flex justify-between px-4 py-2.5">
                  <span class="text-muted-foreground">Check-In</span>
                  <span class="font-medium">{{ formatDate(form.check_in) }}</span>
                </div>
                <div class="flex justify-between px-4 py-2.5">
                  <span class="text-muted-foreground">Check-Out</span>
                  <span class="font-medium">{{ formatDate(form.check_out) }}</span>
                </div>
                <div class="flex justify-between px-4 py-2.5">
                  <span class="text-muted-foreground">Nights</span>
                  <span class="font-medium">{{ nights }}</span>
                </div>
                <div v-if="form.room_id" class="flex justify-between px-4 py-2.5">
                  <span class="text-muted-foreground">Room</span>
                  <span class="font-medium">{{ roomsStore.rooms.find(r => r.id === form.room_id)?.name || '—' }}</span>
                </div>
              </template>
              <!-- Corporate -->
              <template v-else>
                <div class="flex justify-between px-4 py-2.5">
                  <span class="text-muted-foreground">Company</span>
                  <span class="font-medium">{{ form.company_name || '—' }}</span>
                </div>
                <div v-if="form.contact_person" class="flex justify-between px-4 py-2.5">
                  <span class="text-muted-foreground">Contact Person</span>
                  <span class="font-medium">{{ form.contact_person }}</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Guest summary — corporate only -->
          <div v-if="form.client_type === 'corporate'" class="rounded-xl border overflow-hidden flex flex-col">
            <div class="bg-muted/30 px-4 py-2.5 border-b shrink-0">
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Guests ({{ guests.length }})</p>
            </div>
            <div class="overflow-y-auto max-h-52 divide-y text-sm">
              <div
                v-for="(guest, idx) in guests"
                :key="guest.id"
                class="px-4 py-3 flex items-start gap-3"
              >
                <span class="size-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold shrink-0 mt-0.5">
                  {{ idx + 1 }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="font-medium">{{ guest.full_name || 'Unnamed guest' }}</p>
                  <div class="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    <span v-if="guest.email">{{ guest.email }}</span>
                    <span v-if="guest.phone">{{ guest.phone }}</span>
                    <span v-if="guest.id_number">ID: {{ guest.id_number }}</span>
                  </div>
                  <div v-if="guest.check_in || guest.check_out" class="text-xs text-muted-foreground mt-0.5">
                    {{ formatDate(guest.check_in) }}<template v-if="guest.check_out"> → {{ formatDate(guest.check_out) }}</template>
                    <template v-if="guestNights(guest) > 0"> · {{ guestNights(guest) }}n</template>
                  </div>
                </div>
                <span v-if="guest.room_id" class="text-xs text-muted-foreground shrink-0">
                  {{ roomsStore.rooms.find(r => r.id === guest.room_id)?.name }}
                </span>
              </div>
            </div>
          </div>

          <!-- Cost breakdown — individual -->
          <div v-if="form.client_type === 'individual' && form.room_id && nights > 0" class="rounded-xl border overflow-hidden">
            <div class="bg-muted/30 px-4 py-2.5 border-b">
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Breakdown</p>
            </div>
            <div class="divide-y text-sm">
              <div class="flex justify-between px-4 py-2.5">
                <span class="text-muted-foreground">
                  {{ roomsStore.rooms.find(r => r.id === form.room_id)?.name }}
                  · ZMW {{ roomsStore.rooms.find(r => r.id === form.room_id)?.price_per_night.toLocaleString() }}/night
                  × {{ nights }} night{{ nights !== 1 ? 's' : '' }}
                </span>
                <span class="font-medium">ZMW {{ individualTotal.toLocaleString() }}</span>
              </div>
            </div>
            <div class="flex justify-between px-4 py-3 bg-muted/20 font-semibold text-sm">
              <span>Total</span>
              <span>ZMW {{ individualTotal.toLocaleString() }}</span>
            </div>
          </div>

          <!-- Cost breakdown — corporate -->
          <div v-if="form.client_type === 'corporate' && corporateTotal > 0" class="rounded-xl border overflow-hidden">
            <div class="bg-muted/30 px-4 py-2.5 border-b">
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cost Breakdown</p>
            </div>
            <div class="divide-y text-sm">
              <div
                v-for="(guest, idx) in guests.filter(g => g.room_id && guestNights(g) > 0)"
                :key="guest.id"
                class="flex justify-between px-4 py-2.5"
              >
                <span class="text-muted-foreground">
                  {{ guest.full_name || 'Guest ' + (idx + 1) }}
                  · {{ roomsStore.rooms.find(r => r.id === guest.room_id)?.name }}
                  × {{ guestNights(guest) }}n
                </span>
                <span class="font-medium">ZMW {{ guestSubtotal(guest).toLocaleString() }}</span>
              </div>
            </div>
            <div class="flex justify-between px-4 py-3 bg-muted/20 font-semibold text-sm">
              <span>Total</span>
              <span>ZMW {{ corporateTotal.toLocaleString() }}</span>
            </div>
          </div>

          <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {{ error }}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t flex items-center justify-between gap-3 shrink-0">
        <Button
          variant="outline"
          @click="step > 1 && !isEdit ? goBack() : emit('update:open', false)"
        >
          <ArrowLeft v-if="step > 1 && !isEdit" class="size-4 mr-1.5" />
          {{ step > 1 && !isEdit ? 'Back' : 'Cancel' }}
        </Button>

        <Button :disabled="saving" @click="isLastStep || isEdit ? handleSave() : goNext()">
          <Loader2 v-if="saving" class="size-4 mr-2 animate-spin" />
          <template v-else>
            <span>{{ isLastStep || isEdit ? (isEdit ? 'Save Changes' : 'Confirm Booking') : 'Next' }}</span>
            <ArrowRight v-if="!isLastStep && !isEdit" class="size-4 ml-1.5" />
            <Check v-else-if="!isEdit" class="size-4 ml-1.5" />
          </template>
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
