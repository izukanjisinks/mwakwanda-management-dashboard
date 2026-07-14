<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, X, FileText, ExternalLink, CheckCircle2, Mail, RefreshCw, User, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useInvoicesStore } from '@/stores/invoices'
import { useAuthStore } from '@/stores/auth'
import { uploadProofOfPayment } from '@/services/storage'
import { getApiError } from '@/utils/errors'
import { effectiveInvoiceStatus } from '@/utils/invoices'
import type { Invoice, InvoiceStatus } from '@/types/invoice'

const props = defineProps<{
  open: boolean
  invoice: Invoice | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'status-change': [status: InvoiceStatus]
  'updated': [invoice: Invoice]
}>()

const store = useInvoicesStore()
const authStore = useAuthStore()

// ── Billing computed (with dummy fallbacks) ───────────────────────────────────
const isCorporate = computed(() => props.invoice?.client_type === 'corporate')

const orgName    = computed(() => authStore.user?.org_name    || 'Lodge Management')
const orgBranch  = computed(() => props.invoice?.org_branch   || authStore.user?.branch_name || 'Head Office')
const orgEmail   = computed(() => props.invoice?.org_email    || authStore.user?.email || 'info@mwakwanda.com')
const orgPhone   = computed(() => props.invoice?.org_phone    || '+260 211 000 000')
const orgTpin    = computed(() => props.invoice?.org_tpin     || '1000123456')
const orgAddress = computed(() => props.invoice?.org_address  || 'Plot 1234, Great East Road, Lusaka, Zambia')

const clientPhone   = computed(() => props.invoice?.client_phone      || '')
const clientTpin    = computed(() => props.invoice?.client_tpin       || '')
const clientAddress = computed(() => props.invoice?.client_address    || '')
const clientBranch  = computed(() => props.invoice?.client_branch     || '')
const clientDept    = computed(() => props.invoice?.client_department || '')
const glCode           = computed(() => props.invoice?.gl_code        || '')
const costCenterType   = computed(() => props.invoice?.cost_center_type)
const costCenterLabel  = computed(() => costCenterType.value === 'internal_order' ? 'Internal Order' : 'Cost Center')
const costCenterValue  = computed(() => {
  if (costCenterType.value === 'internal_order') return props.invoice?.internal_order || ''
  return props.invoice?.cost_center || ''
})

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft:     { label: 'Draft',     variant: 'outline' },
  issued:    { label: 'Issued',    variant: 'default' },
  paid:      { label: 'Paid',      variant: 'secondary' },
  overdue:   { label: 'Overdue',   variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Cancel confirmation state ─────────────────────────────────────────────────
const showCancelConfirm = ref(false)

function onActionClick(action: { label: string; status: InvoiceStatus; variant: string }) {
  if (action.status === 'cancelled') {
    showCancelConfirm.value = true
  } else {
    emit('status-change', action.status)
  }
}

// ── Mark as Paid form state ───────────────────────────────────────────────────
const showPaymentForm = ref(false)
const paymentDate = ref('')
const proofFile = ref<File | null>(null)
const proofPreview = ref<string | null>(null)
const proofDragOver = ref(false)
const proofInput = ref<HTMLInputElement | null>(null)
const saving = ref(false)

watch(() => props.open, (open) => {
  if (!open) {
    showCancelConfirm.value = false
    showPaymentForm.value = false
    proofFile.value = null
    proofPreview.value = null
    saving.value = false
  }
})

watch(() => props.invoice?.id, () => {
  showCancelConfirm.value = false
  showPaymentForm.value = false
  proofFile.value = null
  proofPreview.value = null
})

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function openPaymentForm() {
  paymentDate.value = todayIso()
  proofFile.value = null
  proofPreview.value = null
  showPaymentForm.value = true
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) setProofFile(input.files[0])
}

function handleDrop(event: DragEvent) {
  proofDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) setProofFile(file)
}

