<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDate, type DateValue } from '@internationalized/date'
import {
  CalendarIcon, Loader2, BedDouble, MapPin, Users, Clock,
  UtensilsCrossed, User, UserPlus, Trash2, ChevronDown, Building2, ShieldCheck,
  ArrowLeft,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { bookingApi } from '@/services/api/bookings'
import { roomApi } from '@/services/api/room'
import { venueApi } from '@/services/api/venue'
import { getApiError } from '@/utils/errors'
import type { Room } from '@/types/room'
import type { Venue } from '@/types/venue'
import type { Booking } from '@/types/booking'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const route  = useRoute()
const router = useRouter()

function goBack() {
  router.push({ name: 'admin-bookings' })
}

// ── Booking type & context ────────────────────────────────────────────────────
type BookingType    = 'accommodation' | 'event'
type BookingContext = 'individual' | 'corporate'

const bookingType  = ref<BookingType>('accommodation')
// Context arrives from the Bookings page tab the user was on (?context=corporate)
const context      = ref<BookingContext>(route.query.context === 'corporate' ? 'corporate' : 'individual')
const isCorporate  = computed(() => context.value === 'corporate')

const maxDate = new CalendarDate(2035, 1, 1)

// ── Constants ─────────────────────────────────────────────────────────────────
const INDUSTRIES = [
  'Agriculture & Agribusiness', 'Banking & Finance',
  'Construction & Infrastructure', 'Education & Training',
  'Energy & Utilities', 'Government & Public Sector',
  'Healthcare & Medical', 'Hospitality & Tourism',
  'Information Technology', 'Legal & Professional Services',
  'Manufacturing', 'Media & Communications',
  'Mining & Extractives', 'NGO & Non-profit',
  'Real Estate', 'Retail & Trade',
  'Telecommunications', 'Transportation & Logistics', 'Other',
]

const EVENT_TYPES = [
  { value: 'conference', label: 'Conference' },
  { value: 'seminar',    label: 'Seminar' },
  { value: 'workshop',   label: 'Workshop' },
  { value: 'training',   label: 'Training' },
  { value: 'gala',       label: 'Gala / Dinner' },
  { value: 'wedding',    label: 'Wedding' },
]

const SETUP_TYPES = [
  { value: 'boardroom', label: 'Boardroom' },
  { value: 'theatre',   label: 'Theatre' },
  { value: 'classroom', label: 'Classroom' },
  { value: 'u_shape',   label: 'U-Shape' },
  { value: 'banquet',   label: 'Banquet' },
  { value: 'cocktail',  label: 'Cocktail' },
]

const VENUE_TYPE_LABELS: Record<string, string> = {
  conference_hall: 'Conference Hall',
  event_space:     'Event Space',
  boardroom:       'Boardroom',
  outdoor:         'Outdoor',
  dining:          'Dining',
}

// ── Date helpers ──────────────────────────────────────────────────────────────
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

// ── Company information (corporate) ──────────────────────────────────────────
const company = ref({
  name: '', tpin: '', industry: '', email: '', phone: '',
  branch: '', department: '',
  cost_center_type: 'cost_center' as 'cost_center' | 'internal_order',
  cost_center: '', gl_code: '',
})

// ── Booked by / lead contact ──────────────────────────────────────────────────
const booker = ref({ name: '', email: '', phone: '', id_number: '', job_title: '', man_number: '' })

// ── Approver (corporate) ──────────────────────────────────────────────────────
const approver = ref({ name: '', title: '', email: '', phone: '' })

// ── Attendants / Delegates / Guests ──────────────────────────────────────────
// For individual: always starts with 1 lead contact (index 0, can't be removed).
// For corporate:  starts empty; delegates added as needed.
type Attendant = { name: string; email: string; phone: string; id_number: string; job_title: string }
const attendants = ref<Attendant[]>(
  isCorporate.value ? [] : [{ name: '', email: '', phone: '', id_number: '', job_title: '' }],
)
const attendantsExpanded = ref(!isCorporate.value)

function addAttendant() {
  attendants.value.push({ name: '', email: '', phone: '', id_number: '', job_title: '' })
  attendantsExpanded.value = true
}
function removeAttendant(i: number) {
  if (!isCorporate.value && i === 0) return  // lead contact cannot be removed for individual
  attendants.value.splice(i, 1)
  if (attendants.value.length === 0) attendantsExpanded.value = false
}

// Re-initialise attendants when context switches
watch(context, (ctx) => {
  if (ctx === 'individual') {
    attendants.value = [{ name: '', email: '', phone: '', id_number: '', job_title: '' }]
    attendantsExpanded.value = true
  } else {
    attendants.value = []
    attendantsExpanded.value = false
  }
})

// ── Accommodation form ────────────────────────────────────────────────────────
const acc = ref({ check_in: '', check_out: '', room_id: '', special_requests: '' })
const fromOpen     = ref(false)
const toOpen       = ref(false)
const rooms        = ref<Room[]>([])
const roomsLoading = ref(false)

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
const evt = ref({
  start_date: '', end_date: '', pax_count: '',
  catering_required: false, notes: '',
})
const startOpen     = ref(false)
const endOpen       = ref(false)
const venues        = ref<Venue[]>([])
const venuesLoading = ref(false)

// ── Sessions (mirrors the public site's master sessions) ─────────────────────
type Session = {
  name: string
  event_type: string
  venue_id: string
  start_time: string
  end_time: string
  setup_type: string
  expected_attendees: string
  special_requirements: string
}
function emptySession(): Session {
  return {
    name: '', event_type: '', venue_id: '', start_time: '', end_time: '',
    setup_type: '', expected_attendees: '', special_requirements: '',
  }
}
const sessions = ref<Session[]>([emptySession()])
// Which session's venue browser is open (null = all closed)
const expandedVenueSession = ref<number | null>(null)

function addSession() {
  sessions.value.push(emptySession())
}
function removeSession(i: number) {
  if (sessions.value.length <= 1) return
  sessions.value.splice(i, 1)
  if (expandedVenueSession.value === i) expandedVenueSession.value = null
}
function venueById(id: string) {
  return venues.value.find(v => v.id === id)
}
function selectVenueForSession(s: Session, venue: Venue) {
  s.venue_id = venue.id
  expandedVenueSession.value = null
}
function clearVenueFromSession(s: Session) {
  s.venue_id = ''
}

const startDateVal = computed({
  get: () => toCalDate(evt.value.start_date),
  set: (dv) => { if (dv) { evt.value.start_date = fromCalDate(dv); startOpen.value = false } },
})
const endDateVal = computed({
  get: () => toCalDate(evt.value.end_date),
  set: (dv) => { if (dv) { evt.value.end_date = fromCalDate(dv); endOpen.value = false } },
})

async function loadVenues() {
  const sd = evt.value.start_date
  const ed = evt.value.end_date
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
}

watch([() => evt.value.start_date, () => evt.value.end_date], () => {
  // Availability changes with the dates — clear stale venue picks and reload
  sessions.value.forEach(s => { s.venue_id = '' })
  venues.value = []
  loadVenues()
})

const eventDays = computed(() => {
  if (!evt.value.start_date || !evt.value.end_date) return 0
  return Math.max(1, Math.round(
    (new Date(evt.value.end_date).getTime() - new Date(evt.value.start_date).getTime()) / 86400000,
  ) + 1)
})

function sessionHours(s: Session) {
  if (!s.start_time || !s.end_time) return 0
  const [sh, sm] = s.start_time.split(':').map(Number)
  const [eh, em] = s.end_time.split(':').map(Number)
  return Math.max(1, (eh! * 60 + em! - sh! * 60 - sm!) / 60)
}

// Estimate: each session's venue, daily or hourly rate, across the event days
const eventTotal = computed(() => {
  let total = 0
  for (const s of sessions.value) {
    const v = venueById(s.venue_id)
    if (!v) continue
    if (v.rate_type === 'daily') {
      total += v.base_rate * eventDays.value
    } else {
      const hrs = sessionHours(s)
      total += v.base_rate * (hrs || 1) * eventDays.value
    }
  }
  return total
})

// ── Validation ────────────────────────────────────────────────────────────────
const saving = ref(false)

const primaryName = computed(() => isCorporate.value ? company.value.name.trim() : booker.value.name.trim())

const canSubmit = computed(() => {
  if (!primaryName.value || saving.value) return false
  if (!isCorporate.value && !booker.value.name.trim()) return false
  if (bookingType.value === 'accommodation') {
    return acc.value.check_in !== '' && acc.value.check_out !== '' &&
      acc.value.check_out > acc.value.check_in && acc.value.room_id !== ''
  }
  const s0 = sessions.value[0]
  return (
    !!s0 && s0.event_type !== '' && s0.venue_id !== '' &&
    s0.start_time !== '' && s0.end_time !== '' &&
    evt.value.start_date !== '' && evt.value.end_date !== '' &&
    evt.value.end_date >= evt.value.start_date &&
    (isCorporate.value || Number(evt.value.pax_count) > 0)
  )
})

// ── Serialize corporate data into special_requests ────────────────────────────
function buildNotes(baseNotes: string) {
  if (!isCorporate.value) {
    const guests = attendants.value.filter(a => a.name.trim())
    const parts: string[] = []
    if (guests.length > 0) {
      const guestLines = guests.map((g, i) => {
        const label   = i === 0 ? 'Lead Guest' : `Guest ${i + 1}`
        const details = [g.id_number ? `ID: ${g.id_number}` : null, g.email || null, g.phone || null].filter(Boolean).join(' · ')
        return `${label}: ${g.name}${details ? ` (${details})` : ''}`
      })
      parts.push(`Guests:\n${guestLines.join('\n')}`)
    }
    if (baseNotes.trim()) parts.push(baseNotes.trim())
    return parts.join('\n\n') || undefined
  }

  const lines: string[] = [`[Corporate Walk-in]`]
  lines.push(`Company: ${company.value.name}`)
  if (company.value.tpin)       lines.push(`TPIN: ${company.value.tpin}`)
  if (company.value.industry)   lines.push(`Industry: ${company.value.industry}`)
  if (company.value.email)      lines.push(`Billing Email: ${company.value.email}`)
  if (company.value.phone)      lines.push(`Company Phone: ${company.value.phone}`)
  if (company.value.branch)     lines.push(`Branch: ${company.value.branch}`)
  if (company.value.department) lines.push(`Department: ${company.value.department}`)
  if (company.value.cost_center) lines.push(`${company.value.cost_center_type === 'internal_order' ? 'Internal Order' : 'Cost Centre'}: ${company.value.cost_center}`)
  if (company.value.gl_code)    lines.push(`GL Code: ${company.value.gl_code}`)

  lines.push(`\nBooked By: ${booker.value.name}`)
  if (booker.value.email)      lines.push(`Contact Email: ${booker.value.email}`)
  if (booker.value.phone)      lines.push(`Contact Phone: ${booker.value.phone}`)
  if (booker.value.job_title)  lines.push(`Job Title: ${booker.value.job_title}`)
  if (booker.value.man_number) lines.push(`Employee No: ${booker.value.man_number}`)

  if (approver.value.name) {
    lines.push(`\nApprover: ${approver.value.name}`)
    if (approver.value.title) lines.push(`Title: ${approver.value.title}`)
    if (approver.value.email) lines.push(`Approver Email: ${approver.value.email}`)
    if (approver.value.phone) lines.push(`Approver Phone: ${approver.value.phone}`)
  }

  const validDelegates = attendants.value.filter(a => a.name.trim())
  if (validDelegates.length) {
    lines.push(`\nDelegates (${validDelegates.length}):`)
    validDelegates.forEach((d, i) =>
      lines.push(`  ${i + 1}. ${d.name}${d.job_title ? ` — ${d.job_title}` : ''}${d.id_number ? ` (ID: ${d.id_number})` : ''}${d.phone ? ` · ${d.phone}` : ''}`)
    )
  }

  const parts = [lines.join('\n'), baseNotes.trim()].filter(Boolean)
  return parts.join('\n\n') || undefined
}

// The API payload only holds one venue/time slot (session 1), so the full
// session schedule is serialized into special_requests for staff visibility.
function buildSessionNotes() {
  const withData = sessions.value.filter(s => s.event_type || s.venue_id || s.name.trim())
  if (withData.length === 0) return ''
  const needsNotes = withData.length > 1 ||
    withData.some(s => s.name.trim() || s.expected_attendees || s.special_requirements.trim())
  if (!needsNotes) return ''
  const lines: string[] = [`Sessions (${withData.length}):`]
  withData.forEach((s, i) => {
    const label = s.name.trim() || `Session ${i + 1}`
    const parts = [
      EVENT_TYPES.find(t => t.value === s.event_type)?.label,
      venueById(s.venue_id)?.name,
      s.start_time && s.end_time ? `${s.start_time}–${s.end_time}` : null,
      SETUP_TYPES.find(t => t.value === s.setup_type)?.label,
      s.expected_attendees ? `${s.expected_attendees} pax` : null,
    ].filter(Boolean).join(' · ')
    lines.push(`  ${i + 1}. ${label}${parts ? ` — ${parts}` : ''}`)
    if (s.special_requirements.trim()) lines.push(`     Requirements: ${s.special_requirements.trim()}`)
  })
  return lines.join('\n')
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handleSubmit() {
  if (!canSubmit.value) return
  saving.value = true
  const bookerName  = isCorporate.value ? (booker.value.name.trim() || company.value.name.trim()) : booker.value.name.trim()
  const bookerEmail = booker.value.email.trim() || undefined
  const bookerPhone = booker.value.phone.trim() || undefined
  // For individual: lead guest's ID (attendants[0]). For corporate: unused.
  const bookerId    = !isCorporate.value
    ? (attendants.value[0]?.id_number.trim() || undefined)
    : undefined
  try {
    let booking: Booking
    if (bookingType.value === 'accommodation') {
      booking = await bookingApi.createIndividual({
        booker_name:         bookerName,
        booker_email:        bookerEmail,
        booker_phone:        bookerPhone,
        identification_card: bookerId,
        room_id:             acc.value.room_id,
        check_in:            acc.value.check_in,
        check_out:           acc.value.check_out,
        special_requests:    buildNotes(acc.value.special_requests),
      })
    } else {
      const pax = isCorporate.value
        ? (attendants.value.filter(a => a.name.trim()).length || Number(evt.value.pax_count) || 1)
        : Number(evt.value.pax_count)
      const s0 = sessions.value[0]!
      const combinedNotes = [buildSessionNotes(), evt.value.notes.trim()].filter(Boolean).join('\n\n')
      booking = await bookingApi.createIndividualEvent({
        booker_name:         bookerName,
        booker_email:        bookerEmail,
        booker_phone:        bookerPhone,
        identification_card: bookerId,
        event_type:          s0.event_type,
        venue_id:            s0.venue_id,
        start_date:          evt.value.start_date,
        end_date:            evt.value.end_date,
        start_time:          s0.start_time || undefined,
        end_time:            s0.end_time   || undefined,
        setup_type:          s0.setup_type || undefined,
        pax_count:           pax,
        catering_required:   evt.value.catering_required,
        special_requests:    buildNotes(combinedNotes),
      })
    }
    toast.success(`Booking created for ${booking.booker_name}.`)
    router.push({ name: 'admin-bookings' })
  } catch (err) {
    toast.error(getApiError(err, 'Failed to create booking.'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <DashboardHeader :title="isCorporate ? 'New Corporate Booking' : 'New Walk-In Booking'" />

    <div class="p-6">
      <div class="max-w-4xl mx-auto flex flex-col gap-4">

        <!-- Back link + intro + context switch -->
        <div class="flex items-end justify-between gap-3 flex-wrap">
          <div class="flex flex-col gap-1">
            <button type="button"
              class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
              @click="goBack">
              <ArrowLeft class="size-4" />
              Back to Bookings
            </button>
            <p class="text-sm text-muted-foreground">
              {{ isCorporate
                ? 'Create a confirmed booking on behalf of a corporate client.'
                : 'Create a confirmed booking on behalf of a walk-in guest.' }}
            </p>
          </div>
          <!-- Same pill style as the Bookings page tabs -->
          <div class="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
            <button type="button"
              class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
              :class="!isCorporate ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="context = 'individual'">
              <User class="size-4" />
              Individual
            </button>
            <button type="button"
              class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
              :class="isCorporate ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="context = 'corporate'">
              <Building2 class="size-4" />
              Corporate
            </button>
          </div>
        </div>

        <!-- ── Booking type ────────────────────────────────────────────── -->
        <div class="grid grid-cols-2 gap-2">
          <button type="button"
            class="flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-all"
            :class="bookingType === 'accommodation' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'"
            @click="bookingType = 'accommodation'">
            <BedDouble class="size-5 shrink-0" />
            <div>
              <p class="text-sm font-semibold">Accommodation</p>
              <p class="text-xs opacity-70 mt-0.5">Room stay booking</p>
            </div>
          </button>
          <button type="button"
            class="flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-all"
            :class="bookingType === 'event' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'"
            @click="bookingType = 'event'">
            <MapPin class="size-5 shrink-0" />
            <div>
              <p class="text-sm font-semibold">Event / Venue</p>
              <p class="text-xs opacity-70 mt-0.5">Function or venue booking</p>
            </div>
          </button>
        </div>

        <!-- ═══════════ CORPORATE SECTIONS ═══════════════════════════════ -->
        <template v-if="isCorporate">

          <!-- ─── Company Information ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2.5">
              <Building2 class="size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-semibold">Company Information</p>
                <p class="text-xs text-muted-foreground">Details of the organisation making this booking</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <Label class="text-xs">Company Name <span class="text-destructive">*</span></Label>
                <Input v-model="company.name" placeholder="e.g. Acme Corporation Ltd" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">TPIN</Label>
                <Input v-model="company.tpin" placeholder="e.g. 1234567890" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Industry</Label>
                <Select v-model="company.industry">
                  <SelectTrigger class="mt-1.5">
                    <SelectValue placeholder="Select industry…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="ind in INDUSTRIES" :key="ind" :value="ind">{{ ind }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label class="text-xs">Billing Email</Label>
                <Input v-model="company.email" type="email" placeholder="accounts@company.com" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Company Phone</Label>
                <Input v-model="company.phone" placeholder="e.g. +260 211 000000" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Branch</Label>
                <Input v-model="company.branch" placeholder="e.g. Lusaka North" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Department</Label>
                <Input v-model="company.department" placeholder="e.g. Finance" class="mt-1.5" />
              </div>
              <div class="flex flex-col gap-2">
                <Label class="text-xs">
                  {{ company.cost_center_type === 'internal_order' ? 'Internal Order No.' : 'Cost Centre' }}
                </Label>
                <div class="flex rounded-lg border overflow-hidden text-xs font-medium">
                  <button type="button"
                    class="flex-1 py-1.5 px-3 transition-colors"
                    :class="company.cost_center_type === 'cost_center' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
                    @click="company.cost_center_type = 'cost_center'">Cost Centre</button>
                  <button type="button"
                    class="flex-1 py-1.5 px-3 transition-colors border-l"
                    :class="company.cost_center_type === 'internal_order' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
                    @click="company.cost_center_type = 'internal_order'">Internal Order</button>
                </div>
                <Input v-model="company.cost_center" :placeholder="company.cost_center_type === 'cost_center' ? 'e.g. CC-1234' : 'e.g. IO-5678'" />
              </div>
              <div>
                <Label class="text-xs">GL Code</Label>
                <Input v-model="company.gl_code" placeholder="e.g. GL-4000" class="mt-1.5" />
              </div>
            </div>
          </div>

          <!-- ─── Booked By (corporate) ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2.5">
              <User class="size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-semibold">Booked By</p>
                <p class="text-xs text-muted-foreground">Company representative submitting this booking</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <Label class="text-xs">Full Name <span class="text-destructive">*</span></Label>
                <Input v-model="booker.name" placeholder="e.g. John Banda" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Email</Label>
                <Input v-model="booker.email" type="email" placeholder="john.banda@company.com" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Phone</Label>
                <Input v-model="booker.phone" placeholder="e.g. 0977 000 000" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Job Title</Label>
                <Input v-model="booker.job_title" placeholder="e.g. HR Manager" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Employee / Man Number</Label>
                <Input v-model="booker.man_number" placeholder="e.g. EMP-00123" class="mt-1.5" />
              </div>
            </div>
          </div>

          <!-- ─── Approver ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2.5">
              <ShieldCheck class="size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-semibold">Approver</p>
                <p class="text-xs text-muted-foreground">Person authorising this booking on behalf of the company</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="text-xs">Full Name</Label>
                <Input v-model="approver.name" placeholder="e.g. Mary Phiri" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Job Title</Label>
                <Input v-model="approver.title" placeholder="e.g. Finance Manager" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Email</Label>
                <Input v-model="approver.email" type="email" placeholder="approver@company.com" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Phone</Label>
                <Input v-model="approver.phone" placeholder="e.g. +260 97 0000000" class="mt-1.5" />
              </div>
            </div>
          </div>

        </template>

        <!-- ═══════════ INDIVIDUAL SECTIONS ══════════════════════════════ -->
        <template v-else>

          <!-- ─── Booked By (individual) ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2.5">
              <User class="size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-semibold">Booked By</p>
                <p class="text-xs text-muted-foreground">Person making this booking — receives all booking communications</p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="col-span-2">
                <Label class="text-xs">Full Name <span class="text-destructive">*</span></Label>
                <Input v-model="booker.name" placeholder="e.g. Grace Zulu" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Email Address <span class="text-destructive">*</span></Label>
                <Input v-model="booker.email" type="email" placeholder="guest@email.com" class="mt-1.5" />
              </div>
              <div>
                <Label class="text-xs">Phone Number</Label>
                <Input v-model="booker.phone" placeholder="e.g. 0977 000 000" class="mt-1.5" />
              </div>
            </div>
          </div>

          <!-- ─── Guests (individual) ─── -->
          <div class="rounded-xl border overflow-hidden">
            <button type="button"
              class="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
              @click="attendantsExpanded = !attendantsExpanded">
              <div class="flex items-center gap-2.5">
                <Users class="size-4 text-muted-foreground shrink-0" />
                <p class="text-sm font-semibold">Guests</p>
              </div>
              <ChevronDown class="size-4 text-muted-foreground transition-transform duration-200" :class="attendantsExpanded && 'rotate-180'" />
            </button>

            <div v-if="attendantsExpanded" class="px-5 pb-5 border-t flex flex-col gap-3 pt-4">
              <p class="text-xs text-muted-foreground">
                Register all guests. The lead contact receives all booking communications.
              </p>

              <div v-for="(att, i) in attendants" :key="i" class="rounded-lg border bg-muted/20 p-4 flex flex-col gap-2.5">
                <!-- Row header: number + label + trash -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                      :class="i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'">
                      {{ i + 1 }}
                    </span>
                    <span class="text-sm font-medium" :class="i === 0 ? 'text-primary' : 'text-muted-foreground'">
                      {{ i === 0 ? 'Lead Contact' : (att.name || `Guest ${i + 1}`) }}
                    </span>
                  </div>
                  <button type="button"
                    class="rounded p-1 transition-colors"
                    :class="i === 0 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-destructive'"
                    :disabled="i === 0"
                    @click="removeAttendant(i)">
                    <Trash2 class="size-3.5" />
                  </button>
                </div>

                <!-- Fields: 4-column single row -->
                <div class="grid grid-cols-4 gap-2.5">
                  <div>
                    <Label class="text-xs uppercase tracking-wide">Full Name <span class="text-destructive">*</span></Label>
                    <Input v-model="att.name" placeholder="John Doe" class="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label class="text-xs uppercase tracking-wide">Email <span class="text-destructive">*</span></Label>
                    <Input v-model="att.email" type="email" placeholder="email@example.com" class="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label class="text-xs uppercase tracking-wide">Phone <span class="text-destructive">*</span></Label>
                    <Input v-model="att.phone" placeholder="+260 977 000 000" class="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label class="text-xs uppercase tracking-wide">Passport / ID <span class="text-destructive">*</span></Label>
                    <Input v-model="att.id_number" placeholder="ID number" class="mt-1 h-8 text-sm" />
                  </div>
                </div>
              </div>

              <button type="button"
                class="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline w-fit mt-1"
                @click="addAttendant">
                <UserPlus class="size-3.5" />
                Add Guest
              </button>
            </div>
          </div>

        </template>

        <!-- ═══════════ DELEGATES (corporate collapsible) ══════════════════ -->
        <template v-if="isCorporate">
          <div class="rounded-xl border overflow-hidden">
            <button type="button"
              class="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
              @click="attendantsExpanded = !attendantsExpanded">
              <div class="flex items-center gap-2.5">
                <Users class="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p class="text-sm font-semibold">Delegates</p>
                  <p class="text-xs text-muted-foreground">
                    {{ attendants.length === 0
                      ? 'No delegates added — click to register'
                      : `${attendants.length} delegate${attendants.length !== 1 ? 's' : ''} registered` }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span v-if="attendants.length > 0"
                  class="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 min-w-[1.5rem]">
                  {{ attendants.length }}
                </span>
                <ChevronDown class="size-4 text-muted-foreground transition-transform duration-200" :class="attendantsExpanded && 'rotate-180'" />
              </div>
            </button>

            <div v-if="attendantsExpanded" class="px-5 pb-5 border-t flex flex-col gap-3 pt-4">
              <p class="text-xs text-muted-foreground">
                Register each delegate attending. Lead delegate receives all booking communications.
              </p>

              <div v-for="(att, i) in attendants" :key="i" class="rounded-lg border bg-muted/20 p-4 flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                      {{ i + 1 }}
                    </span>
                    <span class="text-sm font-medium text-muted-foreground">{{ att.name || `Delegate ${i + 1}` }}</span>
                  </div>
                  <button type="button"
                    class="text-muted-foreground hover:text-destructive transition-colors rounded p-1"
                    @click="removeAttendant(i)">
                    <Trash2 class="size-3.5" />
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-2.5">
                  <div class="col-span-2">
                    <Label class="text-xs">Full Name <span class="text-destructive">*</span></Label>
                    <Input v-model="att.name" placeholder="Full name" class="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label class="text-xs">Email</Label>
                    <Input v-model="att.email" type="email" placeholder="Email" class="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label class="text-xs">Phone</Label>
                    <Input v-model="att.phone" placeholder="Phone" class="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label class="text-xs">Passport / NRC <span class="text-destructive">*</span></Label>
                    <Input v-model="att.id_number" placeholder="ID number" class="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label class="text-xs">Job Title</Label>
                    <Input v-model="att.job_title" placeholder="e.g. Engineer" class="mt-1 h-8 text-sm" />
                  </div>
                </div>
              </div>

              <button type="button"
                class="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline w-fit mt-1"
                @click="addAttendant">
                <UserPlus class="size-3.5" />
                Add Delegate
              </button>
            </div>
          </div>
        </template>

        <!-- ═══════════════════ ACCOMMODATION FIELDS ══════════════════════ -->
        <template v-if="bookingType === 'accommodation'">

          <!-- ─── Accommodation  Details ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2.5">
              <BedDouble class="size-4 text-muted-foreground" />
              <p class="text-sm font-semibold">Accommodation Details</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="text-xs">Check-In <span class="text-destructive">*</span></Label>
                <Popover v-model:open="fromOpen">
                  <PopoverTrigger as-child>
                    <button type="button"
                      class="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                      :class="!acc.check_in && 'text-muted-foreground'">
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
                    <button type="button"
                      class="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                      :class="!acc.check_out && 'text-muted-foreground'"
                      :disabled="!acc.check_in">
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

            <div v-if="nights > 0"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 w-fit text-xs font-semibold text-primary">
              <CalendarIcon class="size-3" />
              {{ nights }} night{{ nights !== 1 ? 's' : '' }} · {{ displayDate(acc.check_in) }} – {{ displayDate(acc.check_out) }}
            </div>

            <!-- Room picker -->
            <div>
              <Label class="text-xs">Room <span class="text-destructive">*</span></Label>
              <div v-if="!acc.check_in || !acc.check_out" class="mt-1.5 text-xs text-muted-foreground rounded-lg border border-dashed px-4 py-4 text-center">
                Select check-in and check-out dates to see available rooms.
              </div>
              <div v-else-if="roomsLoading" class="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-dashed px-4 py-4">
                <Loader2 class="size-3.5 animate-spin" /> Checking room availability…
              </div>
              <div v-else-if="rooms.length === 0" class="mt-1.5 text-xs text-amber-600 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-4 text-center">
                No rooms available for these dates.
              </div>
              <div v-else class="mt-1.5 flex flex-col gap-2 max-h-52 overflow-y-auto">
                <button v-for="room in rooms" :key="room.id" type="button"
                  class="flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors"
                  :class="acc.room_id === room.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/40'"
                  @click="acc.room_id = room.id">
                  <div class="flex items-center gap-2.5">
                    <BedDouble class="size-4 text-muted-foreground shrink-0" />
                    <div>
                      <p class="font-semibold">{{ room.name }}</p>
                      <p class="text-xs text-muted-foreground capitalize">{{ room.type }} · Capacity {{ room.capacity }}</p>
                    </div>
                  </div>
                  <span class="text-xs font-semibold shrink-0">
                    ZMW {{ room.price_per_night.toLocaleString() }}<span class="font-normal text-muted-foreground">/night</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <!-- ─── Special Requests ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-3">
            <p class="text-sm font-semibold">Special Requests</p>
            <Textarea v-model="acc.special_requests"
              placeholder="Any special requirements, dietary needs, accessibility requests, preferred floor…"
              class="resize-none" rows="3" />
          </div>

          <!-- Estimate -->
          <div v-if="selectedRoom && nights > 0" class="rounded-xl bg-muted/40 border px-5 py-3.5 flex items-center justify-between text-sm">
            <span class="text-muted-foreground">{{ nights }} night{{ nights !== 1 ? 's' : '' }} × ZMW {{ selectedRoom.price_per_night.toLocaleString() }}/night</span>
            <span class="font-semibold">ZMW {{ accTotal.toLocaleString() }}</span>
          </div>

        </template>

        <!-- ═══════════════════ EVENT FIELDS ══════════════════════════════ -->
        <template v-else>

          <!-- ─── Event Schedule ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2.5">
              <CalendarIcon class="size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-semibold">Event Schedule</p>
                <p class="text-xs text-muted-foreground">Dates determine which venues are available for your sessions</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="text-xs">Start Date <span class="text-destructive">*</span></Label>
                <Popover v-model:open="startOpen">
                  <PopoverTrigger as-child>
                    <button type="button"
                      class="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                      :class="!evt.start_date && 'text-muted-foreground'">
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
                    <button type="button"
                      class="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                      :class="!evt.end_date && 'text-muted-foreground'"
                      :disabled="!evt.start_date">
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

            <div v-if="eventDays > 0 && evt.start_date && evt.end_date"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 w-fit text-xs font-semibold text-primary">
              <CalendarIcon class="size-3" />
              {{ eventDays }} day{{ eventDays !== 1 ? 's' : '' }} · {{ displayDate(evt.start_date) }} – {{ displayDate(evt.end_date) }}
            </div>
          </div>

          <!-- ─── Sessions ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <Clock class="size-4 text-muted-foreground" />
                <div>
                  <p class="text-sm font-semibold">Sessions</p>
                  <p class="text-xs text-muted-foreground">Each session runs on every event day. Session 1 is the main session.</p>
                </div>
              </div>
              <button v-if="evt.start_date && evt.end_date && !venuesLoading" type="button"
                class="flex items-center gap-1 text-xs font-medium text-primary hover:underline shrink-0"
                @click="loadVenues">
                Refresh venues
              </button>
            </div>

            <div v-for="(session, si) in sessions" :key="si" class="rounded-lg border overflow-hidden">
              <!-- Session header -->
              <div class="flex items-center justify-between px-4 py-3 bg-muted/30">
                <span class="text-sm font-semibold">
                  {{ session.name.trim() || (session.event_type ? (EVENT_TYPES.find(t => t.value === session.event_type)?.label + ' Session') : `Session ${si + 1}`) }}
                </span>
                <div class="flex items-center gap-2">
                  <span v-if="eventDays > 0"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    × {{ eventDays }} day{{ eventDays !== 1 ? 's' : '' }}
                  </span>
                  <button type="button" :disabled="sessions.length === 1"
                    class="rounded p-1 transition-colors"
                    :class="sessions.length === 1 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-destructive'"
                    @click="removeSession(si)">
                    <Trash2 class="size-3.5" />
                  </button>
                </div>
              </div>

              <div class="p-4 flex flex-col gap-3">
                <div class="grid grid-cols-2 gap-3">
                  <div class="col-span-2">
                    <Label class="text-xs">Session Name</Label>
                    <Input v-model="session.name" placeholder="e.g. Plenary, Workshop A, Closing Ceremony" class="mt-1.5" />
                  </div>
                  <div>
                    <Label class="text-xs">Event Type <span v-if="si === 0" class="text-destructive">*</span></Label>
                    <Select v-model="session.event_type">
                      <SelectTrigger class="mt-1.5">
                        <SelectValue placeholder="Select event type…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="et in EVENT_TYPES" :key="et.value" :value="et.value">{{ et.label }}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label class="text-xs">Room / Seating Setup</Label>
                    <Select v-model="session.setup_type">
                      <SelectTrigger class="mt-1.5">
                        <SelectValue placeholder="Select setup…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="st in SETUP_TYPES" :key="st.value" :value="st.value">{{ st.label }}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label class="text-xs flex items-center gap-1"><Clock class="size-3" /> Start Time <span v-if="si === 0" class="text-destructive">*</span></Label>
                    <Input v-model="session.start_time" type="time" class="mt-1.5" />
                  </div>
                  <div>
                    <Label class="text-xs flex items-center gap-1"><Clock class="size-3" /> End Time <span v-if="si === 0" class="text-destructive">*</span></Label>
                    <Input v-model="session.end_time" type="time" class="mt-1.5" />
                  </div>
                </div>

                <!-- Venue picker -->
                <div class="rounded-lg border overflow-hidden"
                  :class="expandedVenueSession === si && 'ring-1 ring-primary/30 border-primary/40'">
                  <div class="flex items-center justify-between gap-3 px-3 py-2.5 bg-muted/20">
                    <div v-if="session.venue_id && venueById(session.venue_id)" class="flex items-center gap-2 min-w-0">
                      <MapPin class="size-4 text-primary shrink-0" />
                      <div class="min-w-0">
                        <p class="text-sm font-semibold truncate">{{ venueById(session.venue_id)!.name }}</p>
                        <p class="text-xs text-muted-foreground">
                          {{ VENUE_TYPE_LABELS[venueById(session.venue_id)!.venue_type] ?? venueById(session.venue_id)!.venue_type }}
                          · Capacity {{ venueById(session.venue_id)!.capacity }}
                          · ZMW {{ venueById(session.venue_id)!.base_rate.toLocaleString() }}/{{ venueById(session.venue_id)!.rate_type === 'daily' ? 'day' : 'hr' }}
                        </p>
                      </div>
                    </div>
                    <p v-else class="text-sm text-muted-foreground">
                      Venue <span v-if="si === 0" class="text-destructive">*</span> — none selected
                    </p>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <button v-if="session.venue_id" type="button"
                        class="text-muted-foreground hover:text-destructive transition-colors rounded p-1"
                        @click="clearVenueFromSession(session)">
                        <Trash2 class="size-3.5" />
                      </button>
                      <Button type="button" size="sm" variant="outline"
                        :disabled="!evt.start_date || !evt.end_date"
                        @click="expandedVenueSession = expandedVenueSession === si ? null : si">
                        {{ expandedVenueSession === si ? 'Close' : (session.venue_id ? 'Change' : 'Browse venues') }}
                      </Button>
                    </div>
                  </div>

                  <!-- Available venue list -->
                  <div v-if="expandedVenueSession === si" class="border-t p-3">
                    <div v-if="!evt.start_date || !evt.end_date" class="text-xs text-muted-foreground rounded-lg border border-dashed px-4 py-4 text-center">
                      Select event dates first to see available venues.
                    </div>
                    <div v-else-if="venuesLoading" class="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-dashed px-4 py-4">
                      <Loader2 class="size-3.5 animate-spin" /> Loading available venues…
                    </div>
                    <div v-else-if="venues.length === 0" class="text-xs text-amber-600 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-4 text-center">
                      No venues available for these dates.
                    </div>
                    <div v-else class="flex flex-col gap-2 max-h-52 overflow-y-auto">
                      <button v-for="venue in venues" :key="venue.id" type="button"
                        class="flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors"
                        :class="session.venue_id === venue.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/40'"
                        @click="selectVenueForSession(session, venue)">
                        <div class="flex items-center gap-2.5">
                          <MapPin class="size-4 text-muted-foreground shrink-0" />
                          <div>
                            <p class="font-semibold">{{ venue.name }}</p>
                            <p class="text-xs text-muted-foreground">{{ VENUE_TYPE_LABELS[venue.venue_type] ?? venue.venue_type }} · Capacity {{ venue.capacity }}</p>
                          </div>
                        </div>
                        <span class="text-xs font-semibold shrink-0">
                          ZMW {{ venue.base_rate.toLocaleString() }}<span class="font-normal text-muted-foreground">/{{ venue.rate_type === 'daily' ? 'day' : 'hr' }}</span>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <Label class="text-xs">Expected Attendees</Label>
                    <Input v-model="session.expected_attendees" type="number" min="1" placeholder="e.g. 50" class="mt-1.5" />
                  </div>
                  <div>
                    <Label class="text-xs">Special Requirements</Label>
                    <Input v-model="session.special_requirements" placeholder="AV equipment, branding, signage…" class="mt-1.5" />
                  </div>
                </div>
              </div>
            </div>

            <button type="button"
              class="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline w-fit"
              @click="addSession">
              <UserPlus class="size-3.5" />
              Add Another Session
            </button>
          </div>

          <!-- ─── Attendees (individual only — corporate uses delegates) ─── -->
          <div v-if="!isCorporate" class="rounded-xl border p-5 flex flex-col gap-3">
            <div class="flex items-center gap-2.5">
              <Users class="size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-semibold">Attendees</p>
                <p class="text-xs text-muted-foreground">Expected number of people attending the event</p>
              </div>
            </div>
            <div>
              <Label class="text-xs">Total Attendees <span class="text-destructive">*</span></Label>
              <Input v-model="evt.pax_count" type="number" min="1" placeholder="e.g. 50" class="mt-1.5 w-36" />
            </div>
          </div>

          <!-- ─── Catering & Requirements ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2.5">
              <UtensilsCrossed class="size-4 text-muted-foreground" />
              <p class="text-sm font-semibold">Catering &amp; Requirements</p>
            </div>
            <label class="flex items-start gap-3 cursor-pointer">
              <Checkbox :checked="evt.catering_required" class="mt-0.5" @update:checked="evt.catering_required = $event" />
              <div>
                <p class="text-sm font-medium">Catering required</p>
                <p class="text-xs text-muted-foreground mt-0.5">Include meal or refreshment service for this event</p>
              </div>
            </label>
            <div>
              <Label class="text-xs">Notes / Special Requirements</Label>
              <Textarea v-model="evt.notes"
                placeholder="Equipment needs, layout preferences, dietary requirements, AV setup, accessibility…"
                class="mt-1.5 resize-none" rows="3" />
            </div>
          </div>

          <!-- Event estimate -->
          <div v-if="eventTotal > 0" class="rounded-xl bg-muted/40 border px-5 py-3.5 flex flex-col gap-1 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground">
                {{ sessions.filter(s => s.venue_id).length }} session{{ sessions.filter(s => s.venue_id).length !== 1 ? 's' : '' }}
                · {{ eventDays }} day{{ eventDays !== 1 ? 's' : '' }}
              </span>
              <span class="font-semibold">ZMW {{ eventTotal.toLocaleString() }}</span>
            </div>
            <p class="text-xs text-muted-foreground">Estimate only — final price confirmed at approval.</p>
          </div>

        </template>

        <!-- ── Actions ─────────────────────────────────────────────────── -->
        <div class="flex items-center justify-end gap-2 pt-2 pb-8">
          <Button variant="outline" :disabled="saving" @click="goBack">Cancel</Button>
          <Button :disabled="!canSubmit" @click="handleSubmit">
            <Loader2 v-if="saving" class="size-4 mr-2 animate-spin" />
            Create Booking
          </Button>
        </div>

      </div>
    </div>
  </div>
</template>
