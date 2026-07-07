<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { Document, Page, View, Text, Image } from '@ceereals/vue-pdf'
import type { Style } from '@ceereals/vue-pdf'
import type { Invoice } from '@/types/invoice'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ invoice: Invoice }>()

const authStore = useAuthStore()

// Prefetch the logo as base64 so the PDF renderer can embed it without CORS issues
const logoBase64 = ref<string | undefined>(undefined)
watchEffect(async () => {
  const url = authStore.user?.org_logo_url
  if (!url) { logoBase64.value = undefined; return }
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    logoBase64.value = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    logoBase64.value = undefined
  }
})
const isCorporate = computed(() => props.invoice.client_type === 'corporate')

// ── Bill From (org) ───────────────────────────────────────────────────────────
const orgName    = computed(() => authStore.user?.org_name    || 'Lodge Management')
const orgBranch  = computed(() => props.invoice.org_branch    || authStore.user?.branch_name || 'Head Office')
const orgEmail   = computed(() => props.invoice.org_email     || authStore.user?.email  || 'info@mwakwanda.com')
const orgPhone   = computed(() => props.invoice.org_phone     || '+260 211 000 000')
const orgTpin    = computed(() => props.invoice.org_tpin      || '1000123456')
const orgAddress = computed(() => props.invoice.org_address   || 'Plot 1234, Great East Road, Lusaka, Zambia')

// ── Bill To (corporate client) ────────────────────────────────────────────────
const clientPhone   = computed(() => props.invoice.client_phone      || '')
const clientTpin    = computed(() => props.invoice.client_tpin       || '')
const clientAddress = computed(() => props.invoice.client_address    || '')
const clientBranch  = computed(() => props.invoice.client_branch     || '')
const clientDept    = computed(() => props.invoice.client_department || '')
const glCode          = computed(() => props.invoice.gl_code        || '')
const costCenterType  = computed(() => props.invoice.cost_center_type)
const costCenterLabel = computed(() => costCenterType.value === 'internal_order' ? 'Internal Order' : 'Cost Center')
const costCenterValue = computed(() => {
  if (costCenterType.value === 'internal_order') return props.invoice.internal_order || ''
  return props.invoice.cost_center || ''
})