function setProofFile(file: File) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowed.includes(file.type)) {
    toast.error('Only JPG, PNG, WEBP, or PDF files are accepted.')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.error('File must be under 10 MB.')
    return
  }
  proofFile.value = file
  proofPreview.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
}

function clearProof() {
  proofFile.value = null
  proofPreview.value = null
}

async function confirmPayment() {
  if (!props.invoice) return
  if (!paymentDate.value) {
    toast.error('Please select a payment date.')
    return
  }
  saving.value = true
  try {
    let proofUrl: string | undefined
    if (proofFile.value) {
      proofUrl = await uploadProofOfPayment(props.invoice.id, proofFile.value)
    }
    const updated = await store.updateStatus(
      props.invoice.id,
      'paid',
      paymentDate.value || todayIso(),
      proofUrl,
    )
    emit('updated', updated)
    showPaymentForm.value = false
    toast.success('Invoice marked as paid.')

    // Best-effort: send payment confirmation email to the client.
    if (updated.client_email) {
      try {
        await store.sendPaymentConfirmation(updated.id)
        toast.success(`Payment confirmation sent to ${updated.client_email}.`)
      } catch {
        toast.warning('Invoice paid, but the confirmation email could not be sent.')
      }
    }
  } catch (err) {
    toast.error(getApiError(err, 'Failed to update invoice.'))
  } finally {
    saving.value = false
  }
}

// ── Approver notification ─────────────────────────────────────────────────────
const notifySending = ref(false)

async function sendToApprover() {
  if (!props.invoice) return
  notifySending.value = true
  try {
    const updated = await store.notifyApprover(props.invoice.id)
    emit('updated', updated)
    toast.success('Invoice sent to approver.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to send notification.'))
  } finally {
    notifySending.value = false
  }
}

function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const canNotify = computed(() =>
  !!props.invoice?.approver_email &&
  (props.invoice.status === 'issued' || props.invoice.status === 'overdue'),
)

// ── Other status transitions ──────────────────────────────────────────────────
const simpleActions = computed(() => {
  if (!props.invoice) return []
  const s = props.invoice.status
  const actions: { label: string; status: InvoiceStatus; variant: 'default' | 'outline' | 'destructive' }[] = []
  if (s === 'draft')   actions.push({ label: 'Issue Invoice', status: 'issued',    variant: 'default' })
  if (s === 'issued')  actions.push({ label: 'Mark Overdue',  status: 'overdue',   variant: 'outline' })
  if (s !== 'cancelled' && s !== 'paid') actions.push({ label: 'Cancel', status: 'cancelled', variant: 'destructive' })
  return actions
})

const canMarkPaid = computed(() =>
  props.invoice?.status === 'issued' || props.invoice?.status === 'overdue',
)

const isProofImage = computed(() => {
  const url = props.invoice?.proof_of_payment_url
  return !!url && /\.(jpe?g|png|webp)(\?|$)/i.test(url)
})

// ── Attendee grouping ─────────────────────────────────────────────────────────
interface DisplayItem {
  id: string
  itemNo: number
  description: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
  context?: string // e.g. "Package · for 20 guests" for buffet/headcount meal lines
}

interface BookingTypeGroup {
  typeKey: string
  label: string
  firstItemNo: number
  subtotal: number
  items: DisplayItem[]
}

interface AttendeeGroup {
  key: string
  name: string
  reference: string
  total: number
  bookingTypes: BookingTypeGroup[]
}

const TYPE_LABELS: Record<string, string> = {
  accommodation: 'Accommodation',
  meals: 'Meals',
  event: 'Events',
  general: 'General',
}

