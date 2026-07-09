<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDate, type DateValue } from '@internationalized/date'
import {
  CalendarIcon, Loader2, BedDouble, MapPin, Users, Clock,
  User, UserPlus, Trash2, ChevronDown, List, Building2, ShieldCheck,
  ArrowLeft, StickyNote, CalendarRange, CalendarClock, Ban, RotateCcw, UtensilsCrossed,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { bookingApi } from '@/services/api/bookings'
import { roomApi } from '@/services/api/room'
import { venueApi } from '@/services/api/venue'
import { menusApi } from '@/services/api/menus'
import { getApiError } from '@/utils/errors'
import type { Room } from '@/types/room'
import type { Venue } from '@/types/venue'
import type { Booking } from '@/types/booking'
import type { MenuItem } from '@/types/menu'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
type BookingType    = 'accommodation' | 'event' | 'meals'
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

const PRICING_BASIS = [
  { value: 'half_day',  label: 'Half Day' },
  { value: 'full_day',  label: 'Full Day' },
  { value: 'hourly',    label: 'Hourly' },
  { value: 'flat_rate', label: 'Flat Rate' },
]

const MEAL_PERIODS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'brunch',    label: 'Brunch' },
  { value: 'lunch',     label: 'Lunch' },
  { value: 'dinner',    label: 'Dinner' },
  { value: 'supper',    label: 'Supper' },
]