// ── Attendee grouping ─────────────────────────────────────────────────────────
interface DisplayItem {
  id: string
  itemNo: number
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface BookingTypeGroup {
  typeKey: string
  label: string
  accentColor: string
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

const TYPE_CONFIG: Record<string, { label: string; accentColor: string }> = {
  accommodation: { label: 'Accommodation', accentColor: '#92400e' },
  meals:         { label: 'Meals',         accentColor: '#b45309' },
  event:         { label: 'Event',         accentColor: '#1d4ed8' },
  general:       { label: 'General',       accentColor: '#57534e' },
}

function parseDescription(raw: string): { name: string; description: string; bookingType: string } {
  const roomMatch = raw.match(/^(.+?)\s*\(([^)]+)\)\s*—\s*(.+)$/)
  if (roomMatch) {
    return { name: roomMatch[2].trim(), description: `${roomMatch[1].trim()} — ${roomMatch[3].trim()}`, bookingType: 'accommodation' }
  }
  const mealMatch = raw.match(/^(.+?)\s*—\s*(.+)$/)
  if (mealMatch) {
    return { name: mealMatch[1].trim(), description: mealMatch[2].trim(), bookingType: 'meals' }
  }
  return { name: '', description: raw, bookingType: 'general' }
}

const groupedLineItems = computed((): AttendeeGroup[] => {
  const attendeeMap = new Map<string, AttendeeGroup>()
  let itemNo = 0

  for (const item of props.invoice.line_items) {
    itemNo++
    let attendeeKey: string, attendeeName: string, reference: string, description: string, bookingType: string

    if (item.attendee_name) {
      attendeeKey  = item.attendee_id ?? item.attendee_passport ?? item.attendee_name
      attendeeName = item.attendee_name
      reference    = item.attendee_passport ?? item.attendee_id ?? ''
      description  = item.description
      bookingType  = item.booking_type ?? 'general'
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
      const cfg = TYPE_CONFIG[bookingType] ?? { label: bookingType, accentColor: '#57534e' }
      typeGroup = { typeKey: bookingType, label: cfg.label, accentColor: cfg.accentColor, subtotal: 0, items: [] }
      group.bookingTypes.push(typeGroup)
    }
    typeGroup.subtotal += item.total
    typeGroup.items.push({ id: item.id, itemNo, description, quantity: item.quantity, unit_price: item.unit_price, total: item.total })
  }

  return [...attendeeMap.values()]
})

// ── Invoice scenario detection ────────────────────────────────────────────────
const invoiceScenario = computed<'accommodation' | 'meals' | 'event' | 'general'>(() => {
  const types = new Set(props.invoice.line_items.map(li => li.booking_type).filter(Boolean))
  if (types.has('accommodation')) return 'accommodation'
  if (types.has('event')) return 'event'
  if (types.has('meals')) return 'meals'
  return 'general'
})

const scenarioConfig = computed(() => {
  const configs = {
    accommodation: { label: 'Accommodation & Meals Invoice', bgColor: '#292524', textColor: '#fde68a' },
    meals:         { label: 'Meals Invoice',                 bgColor: '#fff7ed', textColor: '#9a3412' },
    event:         { label: 'Event Invoice',                 bgColor: '#eff6ff', textColor: '#1d4ed8' },
    general:       { label: 'Invoice',                       bgColor: '#fafaf9', textColor: '#57534e' },
  } as const
  return configs[invoiceScenario.value]
})

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
  orgLogoWrap: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#92400e', marginBottom: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' } as Style,
  orgLogoImg: { width: 72, height: 72, borderRadius: 10 } as Style,
  orgLogoFallback: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: '#ffffff' } as Style,
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
  // Person subheader row
  attendeeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#44403c', paddingHorizontal: 9, paddingVertical: 6, marginTop: 8, marginBottom: 1, borderRadius: 2 } as Style,
  attendeeNameText: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#fafaf9' } as Style,
  attendeeRefText: { fontSize: 8, color: '#a8a29e', marginLeft: 6 } as Style,
  attendeeTotalText: { width: 80, textAlign: 'right', fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#fde68a' } as Style,
  // Line items table header
  tableHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#292524', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 3, marginBottom: 1, marginTop: 8 } as Style,
  thNo: { width: 28, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fafaf9', textTransform: 'uppercase' } as Style,
  thDesc: { flex: 1, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fafaf9', textTransform: 'uppercase' } as Style,
  thQty: { width: 40, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fafaf9', textTransform: 'uppercase', textAlign: 'right' } as Style,
  thUnit: { width: 72, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fafaf9', textTransform: 'uppercase', textAlign: 'right' } as Style,
  thTotal: { width: 80, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#fafaf9', textTransform: 'uppercase', textAlign: 'right' } as Style,
  // Individual item rows
  itemRow:     { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f0efed' } as Style,
  itemAltRow:  { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f0efed', backgroundColor: '#fafaf9' } as Style,
  itemNoCol:   { width: 28, paddingTop: 1 } as Style,
  itemNoText:  { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#a8a29e' } as Style,
  itemDescCol: { flex: 1 } as Style,
  itemDescText:{ fontSize: 9, color: '#1a1a1a' } as Style,
  itemTypeText:{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 } as Style,
  itemQtyCol:  { width: 40, textAlign: 'right', paddingTop: 1 } as Style,
  itemQtyText: { fontSize: 9, color: '#57534e' } as Style,
  itemUnitCol: { width: 72, textAlign: 'right', paddingTop: 1 } as Style,
  itemUnitText:{ fontSize: 9, color: '#57534e' } as Style,
  itemTotalCol:{ width: 80, textAlign: 'right', paddingTop: 1 } as Style,
  itemTotalText:{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1a1a1a' } as Style,

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

  // Scenario banner
  scenarioBanner: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 4, marginBottom: 14 } as Style,
  scenarioBannerText: { fontSize: 9, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.6 } as Style,
  // Booking type sub-header (within attendee group, shown when attendee has multiple types)
  typeSubHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, marginTop: 1, borderLeftWidth: 3 } as Style,
  typeSubLabel: { flex: 1, fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5 } as Style,
  typeSubTotal: { width: 80, textAlign: 'right', fontSize: 8, fontFamily: 'Helvetica-Bold' } as Style,
  // Meal purpose box (shown before items for meals invoices)
  mealPurposeBox: { padding: 10, backgroundColor: '#fff7ed', borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#f97316', marginBottom: 12 } as Style,
  mealPurposeLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9a3412', textTransform: 'uppercase', marginBottom: 3 } as Style,
  mealPurposeText: { fontSize: 9, color: '#7c2d12', lineHeight: 1.4 } as Style,
}
</script>

<template>
  <Document :title="`Invoice ${invoice.invoice_number}`">
    <Page size="A4" :style="s.page">

      <!-- Header -->
      <View :style="s.header">
        <View>
          <View :style="s.orgLogoWrap">
            <Image v-if="logoBase64" :src="logoBase64" :style="s.orgLogoImg" />
            <Text v-else :style="s.orgLogoFallback">{{ orgName.charAt(0).toUpperCase() }}</Text>
          </View>
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
            <View v-if="invoice.client_email" :style="s.billRow">
              <Text :style="s.billKeyDark">Email</Text>
              <Text :style="s.billValLight">{{ invoice.client_email }}</Text>
            </View>
            <View v-if="clientPhone" :style="s.billRow">
              <Text :style="s.billKeyDark">Phone</Text>
              <Text :style="s.billValLight">{{ clientPhone }}</Text>
            </View>
            <View v-if="clientTpin" :style="s.billRow">
              <Text :style="s.billKeyDark">TPIN</Text>
              <Text :style="s.billValLight">{{ clientTpin }}</Text>
            </View>
            <View v-if="clientAddress || clientBranch || clientDept" :style="s.billDividerLight" />
            <View v-if="clientAddress" :style="s.billRow">
              <Text :style="s.billKeyDark">Address</Text>
              <Text :style="s.billValLight">{{ clientAddress }}</Text>
            </View>
            <View v-if="clientBranch" :style="s.billRow">
              <Text :style="s.billKeyDark">Branch</Text>
              <Text :style="s.billValLight">{{ clientBranch }}</Text>
            </View>
            <View v-if="clientDept" :style="s.billRow">
              <Text :style="s.billKeyDark">Department</Text>
              <Text :style="s.billValLight">{{ clientDept }}</Text>
            </View>
            <View v-if="glCode || costCenterValue" :style="s.billDividerLight" />
            <View v-if="glCode" :style="s.billRow">
              <Text :style="s.billKeyDark">GL Code</Text>
              <Text :style="s.billValLight">{{ glCode }}</Text>
            </View>
            <View v-if="costCenterValue" :style="s.billRow">
              <Text :style="s.billKeyDark">{{ costCenterLabel }}</Text>
              <Text :style="s.billValLight">{{ costCenterValue }}</Text>
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
            <View v-if="invoice.client_email" :style="s.billRow">
              <Text :style="s.billKeyDark">Email</Text>
              <Text :style="s.billValLight">{{ invoice.client_email }}</Text>
            </View>
            <View v-if="clientPhone" :style="s.billRow">
              <Text :style="s.billKeyDark">Phone</Text>
              <Text :style="s.billValLight">{{ clientPhone }}</Text>
            </View>
            <View v-if="clientTpin" :style="s.billRow">
              <Text :style="s.billKeyDark">TPIN</Text>
              <Text :style="s.billValLight">{{ clientTpin }}</Text>
            </View>
            <View v-if="clientAddress" :style="s.billDividerLight" />
            <View v-if="clientAddress" :style="s.billRow">
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

      <!-- Scenario banner -->
      <View :style="[s.scenarioBanner, { backgroundColor: scenarioConfig.bgColor }]">
        <Text :style="[s.scenarioBannerText, { color: scenarioConfig.textColor }]">{{ scenarioConfig.label }}</Text>
      </View>

      <!-- Meals: Purpose of Meal shown prominently before items -->
      <View v-if="invoiceScenario === 'meals' && invoice.meal_purpose" :style="s.mealPurposeBox">
        <Text :style="s.mealPurposeLabel">Purpose of Meal</Text>
        <Text :style="s.mealPurposeText">{{ invoice.meal_purpose }}</Text>
      </View>

      <!-- Line items table header -->
      <View :style="s.tableHeader">
        <Text :style="s.thNo">Item No.</Text>
        <Text :style="s.thDesc">Description</Text>
        <Text :style="s.thQty">Qty</Text>
        <Text :style="s.thUnit">Unit Price</Text>
        <Text :style="s.thTotal">Total</Text>
      </View>

      <!-- Person groups → booking type sub-groups → items -->
      <View v-for="group in groupedLineItems" :key="group.key">
        <!-- Person subheader -->
        <View :style="s.attendeeRow">
          <Text :style="s.attendeeNameText">{{ group.name }}</Text>
          <Text v-if="group.reference" :style="s.attendeeRefText">({{ group.reference }})</Text>
          <Text :style="s.attendeeTotalText">{{ fmt(group.total) }}</Text>
        </View>

        <!-- Booking type sub-groups -->
        <View v-for="typeGroup in group.bookingTypes" :key="typeGroup.typeKey">
          <!-- Sub-group header — only shown when attendee has multiple booking types -->
          <View
            v-if="group.bookingTypes.length > 1"
            :style="[s.typeSubHeader, { borderLeftColor: typeGroup.accentColor, backgroundColor: '#f5f5f4' }]"
          >
            <Text :style="[s.typeSubLabel, { color: typeGroup.accentColor }]">{{ typeGroup.label }}</Text>
            <Text :style="[s.typeSubTotal, { color: typeGroup.accentColor }]">{{ fmt(typeGroup.subtotal) }}</Text>
          </View>

          <!-- Item rows -->
          <View
            v-for="(item, i) in typeGroup.items"
            :key="item.id || item.itemNo"
            :style="i % 2 === 0 ? s.itemRow : s.itemAltRow"
          >
            <View :style="s.itemNoCol">
              <Text :style="s.itemNoText">{{ item.itemNo }}</Text>
            </View>
            <View :style="s.itemDescCol">
              <Text :style="s.itemDescText">{{ item.description }}</Text>
            </View>
            <View :style="s.itemQtyCol">
              <Text :style="s.itemQtyText">{{ item.quantity }}</Text>
            </View>
            <View :style="s.itemUnitCol">
              <Text :style="s.itemUnitText">{{ fmt(item.unit_price) }}</Text>
            </View>
            <View :style="s.itemTotalCol">
              <Text :style="s.itemTotalText">{{ fmt(item.total) }}</Text>
            </View>
          </View>
        </View>
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

      <!-- Meal purpose (after totals for non-meals invoices; meals invoices show it before items above) -->
      <View v-if="invoiceScenario !== 'meals' && invoice.meal_purpose" :style="[s.notesSection, { borderLeftColor: '#d97706', backgroundColor: '#fffbeb' }]">
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