function parseDescription(raw: string): { name: string; description: string; bookingType: string } {
  // Room format: "ROOM_ID (NAME) — details"
  const roomMatch = raw.match(/^(.+?)\s*\(([^)]+)\)\s*—\s*(.+)$/)
  if (roomMatch) {
    return { name: roomMatch[2].trim(), description: `${roomMatch[1].trim()} — ${roomMatch[3].trim()}`, bookingType: 'accommodation' }
  }
  // Meal format: "NAME — item details"
  const mealMatch = raw.match(/^(.+?)\s*—\s*(.+)$/)
  if (mealMatch) {
    return { name: mealMatch[1].trim(), description: mealMatch[2].trim(), bookingType: 'meals' }
  }
  return { name: '', description: raw, bookingType: 'general' }
}

const expandedBookingTypes = ref(new Set<string>())

watch(() => props.invoice?.id, () => { expandedBookingTypes.value = new Set() })

function toggleBookingType(key: string) {
  const next = new Set(expandedBookingTypes.value)
  next.has(key) ? next.delete(key) : next.add(key)
  expandedBookingTypes.value = next
}

const groupedLineItems = computed(() => {
  if (!props.invoice) return [] as AttendeeGroup[]
  const attendeeMap = new Map<string, AttendeeGroup>()
  let itemNo = 0

  for (const item of props.invoice.line_items) {
    itemNo++
    let attendeeKey: string, attendeeName: string, reference: string, description: string, bookingType: string
    let context: string | undefined

    const isMeal = item.line_type === 'meal' || !!item.service_type
    const isBuffetOrShared = isMeal && !item.attendee_name

    if (item.attendee_name) {
      // Individual diner line — group under that person.
      attendeeKey  = item.attendee_id ?? item.attendee_passport ?? item.attendee_name
      attendeeName = item.attendee_name
      reference    = item.attendee_passport ?? item.attendee_id ?? ''
      description  = item.description
      bookingType  = item.booking_type ?? 'meals'
    } else if (isBuffetOrShared) {
      // Buffet / headcount meal — shared, no per-plate attribution. Bill as a flat
      // package; show the cover count as context ("for N guests") only.
      attendeeKey  = '__shared_meals__'
      attendeeName = 'Buffet & Shared Meals'
      reference    = ''
      description  = item.description
      bookingType  = 'meals'
      const parts: string[] = []
      if (item.service_type === 'buffet') parts.push('Package')
      if (item.pax_count) parts.push(`for ${item.pax_count} guest${item.pax_count === 1 ? '' : 's'}`)
      context = parts.join(' · ') || undefined
    } else {
      const parsed = parseDescription(item.description)
      if (parsed.name) {
        attendeeKey  = parsed.name
        attendeeName = parsed.name
        reference    = item.attendee_passport ?? item.attendee_id ?? ''
        description  = parsed.description
        bookingType  = item.booking_type ?? parsed.bookingType
      } else {
        attendeeKey  = '__general__'
        attendeeName = 'General Charges'
        reference    = ''
        description  = item.description
        bookingType  = item.booking_type ?? 'general'
      }
    }

    if (!attendeeMap.has(attendeeKey)) {
      attendeeMap.set(attendeeKey, { key: attendeeKey, name: attendeeName, reference, total: 0, bookingTypes: [] })
    }
    const group = attendeeMap.get(attendeeKey)!
    group.total += item.total

    let typeGroup = group.bookingTypes.find(bt => bt.typeKey === bookingType)
    if (!typeGroup) {
      typeGroup = { typeKey: bookingType, label: TYPE_LABELS[bookingType] ?? bookingType, firstItemNo: itemNo, subtotal: 0, items: [] }
      group.bookingTypes.push(typeGroup)
    }
    typeGroup.subtotal += item.total
    typeGroup.items.push({ id: item.id, itemNo, description, quantity: item.quantity, unit_price: item.unit_price, total: item.total, created_at: item.created_at, context })
  }

  return [...attendeeMap.values()]
})

