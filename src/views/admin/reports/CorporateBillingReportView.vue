<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Search, Building2, ChevronDown, ChevronRight as ChevronRightIcon,
  FileText, Eye, Tag, Layers, RefreshCw, X,
} from 'lucide-vue-next'
import { invoiceApi } from '@/services/api/invoices'
import { useBranchFilterStore } from '@/stores/branchFilter'
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

// ── Data loading ──────────────────────────────────────────────────────────────
const branchFilterStore = useBranchFilterStore()
const invoicesStore = useInvoicesStore()
const allInvoices = ref<Invoice[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await invoiceApi.list({
      page: 1,
      page_size: 1000,
      client_type: 'corporate',
      branch_id: branchFilterStore.apiBranchId,
    })
    allInvoices.value = res.data ?? []
  } catch {
    allInvoices.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => branchFilterStore.selectedBranchId, load)

// ── Company selection ─────────────────────────────────────────────────────────
const selectedCompany = ref<string>('')
const companySearch = ref('')

const companies = computed(() => {
  const names = [...new Set(allInvoices.value.map(i => i.client_name).filter(Boolean))]
  return names.sort()
})

const filteredCompanies = computed(() => {
  const q = companySearch.value.toLowerCase()
  return q ? companies.value.filter(c => c.toLowerCase().includes(q)) : companies.value
})

// ── Data for selected company ─────────────────────────────────────────────────
const companyInvoices = computed(() =>
  selectedCompany.value
    ? allInvoices.value.filter(i => i.client_name === selectedCompany.value)
    : [],
)

// Hierarchy: GL Code → Cost Center → Invoice[]
interface CostCenterNode {
  costCenter: string
  invoices: Invoice[]
  paid: number
  pending: number
  overdue: number
  cancelled: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
  totalAmount: number
}

interface GlCodeNode {
  glCode: string
  costCenters: CostCenterNode[]
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
}

const hierarchy = computed<GlCodeNode[]>(() => {
  const glMap = new Map<string, Map<string, Invoice[]>>()

  for (const inv of companyInvoices.value) {
    const gl = inv.gl_code || '(No GL Code)'
    const cc = inv.cost_center || '(No Cost Center)'
    if (!glMap.has(gl)) glMap.set(gl, new Map())
    const ccMap = glMap.get(gl)!
    if (!ccMap.has(cc)) ccMap.set(cc, [])
    ccMap.get(cc)!.push(inv)
  }

  const glNodes: GlCodeNode[] = []
  for (const [glCode, ccMap] of glMap) {
    const costCenters: CostCenterNode[] = []
    for (const [costCenter, invoices] of ccMap) {
      const node: CostCenterNode = {
        costCenter,
        invoices,
        paid:          invoices.filter(i => i.status === 'paid').length,
        pending:       invoices.filter(i => i.status === 'issued' || i.status === 'draft').length,
        overdue:       invoices.filter(i => i.status === 'overdue').length,
        cancelled:     invoices.filter(i => i.status === 'cancelled').length,
        paidAmount:    invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0),
        pendingAmount: invoices.filter(i => i.status === 'issued' || i.status === 'draft').reduce((s, i) => s + i.total_amount, 0),
        overdueAmount: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0),
        totalAmount:   invoices.reduce((s, i) => s + i.total_amount, 0),
      }
      costCenters.push(node)
    }
    costCenters.sort((a, b) => b.totalAmount - a.totalAmount)

    glNodes.push({
      glCode,
      costCenters,
      totalAmount:   costCenters.reduce((s, c) => s + c.totalAmount, 0),
      paidAmount:    costCenters.reduce((s, c) => s + c.paidAmount, 0),
      pendingAmount: costCenters.reduce((s, c) => s + c.pendingAmount, 0),
      overdueAmount: costCenters.reduce((s, c) => s + c.overdueAmount, 0),
    })
  }
  return glNodes.sort((a, b) => b.totalAmount - a.totalAmount)
})

// ── Summary for selected company ─────────────────────────────────────────────
const companySummary = computed(() => {
  const inv = companyInvoices.value
  return {
    total:         inv.length,
    totalAmount:   inv.reduce((s, i) => s + i.total_amount, 0),
    paidAmount:    inv.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0),
    pendingAmount: inv.filter(i => i.status === 'issued' || i.status === 'draft').reduce((s, i) => s + i.total_amount, 0),
    overdueAmount: inv.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0),
  }
})

