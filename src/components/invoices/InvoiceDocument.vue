<script setup lang="ts">
import { computed } from 'vue'
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'
import type { Style } from '@ceereals/vue-pdf'
import type { Invoice } from '@/types/invoice'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ invoice: Invoice }>()

const authStore = useAuthStore()
const isCorporate = computed(() => props.invoice.client_type === 'corporate')

// ── Bill From (org) ───────────────────────────────────────────────────────────
const orgName    = computed(() => authStore.user?.org_name    || 'Lodge Management')
const orgBranch  = computed(() => props.invoice.org_branch    || authStore.user?.branch_name || 'Head Office')
const orgEmail   = computed(() => props.invoice.org_email     || authStore.user?.email  || 'info@mwakwanda.com')
const orgPhone   = computed(() => props.invoice.org_phone     || '+260 211 000 000')
const orgTpin    = computed(() => props.invoice.org_tpin      || '1000123456')
const orgAddress = computed(() => props.invoice.org_address   || 'Plot 1234, Great East Road, Lusaka, Zambia')

// ── Bill To (corporate client) ────────────────────────────────────────────────
const clientPhone   = computed(() => props.invoice.client_phone      || '+260 977 000 001')
const clientTpin    = computed(() => props.invoice.client_tpin       || '2000456789')
const clientAddress = computed(() => props.invoice.client_address    || '15th Floor, Cairo Road, Lusaka, Zambia')
const clientBranch  = computed(() => props.invoice.client_branch     || 'Lusaka Central Branch')
const clientDept    = computed(() => props.invoice.client_department || 'Finance & Administration')
const glCode        = computed(() => props.invoice.gl_code           || '—')
const costCenter    = computed(() => props.invoice.cost_center       || '—')
const internalOrder = computed(() => props.invoice.internal_order    || '—')