// ── Invoice scenario detection ────────────────────────────────────────────────
const invoiceScenario = computed<'accommodation' | 'meals' | 'event' | 'general'>(() => {
  const types = new Set((props.invoice?.line_items ?? []).map(li => li.booking_type).filter(Boolean))
  if (types.has('accommodation')) return 'accommodation'
  if (types.has('event')) return 'event'
  if (types.has('meals')) return 'meals'
  return 'general'
})
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div class="flex items-center justify-between gap-3 pr-6">
          <DialogTitle class="font-mono text-lg">{{ invoice?.invoice_number }}</DialogTitle>
          <Badge v-if="invoice" :variant="statusConfig[effectiveInvoiceStatus(invoice)].variant">
            {{ statusConfig[effectiveInvoiceStatus(invoice)].label }}
          </Badge>
        </div>
        <DialogDescription>
          Created {{ formatDate(invoice?.created_at) }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="invoice" class="flex flex-col gap-5 py-2">

        <!-- ── Corporate: full Bill From / Bill To ─────────────────────────── -->
        <template v-if="isCorporate">
          <div class="grid grid-cols-2 gap-3">

            <!-- Bill From -->
            <div class="rounded-lg bg-stone-900 dark:bg-stone-950 p-4 flex flex-col gap-1.5">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-amber-500 border-b border-stone-700 pb-2 mb-1">Bill From</p>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">Organisation</span>
                <span class="font-medium text-white">{{ orgName }}</span>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">Branch</span>
                <span class="font-medium text-white">{{ orgBranch }}</span>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">Email</span>
                <span class="font-medium text-white break-all">{{ orgEmail }}</span>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">Phone</span>
                <span class="font-medium text-white">{{ orgPhone }}</span>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">TPIN</span>
                <span class="font-medium text-white">{{ orgTpin }}</span>
              </div>
              <div class="border-t border-stone-700 my-1" />
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">Address</span>
                <span class="font-medium text-white">{{ orgAddress }}</span>
              </div>
            </div>

            <!-- Bill To -->
            <div class="rounded-lg border bg-muted/30 p-4 flex flex-col gap-1.5">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2 mb-1">Bill To</p>
              <div class="flex gap-2 text-xs">
                <span class="w-24 shrink-0 text-muted-foreground">Company</span>
                <span class="font-medium">{{ invoice.client_name }}</span>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="w-24 shrink-0 text-muted-foreground">Email</span>
                <span class="font-medium break-all">{{ invoice.client_email || '—' }}</span>
              </div>
              <div v-if="clientPhone" class="flex gap-2 text-xs">
                <span class="w-24 shrink-0 text-muted-foreground">Phone</span>
                <span class="font-medium">{{ clientPhone }}</span>
              </div>
              <div v-if="clientTpin" class="flex gap-2 text-xs">
                <span class="w-24 shrink-0 text-muted-foreground">TPIN</span>
                <span class="font-medium">{{ clientTpin }}</span>
              </div>
              <div v-if="clientAddress || clientBranch || clientDept" class="border-t my-1" />
              <div v-if="clientAddress" class="flex gap-2 text-xs">
                <span class="w-24 shrink-0 text-muted-foreground">Address</span>
                <span class="font-medium">{{ clientAddress }}</span>
              </div>
              <div v-if="clientBranch" class="flex gap-2 text-xs">
                <span class="w-24 shrink-0 text-muted-foreground">Branch</span>
                <span class="font-medium">{{ clientBranch }}</span>
              </div>
              <div v-if="clientDept" class="flex gap-2 text-xs">
                <span class="w-24 shrink-0 text-muted-foreground">Department</span>
                <span class="font-medium">{{ clientDept }}</span>
              </div>
              <div v-if="glCode || costCenterValue" class="border-t my-1" />
              <div v-if="glCode" class="flex gap-2 text-xs">
                <span class="w-24 shrink-0 text-muted-foreground">GL Code</span>
                <span class="font-medium">{{ glCode }}</span>
              </div>
              <div v-if="costCenterValue" class="flex gap-2 text-xs">
                <span class="w-24 shrink-0 text-muted-foreground">{{ costCenterLabel }}</span>
                <span class="font-medium">{{ costCenterValue }}</span>
              </div>
            </div>
          </div>

          <!-- Dates row -->
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-lg border bg-muted/20 px-4 py-3">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Issue Date</p>
              <p class="text-sm font-semibold">{{ formatDate(invoice.issued_date) }}</p>
            </div>
            <div class="rounded-lg border bg-muted/20 px-4 py-3">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Due Date</p>
              <p class="text-sm font-semibold" :class="effectiveInvoiceStatus(invoice) === 'overdue' ? 'text-destructive' : ''">
                {{ formatDate(invoice.due_date) }}
              </p>
            </div>
            <div v-if="invoice.paid_date" class="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">Paid On</p>
              <p class="text-sm font-semibold text-green-700 dark:text-green-300">{{ formatDate(invoice.paid_date) }}</p>
            </div>
            <div v-else class="rounded-lg border bg-muted/20 px-4 py-3">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Paid On</p>
              <p class="text-sm font-semibold text-muted-foreground">—</p>
            </div>
          </div>
        </template>

        <!-- ── Individual: Bill From / Bill To (no accounting fields) ────── -->
        <template v-else>
          <div class="grid grid-cols-2 gap-3">

            <!-- Bill From -->
            <div class="rounded-lg bg-stone-900 dark:bg-stone-950 p-4 flex flex-col gap-1.5">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-amber-500 border-b border-stone-700 pb-2 mb-1">Bill From</p>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">Organisation</span>
                <span class="font-medium text-white">{{ orgName }}</span>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">Branch</span>
                <span class="font-medium text-white">{{ orgBranch }}</span>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">Email</span>
                <span class="font-medium text-white break-all">{{ orgEmail }}</span>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">Phone</span>
                <span class="font-medium text-white">{{ orgPhone }}</span>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">TPIN</span>
                <span class="font-medium text-white">{{ orgTpin }}</span>
              </div>
              <div class="border-t border-stone-700 my-1" />
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-stone-400">Address</span>
                <span class="font-medium text-white">{{ orgAddress }}</span>
              </div>
            </div>

            <!-- Bill To -->
            <div class="rounded-lg border bg-muted/30 p-4 flex flex-col gap-1.5">
              <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b pb-2 mb-1">Bill To</p>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-muted-foreground">Name</span>
                <span class="font-medium">{{ invoice.client_name }}</span>
              </div>
              <div class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-muted-foreground">Email</span>
                <span class="font-medium break-all">{{ invoice.client_email || '—' }}</span>
              </div>
              <div v-if="clientPhone" class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-muted-foreground">Phone</span>
                <span class="font-medium">{{ clientPhone }}</span>
              </div>
              <div v-if="clientTpin" class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-muted-foreground">TPIN</span>
                <span class="font-medium">{{ clientTpin }}</span>
              </div>
              <div v-if="clientAddress" class="border-t my-1" />
              <div v-if="clientAddress" class="flex gap-2 text-xs">
                <span class="w-20 shrink-0 text-muted-foreground">Address</span>
                <span class="font-medium">{{ clientAddress }}</span>
              </div>
            </div>
          </div>

          <!-- Dates row -->
          <div class="grid grid-cols-3 gap-3">
            <div class="rounded-lg border bg-muted/20 px-4 py-3">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Issue Date</p>
              <p class="text-sm font-semibold">{{ formatDate(invoice.issued_date) }}</p>
            </div>
            <div class="rounded-lg border bg-muted/20 px-4 py-3">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Due Date</p>
              <p class="text-sm font-semibold" :class="effectiveInvoiceStatus(invoice) === 'overdue' ? 'text-destructive' : ''">
                {{ formatDate(invoice.due_date) }}
              </p>
            </div>
            <div v-if="invoice.paid_date" class="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-4 py-3">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-1">Paid On</p>
              <p class="text-sm font-semibold text-green-700 dark:text-green-300">{{ formatDate(invoice.paid_date) }}</p>
            </div>
            <div v-else class="rounded-lg border bg-muted/20 px-4 py-3">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Paid On</p>
              <p class="text-sm font-semibold text-muted-foreground">—</p>
            </div>
          </div>
        </template>

        <!-- Approver notification -->
        <div v-if="invoice.approver_email" class="rounded-lg border bg-muted/30 p-4 flex flex-col gap-2">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex items-center gap-2 text-sm">
              <Mail class="size-4 text-muted-foreground shrink-0" />
              <span class="text-muted-foreground">Approver:</span>
              <span class="font-medium">{{ invoice.approver_name || invoice.approver_email }}</span>
              <span v-if="invoice.approver_name" class="text-muted-foreground text-xs">&lt;{{ invoice.approver_email }}&gt;</span>
            </div>
            <Button
              v-if="canNotify"
              variant="outline"
              size="sm"
              :disabled="notifySending"
              @click="sendToApprover"
            >
              <Loader2 v-if="notifySending" class="size-3.5 animate-spin mr-1.5" />
              <RefreshCw v-else class="size-3.5 mr-1.5" />
              {{ invoice.notification_sent_at ? 'Resend Invoice' : 'Send Invoice' }}
            </Button>
          </div>
          <p v-if="invoice.notification_sent_at" class="text-xs text-muted-foreground">
            Last sent: {{ formatDateTime(invoice.notification_sent_at) }}
          </p>
          <p v-else-if="canNotify" class="text-xs text-muted-foreground">
            Invoice has not been sent to the approver yet.
          </p>
        </div>

        <!-- Proof of payment display (already paid) -->
        <div
          v-if="invoice.status === 'paid' && invoice.proof_of_payment_url"
          class="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4"
        >
          <div class="flex items-center gap-2 mb-3">
            <CheckCircle2 class="size-4 text-green-600 dark:text-green-400 shrink-0" />
            <p class="text-sm font-medium text-green-800 dark:text-green-300">Proof of Payment Attached</p>
          </div>
          <img
            v-if="isProofImage"
            :src="invoice.proof_of_payment_url"
            alt="Proof of payment"
            class="max-h-40 rounded-md border object-contain mb-3"
          />
          <a
            :href="invoice.proof_of_payment_url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ExternalLink class="size-3.5" />
            {{ isProofImage ? 'View full image' : 'Open document' }}
          </a>
        </div>

        <!-- Meal purpose shown prominently before items for meals invoices -->
        <div v-if="invoiceScenario === 'meals' && invoice.meal_purpose" class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm">
          <p class="font-medium text-amber-900 dark:text-amber-200 mb-1">Purpose of Meal</p>
          <p class="text-amber-800 dark:text-amber-300">{{ invoice.meal_purpose }}</p>
        </div>

        <Separator />

        <!-- Charge breakdown header with invoice type indicator -->
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Charge Breakdown</span>
          <span
            v-if="invoiceScenario !== 'general'"
            class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded"
            :class="{
              'bg-stone-800 text-amber-400 dark:bg-stone-700': invoiceScenario === 'accommodation',
              'bg-orange-100 text-orange-700 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800': invoiceScenario === 'meals',
              'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800': invoiceScenario === 'event',
            }"
          >
            {{ invoiceScenario === 'accommodation' ? 'Accommodation & Meals' : invoiceScenario === 'meals' ? 'Meals' : 'Event' }}
          </span>
        </div>

        <!-- Line items: person → booking type (collapsible) → items with numbers -->
        <div class="flex flex-col gap-3">
          <div
            v-for="group in groupedLineItems"
            :key="group.key"
            class="rounded-lg border overflow-hidden"
          >
            <!-- Person header -->
            <div class="flex items-center justify-between gap-3 px-4 py-2.5 bg-muted/40 border-b">
              <div class="flex items-center gap-2 min-w-0">
                <User class="size-3.5 text-muted-foreground shrink-0" />
                <span class="font-semibold text-sm">{{ group.name }}</span>
                <span v-if="group.reference" class="text-xs text-muted-foreground">({{ group.reference }})</span>
              </div>
              <span class="text-sm font-semibold shrink-0">ZMW {{ group.total.toLocaleString() }}</span>
            </div>

            <!-- Booking type subheaders -->
            <div
              v-for="bt in group.bookingTypes"
              :key="bt.typeKey"
              class="border-b last:border-b-0"
            >
              <!-- Toggle row -->
              <button
                class="w-full flex items-center justify-between gap-3 px-4 py-2 bg-muted/20 hover:bg-muted/30 transition-colors text-left"
                @click="toggleBookingType(`${group.key}::${bt.typeKey}`)"
              >
                <div class="flex items-center gap-2">
                  <ChevronDown
                    v-if="expandedBookingTypes.has(`${group.key}::${bt.typeKey}`)"
                    class="size-3 text-muted-foreground shrink-0"
                  />
                  <ChevronRight v-else class="size-3 text-muted-foreground shrink-0" />
                  <span v-if="bt.typeKey !== 'general'" class="text-xs font-semibold uppercase tracking-wide">{{ bt.label }}</span>
                  <span class="text-xs text-muted-foreground">{{ bt.items.length }} item{{ bt.items.length !== 1 ? 's' : '' }}</span>
                </div>
                <span class="text-xs font-semibold shrink-0">ZMW {{ bt.subtotal.toLocaleString() }}</span>
              </button>

              <!-- Items (expanded) -->
              <template v-if="expandedBookingTypes.has(`${group.key}::${bt.typeKey}`)">
                <!-- Column headers -->
                <div class="flex items-center text-xs text-muted-foreground font-medium px-4 py-1.5 bg-muted/10 gap-2 border-t">
                  <span class="w-6 shrink-0">#</span>
                  <span class="flex-1">Item</span>
                  <span class="w-24 shrink-0">Date</span>
                  <span class="w-8 text-right shrink-0">Qty</span>
                  <span class="w-20 text-right shrink-0">Unit</span>
                  <span class="w-20 text-right shrink-0">Total</span>
                </div>
                <div
                  v-for="item in bt.items"
                  :key="item.id || item.itemNo"
                  class="flex items-center text-xs px-4 py-2 border-t hover:bg-muted/20 gap-2"
                >
                  <span class="w-6 shrink-0 text-muted-foreground font-mono">{{ item.itemNo }}</span>
                  <span class="flex-1 min-w-0">
                    <span class="block truncate">{{ item.description }}</span>
                    <span v-if="item.context" class="block text-[10px] text-muted-foreground truncate">{{ item.context }}</span>
                  </span>
                  <span class="w-24 shrink-0 text-muted-foreground">{{ formatDate(item.created_at) }}</span>
                  <span class="w-8 text-right shrink-0 text-muted-foreground">{{ item.quantity }}</span>
                  <span class="w-20 text-right shrink-0 text-muted-foreground">{{ item.unit_price.toLocaleString() }}</span>
                  <span class="w-20 text-right shrink-0 font-medium">{{ item.total.toLocaleString() }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <Separator />

        <!-- Totals -->
        <div class="flex flex-col gap-2 text-sm ml-auto w-64">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Subtotal</span>
            <span>ZMW {{ invoice.subtotal.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">VAT ({{ invoice.tax_rate }}%)</span>
            <span>ZMW {{ invoice.tax_amount.toLocaleString() }}</span>
          </div>
          <Separator />
          <div class="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>ZMW {{ invoice.total_amount.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Meal purpose (after totals for non-meals invoices; meals invoices show it before items above) -->
        <div v-if="invoice.meal_purpose && invoiceScenario !== 'meals'" class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm">
          <p class="font-medium text-amber-900 dark:text-amber-200 mb-1">Purpose of Meal</p>
          <p class="text-amber-800 dark:text-amber-300">{{ invoice.meal_purpose }}</p>
        </div>

        <!-- Notes -->
        <div v-if="invoice.notes" class="rounded-lg bg-muted/50 border px-4 py-3 text-sm text-muted-foreground">
          <p class="font-medium text-foreground mb-1">Notes</p>
          {{ invoice.notes }}
        </div>

        <!-- Cancel confirmation inline -->
        <div
          v-if="showCancelConfirm"
          class="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-5 flex flex-col gap-3"
        >
          <p class="font-semibold text-sm">Cancel this invoice?</p>
          <p class="text-sm text-muted-foreground">
            This will mark the invoice as cancelled. The action cannot be undone.
          </p>
          <div class="flex gap-2 justify-end">
            <Button variant="outline" size="sm" @click="showCancelConfirm = false">Go Back</Button>
            <Button
              variant="destructive"
              size="sm"
              @click="emit('status-change', 'cancelled'); showCancelConfirm = false"
            >
              Yes, Cancel Invoice
            </Button>
          </div>
        </div>

        <!-- Mark as Paid inline form -->
        <div
          v-if="showPaymentForm"
          class="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 flex flex-col gap-4"
        >
          <p class="font-semibold text-sm">Confirm Payment</p>

          <div class="grid gap-2">
            <Label for="payment-date">Payment Date</Label>
            <Input id="payment-date" v-model="paymentDate" type="date" :max="todayIso()" />
          </div>

          <div class="grid gap-2">
            <Label>
              Proof of Payment
              <span class="text-muted-foreground font-normal ml-1">(optional)</span>
            </Label>

            <div
              v-if="!proofFile"
              class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 transition-colors cursor-pointer"
              :class="proofDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/40'"
              @dragover.prevent="proofDragOver = true"
              @dragleave="proofDragOver = false"
              @drop.prevent="handleDrop"
              @click="proofInput?.click()"
            >
              <Upload class="size-6 text-muted-foreground" />
              <p class="text-sm text-muted-foreground text-center">
                Drag & drop or <span class="text-primary underline">browse</span>
              </p>
              <p class="text-xs text-muted-foreground">JPG, PNG, PDF · max 10 MB</p>
              <input
                ref="proofInput"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                class="sr-only"
                @change="handleFileSelect"
              />
            </div>

            <div v-else class="flex items-start gap-3 rounded-lg border bg-card p-3">
              <img
                v-if="proofPreview"
                :src="proofPreview"
                alt="Preview"
                class="size-16 rounded object-cover border shrink-0"
              />
              <div v-else class="size-16 rounded border bg-muted flex items-center justify-center shrink-0">
                <FileText class="size-6 text-muted-foreground" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{{ proofFile.name }}</p>
                <p class="text-xs text-muted-foreground">{{ (proofFile.size / 1024).toFixed(0) }} KB</p>
              </div>
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                @click="clearProof"
              >
                <X class="size-4" />
              </button>
            </div>
          </div>

          <div class="flex gap-2 justify-end">
            <Button variant="outline" size="sm" :disabled="saving" @click="showPaymentForm = false">
              Cancel
            </Button>
            <Button size="sm" :disabled="saving" @click="confirmPayment">
              <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
              {{ saving ? 'Uploading...' : 'Confirm Payment' }}
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter class="flex-wrap gap-2">
        <Button variant="outline" @click="emit('update:open', false)">Close</Button>
        <template v-if="!showPaymentForm && !showCancelConfirm">
          <Button
            v-for="action in simpleActions"
            :key="action.status"
            :variant="action.variant"
            @click="onActionClick(action)"
          >
            {{ action.label }}
          </Button>
          <Button v-if="canMarkPaid" @click="openPaymentForm">
            Mark as Paid
          </Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
