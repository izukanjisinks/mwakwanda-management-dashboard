<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue'
import { usePdf } from '@ceereals/vue-pdf'
import { Search, Eye, ChevronLeft, ChevronRight, FileText, User, Building2, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useInvoicesStore } from '@/stores/invoices'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { effectiveInvoiceStatus, fetchLogoBase64 } from '@/utils/invoices'
import { useAuthStore } from '@/stores/auth'
import type { Invoice, InvoiceStatus } from '@/types/invoice'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import InvoiceDetailDialog from '@/components/invoices/InvoiceDetailDialog.vue'
import InvoiceDocument from '@/components/invoices/InvoiceDocument.vue'
import InvoicePdfSheet from '@/components/invoices/InvoicePdfSheet.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const store = useInvoicesStore()
const branchFilterStore = useBranchFilterStore()
const authStore = useAuthStore()

type ClientTab = 'individual' | 'corporate'
const activeTab = ref<ClientTab>('individual')

const detailOpen = ref(false)
const selectedInvoice = ref<Invoice | null>(null)
const pdfSheetOpen = ref(false)
const pdfInvoice = ref<Invoice | null>(null)
const search = ref('')
const statusFilter = ref<InvoiceStatus | 'all'>('all')

const issueConfirmOpen = ref(false)
const issueConfirmLoading = ref(false)

const page = ref(1)
const pageSize = 10

function loadInvoices() {
  store.fetchInvoices(
    page.value,
    pageSize,
    statusFilter.value === 'all' ? undefined : statusFilter.value,
    activeTab.value,
  )
}

onMounted(loadInvoices)
watch(page, loadInvoices)
watch(activeTab, () => { page.value = 1; search.value = ''; loadInvoices() })
watch(() => branchFilterStore.selectedBranchId, () => { page.value = 1; loadInvoices() })

function setStatus(val: InvoiceStatus | 'all') {
  statusFilter.value = val
  page.value = 1
  loadInvoices()
}

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / pageSize)))

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.invoices
  return store.invoices.filter(i =>
    i.client_name.toLowerCase().includes(q) ||
    i.invoice_number.toLowerCase().includes(q),
  )
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
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openDetail(invoice: Invoice) {
  selectedInvoice.value = invoice
  detailOpen.value = true
}

function handleStatusChange(status: InvoiceStatus) {
  if (!selectedInvoice.value) return
  if (status === 'issued') {
    detailOpen.value = false
    issueConfirmOpen.value = true
    return
  }
  applyStatusChange(status)
}

