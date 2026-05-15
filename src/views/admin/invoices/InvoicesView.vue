<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search, Eye, ChevronLeft, ChevronRight, FileText } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useInvoicesStore } from '@/stores/invoices'
import type { Invoice, InvoiceStatus } from '@/types/invoice'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import InvoiceDetailDialog from '@/components/invoices/InvoiceDetailDialog.vue'
import InvoicePdfSheet from '@/components/invoices/InvoicePdfSheet.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

const detailOpen = ref(false)
const selectedInvoice = ref<Invoice | null>(null)
const pdfSheetOpen = ref(false)
const pdfInvoice = ref<Invoice | null>(null)
const search = ref('')
const statusFilter = ref<InvoiceStatus | 'all'>('all')

const page = ref(1)
const pageSize = 10

function loadInvoices() {
  store.fetchInvoices(page.value, pageSize, statusFilter.value === 'all' ? undefined : statusFilter.value)
}

onMounted(loadInvoices)
watch(page, loadInvoices)

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

function openDetail(invoice: Invoice) {
  selectedInvoice.value = invoice
  detailOpen.value = true
}

async function handleStatusChange(status: InvoiceStatus) {
  if (!selectedInvoice.value) return
  const paidDate = status === 'paid' ? new Date().toISOString().split('T')[0] : undefined
  try {
    const updated = await store.updateStatus(selectedInvoice.value.id, status, paidDate)
    selectedInvoice.value = updated
    toast.success(`Invoice marked as ${statusConfig[status].label}.`)
  } catch {
    toast.error('Failed to update invoice status.')
  }
}

const summary = computed(() => ({
  total: store.total,
  outstanding: store.invoices.filter(i => i.status === 'issued' || i.status === 'overdue').length,
  paid: store.invoices.filter(i => i.status === 'paid').length,
  overdue: store.invoices.filter(i => i.status === 'overdue').length,
  revenue: store.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0),
}))
</script>

<template>
  <DashboardHeader title="Invoices" />

  <div class="flex flex-col gap-6 p-6">

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
            <TableHead>Client</TableHead>
            <TableHead>Type</TableHead>
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
              <TableCell colspan="8">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="filtered.length === 0">
            <TableRow>
              <TableCell colspan="8" class="py-16 text-center text-muted-foreground">
                {{ store.invoices.length === 0 ? 'No invoices yet.' : 'No invoices match your filters.' }}
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
              <TableCell class="font-medium">{{ invoice.client_name }}</TableCell>
              <TableCell class="capitalize text-muted-foreground text-sm">{{ invoice.client_type }}</TableCell>
              <TableCell>{{ formatDate(invoice.issued_date) }}</TableCell>
              <TableCell :class="invoice.status === 'overdue' ? 'text-destructive font-medium' : ''">
                {{ formatDate(invoice.due_date) }}
              </TableCell>
              <TableCell class="font-medium">{{ invoice.total_amount.toLocaleString() }}</TableCell>
              <TableCell>
                <Badge :variant="statusConfig[invoice.status].variant">
                  {{ statusConfig[invoice.status].label }}
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
  <InvoiceDetailDialog v-model:open="detailOpen" :invoice="selectedInvoice" @status-change="handleStatusChange" />
</template>
