<script setup lang="ts">
import { computed } from 'vue'
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'
import type { Style } from '@ceereals/vue-pdf'
import type { Invoice } from '@/types/invoice'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ invoice: Invoice }>()

const authStore = useAuthStore()
const orgName = computed(() => authStore.user?.org_name || 'Lodge Management')

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: '#d97706' } as Style,
  orgLogo: { width: 48, height: 48, borderRadius: 4, marginBottom: 6, objectFit: 'contain' } as Style,
  lodgeName: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#92400e' } as Style,
  lodgeSub: { fontSize: 9, color: '#78716c', marginTop: 3 } as Style,
  invoiceTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: '#1a1a1a' } as Style,
  invoiceNumber: { fontSize: 10, color: '#6b7280', textAlign: 'right', marginTop: 4 } as Style,

  // Status badge
  statusBadge: { alignSelf: 'flex-end', marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 } as Style,
  statusText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff' } as Style,

  // Bill to / dates
  metaRow: { flexDirection: 'row', marginBottom: 24, gap: 20 } as Style,
  metaBox: { flex: 1, backgroundColor: '#fafaf9', padding: 12, borderRadius: 4 } as Style,
  metaLabel: { fontSize: 8, color: '#78716c', textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Helvetica-Bold' } as Style,
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 2 } as Style,
  metaSmall: { fontSize: 9, color: '#6b7280' } as Style,

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

  // Notes
  notesSection: { marginTop: 24, padding: 12, backgroundColor: '#fafaf9', borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#d97706' } as Style,
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

      <!-- Bill To + Dates -->
      <View :style="s.metaRow">
        <View :style="s.metaBox">
          <Text :style="s.metaLabel">Bill To</Text>
          <Text :style="s.metaValue">{{ invoice.client_name }}</Text>
          <Text :style="s.metaSmall">{{ invoice.client_type === 'corporate' ? 'Corporate' : 'Individual' }}</Text>
          <Text v-if="invoice.client_email" :style="s.metaSmall">{{ invoice.client_email }}</Text>
        </View>
        <View :style="s.metaBox">
          <Text :style="s.metaLabel">Dates</Text>
          <Text :style="s.metaSmall">Issued: <Text :style="{ fontFamily: 'Helvetica-Bold' }">{{ fmtDate(invoice.issued_date) }}</Text></Text>
          <Text :style="[s.metaSmall, { marginTop: 3 }]">Due: <Text :style="{ fontFamily: 'Helvetica-Bold' }">{{ fmtDate(invoice.due_date) }}</Text></Text>
          <Text v-if="invoice.paid_date" :style="[s.metaSmall, { marginTop: 3, color: '#16a34a' }]">Paid: <Text :style="{ fontFamily: 'Helvetica-Bold' }">{{ fmtDate(invoice.paid_date) }}</Text></Text>
        </View>
      </View>

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
        <!-- Subtotal + tax rows -->
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
        <!-- Total Due block — same row -->
        <View :style="s.grandRow">
          <Text :style="s.grandLabel">Total Due</Text>
          <Text :style="s.grandValue">{{ fmt(invoice.total_amount) }}</Text>
        </View>
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
