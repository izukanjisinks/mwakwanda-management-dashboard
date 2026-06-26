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
import { Loader2, Upload, X, FileText, ExternalLink, CheckCircle2, Mail, RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useInvoicesStore } from '@/stores/invoices'
import { uploadProofOfPayment } from '@/services/storage'
import { getApiError } from '@/utils/errors'
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
    showPaymentForm.value = false
    proofFile.value = null
    proofPreview.value = null
    saving.value = false
  }
})

watch(() => props.invoice?.id, () => {
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
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div class="flex items-center justify-between gap-3 pr-6">
          <DialogTitle class="font-mono text-lg">{{ invoice?.invoice_number }}</DialogTitle>
          <Badge v-if="invoice" :variant="statusConfig[invoice.status].variant">
            {{ statusConfig[invoice.status].label }}
          </Badge>
        </div>
        <DialogDescription>
          Created {{ formatDate(invoice?.created_at) }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="invoice" class="flex flex-col gap-5 py-2">

        <!-- Client info -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-xs text-muted-foreground mb-1">Billed To</p>
            <p class="font-medium">{{ invoice.client_name }}</p>
            <p class="text-muted-foreground">{{ invoice.client_email }}</p>
            <p v-if="invoice.cost_center" class="text-muted-foreground text-xs mt-0.5">
              Cost Center: {{ invoice.cost_center }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs text-muted-foreground mb-1">Dates</p>
            <p v-if="invoice.issued_date">Issued: {{ formatDate(invoice.issued_date) }}</p>
            <p v-if="invoice.due_date" :class="invoice.status === 'overdue' ? 'text-destructive font-medium' : ''">
              Due: {{ formatDate(invoice.due_date) }}
            </p>
            <p v-if="invoice.paid_date" class="text-green-600 dark:text-green-400 font-medium">
              Paid: {{ formatDate(invoice.paid_date) }}
            </p>
          </div>
        </div>

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

        <Separator />

        <!-- Line items -->
        <div class="flex flex-col gap-2">
          <div class="grid grid-cols-12 text-xs text-muted-foreground font-medium px-1">
            <span class="col-span-6">Description</span>
            <span class="col-span-2 text-right">Qty</span>
            <span class="col-span-2 text-right">Unit Price</span>
            <span class="col-span-2 text-right">Total</span>
          </div>
          <div
            v-for="(item, i) in invoice.line_items"
            :key="i"
            class="grid grid-cols-12 text-sm px-1 py-2 rounded-md hover:bg-muted/50"
          >
            <span class="col-span-6">{{ item.description }}</span>
            <span class="col-span-2 text-right text-muted-foreground">{{ item.quantity }}</span>
            <span class="col-span-2 text-right text-muted-foreground">{{ item.unit_price.toLocaleString() }}</span>
            <span class="col-span-2 text-right font-medium">{{ item.total.toLocaleString() }}</span>
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

        <!-- Meal purpose -->
        <div v-if="invoice.meal_purpose" class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm">
          <p class="font-medium text-amber-900 dark:text-amber-200 mb-1">Purpose of Meal</p>
          <p class="text-amber-800 dark:text-amber-300">{{ invoice.meal_purpose }}</p>
        </div>

        <!-- Notes -->
        <div v-if="invoice.notes" class="rounded-lg bg-muted/50 border px-4 py-3 text-sm text-muted-foreground">
          <p class="font-medium text-foreground mb-1">Notes</p>
          {{ invoice.notes }}
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
        <template v-if="!showPaymentForm">
          <Button
            v-for="action in simpleActions"
            :key="action.status"
            :variant="action.variant"
            @click="emit('status-change', action.status)"
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
