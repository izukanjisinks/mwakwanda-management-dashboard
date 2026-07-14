<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Search, Building2, ChevronDown, ChevronRight as ChevronRightIcon,
  FileText, Eye, Tag, Layers, RefreshCw, X,
} from 'lucide-vue-next'
import { invoiceApi } from '@/services/api/invoices'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { useInvoicesStore } from '@/stores/invoices'
import { effectiveInvoiceStatus } from '@/utils/invoices'
import type { Invoice, InvoiceStatus } from '@/types/invoice'
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
const selectedTpin = ref<string>('')
const companySearch = ref('')

interface CompanyOption {
  name: string
  tpin: string
}

const companies = computed<CompanyOption[]>(() => {
  const seen = new Map<string, string>()
  for (const inv of allInvoices.value) {
    if (inv.client_tpin && !seen.has(inv.client_tpin))
      seen.set(inv.client_tpin, inv.client_name || inv.client_tpin)
  }
  return [...seen.entries()]
    .map(([tpin, name]) => ({ tpin, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filteredCompanies = computed<CompanyOption[]>(() => {
  const q = companySearch.value.toLowerCase()
  return q
    ? companies.value.filter(c =>
        c.name.toLowerCase().includes(q) || c.tpin.toLowerCase().includes(q),
      )
    : companies.value
})

const selectedCompanyName = computed(
  () => companies.value.find(c => c.tpin === selectedTpin.value)?.name ?? selectedTpin.value,
)

// ── Data for selected company ─────────────────────────────────────────────────
const companyInvoices = computed(() =>
  selectedTpin.value
    ? allInvoices.value.filter(i => i.client_tpin === selectedTpin.value)
    : [],
)

// Hierarchy: Cost Center → GL Code → Invoice[]
interface GlCodeNode {
  glCode: string
  invoices: Invoice[]
  paid: number
  pending: number
  overdue: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
  totalAmount: number
}

interface CostCenterNode {
  costCenter: string
  type: 'cost_center' | 'internal_order' | undefined
  glCodes: GlCodeNode[]
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  overdueAmount: number
}

const hierarchy = computed<CostCenterNode[]>(() => {
  const ccMap = new Map<string, Map<string, Invoice[]>>()

  for (const inv of companyInvoices.value) {
    // Trim before grouping — source data has inconsistent whitespace (e.g.
    // gl_code " 1000" vs "1000"), which otherwise splits the same code into
    // two lookalike groups.
    const cc = inv.cost_center_type === 'internal_order'
      ? ((inv.internal_order ?? '').trim() || '(No Internal Order)')
      : ((inv.cost_center ?? '').trim() || '(No Cost Center)')
    const gl = (inv.gl_code ?? '').trim() || '(No GL Code)'
    if (!ccMap.has(cc)) ccMap.set(cc, new Map())
    const glMap = ccMap.get(cc)!
    if (!glMap.has(gl)) glMap.set(gl, [])
    glMap.get(gl)!.push(inv)
  }

  const ccNodes: CostCenterNode[] = []
  for (const [costCenter, glMap] of ccMap) {
    const glCodes: GlCodeNode[] = []
    for (const [glCode, invoices] of glMap) {
      const node: GlCodeNode = {
        glCode,
        invoices,
        paid:          invoices.filter(i => effectiveInvoiceStatus(i) === 'paid').length,
        pending:       invoices.filter(i => effectiveInvoiceStatus(i) === 'issued' || effectiveInvoiceStatus(i) === 'draft').length,
        overdue:       invoices.filter(i => effectiveInvoiceStatus(i) === 'overdue').length,
        paidAmount:    invoices.filter(i => effectiveInvoiceStatus(i) === 'paid').reduce((s, i) => s + i.total_amount, 0),
        pendingAmount: invoices.filter(i => effectiveInvoiceStatus(i) === 'issued' || effectiveInvoiceStatus(i) === 'draft').reduce((s, i) => s + i.total_amount, 0),
        overdueAmount: invoices.filter(i => effectiveInvoiceStatus(i) === 'overdue').reduce((s, i) => s + i.total_amount, 0),
        // A cancelled invoice was never actually billed — exclude it from the total.
        totalAmount:   invoices.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.total_amount, 0),
      }
      glCodes.push(node)
    }
    glCodes.sort((a, b) => b.totalAmount - a.totalAmount)

    const firstInv = glCodes[0]?.invoices[0]
    ccNodes.push({
      costCenter,
      type: firstInv?.cost_center_type,
      glCodes,
      totalAmount:   glCodes.reduce((s, g) => s + g.totalAmount, 0),
      paidAmount:    glCodes.reduce((s, g) => s + g.paidAmount, 0),
      pendingAmount: glCodes.reduce((s, g) => s + g.pendingAmount, 0),
      overdueAmount: glCodes.reduce((s, g) => s + g.overdueAmount, 0),
    })
  }
  return ccNodes.sort((a, b) => b.totalAmount - a.totalAmount)
})

const companySummary = computed(() => {
  const inv = companyInvoices.value
  return {
    total:         inv.length,
    // A cancelled invoice was never actually billed — exclude it from the total.
    totalAmount:   inv.filter(i => i.status !== 'cancelled').reduce((s, i) => s + i.total_amount, 0),
    paidAmount:    inv.filter(i => effectiveInvoiceStatus(i) === 'paid').reduce((s, i) => s + i.total_amount, 0),
    pendingAmount: inv.filter(i => effectiveInvoiceStatus(i) === 'issued' || effectiveInvoiceStatus(i) === 'draft').reduce((s, i) => s + i.total_amount, 0),
    overdueAmount: inv.filter(i => effectiveInvoiceStatus(i) === 'overdue').reduce((s, i) => s + i.total_amount, 0),
  }
})

// ── Expand / collapse ─────────────────────────────────────────────────────────
const expandedCc = ref(new Set<string>())
const expandedGl = ref(new Set<string>())

function toggleCc(costCenter: string) {
  expandedCc.value.has(costCenter) ? expandedCc.value.delete(costCenter) : expandedCc.value.add(costCenter)
}
function toggleGl(key: string) {
  expandedGl.value.has(key) ? expandedGl.value.delete(key) : expandedGl.value.add(key)
}
function glKey(costCenter: string, glCode: string) { return `${costCenter}::${glCode}` }

watch(selectedTpin, () => {
  expandedCc.value = new Set()
  expandedGl.value = new Set()
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
</script>

<template>
  <div class="flex flex-col gap-6">

    <!-- Company selector -->
    <div class="flex flex-wrap items-end gap-3">
      <div class="flex flex-col gap-1.5 flex-1 min-w-0 max-w-xs">
        <label class="text-sm font-medium">Company</label>
        <Select :model-value="selectedTpin" @update:model-value="(v) => { selectedTpin = String(v) }">
          <SelectTrigger>
            <span v-if="selectedTpin" class="flex items-center gap-1.5 truncate">
              <span class="truncate">{{ selectedCompanyName }}</span>
              <span class="text-xs text-muted-foreground shrink-0">{{ selectedTpin }}</span>
            </span>
            <span v-else class="text-muted-foreground">Select a company…</span>
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
              <SelectItem v-for="company in filteredCompanies" :key="company.tpin" :value="company.tpin">
                <span>{{ company.name }}</span>
                <span class="ml-2 text-xs text-muted-foreground">{{ company.tpin }}</span>
              </SelectItem>
              <div v-if="filteredCompanies.length === 0" class="px-3 py-4 text-center text-sm text-muted-foreground">
                No companies found.
              </div>
            </template>
          </SelectContent>
        </Select>
      </div>

      <Button v-if="selectedTpin" variant="outline" size="sm" @click="selectedTpin = ''">
        <X class="size-4 mr-1.5" />
        Clear
      </Button>
      <Button variant="ghost" size="icon" :disabled="loading" title="Refresh" @click="load">
        <RefreshCw class="size-4" :class="loading ? 'animate-spin' : ''" />
      </Button>
    </div>

    <!-- No company selected -->
    <div v-if="!selectedTpin" class="flex flex-col items-center gap-4 py-20 text-muted-foreground rounded-xl border bg-card">
      <Building2 class="size-12 opacity-20" />
      <div class="text-center">
        <p class="text-base font-medium text-foreground">Select a Company</p>
        <p class="text-sm mt-1">Choose a corporate client above to view their billing broken down by cost center and GL code.</p>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="grid gap-4 sm:grid-cols-4">
      <div v-for="i in 4" :key="i" class="rounded-xl border bg-card px-5 py-4">
        <div class="h-3 w-20 rounded bg-muted animate-pulse mb-2" />
        <div class="h-7 w-28 rounded bg-muted animate-pulse" />
      </div>
    </div>

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

      <!-- Empty state for company -->
      <div v-if="hierarchy.length === 0" class="flex flex-col items-center gap-2 py-16 rounded-xl border bg-card text-muted-foreground">
        <Layers class="size-8 opacity-30" />
        <p class="text-sm">No invoices found for {{ selectedCompanyName }}.</p>
      </div>

      <!-- Cost Center → GL Code → Invoices -->
      <div v-else class="flex flex-col gap-3">
        <div
          v-for="ccNode in hierarchy"
          :key="ccNode.costCenter"
          class="rounded-xl border bg-card overflow-hidden"
        >
          <!-- Cost Center header -->
          <button
            class="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/40 transition-colors text-left"
            @click="toggleCc(ccNode.costCenter)"
          >
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <Layers class="size-4 text-primary shrink-0" />
              <span class="text-xs text-muted-foreground font-medium shrink-0">
                {{ ccNode.type === 'internal_order' ? 'Internal Order' : 'Cost Center' }}
              </span>
              <span class="font-semibold text-sm">{{ ccNode.costCenter }}</span>
              <span class="text-xs text-muted-foreground">
                ({{ ccNode.glCodes.length }} GL code{{ ccNode.glCodes.length !== 1 ? 's' : '' }})
              </span>
            </div>
            <div class="hidden sm:flex items-center gap-6 text-sm shrink-0">
              <div class="text-right">
                <span class="text-xs text-muted-foreground block">Paid</span>
                <span class="text-green-600 dark:text-green-400 font-medium">{{ fmt(ccNode.paidAmount) }}</span>
              </div>
              <div class="text-right">
                <span class="text-xs text-muted-foreground block">Pending</span>
                <span class="font-medium">{{ fmt(ccNode.pendingAmount) }}</span>
              </div>
              <div v-if="ccNode.overdueAmount > 0" class="text-right">
                <span class="text-xs text-muted-foreground block">Overdue</span>
                <span class="text-destructive font-medium">{{ fmt(ccNode.overdueAmount) }}</span>
              </div>
              <div class="text-right min-w-[100px]">
                <span class="text-xs text-muted-foreground block">Total</span>
                <span class="font-semibold">ZMW {{ fmt(ccNode.totalAmount) }}</span>
              </div>
            </div>
            <ChevronDown
              class="size-4 text-muted-foreground shrink-0 transition-transform duration-200"
              :class="expandedCc.has(ccNode.costCenter) ? 'rotate-180' : ''"
            />
          </button>

          <!-- GL Codes -->
          <template v-if="expandedCc.has(ccNode.costCenter)">
            <div v-for="glNode in ccNode.glCodes" :key="glNode.glCode" class="border-t">

              <!-- GL code row -->
              <button
                class="w-full flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors text-left bg-muted/10"
                @click="toggleGl(glKey(ccNode.costCenter, glNode.glCode))"
              >
                <ChevronRightIcon
                  class="size-3.5 text-muted-foreground shrink-0 transition-transform duration-200"
                  :class="expandedGl.has(glKey(ccNode.costCenter, glNode.glCode)) ? 'rotate-90' : ''"
                />
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <Tag class="size-3.5 text-muted-foreground shrink-0" />
                  <span class="text-sm font-medium">GL Code: {{ glNode.glCode }}</span>
                  <span class="text-xs text-muted-foreground">
                    · {{ glNode.invoices.length }} invoice{{ glNode.invoices.length !== 1 ? 's' : '' }}
                  </span>
                </div>
                <div class="hidden sm:flex items-center gap-2 shrink-0">
                  <span v-if="glNode.paid" class="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 rounded-full px-2 py-0.5">
                    {{ glNode.paid }} paid
                  </span>
                  <span v-if="glNode.pending" class="text-xs bg-muted rounded-full px-2 py-0.5">
                    {{ glNode.pending }} pending
                  </span>
                  <span v-if="glNode.overdue" class="text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5">
                    {{ glNode.overdue }} overdue
                  </span>
                  <span class="text-sm font-semibold ml-2 min-w-[90px] text-right">ZMW {{ fmt(glNode.totalAmount) }}</span>
                </div>
              </button>

              <!-- Invoice list for GL code -->
              <template v-if="expandedGl.has(glKey(ccNode.costCenter, glNode.glCode))">
                <div class="divide-y border-t bg-background">
                  <div class="grid grid-cols-12 gap-2 px-8 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/20">
                    <span class="col-span-2">Invoice No.</span>
                    <span class="col-span-2">Generated</span>
                    <span class="col-span-2">Issued</span>
                    <span class="col-span-2">Due</span>
                    <span class="col-span-2 text-right">Amount</span>
                    <span class="col-span-1">Status</span>
                    <span class="col-span-1 text-right">Actions</span>
                  </div>
                  <div
                    v-for="inv in glNode.invoices"
                    :key="inv.id"
                    class="grid grid-cols-12 gap-2 items-center px-8 py-2.5 text-sm hover:bg-muted/20 transition-colors"
                  >
                    <div class="col-span-2 flex flex-col gap-0.5">
                      <span class="font-mono text-xs">{{ inv.invoice_number }}</span>
                      <span v-if="inv.internal_order" class="text-[10px] text-muted-foreground">
                        IO: {{ inv.internal_order }}
                      </span>
                    </div>
                    <span class="col-span-2 text-muted-foreground text-xs">{{ fmtDate(inv.created_at) }}</span>
                    <span class="col-span-2 text-muted-foreground text-xs">{{ fmtDate(inv.issued_date) }}</span>
                    <span
                      class="col-span-2 text-xs"
                      :class="effectiveInvoiceStatus(inv) === 'overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'"
                    >
                      {{ fmtDate(inv.due_date) }}
                    </span>
                    <span class="col-span-2 text-right font-medium text-xs">{{ fmt(inv.total_amount) }}</span>
                    <span class="col-span-1">
                      <Badge :variant="statusConfig[effectiveInvoiceStatus(inv)].variant" class="text-[10px] px-1.5 py-0">
                        {{ statusConfig[effectiveInvoiceStatus(inv)].label }}
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
                  <div class="grid grid-cols-12 gap-2 items-center px-8 py-2.5 bg-muted/30 text-xs font-semibold">
                    <span class="col-span-8 text-muted-foreground">GL Code Total</span>
                    <span class="col-span-2 text-right">{{ fmt(glNode.totalAmount) }}</span>
                    <span class="col-span-2" />
                  </div>
                </div>
              </template>
            </div>

            <!-- Cost center total -->
            <div class="border-t px-5 py-3 bg-muted/20 flex items-center justify-between text-sm">
              <span class="text-muted-foreground font-medium">Cost Center Total · {{ ccNode.costCenter }}</span>
              <span class="font-semibold">ZMW {{ fmt(ccNode.totalAmount) }}</span>
            </div>
          </template>
        </div>

        <!-- Grand total -->
        <div class="rounded-xl border-2 border-primary/20 bg-primary/5 px-5 py-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">{{ selectedCompanyName }} — Grand Total</p>
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
</template>
