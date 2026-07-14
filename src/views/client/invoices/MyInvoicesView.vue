<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Eye } from 'lucide-vue-next'
import { useInvoicesStore } from '@/stores/invoices'
import { effectiveInvoiceStatus } from '@/utils/invoices'
import type { Invoice, InvoiceStatus } from '@/types/invoice'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import InvoiceDetailDialog from '@/components/invoices/InvoiceDetailDialog.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

onMounted(() => store.fetchInvoices())

const invoices = computed(() => store.invoices)

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

const totalDue = computed(() =>
  invoices.value
    .filter(i => effectiveInvoiceStatus(i) === 'issued' || effectiveInvoiceStatus(i) === 'overdue')
    .reduce((s, i) => s + i.total_amount, 0)
)
</script>

<template>
  <DashboardHeader title="My Invoices" />

  <div class="flex flex-col gap-6 p-6 max-w-4xl">

    <!-- Outstanding banner -->
    <div v-if="totalDue > 0" class="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-center justify-between">
      <div>
        <p class="text-sm font-medium">Outstanding Balance</p>
        <p class="text-xs text-muted-foreground mt-0.5">You have unpaid invoices due</p>
      </div>
      <p class="text-xl font-semibold">ZMW {{ totalDue.toLocaleString() }}</p>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice No.</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Amount (ZMW)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="w-16 text-right">View</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 3" :key="i">
              <TableCell colspan="6">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="invoices.length === 0">
            <TableRow>
              <TableCell colspan="6" class="py-16 text-center text-muted-foreground">
                You have no invoices yet.
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow
              v-for="invoice in invoices"
              :key="invoice.id"
              class="cursor-pointer"
              @click="openDetail(invoice)"
            >
              <TableCell class="font-mono text-sm">{{ invoice.invoice_number }}</TableCell>
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
                <Button variant="ghost" size="icon" class="size-8" @click="openDetail(invoice)">
                  <Eye class="size-4" />
                </Button>
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
    @status-change="() => {}"
  />
</template>