async function applyStatusChange(status: InvoiceStatus) {
  if (!selectedInvoice.value) return
  try {
    const updated = await store.updateStatus(selectedInvoice.value.id, status)
    selectedInvoice.value = updated
    toast.success(`Invoice marked as ${statusConfig[status].label}.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to update invoice status.'))
  }
}

// Render the invoice document to a base64-encoded PDF string (no data-URL prefix).
async function invoiceToBase64(invoice: Invoice): Promise<string> {
  // Resolved up front — usePdf renders a one-shot snapshot, so a logo fetched
  // from inside the component would race the render and lose almost every time.
  const logoBase64 = await fetchLogoBase64(authStore.user?.org_logo_url)
  const { blob, execute } = usePdf(() => h(InvoiceDocument, { invoice, logoBase64 }), { reactive: false })
  await execute(true)
  if (!blob.value) throw new Error('Failed to render invoice PDF')
  const buffer = await blob.value.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

async function confirmIssue() {
  if (!selectedInvoice.value) return
  issueConfirmLoading.value = true
  try {
    const updated = await store.updateStatus(selectedInvoice.value.id, 'issued')
    selectedInvoice.value = updated
    issueConfirmOpen.value = false
    toast.success('Invoice issued.')

    // Best-effort: email the PDF to the client's billing address.
    if (updated.client_email) {
      try {
        const pdfBase64 = await invoiceToBase64(updated)
        await store.sendInvoiceEmail(updated.id, pdfBase64)
        toast.success(`Invoice emailed to ${updated.client_email}.`)
      } catch (err) {
        toast.error(getApiError(err, 'Invoice issued, but the email could not be sent.'))
      }
    } else {
      toast.warning('Invoice issued, but no billing email is on file to send it to.')
    }
  } catch (err) {
    toast.error(getApiError(err, 'Failed to issue invoice.'))
  } finally {
    issueConfirmLoading.value = false
  }
}

function handleInvoiceUpdated(invoice: Invoice) {
  selectedInvoice.value = invoice
}

const summary = computed(() => ({
  total: store.total,
  outstanding: store.invoices.filter(i => effectiveInvoiceStatus(i) === 'issued' || effectiveInvoiceStatus(i) === 'overdue').length,
  paid: store.invoices.filter(i => effectiveInvoiceStatus(i) === 'paid').length,
  overdue: store.invoices.filter(i => effectiveInvoiceStatus(i) === 'overdue').length,
  revenue: store.invoices.filter(i => effectiveInvoiceStatus(i) === 'paid').reduce((s, i) => s + i.total_amount, 0),
}))
</script>

<template>
<div>
  <DashboardHeader title="Invoices" />

  <div class="flex flex-col gap-6 p-6">

    <!-- Tabs -->
    <div class="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === 'individual' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'individual'"
      >
        <User class="size-4" />
        Individual
      </button>
      <button
        class="flex items-center justify-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
        :class="activeTab === 'corporate' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'corporate'"
      >
        <Building2 class="size-4" />
        Corporate
      </button>
    </div>

    <!-- Summary cards -->
    <div class="grid gap-4 sm:grid-cols-4">
      <div class="rounded-xl border bg-card px-5 py-4">
        <p class="text-xs text-muted-foreground">Total Invoices</p>
        <p class="text-2xl font-semibold mt-1">{{ summary.total }}</p>
      </div>
      <div class="rounded-xl border bg-card px-5 py-4">
        <p class="text-xs text-muted-foreground">Outstanding</p>
        <p class="text-2xl font-semibold mt-1">{{ summary.outstanding }}</p>
      </div>
      <div class="rounded-xl border bg-card px-5 py-4">
        <p class="text-xs text-muted-foreground">Overdue</p>
        <p class="text-2xl font-semibold mt-1 text-destructive">{{ summary.overdue }}</p>
      </div>
      <div class="rounded-xl border bg-card px-5 py-4">
        <p class="text-xs text-muted-foreground">Revenue Collected</p>
        <p class="text-2xl font-semibold mt-1">ZMW {{ summary.revenue.toLocaleString() }}</p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="relative max-w-xs w-full">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input v-model="search" placeholder="Search invoices..." class="pl-9" />
        </div>
        <Select :model-value="statusFilter" @update:model-value="(v) => setStatus(v as InvoiceStatus | 'all')">
          <SelectTrigger class="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="issued">Issued</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>Invoice No.</TableHead>
            <TableHead>{{ activeTab === 'corporate' ? 'Company' : 'Client' }}</TableHead>
            <TableHead v-if="activeTab === 'corporate'">TPIN</TableHead>
            <TableHead>Date Generated</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Amount (ZMW)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 5" :key="i">
              <TableCell :colspan="activeTab === 'corporate' ? 9 : 8">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="filtered.length === 0">
            <TableRow>
              <TableCell :colspan="activeTab === 'corporate' ? 9 : 8" class="py-16 text-center text-muted-foreground">
                {{ store.invoices.length === 0 ? `No ${activeTab} invoices yet.` : 'No invoices match your filters.' }}
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow
              v-for="invoice in filtered"
              :key="invoice.id"
              class="cursor-pointer"
              @click="openDetail(invoice)"
            >
              <TableCell class="font-mono text-sm">{{ invoice.invoice_number }}</TableCell>
              <TableCell class="font-medium">{{ invoice.client_name || '—' }}</TableCell>
              <TableCell v-if="activeTab === 'corporate'" class="font-mono text-sm text-muted-foreground">{{ invoice.client_tpin || '—' }}</TableCell>
              <TableCell class="text-muted-foreground">{{ formatDateTime(invoice.created_at) }}</TableCell>
              <TableCell>{{ formatDate(invoice.issued_date) }}</TableCell>
              <TableCell :class="effectiveInvoiceStatus(invoice) === 'overdue' ? 'text-destructive font-medium' : ''">
                {{ formatDate(invoice.due_date) }}
              </TableCell>
              <TableCell class="font-medium">{{ invoice.total_amount.toLocaleString() }}</TableCell>
              <TableCell>
                <Badge :variant="statusConfig[effectiveInvoiceStatus(invoice)].variant">
                  {{ statusConfig[effectiveInvoiceStatus(invoice)].label }}
                </Badge>
              </TableCell>
              <TableCell class="text-right" @click.stop>
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" class="size-8 text-muted-foreground hover:text-foreground" title="View PDF" @click="pdfInvoice = invoice; pdfSheetOpen = true">
                    <FileText class="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-8" @click="openDetail(invoice)">
                    <Eye class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
        <span>{{ store.total }} invoice{{ store.total !== 1 ? 's' : '' }}</span>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" class="size-8" :disabled="page <= 1" @click="page--">
            <ChevronLeft class="size-4" />
          </Button>
          <span>{{ page }} / {{ totalPages }}</span>
          <Button variant="outline" size="icon" class="size-8" :disabled="page >= totalPages" @click="page++">
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>

  <InvoicePdfSheet v-model:open="pdfSheetOpen" :invoice="pdfInvoice" />
  <InvoiceDetailDialog v-model:open="detailOpen" :invoice="selectedInvoice" @status-change="handleStatusChange" @updated="handleInvoiceUpdated" />

  <Dialog v-model:open="issueConfirmOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Issue Invoice</DialogTitle>
        <DialogDescription>
          Are you sure you want to issue
          <span class="font-semibold text-foreground">{{ selectedInvoice?.invoice_number }}</span>
          to
          <span class="font-semibold text-foreground">{{ selectedInvoice?.client_name }}</span>?
          Once issued, the invoice will be visible to the client and can no longer be edited.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="issueConfirmLoading" @click="issueConfirmOpen = false">
          Cancel
        </Button>
        <Button :disabled="issueConfirmLoading" @click="confirmIssue">
          <Loader2 v-if="issueConfirmLoading" class="size-4 animate-spin mr-2" />
          {{ issueConfirmLoading ? 'Issuing...' : 'Issue Invoice' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</div>
</template>
