<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search, Eye, Trash2 } from 'lucide-vue-next'
import { useInvoicesStore } from '@/stores/invoices'
import type { Invoice, InvoiceStatus } from '@/types/invoice'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import InvoiceDetailDialog from '@/components/invoices/InvoiceDetailDialog.vue'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const store = useInvoicesStore()

const detailOpen = ref(false)
const selectedInvoice = ref<Invoice | null>(null)
const deleteDialogOpen = ref(false)
const invoiceToDelete = ref<Invoice | null>(null)
const search = ref('')
const statusFilter = ref<InvoiceStatus | 'all'>('all')
const deleting = ref(false)

onMounted(() => store.fetchInvoices())

const filtered = computed(() => {
  let list = store.invoices
  if (statusFilter.value !== 'all') list = list.filter(i => i.status === statusFilter.value)
  const q = search.value.toLowerCase().trim()
  if (!q) return list
  return list.filter(i =>
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

function confirmDelete(invoice: Invoice) {
  invoiceToDelete.value = invoice
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!invoiceToDelete.value) return
  deleting.value = true
  try {
    await store.deleteInvoice(invoiceToDelete.value.id)
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    invoiceToDelete.value = null
  }
}

async function handleStatusChange(status: InvoiceStatus) {
  if (!selectedInvoice.value) return
  const paidDate = status === 'paid' ? new Date().toISOString().split('T')[0] : undefined
  try {
    const updated = await store.updateStatus(selectedInvoice.value.id, status, paidDate)
    selectedInvoice.value = updated
  } catch {}
}

// Summary counts
const summary = computed(() => ({
  total: store.invoices.length,
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
        <Select v-model="statusFilter">
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
          <TableRow>
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
                  <Button variant="ghost" size="icon" class="size-8" @click="openDetail(invoice)">
                    <Eye class="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(invoice)">
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>
        </TableBody>
      </Table>
    </div>
  </div>

  <InvoiceDetailDialog
    v-model:open="detailOpen"
    :invoice="selectedInvoice"
    @status-change="handleStatusChange"
  />

  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete <strong>{{ invoiceToDelete?.invoice_number }}</strong>?
          This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="handleDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