// ── Expand / collapse ─────────────────────────────────────────────────────────
const expandedGl = ref(new Set<string>())
const expandedCc = ref(new Set<string>())

function toggleGl(glCode: string) {
  expandedGl.value.has(glCode) ? expandedGl.value.delete(glCode) : expandedGl.value.add(glCode)
}
function toggleCc(key: string) {
  expandedCc.value.has(key) ? expandedCc.value.delete(key) : expandedCc.value.add(key)
}

watch(selectedCompany, () => {
  expandedGl.value = new Set()
  expandedCc.value = new Set()
})

// ── Invoice detail + PDF ──────────────────────────────────────────────────────
const detailOpen = ref(false)
const selectedInvoice = ref<Invoice | null>(null)
const pdfSheetOpen = ref(false)
const pdfInvoice = ref<Invoice | null>(null)

function openDetail(invoice: Invoice) {
  selectedInvoice.value = invoice
  detailOpen.value = true
}

async function handleStatusChange(status: InvoiceStatus) {
  if (!selectedInvoice.value) return
  try {
    const updated = await invoicesStore.updateStatus(selectedInvoice.value.id, status)
    selectedInvoice.value = updated
    const idx = allInvoices.value.findIndex(i => i.id === updated.id)
    if (idx !== -1) allInvoices.value[idx] = updated
  } catch { /* handled by store */ }
}