const SERVICE_TYPES = [
  { value: 'buffet',           label: 'Buffet' },
  { value: 'individual_order', label: 'Individual Orders' },
  { value: 'mixed',            label: 'Mixed (Buffet + Exceptions)' },
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
  branch: '', department: '', country: '',
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
type Attendant = { name: string; email: string; phone: string; id_number: string; job_title: string; dietary_notes: string }
function blankAttendant(): Attendant {
  return { name: '', email: '', phone: '', id_number: '', job_title: '', dietary_notes: '' }
}
const attendants = ref<Attendant[]>(
  isCorporate.value ? [] : [blankAttendant()],
)
const attendantsExpanded = ref(!isCorporate.value)

function addAttendant() {
  attendants.value.push(blankAttendant())
  attendantsExpanded.value = true
}
function removeAttendant(i: number) {
  if (!isCorporate.value && i === 0) return  // lead contact cannot be removed for individual
  attendants.value.splice(i, 1)
  if (attendants.value.length === 0) attendantsExpanded.value = false
  // Reindex delegate room assignments to follow the shifted attendant indices
  const reindexed: Record<number, DelegateRoomAssignment> = {}
  Object.entries(delegateRooms.value).forEach(([k, v]) => {
    const idx = Number(k)
    if (idx === i) return
    reindexed[idx > i ? idx - 1 : idx] = v
  })
  delegateRooms.value = reindexed
}

// ── Attendee registration mode (individual events) ───────────────────────────
// 'headcount' = expected pax only; 'detailed' = register each attendee record.
const participantMode   = ref<'headcount' | 'detailed'>('headcount')
const attendeesExpanded = ref(true)

// ── Delegate registration mode (corporate events — accommodation always needs
// individual records so rooms can be assigned per delegate) ──────────────────
const delegateMode = ref<'headcount' | 'detailed'>('headcount')

// Re-initialise attendants when context switches
watch(context, (ctx) => {
  if (ctx === 'individual') {
    attendants.value = [blankAttendant()]
    attendantsExpanded.value = true
  } else {
    attendants.value = []
    attendantsExpanded.value = false
  }
  participantMode.value = 'headcount'
  delegateMode.value    = 'headcount'
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

// Corporate: one room can be assigned to each delegate (keyed by attendant index)
type DelegateRoomAssignment = { room_id: string; room_name: string; room_type: string; rate_per_night: number }
const delegateRooms             = ref<Record<number, DelegateRoomAssignment>>({})
const expandedDelegateRoomPicker = ref<number | null>(null)

function getDelegateRoom(i: number) {
  return delegateRooms.value[i] ?? null
}
function setDelegateRoom(i: number, room: Room) {
  delegateRooms.value[i] = {
    room_id: room.id, room_name: room.name, room_type: room.type, rate_per_night: room.price_per_night,
  }
  expandedDelegateRoomPicker.value = null
}
function clearDelegateRoom(i: number) {
  delete delegateRooms.value[i]
}
// Rooms already assigned to other delegates are hidden from this delegate's picker
function availableRoomsForDelegate(i: number) {
  const takenByOthers = new Set(
    Object.entries(delegateRooms.value)
      .filter(([k]) => Number(k) !== i)
      .map(([, r]) => r.room_id),
  )
  return rooms.value.filter(r => !takenByOthers.has(r.id))
}

watch([() => acc.value.check_in, () => acc.value.check_out], async ([ci, co]) => {
  acc.value.room_id = ''
  rooms.value = []
  delegateRooms.value = {}
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
const delegateRoomTotal = computed(() =>
  Object.values(delegateRooms.value).reduce((sum, r) => sum + r.rate_per_night, 0) * nights.value,
)

// ── Event form ────────────────────────────────────────────────────────────────
const evt = ref({
  start_date: '', end_date: '', pax_count: '',
  catering_required: false, notes: '',
})

// Detailed mode derives the total attendee/delegate count from the records
watch([participantMode, () => attendants.value.length], () => {
  if (!isCorporate.value && participantMode.value === 'detailed') {
    evt.value.pax_count = String(attendants.value.length)
  }
})
watch([delegateMode, () => attendants.value.length], () => {
  if (isCorporate.value && delegateMode.value === 'detailed') {
    evt.value.pax_count = String(attendants.value.length)
  }
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
  pricing_basis: string
  expected_attendees: string
  special_requirements: string
}
function emptySession(): Session {
  return {
    name: '', event_type: '', venue_id: '', start_time: '', end_time: '',
    setup_type: '', pricing_basis: 'full_day', expected_attendees: '', special_requirements: '',
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
function sessionLabel(s: Session, i: number) {
  return s.name.trim() || (s.event_type ? `${EVENT_TYPES.find(t => t.value === s.event_type)?.label} Session` : `Session ${i + 1}`)
}

// ── Multi-day scheduling: uniform (same sessions every day) vs per-day ───────
// (mirrors the public site's schedule-mode / day-overrides behaviour)
const scheduleMode = ref<'uniform' | 'per_day'>('uniform')
type DayOverride = { excluded: boolean; sessions: Session[] }
const dayOverrides         = ref<Record<string, DayOverride>>({})
const expandedDayOverride  = ref<string | null>(null)
const expandedOverrideVenue = ref<string | null>(null)

const dayRange = computed(() => {
  const sd = evt.value.start_date
  const ed = evt.value.end_date
  if (!sd || !ed || ed < sd) return [] as string[]
  const [sy, sm, sdd] = sd.split('-').map(Number)
  const [ey, em, edd] = ed.split('-').map(Number)
  const start = new Date(Date.UTC(sy!, sm! - 1, sdd!))
  const end   = new Date(Date.UTC(ey!, em! - 1, edd!))
  const dates: string[] = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1))
    dates.push(d.toISOString().slice(0, 10))
  return dates
})

watch(dayRange, (range) => { if (range.length <= 1) scheduleMode.value = 'uniform' })

const eventDaySummary = computed(() => {
  const total      = dayRange.value.length
  const skipped    = Object.values(dayOverrides.value).filter(o =>  o.excluded).length
  const customised = Object.values(dayOverrides.value).filter(o => !o.excluded).length
  return { total, skipped, customised, defaultCount: total - skipped - customised }
})

function fmtDayLabel(iso: string) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function dayStatus(date: string): 'default' | 'skipped' | 'overridden' {
  const ov = dayOverrides.value[date]
  if (!ov) return 'default'
  return ov.excluded ? 'skipped' : 'overridden'
}

function setDayOverride(date: string) {
  if (!dayOverrides.value[date]) {
    dayOverrides.value[date] = { excluded: false, sessions: sessions.value.map(s => ({ ...s })) }
  }
}
function startDayOverride(date: string) {
  setDayOverride(date)
  expandedDayOverride.value = expandedDayOverride.value === date ? null : date
}
function collapseDayOverride(date: string) {
  delete dayOverrides.value[date]
  if (expandedDayOverride.value === date) expandedDayOverride.value = null
}
function toggleDayExcluded(date: string) {
  const ov = dayOverrides.value[date]
  if (!ov) dayOverrides.value[date] = { excluded: true, sessions: [] }
  else ov.excluded = !ov.excluded
}
function addOverrideSession(date: string) {
  dayOverrides.value[date]?.sessions.push(emptySession())
}
function removeOverrideSession(date: string, i: number) {
  const ov = dayOverrides.value[date]
  if (ov && ov.sessions.length > 1) ov.sessions.splice(i, 1)
}
function selectVenueForOverrideSession(s: Session, venue: Venue) {
  s.venue_id = venue.id
  expandedOverrideVenue.value = null
}
function overrideSessions(date: string): Session[] {
  return dayOverrides.value[date]?.sessions ?? []
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
  Object.values(dayOverrides.value).forEach(ov => ov.sessions.forEach(s => { s.venue_id = '' }))
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

// ── Meal form ──────────────────────────────────────────────────────────────────
const meal = ref({ start_date: '', end_date: '', reason: '', notes: '' })
const mealStartOpen = ref(false)
const mealEndOpen   = ref(false)

const mealStartDateVal = computed({
  get: () => toCalDate(meal.value.start_date),
  set: (dv) => { if (dv) { meal.value.start_date = fromCalDate(dv); mealStartOpen.value = false } },
})
const mealEndDateVal = computed({
  get: () => toCalDate(meal.value.end_date),
  set: (dv) => { if (dv) { meal.value.end_date = fromCalDate(dv); mealEndOpen.value = false } },
})

const mealDays = computed(() => {
  if (!meal.value.start_date || !meal.value.end_date) return 0
  return Math.max(1, Math.round(
    (new Date(meal.value.end_date).getTime() - new Date(meal.value.start_date).getTime()) / 86400000,
  ) + 1)
})

// ── Menu catalog (buffet selection / individual order line items) ─────────────
const menuItems    = ref<MenuItem[]>([])
const menuLoading  = ref(false)
async function loadMenuItems() {
  menuLoading.value = true
  try {
    const res = await menusApi.getMenu({ page_size: 200 })
    menuItems.value = res.items?.data ?? []
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load menu items.'))
  } finally {
    menuLoading.value = false
  }
}
onMounted(loadMenuItems)

const buffetMenuItems = computed(() => menuItems.value.filter(m => m.category === 'buffet'))
// Individual/mixed order assignments pick a specific dish, not a buffet package
const individualOrderMenuItems = computed(() => menuItems.value.filter(m => m.category !== 'buffet'))
function menuItemById(id: string) {
  return menuItems.value.find(m => m.id === id)
}

// ── Meal sessions ───────────────────────────────────────────────────────────────
type MealOrderLine = { attendant_idx: number; menu_item_id: string; quantity: number; notes: string }
type MealSession = {
  name: string
  meal_period: string
  serving_time: string
  service_type: 'buffet' | 'individual_order' | 'mixed'
  buffet_item_id: string
  dietary_notes: string
  arrangements_notes: string
  individual_orders: MealOrderLine[]
}
function emptyMealSession(): MealSession {
  return {
    name: '', meal_period: 'lunch', serving_time: '', service_type: 'buffet',
    buffet_item_id: '', dietary_notes: '', arrangements_notes: '', individual_orders: [],
  }
}
const masterMeals = ref<MealSession[]>([emptyMealSession()])
function addMasterMeal() { masterMeals.value.push(emptyMealSession()) }
function removeMasterMeal(i: number) {
  if (masterMeals.value.length <= 1) return
  masterMeals.value.splice(i, 1)
}
function mealSessionLabel(s: MealSession, i: number) {
  return s.name.trim() || (s.meal_period ? `${MEAL_PERIODS.find(p => p.value === s.meal_period)?.label} Session` : `Meal ${i + 1}`)
}

// Diner slots for per-guest order assignment — real attendant records in detailed
// mode, or anonymous numbered seats sized to the headcount otherwise.
type OrderSlot = { name: string }
const dinerSlots = computed<OrderSlot[]>(() => {
  const detailed = isCorporate.value ? delegateMode.value === 'detailed' : participantMode.value === 'detailed'
  if (detailed) return attendants.value.map(a => ({ name: a.name }))
  const count = Math.max(1, Number(evt.value.pax_count) || 1)
  return Array.from({ length: count }, () => ({ name: '' }))
})

function orderLinesFor(session: MealSession, attendantIdx: number) {
  return session.individual_orders.filter(o => o.attendant_idx === attendantIdx)
}
function addOrderLine(session: MealSession, attendantIdx: number) {
  session.individual_orders.push({ attendant_idx: attendantIdx, menu_item_id: '', quantity: 1, notes: '' })
}
function removeOrderLine(session: MealSession, line: MealOrderLine) {
  const idx = session.individual_orders.indexOf(line)
  if (idx !== -1) session.individual_orders.splice(idx, 1)
}
function applyToAllDiners(session: MealSession, menuItemId: string, quantity: number) {
  if (!menuItemId) return
  session.individual_orders = dinerSlots.value.map((_, i) => ({
    attendant_idx: i, menu_item_id: menuItemId, quantity: quantity || 1, notes: '',
  }))
}
const quickFillItemId = ref('')
const quickFillQty    = ref(1)

// ── Multi-day scheduling for meals: uniform vs per-day (mirrors events) ───────
const mealScheduleMode = ref<'uniform' | 'per_day'>('uniform')
type MealDayOverride = { excluded: boolean; sessions: MealSession[] }
const mealDayOverrides        = ref<Record<string, MealDayOverride>>({})
const expandedMealDayOverride = ref<string | null>(null)

const mealDayRange = computed(() => {
  const sd = meal.value.start_date
  const ed = meal.value.end_date
  if (!sd || !ed || ed < sd) return [] as string[]
  const [sy, sm, sdd] = sd.split('-').map(Number)
  const [ey, em, edd] = ed.split('-').map(Number)
  const start = new Date(Date.UTC(sy!, sm! - 1, sdd!))
  const end   = new Date(Date.UTC(ey!, em! - 1, edd!))
  const dates: string[] = []
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1))
    dates.push(d.toISOString().slice(0, 10))
  return dates
})

watch(mealDayRange, (range) => { if (range.length <= 1) mealScheduleMode.value = 'uniform' })

const mealDaySummary = computed(() => {
  const total      = mealDayRange.value.length
  const skipped    = Object.values(mealDayOverrides.value).filter(o =>  o.excluded).length
  const customised = Object.values(mealDayOverrides.value).filter(o => !o.excluded).length
  return { total, skipped, customised, defaultCount: total - skipped - customised }
})

function mealDayStatus(date: string): 'default' | 'skipped' | 'overridden' {
  const ov = mealDayOverrides.value[date]
  if (!ov) return 'default'
  return ov.excluded ? 'skipped' : 'overridden'
}
function setMealDayOverride(date: string) {
  if (!mealDayOverrides.value[date]) {
    mealDayOverrides.value[date] = {
      excluded: false,
      sessions: masterMeals.value.map(s => ({ ...s, individual_orders: s.individual_orders.map(o => ({ ...o })) })),
    }
  }
}
function startMealDayOverride(date: string) {
  setMealDayOverride(date)
  expandedMealDayOverride.value = expandedMealDayOverride.value === date ? null : date
}
function collapseMealDayOverride(date: string) {
  delete mealDayOverrides.value[date]
  if (expandedMealDayOverride.value === date) expandedMealDayOverride.value = null
}
function toggleMealDayExcluded(date: string) {
  const ov = mealDayOverrides.value[date]
  if (!ov) mealDayOverrides.value[date] = { excluded: true, sessions: [] }
  else ov.excluded = !ov.excluded
}
function addOverrideMeal(date: string) {
  mealDayOverrides.value[date]?.sessions.push(emptyMealSession())
}
function removeOverrideMeal(date: string, i: number) {
  const ov = mealDayOverrides.value[date]
  if (ov && ov.sessions.length > 1) ov.sessions.splice(i, 1)
}
function overrideMeals(date: string): MealSession[] {
  return mealDayOverrides.value[date]?.sessions ?? []
}

// ── Validation ────────────────────────────────────────────────────────────────
const saving = ref(false)

const primaryName = computed(() => isCorporate.value ? company.value.name.trim() : booker.value.name.trim())

const canSubmit = computed(() => {
  if (!primaryName.value || saving.value) return false
  if (!isCorporate.value && !booker.value.name.trim()) return false
  if (bookingType.value === 'accommodation') {
    if (acc.value.check_in === '' || acc.value.check_out === '' || acc.value.check_out <= acc.value.check_in) return false
    return isCorporate.value
      ? Object.keys(delegateRooms.value).length > 0
      : acc.value.room_id !== ''
  }
  if (bookingType.value === 'meals') {
    const m0 = masterMeals.value[0]
    return (
      !!m0 && m0.meal_period !== '' &&
      (m0.service_type !== 'buffet' || m0.buffet_item_id !== '') &&
      meal.value.start_date !== '' && meal.value.end_date !== '' &&
      meal.value.end_date >= meal.value.start_date &&
      (isCorporate.value || (participantMode.value === 'detailed'
        ? attendants.value.some(a => a.name.trim())
        : Number(evt.value.pax_count) > 0))
    )
  }
  const s0 = sessions.value[0]
  return (
    !!s0 && s0.event_type !== '' && s0.venue_id !== '' &&
    s0.start_time !== '' && s0.end_time !== '' &&
    evt.value.start_date !== '' && evt.value.end_date !== '' &&
    evt.value.end_date >= evt.value.start_date &&
    (isCorporate.value || (participantMode.value === 'detailed'
      ? attendants.value.some(a => a.name.trim())
      : Number(evt.value.pax_count) > 0))
  )
})

// ── Serialize corporate data into special_requests ────────────────────────────
function buildNotes(baseNotes: string) {
  if (!isCorporate.value) {
    // Events in headcount mode carry no individual records — skip the guest list
    const includeGuests = bookingType.value === 'accommodation' || participantMode.value === 'detailed'
    const guests = includeGuests ? attendants.value.filter(a => a.name.trim()) : []
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
  if (company.value.country)   lines.push(`Country: ${company.value.country}`)

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

  const validDelegates = attendants.value
    .map((a, i) => ({ ...a, _idx: i }))
    .filter(a => a.name.trim())
  if (validDelegates.length) {
    lines.push(`\nDelegates (${validDelegates.length}):`)
    validDelegates.forEach((d, i) => {
      const room = bookingType.value === 'accommodation' ? getDelegateRoom(d._idx) : null
      lines.push(`  ${i + 1}. ${d.name}${d.job_title ? ` — ${d.job_title}` : ''}${d.id_number ? ` (ID: ${d.id_number})` : ''}${d.phone ? ` · ${d.phone}` : ''}${room ? ` · Room: ${room.room_name}` : ''}`)
    })
  } else if (bookingType.value !== 'accommodation' && delegateMode.value === 'headcount' && Number(evt.value.pax_count) > 0) {
    lines.push(`\nDelegates: ${evt.value.pax_count} (headcount only)`)
  }

  const parts = [lines.join('\n'), baseNotes.trim()].filter(Boolean)
  return parts.join('\n\n') || undefined
}

function sessionSummaryLine(s: Session, i: number, indent: string) {
  const label = s.name.trim() || `Session ${i + 1}`
  const parts = [
    EVENT_TYPES.find(t => t.value === s.event_type)?.label,
    venueById(s.venue_id)?.name,
    s.start_time && s.end_time ? `${s.start_time}–${s.end_time}` : null,
    SETUP_TYPES.find(t => t.value === s.setup_type)?.label,
    PRICING_BASIS.find(p => p.value === s.pricing_basis)?.label,
    s.expected_attendees ? `${s.expected_attendees} pax` : null,
  ].filter(Boolean).join(' · ')
  const lines = [`${indent}${i + 1}. ${label}${parts ? ` — ${parts}` : ''}`]
  if (s.special_requirements.trim()) lines.push(`${indent}   Requirements: ${s.special_requirements.trim()}`)
  return lines
}

// The API payload only holds one venue/time slot (session 1), so the full
// session schedule — including any per-day customisations — is serialized
// into special_requests for staff visibility.
function buildSessionNotes() {
  const withData  = sessions.value.filter(s => s.event_type || s.venue_id || s.name.trim())
  const multiDay  = dayRange.value.length > 1
  const perDay    = multiDay && scheduleMode.value === 'per_day'
  const hasOverrides = perDay && Object.keys(dayOverrides.value).length > 0

  if (withData.length === 0 && !hasOverrides) return ''

  const lines: string[] = []
  if (multiDay) lines.push(`Schedule: ${perDay ? 'Per-Day' : 'Uniform'} (${dayRange.value.length} days)`)

  if (withData.length) {
    lines.push(`${perDay ? 'Default Sessions' : 'Sessions'} (${withData.length}):`)
    withData.forEach((s, i) => lines.push(...sessionSummaryLine(s, i, '  ')))
  }

  if (hasOverrides) {
    lines.push('', 'Day-by-Day:')
    dayRange.value.forEach(date => {
      const ov    = dayOverrides.value[date]
      const label = fmtDayLabel(date)
      if (!ov)             { lines.push(`  ${label}: Using default schedule`); return }
      if (ov.excluded)     { lines.push(`  ${label}: Skipped`); return }
      lines.push(`  ${label}: ${ov.sessions.length} custom session${ov.sessions.length !== 1 ? 's' : ''}`)
      ov.sessions.forEach((s, i) => lines.push(...sessionSummaryLine(s, i, '    ')))
    })
  }

  return lines.join('\n')
}

function mealSummaryLine(s: MealSession, i: number, indent: string) {
  const label = s.name.trim() || `Meal ${i + 1}`
  const parts = [
    MEAL_PERIODS.find(p => p.value === s.meal_period)?.label,
    s.serving_time || null,
    SERVICE_TYPES.find(t => t.value === s.service_type)?.label,
    s.service_type === 'buffet' && s.buffet_item_id ? menuItemById(s.buffet_item_id)?.name : null,
  ].filter(Boolean).join(' · ')
  const lines = [`${indent}${i + 1}. ${label}${parts ? ` — ${parts}` : ''}`]
  if (s.dietary_notes.trim()) lines.push(`${indent}   Dietary: ${s.dietary_notes.trim()}`)
  if (s.arrangements_notes.trim()) lines.push(`${indent}   Arrangements: ${s.arrangements_notes.trim()}`)
  if (s.individual_orders.length) {
    lines.push(`${indent}   Orders:`)
    s.individual_orders.forEach(o => {
      const item      = menuItemById(o.menu_item_id)
      const dinerName = dinerSlots.value[o.attendant_idx]?.name || `Guest ${o.attendant_idx + 1}`
      lines.push(`${indent}     ${dinerName}: ${o.quantity}× ${item?.name ?? 'item'}${o.notes ? ` (${o.notes})` : ''}`)
    })
  }
  return lines
}

// The API payload only holds one meal slot (session 1), so the full meal plan —
// including any per-day customisations — is serialized into special_requests.
function buildMealNotes() {
  const withData = masterMeals.value.filter(s => s.name.trim() || s.meal_period || s.individual_orders.length)
  const multiDay  = mealDayRange.value.length > 1
  const perDay    = multiDay && mealScheduleMode.value === 'per_day'
  const hasOverrides = perDay && Object.keys(mealDayOverrides.value).length > 0

  if (withData.length === 0 && !hasOverrides) return ''

  const lines: string[] = []
  if (multiDay) lines.push(`Schedule: ${perDay ? 'Per-Day' : 'Uniform'} (${mealDayRange.value.length} days)`)

  if (withData.length) {
    lines.push(`${perDay ? 'Default Meals' : 'Meals'} (${withData.length}):`)
    withData.forEach((s, i) => lines.push(...mealSummaryLine(s, i, '  ')))
  }

  if (hasOverrides) {
    lines.push('', 'Day-by-Day:')
    mealDayRange.value.forEach(date => {
      const ov    = mealDayOverrides.value[date]
      const label = fmtDayLabel(date)
      if (!ov)             { lines.push(`  ${label}: Using default plan`); return }
      if (ov.excluded)     { lines.push(`  ${label}: No meals`); return }
      lines.push(`  ${label}: ${ov.sessions.length} custom meal${ov.sessions.length !== 1 ? 's' : ''}`)
      ov.sessions.forEach((s, i) => lines.push(...mealSummaryLine(s, i, '    ')))
    })
  }

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
      // The booking API reserves a single room per booking — for corporate stays with
      // several delegate room assignments, the first assigned room anchors the booking
      // and the full delegate → room breakdown is captured in special_requests below.
      const roomId = isCorporate.value
        ? (Object.values(delegateRooms.value)[0]?.room_id ?? '')
        : acc.value.room_id
      booking = await bookingApi.createIndividual({
        booker_name:         bookerName,
        booker_email:        bookerEmail,
        booker_phone:        bookerPhone,
        identification_card: bookerId,
        room_id:             roomId,
        check_in:            acc.value.check_in,
        check_out:           acc.value.check_out,
        special_requests:    buildNotes(acc.value.special_requests),
      })
    } else if (bookingType.value === 'meals') {
      const pax = isCorporate.value
        ? (attendants.value.filter(a => a.name.trim()).length || Number(evt.value.pax_count) || 1)
        : (participantMode.value === 'detailed'
            ? (attendants.value.filter(a => a.name.trim()).length || 1)
            : Number(evt.value.pax_count))
      const m0 = masterMeals.value[0]!
      const combinedNotes = [
        meal.value.reason.trim() ? `Reason: ${meal.value.reason.trim()}` : '',
        buildMealNotes(),
        meal.value.notes.trim(),
      ].filter(Boolean).join('\n\n')
      booking = await bookingApi.createIndividualMeal({
        booker_name:         bookerName,
        booker_email:        bookerEmail,
        booker_phone:        bookerPhone,
        identification_card: bookerId,
        start_date:          meal.value.start_date,
        end_date:            meal.value.end_date,
        meal_period:         m0.meal_period,
        service_type:        m0.service_type,
        serving_time:        m0.serving_time || undefined,
        menu_item_id:        m0.service_type === 'buffet' ? (m0.buffet_item_id || undefined) : undefined,
        pax_count:           pax,
        special_requests:    buildNotes(combinedNotes),
      })
    } else {
      const pax = isCorporate.value
        ? (attendants.value.filter(a => a.name.trim()).length || Number(evt.value.pax_count) || 1)
        : (participantMode.value === 'detailed'
            ? (attendants.value.filter(a => a.name.trim()).length || 1)
            : Number(evt.value.pax_count))
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
        <div class="grid grid-cols-3 gap-2">
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
          <button type="button"
            class="flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-all"
            :class="bookingType === 'meals' ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'"
            @click="bookingType = 'meals'">
            <UtensilsCrossed class="size-5 shrink-0" />
            <div>
              <p class="text-sm font-semibold">Meals</p>
              <p class="text-xs opacity-70 mt-0.5">Catering / meal plan booking</p>
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
              <div>
                <Label class="text-xs">Country</Label>
                <Input v-model="company.country" placeholder="e.g. Zambia" class="mt-1.5" />
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

          <!-- ─── Attendees (individual event/meals — corporate uses delegates) ─── -->
          <div v-if="bookingType === 'event' || bookingType === 'meals'" class="rounded-xl border overflow-hidden">
            <button type="button"
              class="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
              @click="attendeesExpanded = !attendeesExpanded">
              <div class="flex items-center gap-2.5">
                <Users class="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p class="text-sm font-semibold">{{ bookingType === 'meals' ? 'Guests / Diners' : 'Attendees' }}</p>
                  <p v-if="!attendeesExpanded" class="text-xs text-muted-foreground">
                    {{ participantMode === 'headcount'
                      ? `Party of ${Number(evt.pax_count) || 0}`
                      : `${attendants.filter(a => a.name.trim()).length} registered` }}
                  </p>
                </div>
              </div>
              <ChevronDown class="size-4 text-muted-foreground transition-transform duration-200" :class="attendeesExpanded && 'rotate-180'" />
            </button>

            <div v-if="attendeesExpanded" class="px-5 pb-5 border-t flex flex-col gap-4 pt-4">
              <!-- Mode selector -->
              <div class="grid grid-cols-2 gap-3">
                <button type="button"
                  class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all"
                  :class="participantMode === 'headcount' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'"
                  @click="participantMode = 'headcount'">
                  <Users class="size-5 shrink-0 mt-0.5" :class="participantMode === 'headcount' ? 'text-primary' : 'text-muted-foreground'" />
                  <div>
                    <p class="text-sm font-semibold">Headcount Only</p>
                    <p class="text-xs text-muted-foreground mt-0.5">Total attendee count — no individual details</p>
                  </div>
                </button>
                <button type="button"
                  class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all"
                  :class="participantMode === 'detailed' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'"
                  @click="participantMode = 'detailed'">
                  <List class="size-5 shrink-0 mt-0.5" :class="participantMode === 'detailed' ? 'text-primary' : 'text-muted-foreground'" />
                  <div>
                    <p class="text-sm font-semibold">Individual Records</p>
                    <p class="text-xs text-muted-foreground mt-0.5">Register each attendee with name and contact</p>
                  </div>
                </button>
              </div>

              <!-- Total attendees -->
              <div>
                <Label class="text-xs uppercase tracking-wide">
                  {{ bookingType === 'meals' ? 'Total Diners' : 'Total Attendees' }}
                  <span v-if="participantMode === 'headcount'" class="text-destructive">*</span>
                </Label>
                <div class="flex items-center gap-3 mt-1.5">
                  <Input v-model="evt.pax_count" type="number" min="1" placeholder="e.g. 50"
                    class="w-28 text-center" :disabled="participantMode === 'detailed'" />
                  <p v-if="participantMode === 'detailed'" class="text-xs text-muted-foreground">
                    {{ bookingType === 'meals' ? 'Set to number of diners' : 'Set to number of attendees' }}
                  </p>
                </div>
              </div>

              <!-- Individual records -->
              <template v-if="participantMode === 'detailed'">
                <div v-for="(att, i) in attendants" :key="i" class="rounded-lg border bg-muted/20 p-4 flex flex-col gap-2.5">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
                        :class="i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'">
                        {{ i + 1 }}
                      </span>
                      <span class="text-sm font-medium" :class="i === 0 ? 'text-primary' : 'text-muted-foreground'">
                        {{ i === 0 ? 'Lead Contact' : (att.name || `Attendee ${i + 1}`) }}
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

                  <div class="grid grid-cols-4 gap-2.5">
                    <div>
                      <Label class="text-xs uppercase tracking-wide">Full Name <span class="text-destructive">*</span></Label>
                      <Input v-model="att.name" placeholder="John Doe" class="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label class="text-xs uppercase tracking-wide">Email <span v-if="i === 0" class="text-destructive">*</span></Label>
                      <Input v-model="att.email" type="email" placeholder="email@example.com" class="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label class="text-xs uppercase tracking-wide">Phone <span v-if="i === 0" class="text-destructive">*</span></Label>
                      <Input v-model="att.phone" placeholder="+260 977 000 000" class="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label class="text-xs uppercase tracking-wide">Passport / ID <span class="text-destructive">*</span></Label>
                      <Input v-model="att.id_number" placeholder="ID number" class="mt-1 h-8 text-sm" />
                    </div>
                    <div v-if="bookingType === 'meals'" class="col-span-4">
                      <Label class="text-xs uppercase tracking-wide">Dietary Notes</Label>
                      <Input v-model="att.dietary_notes" placeholder="e.g. Vegetarian, halal, nut allergy" class="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                </div>

                <button type="button"
                  class="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline w-fit"
                  @click="addAttendant">
                  <UserPlus class="size-3.5" />
                  {{ bookingType === 'meals' ? 'Add Guest' : 'Add Attendee' }}
                </button>
              </template>
            </div>
          </div>

          <!-- ─── Guests (individual accommodation — events use the Attendees section) ─── -->
          <div v-if="bookingType === 'accommodation'" class="rounded-xl border overflow-hidden">
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
                    {{ bookingType !== 'accommodation' && delegateMode === 'headcount'
                      ? `${Number(evt.pax_count) || 0} delegate${Number(evt.pax_count) !== 1 ? 's' : ''} — headcount only`
                      : attendants.length === 0
                        ? 'No delegates added — click to register'
                        : `${attendants.length} delegate${attendants.length !== 1 ? 's' : ''} registered` }}
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span v-if="bookingType !== 'accommodation' && delegateMode === 'headcount' && Number(evt.pax_count) > 0"
                  class="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 min-w-[1.5rem]">
                  {{ evt.pax_count }}
                </span>
                <span v-else-if="attendants.length > 0"
                  class="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 min-w-[1.5rem]">
                  {{ attendants.length }}
                </span>
                <ChevronDown class="size-4 text-muted-foreground transition-transform duration-200" :class="attendantsExpanded && 'rotate-180'" />
              </div>
            </button>

            <div v-if="attendantsExpanded" class="px-5 pb-5 border-t flex flex-col gap-3 pt-4">
              <!-- Mode selector (event/meals only — accommodation always needs individual records to assign rooms) -->
              <template v-if="bookingType !== 'accommodation'">
                <div class="grid grid-cols-2 gap-3">
                  <button type="button"
                    class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all"
                    :class="delegateMode === 'headcount' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'"
                    @click="delegateMode = 'headcount'">
                    <Users class="size-5 shrink-0 mt-0.5" :class="delegateMode === 'headcount' ? 'text-primary' : 'text-muted-foreground'" />
                    <div>
                      <p class="text-sm font-semibold">Headcount Only</p>
                      <p class="text-xs text-muted-foreground mt-0.5">Total delegate count — no individual details needed</p>
                    </div>
                  </button>
                  <button type="button"
                    class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all"
                    :class="delegateMode === 'detailed' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'"
                    @click="delegateMode = 'detailed'">
                    <List class="size-5 shrink-0 mt-0.5" :class="delegateMode === 'detailed' ? 'text-primary' : 'text-muted-foreground'" />
                    <div>
                      <p class="text-sm font-semibold">Individual Records</p>
                      <p class="text-xs text-muted-foreground mt-0.5">Register each delegate with their details</p>
                    </div>
                  </button>
                </div>

                <div class="flex items-center gap-3">
                  <Input v-model="evt.pax_count" type="number" min="1" placeholder="e.g. 50"
                    class="w-28 text-center" :disabled="delegateMode === 'detailed'" />
                  <p class="text-sm text-muted-foreground">
                    {{ delegateMode === 'detailed'
                      ? 'Set to number of registered delegates'
                      : bookingType === 'meals' ? 'Total delegates dining' : 'Total delegates attending across all sessions' }}
                  </p>
                </div>
              </template>

              <template v-if="bookingType === 'accommodation' || delegateMode === 'detailed'">
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
                    <div v-if="bookingType === 'meals'" class="col-span-2">
                      <Label class="text-xs">Dietary Notes</Label>
                      <Input v-model="att.dietary_notes" placeholder="e.g. Vegetarian, halal, nut allergy" class="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                </div>

                <button type="button"
                  class="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline w-fit mt-1"
                  @click="addAttendant">
                  <UserPlus class="size-3.5" />
                  Add Delegate
                </button>
              </template>
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

            <!-- Room picker (individual: single room for the booking) -->
            <div v-if="!isCorporate">
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

            <!-- Room assignments (corporate: one room per delegate) -->
            <div v-else>
              <div class="flex items-center justify-between">
                <Label class="text-xs">Room Assignments <span class="text-destructive">*</span></Label>
                <span v-if="attendants.length > 0" class="text-xs text-muted-foreground">
                  {{ Object.keys(delegateRooms).length }} of {{ attendants.length }} assigned
                </span>
              </div>

              <div v-if="!acc.check_in || !acc.check_out" class="mt-1.5 text-xs text-muted-foreground rounded-lg border border-dashed px-4 py-4 text-center">
                Select check-in and check-out dates to see available rooms.
              </div>
              <div v-else-if="attendants.length === 0" class="mt-1.5 text-xs text-muted-foreground rounded-lg border border-dashed px-4 py-4 text-center">
                Add delegates in the section above to assign rooms.
              </div>
              <div v-else-if="roomsLoading" class="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-dashed px-4 py-4">
                <Loader2 class="size-3.5 animate-spin" /> Checking room availability…
              </div>
              <div v-else-if="rooms.length === 0" class="mt-1.5 text-xs text-amber-600 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-4 text-center">
                No rooms available for these dates.
              </div>
              <div v-else class="mt-1.5 flex flex-col gap-2">
                <div v-for="(delegate, i) in attendants" :key="i" class="rounded-lg border overflow-hidden"
                  :class="expandedDelegateRoomPicker === i && 'ring-1 ring-primary/30 border-primary/40'">
                  <div class="flex items-center justify-between gap-3 px-3 py-2.5 bg-muted/20">
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0">{{ i + 1 }}</span>
                      <div class="min-w-0">
                        <p class="text-sm font-medium truncate">{{ delegate.name || `Delegate ${i + 1}` }}</p>
                        <p v-if="getDelegateRoom(i)" class="text-xs text-primary">{{ getDelegateRoom(i)?.room_name }}</p>
                        <p v-else class="text-xs text-muted-foreground">No room assigned</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <button v-if="getDelegateRoom(i)" type="button"
                        class="text-muted-foreground hover:text-destructive transition-colors rounded p-1"
                        @click="clearDelegateRoom(i)">
                        <Trash2 class="size-3.5" />
                      </button>
                      <Button type="button" size="sm" variant="outline"
                        @click="expandedDelegateRoomPicker = expandedDelegateRoomPicker === i ? null : i">
                        {{ expandedDelegateRoomPicker === i ? 'Close' : (getDelegateRoom(i) ? 'Change' : 'Assign Room') }}
                      </Button>
                    </div>
                  </div>
                  <div v-if="expandedDelegateRoomPicker === i" class="border-t p-3 flex flex-col gap-2 max-h-52 overflow-y-auto">
                    <p v-if="availableRoomsForDelegate(i).length === 0" class="text-xs text-muted-foreground text-center py-2">
                      All available rooms are already assigned to other delegates.
                    </p>
                    <button v-for="room in availableRoomsForDelegate(i)" :key="room.id" type="button"
                      class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                      :class="getDelegateRoom(i)?.room_id === room.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/40'"
                      @click="setDelegateRoom(i, room)">
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
            </div>
          </div>

          <!-- ─── Additional Requests ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-3">
            <div class="flex items-center gap-2.5">
              <StickyNote class="size-4 text-muted-foreground" />
              <p class="text-sm font-semibold">Additional Requests</p>
            </div>
            <Textarea v-model="acc.special_requests"
              placeholder="Special requests, accessibility needs, floor preferences, early check-in requirements…"
              class="resize-none" rows="3" />
          </div>

          <!-- Estimate -->
          <div v-if="!isCorporate && selectedRoom && nights > 0" class="rounded-xl bg-muted/40 border px-5 py-3.5 flex items-center justify-between text-sm">
            <span class="text-muted-foreground">{{ nights }} night{{ nights !== 1 ? 's' : '' }} × ZMW {{ selectedRoom.price_per_night.toLocaleString() }}/night</span>
            <span class="font-semibold">ZMW {{ accTotal.toLocaleString() }}</span>
          </div>
          <div v-else-if="isCorporate && Object.keys(delegateRooms).length > 0 && nights > 0"
            class="rounded-xl bg-muted/40 border px-5 py-3.5 flex items-center justify-between text-sm">
            <span class="text-muted-foreground">
              {{ nights }} night{{ nights !== 1 ? 's' : '' }} × {{ Object.keys(delegateRooms).length }} room{{ Object.keys(delegateRooms).length !== 1 ? 's' : '' }}
            </span>
            <span class="font-semibold">ZMW {{ delegateRoomTotal.toLocaleString() }}</span>
          </div>

        </template>

        <!-- ═══════════════════ EVENT FIELDS ══════════════════════════════ -->
        <template v-else-if="bookingType === 'event'">

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

            <!-- Schedule mode (multi-day only) -->
            <div v-if="dayRange.length > 1" class="grid grid-cols-2 gap-3">
              <button type="button"
                class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all"
                :class="scheduleMode === 'uniform' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'"
                @click="scheduleMode = 'uniform'">
                <CalendarRange class="size-5 shrink-0 mt-0.5" :class="scheduleMode === 'uniform' ? 'text-primary' : 'text-muted-foreground'" />
                <div>
                  <p class="text-sm font-semibold">Uniform Schedule</p>
                  <p class="text-xs text-muted-foreground mt-0.5">Same schedule repeated across all event days</p>
                </div>
              </button>
              <button type="button"
                class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all"
                :class="scheduleMode === 'per_day' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'"
                @click="scheduleMode = 'per_day'">
                <CalendarClock class="size-5 shrink-0 mt-0.5" :class="scheduleMode === 'per_day' ? 'text-primary' : 'text-muted-foreground'" />
                <div>
                  <p class="text-sm font-semibold">Per-Day Schedule</p>
                  <p class="text-xs text-muted-foreground mt-0.5">Start from a default, then customise or skip individual days</p>
                </div>
              </button>
            </div>

            <!-- Scope banner -->
            <div v-if="dayRange.length > 1" class="rounded-lg border px-4 py-3 bg-primary/5 border-primary/20">
              <p class="text-sm font-semibold">{{ scheduleMode === 'per_day' ? 'Default Daily Schedule' : 'Daily Schedule Template' }}</p>
              <p v-if="scheduleMode === 'uniform'" class="text-xs text-muted-foreground mt-0.5">
                Applied to all <strong class="text-foreground">{{ dayRange.length }} days</strong>
                · {{ displayDate(evt.start_date) }} – {{ displayDate(evt.end_date) }}.
              </p>
              <p v-else class="text-xs text-muted-foreground mt-0.5">
                Fallback for days without a custom plan — covering
                <strong class="text-foreground">{{ eventDaySummary.defaultCount }} of {{ eventDaySummary.total }}</strong> days.
              </p>
            </div>
          </div>

          <!-- ─── Sessions ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5">
                <Clock class="size-4 text-muted-foreground" />
                <div>
                  <p class="text-sm font-semibold">Sessions</p>
                  <p class="text-xs text-muted-foreground">
                    {{ dayRange.length > 1 && scheduleMode === 'per_day'
                      ? 'Default schedule — used for days without a custom plan. Session 1 is the main session.'
                      : 'Each session runs on every event day. Session 1 is the main session.' }}
                  </p>
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
                <span class="text-sm font-semibold">{{ sessionLabel(session, si) }}</span>
                <div class="flex items-center gap-2">
                  <span v-if="dayRange.length > 1 && scheduleMode === 'uniform'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    × {{ dayRange.length }} days
                  </span>
                  <span v-else-if="dayRange.length > 1 && scheduleMode === 'per_day'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                    default
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
                    <Label class="text-xs">Pricing Basis</Label>
                    <Select v-model="session.pricing_basis">
                      <SelectTrigger class="mt-1.5">
                        <SelectValue placeholder="Select pricing basis…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="p in PRICING_BASIS" :key="p.value" :value="p.value">{{ p.label }}</SelectItem>
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
              {{ dayRange.length > 1 && scheduleMode === 'per_day' ? 'Add Session to Default Schedule' : 'Add Another Session' }}
            </button>

            <!-- ── Day-by-day overrides ── -->
            <div v-if="scheduleMode === 'per_day' && dayRange.length > 0" class="mt-2 pt-4 border-t flex flex-col gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide">
                  Day-by-Day Schedule <span class="text-muted-foreground font-normal normal-case">({{ dayRange.length }} days)</span>
                </p>
                <p class="text-xs text-muted-foreground mt-0.5">Skip days your event doesn't run, or customise sessions for individual days.</p>
              </div>

              <!-- Status strip -->
              <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  <span class="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block"></span>
                  {{ eventDaySummary.defaultCount }} using default
                </span>
                <span v-if="eventDaySummary.customised > 0"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                  {{ eventDaySummary.customised }} customised
                </span>
                <span v-if="eventDaySummary.skipped > 0"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {{ eventDaySummary.skipped }} skipped
                </span>
              </div>

              <div class="flex flex-col gap-2">
                <div v-for="date in dayRange" :key="date" class="rounded-lg border overflow-hidden"
                  :class="dayStatus(date) === 'skipped' && 'opacity-60'">
                  <!-- Day row -->
                  <div class="flex items-center justify-between px-4 py-3 bg-muted/30">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="text-sm font-semibold shrink-0">{{ fmtDayLabel(date) }}</span>
                      <span v-if="dayStatus(date) === 'overridden'"
                        class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                        {{ overrideSessions(date).length }} override{{ overrideSessions(date).length !== 1 ? 's' : '' }}
                      </span>
                      <span v-else-if="dayStatus(date) === 'skipped'"
                        class="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold shrink-0">
                        Skipped
                      </span>
                      <span v-else class="text-xs text-muted-foreground hidden sm:inline">Using default schedule</span>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 ml-2">
                      <button v-if="dayStatus(date) !== 'skipped'" type="button"
                        class="text-xs font-medium text-primary hover:underline px-2 py-1"
                        @click="startDayOverride(date)">
                        {{ dayStatus(date) === 'overridden' ? (expandedDayOverride === date ? 'Collapse' : 'Edit') : 'Customise' }}
                      </button>
                      <button v-if="dayStatus(date) === 'overridden'" type="button"
                        class="text-xs text-muted-foreground hover:text-destructive hover:underline px-2 py-1"
                        @click="collapseDayOverride(date)">
                        Reset
                      </button>
                      <button type="button"
                        class="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
                        :class="dayStatus(date) === 'skipped' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-destructive'"
                        :title="dayStatus(date) === 'skipped' ? 'Restore day' : 'Skip this day'"
                        @click="toggleDayExcluded(date)">
                        <RotateCcw v-if="dayStatus(date) === 'skipped'" class="size-3.5" />
                        <Ban v-else class="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <!-- Expanded override editor -->
                  <div v-if="expandedDayOverride === date && dayStatus(date) === 'overridden'" class="p-4 flex flex-col gap-3">
                    <div v-for="(s, si) in overrideSessions(date)" :key="si" class="rounded-lg border overflow-hidden">
                      <div class="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                        <span class="text-sm font-semibold">{{ sessionLabel(s, si) }}</span>
                        <button type="button" :disabled="overrideSessions(date).length === 1"
                          class="rounded p-1 transition-colors"
                          :class="overrideSessions(date).length === 1 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-destructive'"
                          @click="removeOverrideSession(date, si)">
                          <Trash2 class="size-3.5" />
                        </button>
                      </div>
                      <div class="p-4 flex flex-col gap-3">
                        <div class="grid grid-cols-2 gap-3">
                          <div class="col-span-2">
                            <Label class="text-xs">Session Name</Label>
                            <Input v-model="s.name" placeholder="e.g. Keynote, Breakout, Gala Dinner" class="mt-1.5" />
                          </div>
                          <div>
                            <Label class="text-xs">Event Type</Label>
                            <Select v-model="s.event_type">
                              <SelectTrigger class="mt-1.5">
                                <SelectValue placeholder="Select event type…" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem v-for="et in EVENT_TYPES" :key="et.value" :value="et.value">{{ et.label }}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label class="text-xs">Room Setup</Label>
                            <Select v-model="s.setup_type">
                              <SelectTrigger class="mt-1.5">
                                <SelectValue placeholder="Select setup…" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem v-for="st in SETUP_TYPES" :key="st.value" :value="st.value">{{ st.label }}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label class="text-xs">Start Time</Label>
                            <Input v-model="s.start_time" type="time" class="mt-1.5" />
                          </div>
                          <div>
                            <Label class="text-xs">End Time</Label>
                            <Input v-model="s.end_time" type="time" class="mt-1.5" />
                          </div>
                        </div>

                        <!-- Venue picker (override) -->
                        <div class="rounded-lg border overflow-hidden"
                          :class="expandedOverrideVenue === `${date}::${si}` && 'ring-1 ring-primary/30 border-primary/40'">
                          <div class="flex items-center justify-between gap-3 px-3 py-2.5 bg-muted/20">
                            <div v-if="s.venue_id && venueById(s.venue_id)" class="flex items-center gap-2 min-w-0">
                              <MapPin class="size-4 text-primary shrink-0" />
                              <p class="text-sm font-semibold truncate">{{ venueById(s.venue_id)?.name }}</p>
                            </div>
                            <p v-else class="text-sm text-muted-foreground">No preference / TBC</p>
                            <div class="flex items-center gap-1.5 shrink-0">
                              <button v-if="s.venue_id" type="button"
                                class="text-muted-foreground hover:text-destructive transition-colors rounded p-1"
                                @click="clearVenueFromSession(s)">
                                <Trash2 class="size-3.5" />
                              </button>
                              <Button type="button" size="sm" variant="outline"
                                @click="expandedOverrideVenue = expandedOverrideVenue === `${date}::${si}` ? null : `${date}::${si}`">
                                {{ expandedOverrideVenue === `${date}::${si}` ? 'Close' : (s.venue_id ? 'Change' : 'Browse venues') }}
                              </Button>
                            </div>
                          </div>
                          <div v-if="expandedOverrideVenue === `${date}::${si}`" class="border-t p-3">
                            <div v-if="venuesLoading" class="flex items-center gap-2 text-xs text-muted-foreground rounded-lg border border-dashed px-4 py-4">
                              <Loader2 class="size-3.5 animate-spin" /> Loading available venues…
                            </div>
                            <div v-else-if="venues.length === 0" class="text-xs text-amber-600 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-4 py-4 text-center">
                              No venues available for these dates.
                            </div>
                            <div v-else class="flex flex-col gap-2 max-h-52 overflow-y-auto">
                              <button v-for="venue in venues" :key="venue.id" type="button"
                                class="flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors"
                                :class="s.venue_id === venue.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-muted/40'"
                                @click="selectVenueForOverrideSession(s, venue)">
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
                      </div>
                    </div>

                    <button type="button"
                      class="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline w-fit"
                      @click="addOverrideSession(date)">
                      <UserPlus class="size-3.5" />
                      Add Session to {{ fmtDayLabel(date) }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── Additional Requests ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-3">
            <div class="flex items-center gap-2.5">
              <StickyNote class="size-4 text-muted-foreground" />
              <p class="text-sm font-semibold">Additional Requests</p>
            </div>
            <Textarea v-model="evt.notes"
              placeholder="Dietary requirements for catering, decoration preferences, branding guidelines, accessibility needs…"
              class="resize-none" rows="3" />
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

        <!-- ═══════════════════ MEAL FIELDS ════════════════════════════════ -->
        <template v-else>

          <!-- ─── Meal Plan ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2.5">
              <UtensilsCrossed class="size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-semibold">Meal Plan</p>
                <p class="text-xs text-muted-foreground">Catering dates determine which meal sessions apply</p>
              </div>
            </div>

            <div>
              <Label class="text-xs">Reason / Occasion</Label>
              <Input v-model="meal.reason" placeholder="e.g. Conference catering, gala dinner, working lunch" class="mt-1.5" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label class="text-xs">Start Date <span class="text-destructive">*</span></Label>
                <Popover v-model:open="mealStartOpen">
                  <PopoverTrigger as-child>
                    <button type="button"
                      class="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                      :class="!meal.start_date && 'text-muted-foreground'">
                      <CalendarIcon class="size-4 shrink-0" />
                      {{ meal.start_date ? displayDate(meal.start_date) : 'Select date' }}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="mealStartDateVal" layout="month-and-year" :max-value="mealEndDateVal ?? maxDate" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label class="text-xs">End Date <span class="text-destructive">*</span></Label>
                <Popover v-model:open="mealEndOpen">
                  <PopoverTrigger as-child>
                    <button type="button"
                      class="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-left flex items-center gap-2 hover:bg-muted/40 transition-colors"
                      :class="!meal.end_date && 'text-muted-foreground'"
                      :disabled="!meal.start_date">
                      <CalendarIcon class="size-4 shrink-0" />
                      {{ meal.end_date ? displayDate(meal.end_date) : 'Select date' }}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent class="w-auto p-0" align="start">
                    <Calendar v-model="mealEndDateVal" layout="month-and-year" :min-value="mealStartDateVal" :max-value="maxDate" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div v-if="mealDays > 0 && meal.start_date && meal.end_date"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 w-fit text-xs font-semibold text-primary">
              <UtensilsCrossed class="size-3" />
              {{ mealDays }} day{{ mealDays !== 1 ? 's' : '' }} · {{ displayDate(meal.start_date) }} – {{ displayDate(meal.end_date) }}
            </div>

            <!-- Schedule mode (multi-day only) -->
            <div v-if="mealDayRange.length > 1" class="grid grid-cols-2 gap-3">
              <button type="button"
                class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all"
                :class="mealScheduleMode === 'uniform' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'"
                @click="mealScheduleMode = 'uniform'">
                <CalendarRange class="size-5 shrink-0 mt-0.5" :class="mealScheduleMode === 'uniform' ? 'text-primary' : 'text-muted-foreground'" />
                <div>
                  <p class="text-sm font-semibold">Uniform Plan</p>
                  <p class="text-xs text-muted-foreground mt-0.5">Same meals served every day</p>
                </div>
              </button>
              <button type="button"
                class="flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all"
                :class="mealScheduleMode === 'per_day' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'"
                @click="mealScheduleMode = 'per_day'">
                <CalendarClock class="size-5 shrink-0 mt-0.5" :class="mealScheduleMode === 'per_day' ? 'text-primary' : 'text-muted-foreground'" />
                <div>
                  <p class="text-sm font-semibold">Per-Day Plan</p>
                  <p class="text-xs text-muted-foreground mt-0.5">Customise or skip individual days</p>
                </div>
              </button>
            </div>

            <!-- Scope banner -->
            <div v-if="mealDayRange.length > 1" class="rounded-lg border px-4 py-3 bg-primary/5 border-primary/20">
              <p class="text-sm font-semibold">{{ mealScheduleMode === 'per_day' ? 'Default Daily Plan' : 'Daily Meal Plan' }}</p>
              <p v-if="mealScheduleMode === 'uniform'" class="text-xs text-muted-foreground mt-0.5">
                Applied to all <strong class="text-foreground">{{ mealDayRange.length }} days</strong>
                · {{ displayDate(meal.start_date) }} – {{ displayDate(meal.end_date) }}.
              </p>
              <p v-else class="text-xs text-muted-foreground mt-0.5">
                Fallback for days without a custom plan — covering
                <strong class="text-foreground">{{ mealDaySummary.defaultCount }} of {{ mealDaySummary.total }}</strong> days.
              </p>
            </div>
          </div>

          <!-- ─── Meals ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2.5">
              <Clock class="size-4 text-muted-foreground" />
              <div>
                <p class="text-sm font-semibold">Meals</p>
                <p class="text-xs text-muted-foreground">
                  {{ mealDayRange.length > 1 && mealScheduleMode === 'per_day'
                    ? 'Default plan — used for days without a custom menu. Meal 1 is the main session.'
                    : 'Each meal runs on every catering day. Meal 1 is the main session.' }}
                </p>
              </div>
            </div>

            <div v-for="(session, si) in masterMeals" :key="si" class="rounded-lg border overflow-hidden">
              <div class="flex items-center justify-between px-4 py-3 bg-muted/30">
                <span class="text-sm font-semibold">{{ mealSessionLabel(session, si) }}</span>
                <div class="flex items-center gap-2">
                  <span v-if="mealDayRange.length > 1 && mealScheduleMode === 'uniform'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    × {{ mealDayRange.length }} days
                  </span>
                  <span v-else-if="mealDayRange.length > 1 && mealScheduleMode === 'per_day'"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                    default
                  </span>
                  <button type="button" :disabled="masterMeals.length === 1"
                    class="rounded p-1 transition-colors"
                    :class="masterMeals.length === 1 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-destructive'"
                    @click="removeMasterMeal(si)">
                    <Trash2 class="size-3.5" />
                  </button>
                </div>
              </div>

              <div class="p-4 flex flex-col gap-3">
                <div class="grid grid-cols-2 gap-3">
                  <div class="col-span-2">
                    <Label class="text-xs">Session Name</Label>
                    <Input v-model="session.name" placeholder="e.g. Morning Tea, Working Lunch, Networking Dinner" class="mt-1.5" />
                  </div>
                  <div>
                    <Label class="text-xs">Meal Period <span v-if="si === 0" class="text-destructive">*</span></Label>
                    <Select v-model="session.meal_period">
                      <SelectTrigger class="mt-1.5">
                        <SelectValue placeholder="Select meal period…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="p in MEAL_PERIODS" :key="p.value" :value="p.value">{{ p.label }}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label class="text-xs flex items-center gap-1"><Clock class="size-3" /> Serving Time</Label>
                    <Input v-model="session.serving_time" type="time" class="mt-1.5" />
                  </div>
                  <div>
                    <Label class="text-xs">Service Style</Label>
                    <Select v-model="session.service_type">
                      <SelectTrigger class="mt-1.5">
                        <SelectValue placeholder="Select service style…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="t in SERVICE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div v-if="session.service_type === 'buffet'">
                    <Label class="text-xs">Buffet Selection <span v-if="si === 0" class="text-destructive">*</span></Label>
                    <Select v-if="buffetMenuItems.length > 0" v-model="session.buffet_item_id">
                      <SelectTrigger class="mt-1.5">
                        <SelectValue placeholder="Select buffet package…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="mi in buffetMenuItems" :key="mi.id" :value="mi.id">{{ mi.name }} — ZMW {{ mi.price.toLocaleString() }}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p v-else class="mt-1.5 text-xs text-amber-600 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5">
                      No buffet options available for this lodge.
                    </p>
                  </div>
                </div>

                <div>
                  <Label class="text-xs">Dietary Requirements</Label>
                  <Textarea v-model="session.dietary_notes" placeholder="Halal, vegetarian, nut-free, diabetic…" class="mt-1.5 resize-none" rows="2" />
                </div>
                <div v-if="isCorporate">
                  <Label class="text-xs">Arrangements Notes</Label>
                  <Textarea v-model="session.arrangements_notes" placeholder="Table layout, decor, branded napkins, presentation style…" class="mt-1.5 resize-none" rows="2" />
                </div>

                <!-- Individual Meal Assignments -->
                <div v-if="session.service_type === 'individual_order' || session.service_type === 'mixed'"
                  class="rounded-lg border p-3 flex flex-col gap-3 bg-muted/10">
                  <div>
                    <p class="text-sm font-semibold">{{ session.service_type === 'mixed' ? 'Buffet Exceptions / Individual Orders' : 'Individual Meal Assignments' }}</p>
                    <p class="text-xs text-muted-foreground mt-0.5">
                      {{ session.service_type === 'mixed'
                        ? 'Assign specific items to diners who need something different from the buffet.'
                        : 'Assign menu items directly to each diner.' }}
                    </p>
                  </div>

                  <div v-if="menuLoading" class="text-xs text-muted-foreground flex items-center gap-2 py-2">
                    <Loader2 class="size-3.5 animate-spin" /> Loading menu items…
                  </div>
                  <div v-else-if="individualOrderMenuItems.length === 0" class="text-xs text-muted-foreground text-center py-2">
                    No menu items available for this lodge.
                  </div>
                  <div v-else-if="(isCorporate ? delegateMode === 'detailed' : participantMode === 'detailed') && !attendants.some(a => a.name.trim())"
                    class="text-xs text-muted-foreground rounded-lg border border-dashed px-3 py-3 text-center">
                    Register guests in the Guests / Diners section first.
                  </div>
                  <template v-else>
                    <div class="flex items-center gap-2">
                      <Select v-model="quickFillItemId">
                        <SelectTrigger class="flex-1"><SelectValue placeholder="Quick-fill all diners…" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="mi in individualOrderMenuItems" :key="mi.id" :value="mi.id">{{ mi.name }} — ZMW {{ mi.price.toLocaleString() }}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input v-model.number="quickFillQty" type="number" min="1" class="w-16" />
                      <Button type="button" size="sm" variant="outline"
                        @click="applyToAllDiners(session, quickFillItemId, quickFillQty); quickFillItemId = ''">
                        Apply to All
                      </Button>
                    </div>

                    <div v-for="(diner, di) in dinerSlots" :key="di" class="rounded-lg border bg-background p-2.5 flex flex-col gap-2">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold">{{ di + 1 }}. {{ diner.name || `Guest ${di + 1}` }}</span>
                        <button type="button" class="text-xs text-primary hover:underline flex items-center gap-1" @click="addOrderLine(session, di)">
                          <UserPlus class="size-3" /> Add item
                        </button>
                      </div>
                      <p v-if="orderLinesFor(session, di).length === 0" class="text-xs text-muted-foreground">No items assigned yet</p>
                      <div v-for="(line, li) in orderLinesFor(session, di)" :key="li" class="grid grid-cols-[1fr_4.5rem_1fr_auto] gap-1.5 items-center">
                        <Select v-model="line.menu_item_id">
                          <SelectTrigger class="h-8 text-xs"><SelectValue placeholder="Select menu item…" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem v-for="mi in individualOrderMenuItems" :key="mi.id" :value="mi.id">{{ mi.name }} — ZMW {{ mi.price.toLocaleString() }}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input v-model.number="line.quantity" type="number" min="1" class="h-8 text-xs" />
                        <Input v-model="line.notes" placeholder="Notes…" class="h-8 text-xs" />
                        <button type="button" class="text-muted-foreground hover:text-destructive rounded p-1" @click="removeOrderLine(session, line)">
                          <Trash2 class="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <button type="button"
              class="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline w-fit"
              @click="addMasterMeal">
              <UserPlus class="size-3.5" />
              {{ mealDayRange.length > 1 && mealScheduleMode === 'per_day' ? 'Add Meal to Default Plan' : 'Add Another Meal' }}
            </button>

            <!-- ── Day-by-day overrides ── -->
            <div v-if="mealScheduleMode === 'per_day' && mealDayRange.length > 0" class="mt-2 pt-4 border-t flex flex-col gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide">
                  Day-by-Day Plan <span class="text-muted-foreground font-normal normal-case">({{ mealDayRange.length }} days)</span>
                </p>
                <p class="text-xs text-muted-foreground mt-0.5">Skip days with no catering, or adjust the menu for individual days.</p>
              </div>

              <!-- Status strip -->
              <div class="flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  <span class="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block"></span>
                  {{ mealDaySummary.defaultCount }} using default
                </span>
                <span v-if="mealDaySummary.customised > 0"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  <span class="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                  {{ mealDaySummary.customised }} customised
                </span>
                <span v-if="mealDaySummary.skipped > 0"
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {{ mealDaySummary.skipped }} no meals
                </span>
              </div>

              <div class="flex flex-col gap-2">
                <div v-for="date in mealDayRange" :key="date" class="rounded-lg border overflow-hidden"
                  :class="mealDayStatus(date) === 'skipped' && 'opacity-60'">
                  <div class="flex items-center justify-between px-4 py-3 bg-muted/30">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="text-sm font-semibold shrink-0">{{ fmtDayLabel(date) }}</span>
                      <span v-if="mealDayStatus(date) === 'overridden'"
                        class="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
                        {{ overrideMeals(date).length }} custom meal{{ overrideMeals(date).length !== 1 ? 's' : '' }}
                      </span>
                      <span v-else-if="mealDayStatus(date) === 'skipped'"
                        class="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-semibold shrink-0">
                        No meals
                      </span>
                      <span v-else class="text-xs text-muted-foreground hidden sm:inline">Using default plan</span>
                    </div>
                    <div class="flex items-center gap-1 shrink-0 ml-2">
                      <button v-if="mealDayStatus(date) !== 'skipped'" type="button"
                        class="text-xs font-medium text-primary hover:underline px-2 py-1"
                        @click="startMealDayOverride(date)">
                        {{ mealDayStatus(date) === 'overridden' ? (expandedMealDayOverride === date ? 'Collapse' : 'Edit') : 'Customise' }}
                      </button>
                      <button v-if="mealDayStatus(date) === 'overridden'" type="button"
                        class="text-xs text-muted-foreground hover:text-destructive hover:underline px-2 py-1"
                        @click="collapseMealDayOverride(date)">
                        Reset
                      </button>
                      <button type="button"
                        class="h-7 w-7 flex items-center justify-center rounded-lg transition-colors"
                        :class="mealDayStatus(date) === 'skipped' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-destructive'"
                        :title="mealDayStatus(date) === 'skipped' ? 'Restore meals' : 'No meals this day'"
                        @click="toggleMealDayExcluded(date)">
                        <RotateCcw v-if="mealDayStatus(date) === 'skipped'" class="size-3.5" />
                        <Ban v-else class="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div v-if="expandedMealDayOverride === date && mealDayStatus(date) === 'overridden'" class="p-4 flex flex-col gap-3">
                    <div v-for="(s, si) in overrideMeals(date)" :key="si" class="rounded-lg border overflow-hidden">
                      <div class="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                        <span class="text-sm font-semibold">{{ mealSessionLabel(s, si) }}</span>
                        <button type="button" :disabled="overrideMeals(date).length === 1"
                          class="rounded p-1 transition-colors"
                          :class="overrideMeals(date).length === 1 ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-destructive'"
                          @click="removeOverrideMeal(date, si)">
                          <Trash2 class="size-3.5" />
                        </button>
                      </div>
                      <div class="p-4 flex flex-col gap-3">
                        <div class="grid grid-cols-2 gap-3">
                          <div class="col-span-2">
                            <Label class="text-xs">Session Name</Label>
                            <Input v-model="s.name" placeholder="e.g. Keynote Lunch, Farewell Dinner" class="mt-1.5" />
                          </div>
                          <div>
                            <Label class="text-xs">Meal Period</Label>
                            <Select v-model="s.meal_period">
                              <SelectTrigger class="mt-1.5"><SelectValue placeholder="Select meal period…" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem v-for="p in MEAL_PERIODS" :key="p.value" :value="p.value">{{ p.label }}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label class="text-xs">Serving Time</Label>
                            <Input v-model="s.serving_time" type="time" class="mt-1.5" />
                          </div>
                          <div>
                            <Label class="text-xs">Service Style</Label>
                            <Select v-model="s.service_type">
                              <SelectTrigger class="mt-1.5"><SelectValue placeholder="Select service style…" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem v-for="t in SERVICE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div v-if="s.service_type === 'buffet'">
                            <Label class="text-xs">Buffet Selection</Label>
                            <Select v-if="buffetMenuItems.length > 0" v-model="s.buffet_item_id">
                              <SelectTrigger class="mt-1.5"><SelectValue placeholder="Select buffet package…" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem v-for="mi in buffetMenuItems" :key="mi.id" :value="mi.id">{{ mi.name }} — ZMW {{ mi.price.toLocaleString() }}</SelectItem>
                              </SelectContent>
                            </Select>
                            <p v-else class="mt-1.5 text-xs text-amber-600 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5">
                              No buffet options available.
                            </p>
                          </div>
                        </div>

                        <div>
                          <Label class="text-xs">Dietary Notes</Label>
                          <Textarea v-model="s.dietary_notes" placeholder="e.g. Halal, vegan, allergens" class="mt-1.5 resize-none" rows="2" />
                        </div>

                        <!-- Individual Meal Assignments (override) -->
                        <div v-if="s.service_type === 'individual_order' || s.service_type === 'mixed'"
                          class="rounded-lg border p-3 flex flex-col gap-3 bg-muted/10">
                          <p class="text-xs text-muted-foreground">
                            {{ s.service_type === 'mixed'
                              ? 'Assign items to diners who need something different from the buffet.'
                              : 'Assign menu items directly to each diner.' }}
                          </p>
                          <div v-if="individualOrderMenuItems.length === 0" class="text-xs text-muted-foreground text-center py-2">No menu items available.</div>
                          <template v-else>
                            <div v-for="(diner, di) in dinerSlots" :key="di" class="rounded-lg border bg-background p-2.5 flex flex-col gap-2">
                              <div class="flex items-center justify-between">
                                <span class="text-xs font-semibold">{{ di + 1 }}. {{ diner.name || `Guest ${di + 1}` }}</span>
                                <button type="button" class="text-xs text-primary hover:underline flex items-center gap-1" @click="addOrderLine(s, di)">
                                  <UserPlus class="size-3" /> Add item
                                </button>
                              </div>
                              <p v-if="orderLinesFor(s, di).length === 0" class="text-xs text-muted-foreground">No items assigned yet</p>
                              <div v-for="(line, li) in orderLinesFor(s, di)" :key="li" class="grid grid-cols-[1fr_4.5rem_1fr_auto] gap-1.5 items-center">
                                <Select v-model="line.menu_item_id">
                                  <SelectTrigger class="h-8 text-xs"><SelectValue placeholder="Select menu item…" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem v-for="mi in individualOrderMenuItems" :key="mi.id" :value="mi.id">{{ mi.name }} — ZMW {{ mi.price.toLocaleString() }}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input v-model.number="line.quantity" type="number" min="1" class="h-8 text-xs" />
                                <Input v-model="line.notes" placeholder="Notes…" class="h-8 text-xs" />
                                <button type="button" class="text-muted-foreground hover:text-destructive rounded p-1" @click="removeOrderLine(s, line)">
                                  <Trash2 class="size-3.5" />
                                </button>
                              </div>
                            </div>
                          </template>
                        </div>
                      </div>
                    </div>

                    <button type="button"
                      class="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline w-fit"
                      @click="addOverrideMeal(date)">
                      <UserPlus class="size-3.5" />
                      Add Meal to {{ fmtDayLabel(date) }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ─── Additional Requests ─── -->
          <div class="rounded-xl border p-5 flex flex-col gap-3">
            <div class="flex items-center gap-2.5">
              <StickyNote class="size-4 text-muted-foreground" />
              <p class="text-sm font-semibold">Additional Requests</p>
            </div>
            <Textarea v-model="meal.notes"
              placeholder="Service timing, table configuration, themed decor, alcohol preferences, children's menu…"
              class="resize-none" rows="3" />
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