function fmt(amount: number) {
  return `ZMW ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    draft: 'DRAFT', issued: 'ISSUED', paid: 'PAID', overdue: 'OVERDUE', cancelled: 'CANCELLED',
  }
  return map[props.invoice.status] ?? props.invoice.status.toUpperCase()
})

const statusColor = computed(() => {
  const map: Record<string, string> = {
    paid: '#16a34a', issued: '#2563eb', overdue: '#dc2626', cancelled: '#6b7280', draft: '#9ca3af',
  }
  return map[props.invoice.status] ?? '#6b7280'
})

const s = {
  page: { padding: 48, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' } as Style,

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: '#d97706' } as Style,
  orgLogo: { width: 48, height: 48, borderRadius: 4, marginBottom: 6, objectFit: 'contain' } as Style,
  lodgeName: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#92400e' } as Style,
  lodgeSub: { fontSize: 9, color: '#78716c', marginTop: 3 } as Style,
  invoiceTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: '#1a1a1a' } as Style,
  invoiceNumber: { fontSize: 10, color: '#6b7280', textAlign: 'right', marginTop: 4 } as Style,
  statusBadge: { alignSelf: 'flex-end', marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 } as Style,
  statusText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff' } as Style,

  // Bill From / Bill To two-column row
  billingRow: { flexDirection: 'row', marginBottom: 16, gap: 12 } as Style,
  billBox: { flex: 1, padding: 12, borderRadius: 4, borderWidth: 1, borderColor: '#e7e5e4' } as Style,
  billBoxFrom: { backgroundColor: '#292524' } as Style,
  billBoxTo: { backgroundColor: '#fafaf9' } as Style,
  billSectionLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1 } as Style,
  billSectionLabelFrom: { color: '#d97706', borderBottomColor: '#44403c' } as Style,
  billSectionLabelTo: { color: '#78716c', borderBottomColor: '#e7e5e4' } as Style,
  billRow: { flexDirection: 'row', marginBottom: 4 } as Style,
  billKey: { width: 90, fontSize: 8, color: '#a8a29e' } as Style,
  billKeyDark: { width: 90, fontSize: 8, color: '#78716c' } as Style,
  billVal: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff' } as Style,
  billValLight: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' } as Style,
  billDivider: { borderTopWidth: 1, borderTopColor: '#44403c', marginVertical: 6 } as Style,
  billDividerLight: { borderTopWidth: 1, borderTopColor: '#e7e5e4', marginVertical: 6 } as Style,

  // Dates bar (below billing row for corporate)
  datesBar: { flexDirection: 'row', gap: 8, marginBottom: 20 } as Style,
  datePill: { flex: 1, backgroundColor: '#fafaf9', borderRadius: 4, padding: 10, borderWidth: 1, borderColor: '#e7e5e4' } as Style,
  dateLabel: { fontSize: 7, color: '#78716c', textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 3 } as Style,
  dateValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' } as Style,

  // Line items table
  tableHeader: { flexDirection: 'row', backgroundColor: '#292524', padding: 9, borderRadius: 4, marginBottom: 1 } as Style,
  thText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase' } as Style,
  tableRow: { flexDirection: 'row', padding: 9, borderBottomWidth: 1, borderBottomColor: '#f5f5f4' } as Style,
  tableRowAlt: { flexDirection: 'row', padding: 9, backgroundColor: '#fafaf9', borderBottomWidth: 1, borderBottomColor: '#f5f5f4' } as Style,
  colDesc: { flex: 1 } as Style,
  colDate: { width: 70, textAlign: 'center' } as Style,
  colQty: { width: 40, textAlign: 'center' } as Style,
  colPrice: { width: 80, textAlign: 'right' } as Style,
  colTotal: { width: 80, textAlign: 'right' } as Style,

  // Totals
  totalsSection: { marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'stretch', gap: 12 } as Style,
  subtotalsBlock: { flexDirection: 'column', justifyContent: 'center', gap: 4 } as Style,
  totalRow: { flexDirection: 'row', paddingVertical: 2 } as Style,
  totalLabel: { width: 120, textAlign: 'right', paddingRight: 16, color: '#6b7280' } as Style,
  totalValue: { width: 100, textAlign: 'right' } as Style,
  totalBold: { width: 100, textAlign: 'right', fontFamily: 'Helvetica-Bold' } as Style,
  grandRow: { flexDirection: 'column', backgroundColor: '#92400e', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 4, justifyContent: 'center', alignItems: 'flex-end' } as Style,
  grandLabel: { color: '#fde68a', fontSize: 8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 4 } as Style,
  grandValue: { color: '#ffffff', fontSize: 16, fontFamily: 'Helvetica-Bold' } as Style,

  // Notes / meal purpose
  notesSection: { marginTop: 16, padding: 12, backgroundColor: '#fafaf9', borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#d97706' } as Style,
  notesLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#78716c', textTransform: 'uppercase', marginBottom: 4 } as Style,
  notesText: { fontSize: 9, color: '#57534e', lineHeight: 1.5 } as Style,

  // Footer
  footer: { position: 'absolute', bottom: 30, left: 48, right: 48, borderTopWidth: 1, borderTopColor: '#e7e5e4', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' } as Style,
  footerText: { fontSize: 8, color: '#a8a29e' } as Style,
}
</script>

<template>
  <Document :title="`Invoice ${invoice.invoice_number}`">
    <Page size="A4" :style="s.page">

      <!-- Header -->
      <View :style="s.header">
        <View>
          <Image v-if="authStore.user?.org_logo_url" :src="authStore.user.org_logo_url" :style="s.orgLogo" />
          <Text :style="s.lodgeName">{{ orgName }}</Text>
          <Text :style="s.lodgeSub">Hospitality &amp; Accommodation</Text>
        </View>
        <View>
          <Text :style="s.invoiceTitle">INVOICE</Text>
          <Text :style="s.invoiceNumber">{{ invoice.invoice_number }}</Text>
          <View :style="[s.statusBadge, { backgroundColor: statusColor }]">
            <Text :style="s.statusText">{{ statusLabel }}</Text>
          </View>
        </View>
      </View>

      <!-- ── Corporate: full Bill From / Bill To ─────────────────────────────── -->
      <template v-if="isCorporate">
        <View :style="s.billingRow">

          <!-- Bill From (dark) -->
          <View :style="[s.billBox, s.billBoxFrom]">
            <Text :style="[s.billSectionLabel, s.billSectionLabelFrom]">Bill From</Text>
            <View :style="s.billRow">
              <Text :style="s.billKey">Organisation</Text>
              <Text :style="s.billVal">{{ orgName }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKey">Branch</Text>
              <Text :style="s.billVal">{{ orgBranch }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKey">Email</Text>
              <Text :style="s.billVal">{{ orgEmail }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKey">Phone</Text>
              <Text :style="s.billVal">{{ orgPhone }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKey">TPIN</Text>
              <Text :style="s.billVal">{{ orgTpin }}</Text>
            </View>
            <View :style="s.billDivider" />
            <View :style="s.billRow">
              <Text :style="s.billKey">Address</Text>
              <Text :style="s.billVal">{{ orgAddress }}</Text>
            </View>
          </View>

          <!-- Bill To (light) -->
          <View :style="[s.billBox, s.billBoxTo]">
            <Text :style="[s.billSectionLabel, s.billSectionLabelTo]">Bill To</Text>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Company</Text>
              <Text :style="s.billValLight">{{ invoice.client_name }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Email</Text>
              <Text :style="s.billValLight">{{ invoice.client_email || clientPhone }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Phone</Text>
              <Text :style="s.billValLight">{{ clientPhone }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">TPIN</Text>
              <Text :style="s.billValLight">{{ clientTpin }}</Text>
            </View>
            <View :style="s.billDividerLight" />
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Address</Text>
              <Text :style="s.billValLight">{{ clientAddress }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Branch</Text>
              <Text :style="s.billValLight">{{ clientBranch }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Department</Text>
              <Text :style="s.billValLight">{{ clientDept }}</Text>
            </View>
            <View :style="s.billDividerLight" />
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">GL Code</Text>
              <Text :style="s.billValLight">{{ glCode }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Cost Center</Text>
              <Text :style="s.billValLight">{{ costCenter }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Internal Order</Text>
              <Text :style="s.billValLight">{{ internalOrder }}</Text>
            </View>
          </View>
        </View>

        <!-- Dates bar -->
        <View :style="s.datesBar">
          <View :style="s.datePill">
            <Text :style="s.dateLabel">Issue Date</Text>
            <Text :style="s.dateValue">{{ fmtDate(invoice.issued_date) }}</Text>
          </View>
          <View :style="s.datePill">
            <Text :style="s.dateLabel">Due Date</Text>
            <Text :style="s.dateValue">{{ fmtDate(invoice.due_date) }}</Text>
          </View>
          <View v-if="invoice.paid_date" :style="[s.datePill, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]">
            <Text :style="[s.dateLabel, { color: '#16a34a' }]">Paid On</Text>
            <Text :style="[s.dateValue, { color: '#16a34a' }]">{{ fmtDate(invoice.paid_date) }}</Text>
          </View>
        </View>
      </template>

      <!-- ── Individual: Bill From / Bill To (no accounting fields) ─────── -->
      <template v-else>
        <View :style="s.billingRow">

          <!-- Bill From (dark) -->
          <View :style="[s.billBox, s.billBoxFrom]">
            <Text :style="[s.billSectionLabel, s.billSectionLabelFrom]">Bill From</Text>
            <View :style="s.billRow">
              <Text :style="s.billKey">Organisation</Text>
              <Text :style="s.billVal">{{ orgName }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKey">Branch</Text>
              <Text :style="s.billVal">{{ orgBranch }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKey">Email</Text>
              <Text :style="s.billVal">{{ orgEmail }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKey">Phone</Text>
              <Text :style="s.billVal">{{ orgPhone }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKey">TPIN</Text>
              <Text :style="s.billVal">{{ orgTpin }}</Text>
            </View>
            <View :style="s.billDivider" />
            <View :style="s.billRow">
              <Text :style="s.billKey">Address</Text>
              <Text :style="s.billVal">{{ orgAddress }}</Text>
            </View>
          </View>

          <!-- Bill To (light) -->
          <View :style="[s.billBox, s.billBoxTo]">
            <Text :style="[s.billSectionLabel, s.billSectionLabelTo]">Bill To</Text>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Name</Text>
              <Text :style="s.billValLight">{{ invoice.client_name }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Email</Text>
              <Text :style="s.billValLight">{{ invoice.client_email || '—' }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Phone</Text>
              <Text :style="s.billValLight">{{ clientPhone }}</Text>
            </View>
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">TPIN</Text>
              <Text :style="s.billValLight">{{ clientTpin }}</Text>
            </View>
            <View :style="s.billDividerLight" />
            <View :style="s.billRow">
              <Text :style="s.billKeyDark">Address</Text>
              <Text :style="s.billValLight">{{ clientAddress }}</Text>
            </View>
          </View>
        </View>

        <!-- Dates bar -->
        <View :style="s.datesBar">
          <View :style="s.datePill">
            <Text :style="s.dateLabel">Issue Date</Text>
            <Text :style="s.dateValue">{{ fmtDate(invoice.issued_date) }}</Text>
          </View>
          <View :style="s.datePill">
            <Text :style="s.dateLabel">Due Date</Text>
            <Text :style="s.dateValue">{{ fmtDate(invoice.due_date) }}</Text>
          </View>
          <View v-if="invoice.paid_date" :style="[s.datePill, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]">
            <Text :style="[s.dateLabel, { color: '#16a34a' }]">Paid On</Text>
            <Text :style="[s.dateValue, { color: '#16a34a' }]">{{ fmtDate(invoice.paid_date) }}</Text>
          </View>
        </View>
      </template>

      <!-- Line items table -->
      <View :style="s.tableHeader">
        <Text :style="[s.thText, s.colDesc]">Description</Text>
        <Text :style="[s.thText, s.colDate]">Date</Text>
        <Text :style="[s.thText, s.colQty]">Qty</Text>
        <Text :style="[s.thText, s.colPrice]">Unit Price</Text>
        <Text :style="[s.thText, s.colTotal]">Total</Text>
      </View>
      <View
        v-for="(item, i) in invoice.line_items"
        :key="i"
        :style="i % 2 === 0 ? s.tableRow : s.tableRowAlt"
      >
        <Text :style="s.colDesc">{{ item.description }}</Text>
        <Text :style="[s.colDate, { fontSize: 9, textAlign: 'center', color: '#6b7280' }]">{{ fmtDate(item.created_at) }}</Text>
        <Text :style="s.colQty">{{ item.quantity }}</Text>
        <Text :style="s.colPrice">{{ fmt(item.unit_price) }}</Text>
        <Text :style="s.colTotal">{{ fmt(item.total) }}</Text>
      </View>

      <!-- Totals -->
      <View :style="s.totalsSection">
        <View :style="s.subtotalsBlock">
          <View :style="s.totalRow">
            <Text :style="s.totalLabel">Subtotal</Text>
            <Text :style="s.totalBold">{{ fmt(invoice.subtotal) }}</Text>
          </View>
          <View :style="s.totalRow">
            <Text :style="s.totalLabel">VAT ({{ invoice.tax_rate }}%)</Text>
            <Text :style="s.totalValue">{{ fmt(invoice.tax_amount) }}</Text>
          </View>
        </View>
        <View :style="s.grandRow">
          <Text :style="s.grandLabel">Total Due</Text>
          <Text :style="s.grandValue">{{ fmt(invoice.total_amount) }}</Text>
        </View>
      </View>

      <!-- Meal purpose -->
      <View v-if="invoice.meal_purpose" :style="[s.notesSection, { borderLeftColor: '#d97706', backgroundColor: '#fffbeb' }]">
        <Text :style="s.notesLabel">Purpose of Meal</Text>
        <Text :style="s.notesText">{{ invoice.meal_purpose }}</Text>
      </View>

      <!-- Notes -->
      <View v-if="invoice.notes" :style="s.notesSection">
        <Text :style="s.notesLabel">Notes</Text>
        <Text :style="s.notesText">{{ invoice.notes }}</Text>
      </View>

      <!-- Footer -->
      <View :style="s.footer" fixed>
        <Text :style="s.footerText">{{ orgName }} — {{ invoice.invoice_number }}</Text>
        <Text :style="s.footerText">Thank you for your business.</Text>
      </View>

    </Page>
  </Document>
</template>