function handleInvoiceUpdated(invoice: Invoice) {
  selectedInvoice.value = invoice
  const idx = allInvoices.value.findIndex(i => i.id === invoice.id)
  if (idx !== -1) allInvoices.value[idx] = invoice
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft:     { label: 'Draft',     variant: 'outline' },
  issued:    { label: 'Issued',    variant: 'default' },
  paid:      { label: 'Paid',      variant: 'secondary' },
  overdue:   { label: 'Overdue',   variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

function fmt(n: number) {
  return n.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ccKey(glCode: string, costCenter: string) {
  return `${glCode}::${costCenter}`
}
</script>

<template>
<div>
  <DashboardHeader title="Corporate Billing Report" />

  <div class="flex flex-col gap-6 p-6">

    <!-- Company selector -->
    <div class="flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-1.5 flex-1 min-w-0 max-w-xs">
        <label class="text-sm font-medium">Company</label>
        <Select :model-value="selectedCompany" @update:model-value="(v) => selectedCompany = v as string">
          <SelectTrigger>
            <SelectValue placeholder="Select a company…" />
          </SelectTrigger>
          <SelectContent>
            <div class="px-2 pt-2 pb-1">
              <div class="relative">
                <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  v-model="companySearch"
                  placeholder="Search companies…"
                  class="w-full rounded-md border bg-background pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  @click.stop
                />
              </div>
            </div>
            <div v-if="loading" class="px-3 py-4 text-center text-sm text-muted-foreground">Loading…</div>
            <template v-else>
              <SelectItem
                v-for="company in filteredCompanies"
                :key="company"
                :value="company"
              >
                {{ company }}
              </SelectItem>
              <div v-if="filteredCompanies.length === 0" class="px-3 py-4 text-center text-sm text-muted-foreground">
                No companies found.
              </div>
            </template>
          </SelectContent>
        </Select>
      </div>

      <Button v-if="selectedCompany" variant="outline" size="sm" @click="selectedCompany = ''">
        <X class="size-4 mr-1.5" />
        Clear
      </Button>

      <Button variant="ghost" size="icon" title="Refresh" :class="loading ? 'animate-spin' : ''" @click="load">
        <RefreshCw class="size-4" />
      </Button>
    </div>

    <!-- No company selected -->
    <div v-if="!selectedCompany" class="flex flex-col items-center gap-4 py-20 text-muted-foreground">
      <Building2 class="size-12 opacity-20" />
      <div class="text-center">
        <p class="text-base font-medium text-foreground">Select a Company</p>
        <p class="text-sm mt-1">Choose a corporate client above to view their billing breakdown by GL code and cost center.</p>
      </div>
    </div>

    <template v-else-if="loading">
      <div class="grid gap-4 sm:grid-cols-4">
        <div v-for="i in 4" :key="i" class="rounded-xl border bg-card px-5 py-4">
          <div class="h-3 w-20 rounded bg-muted animate-pulse mb-2" />
          <div class="h-7 w-28 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </template>

    <template v-else>
      <!-- Company summary cards -->
      <div class="grid gap-4 sm:grid-cols-4">
        <div class="rounded-xl border bg-card px-5 py-4">
          <p class="text-xs text-muted-foreground">Total Billed</p>
          <p class="text-xl font-semibold mt-1">ZMW {{ fmt(companySummary.totalAmount) }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">{{ companySummary.total }} invoice{{ companySummary.total !== 1 ? 's' : '' }}</p>
        </div>
        <div class="rounded-xl border bg-card px-5 py-4">
          <p class="text-xs text-muted-foreground">Collected</p>
          <p class="text-xl font-semibold mt-1 text-green-600 dark:text-green-400">ZMW {{ fmt(companySummary.paidAmount) }}</p>
        </div>
        <div class="rounded-xl border bg-card px-5 py-4">
          <p class="text-xs text-muted-foreground">Pending Payment</p>
          <p class="text-xl font-semibold mt-1">ZMW {{ fmt(companySummary.pendingAmount) }}</p>
        </div>
        <div class="rounded-xl border bg-card px-5 py-4">
          <p class="text-xs text-muted-foreground">Overdue</p>
          <p class="text-xl font-semibold mt-1 text-destructive">ZMW {{ fmt(companySummary.overdueAmount) }}</p>
        </div>
      </div>

      <!-- No invoices -->
      <div v-if="hierarchy.length === 0" class="flex flex-col items-center gap-2 py-16 text-muted-foreground">
        <Layers class="size-8 opacity-30" />
        <p class="text-sm">No invoices found for {{ selectedCompany }}.</p>
      </div>

      <!-- GL Code → Cost Center → Invoices -->
      <div v-else class="flex flex-col gap-3">

        <div
          v-for="glNode in hierarchy"
          :key="glNode.glCode"
          class="rounded-xl border bg-card overflow-hidden"
        >
          <!-- GL Code header row -->
          <button
            class="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors text-left"
            @click="toggleGl(glNode.glCode)"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <Tag class="size-4 text-primary shrink-0" />
              <span class="font-semibold text-sm truncate">GL Code: {{ glNode.glCode }}</span>
              <span class="text-xs text-muted-foreground ml-1">
                ({{ glNode.costCenters.length }} cost center{{ glNode.costCenters.length !== 1 ? 's' : '' }})
              </span>
            </div>
            <!-- GL totals -->
            <div class="hidden sm:flex items-center gap-6 text-sm shrink-0">
              <div class="text-right">
                <span class="text-xs text-muted-foreground block">Paid</span>
                <span class="text-green-600 dark:text-green-400 font-medium">{{ fmt(glNode.paidAmount) }}</span>
              </div>
              <div class="text-right">
                <span class="text-xs text-muted-foreground block">Pending</span>
                <span class="font-medium">{{ fmt(glNode.pendingAmount) }}</span>
              </div>
              <div v-if="glNode.overdueAmount > 0" class="text-right">
                <span class="text-xs text-muted-foreground block">Overdue</span>
                <span class="text-destructive font-medium">{{ fmt(glNode.overdueAmount) }}</span>
              </div>
              <div class="text-right min-w-[100px]">
                <span class="text-xs text-muted-foreground block">Total</span>
                <span class="font-semibold">ZMW {{ fmt(glNode.totalAmount) }}</span>
              </div>
            </div>
            <ChevronDown
              class="size-4 text-muted-foreground shrink-0 transition-transform"
              :class="expandedGl.has(glNode.glCode) ? 'rotate-180' : ''"
            />
          </button>

          <!-- Cost Centers under this GL Code -->
          <template v-if="expandedGl.has(glNode.glCode)">
            <div
              v-for="ccNode in glNode.costCenters"
              :key="ccNode.costCenter"
              class="border-t"
            >
              <!-- Cost center row -->
              <button
                class="w-full flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors text-left bg-muted/10"
                @click="toggleCc(ccKey(glNode.glCode, ccNode.costCenter))"
              >
                <ChevronRightIcon
                  class="size-3.5 text-muted-foreground shrink-0 transition-transform"
                  :class="expandedCc.has(ccKey(glNode.glCode, ccNode.costCenter)) ? 'rotate-90' : ''"
                />
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <Layers class="size-3.5 text-muted-foreground shrink-0" />
                  <span class="text-sm font-medium">{{ ccNode.costCenter }}</span>
                  <span class="text-xs text-muted-foreground">
                    · {{ ccNode.invoices.length }} invoice{{ ccNode.invoices.length !== 1 ? 's' : '' }}
                  </span>
                </div>
                <!-- Status pill summary -->
                <div class="hidden sm:flex items-center gap-2 shrink-0">
                  <span v-if="ccNode.paid" class="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full px-2 py-0.5">
                    {{ ccNode.paid }} paid
                  </span>
                  <span v-if="ccNode.pending" class="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5">
                    {{ ccNode.pending }} pending
                  </span>
                  <span v-if="ccNode.overdue" class="inline-flex items-center gap-1 text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
                    {{ ccNode.overdue }} overdue
                  </span>
                  <span class="text-sm font-semibold ml-2 min-w-[90px] text-right">ZMW {{ fmt(ccNode.totalAmount) }}</span>
                </div>
              </button>

              <!-- Invoice list for this cost center -->
              <template v-if="expandedCc.has(ccKey(glNode.glCode, ccNode.costCenter))">
                <div class="divide-y border-t bg-background">
                  <!-- Mini table header -->
                  <div class="grid grid-cols-12 gap-2 px-8 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/20">
                    <span class="col-span-3">Invoice No.</span>
                    <span class="col-span-3">Issued</span>
                    <span class="col-span-2">Due</span>
                    <span class="col-span-2 text-right">Amount</span>
                    <span class="col-span-1">Status</span>
                    <span class="col-span-1 text-right">Actions</span>
                  </div>
                  <div
                    v-for="inv in ccNode.invoices"
                    :key="inv.id"
                    class="grid grid-cols-12 gap-2 items-center px-8 py-2.5 text-sm hover:bg-muted/20 transition-colors"
                  >
                    <span class="col-span-3 font-mono text-xs">{{ inv.invoice_number }}</span>
                    <span class="col-span-3 text-muted-foreground text-xs">{{ fmtDate(inv.issued_date) }}</span>
                    <span
                      class="col-span-2 text-xs"
                      :class="inv.status === 'overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'"
                    >
                      {{ fmtDate(inv.due_date) }}
                    </span>
                    <span class="col-span-2 text-right font-medium text-xs">{{ fmt(inv.total_amount) }}</span>
                    <span class="col-span-1">
                      <Badge :variant="statusConfig[inv.status].variant" class="text-[10px] px-1.5 py-0">
                        {{ statusConfig[inv.status].label }}
                      </Badge>
                    </span>
                    <span class="col-span-1 flex justify-end gap-0.5">
                      <Button variant="ghost" size="icon" class="size-6" title="View PDF" @click="pdfInvoice = inv; pdfSheetOpen = true">
                        <FileText class="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" class="size-6" title="View detail" @click="openDetail(inv)">
                        <Eye class="size-3.5" />
                      </Button>
                    </span>
                  </div>

                  <!-- Cost center subtotal -->
                  <div class="grid grid-cols-12 gap-2 items-center px-8 py-2.5 bg-muted/30 text-xs font-semibold">
                    <span class="col-span-8 text-muted-foreground">Cost Center Total</span>
                    <span class="col-span-2 text-right">{{ fmt(ccNode.totalAmount) }}</span>
                    <span class="col-span-2" />
                  </div>
                </div>
              </template>
            </div>

            <!-- GL code total row -->
            <div class="border-t px-5 py-3 bg-muted/20 flex items-center justify-between text-sm">
              <span class="text-muted-foreground font-medium">GL Code Total · {{ glNode.glCode }}</span>
              <span class="font-semibold">ZMW {{ fmt(glNode.totalAmount) }}</span>
            </div>
          </template>
        </div>

        <!-- Grand total -->
        <div class="rounded-xl border-2 border-primary/20 bg-primary/5 px-5 py-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">{{ selectedCompany }} — Grand Total</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Paid: ZMW {{ fmt(companySummary.paidAmount) }} ·
              Pending: ZMW {{ fmt(companySummary.pendingAmount) }}
              <span v-if="companySummary.overdueAmount > 0"> · Overdue: ZMW {{ fmt(companySummary.overdueAmount) }}</span>
            </p>
          </div>
          <p class="text-2xl font-bold text-primary">ZMW {{ fmt(companySummary.totalAmount) }}</p>
        </div>
      </div>
    </template>

  </div>

  <InvoicePdfSheet v-model:open="pdfSheetOpen" :invoice="pdfInvoice" />
  <InvoiceDetailDialog
    v-model:open="detailOpen"
    :invoice="selectedInvoice"
    @status-change="handleStatusChange"
    @updated="handleInvoiceUpdated"
  />
</div>
</template>
