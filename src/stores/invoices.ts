import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoiceApi } from '@/services/api/invoices'
import type { Invoice, InvoicePayload, InvoiceStatus } from '@/types/invoice'

export const useInvoicesStore = defineStore('invoices', () => {
  const invoices = ref<Invoice[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchInvoices() {
    loading.value = true
    error.value = null
    try {
      invoices.value = await invoiceApi.list()
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load invoices.'
      if (import.meta.env.DEV && invoices.value.length === 0) {
        invoices.value = DEV_MOCK_INVOICES
      }
    } finally {
      loading.value = false
    }
  }

  async function createInvoice(payload: InvoicePayload): Promise<Invoice> {
    const invoice = await invoiceApi.create(payload)
    invoices.value.unshift(invoice)
    return invoice
  }

  async function updateStatus(id: number, status: InvoiceStatus, paid_date?: string): Promise<Invoice> {
    const updated = await invoiceApi.updateStatus(id, { status, paid_date })
    const idx = invoices.value.findIndex(i => i.id === id)
    if (idx !== -1) invoices.value[idx] = updated
    return updated
  }

  async function deleteInvoice(id: number): Promise<void> {
    await invoiceApi.delete(id)
    invoices.value = invoices.value.filter(i => i.id !== id)
  }

  return { invoices, loading, error, fetchInvoices, createInvoice, updateStatus, deleteInvoice }
})

const DEV_MOCK_INVOICES: Invoice[] = [
  {
    id: 1,
    invoice_number: 'INV-2026-001',
    booking_id: 1,
    client_id: 1, client_name: 'John Mwale', client_type: 'individual',
    client_email: 'john.mwale@email.com',
    line_items: [
      { description: 'Room 303 — Suite (3 nights)', quantity: 3, unit_price: 2500, total: 7500 },
    ],
    subtotal: 7500, tax_rate: 16, tax_amount: 1200, total_amount: 8700,
    status: 'issued',
    issued_date: '2026-03-10',
    due_date: '2026-03-25',
    created_at: '2026-03-10T09:00:00Z',
  },
  {
    id: 2,
    invoice_number: 'INV-2026-002',
    booking_id: 3,
    client_id: 1, client_name: 'Zambia National Bank', client_type: 'corporate',
    client_email: 'c.mwanza@znb.co.zm',
    company_reg_number: 'ZNB-001-2010',
    line_items: [
      { description: 'Conference A (1 day)', quantity: 1, unit_price: 5000, total: 5000 },
      { description: 'Catering & Refreshments', quantity: 15, unit_price: 150, total: 2250 },
    ],
    subtotal: 7250, tax_rate: 16, tax_amount: 1160, total_amount: 8410,
    status: 'paid',
    issued_date: '2026-03-14',
    due_date: '2026-03-28',
    paid_date: '2026-03-16',
    created_at: '2026-03-14T08:00:00Z',
  },
  {
    id: 3,
    invoice_number: 'INV-2026-003',
    booking_id: 2,
    client_id: 3, client_name: 'David Banda', client_type: 'individual',
    client_email: 'david.banda@yahoo.com',
    line_items: [
      { description: 'Room 101 — Single (2 nights)', quantity: 2, unit_price: 850, total: 1700 },
    ],
    subtotal: 1700, tax_rate: 16, tax_amount: 272, total_amount: 1972,
    status: 'issued',
    issued_date: '2026-03-17',
    due_date: '2026-03-31',
    created_at: '2026-03-17T08:00:00Z',
  },
  {
    id: 4,
    invoice_number: 'INV-2026-004',
    booking_id: 5,
    client_id: 2, client_name: 'Sarah Johnson', client_type: 'individual',
    client_email: 'sarah.j@gmail.com',
    line_items: [
      { description: 'Room 202 — Double (4 nights)', quantity: 4, unit_price: 1200, total: 4800 },
    ],
    subtotal: 4800, tax_rate: 16, tax_amount: 768, total_amount: 5568,
    status: 'paid',
    issued_date: '2026-03-05',
    due_date: '2026-03-19',
    paid_date: '2026-03-14',
    created_at: '2026-03-05T10:00:00Z',
  },
  {
    id: 5,
    invoice_number: 'INV-2026-005',
    booking_id: 4,
    client_id: 6, client_name: 'Pierre Dubois', client_type: 'individual',
    client_email: 'p.dubois@email.fr',
    line_items: [
      { description: 'Cabin 07 (5 nights)', quantity: 5, unit_price: 3200, total: 16000 },
    ],
    subtotal: 16000, tax_rate: 16, tax_amount: 2560, total_amount: 18560,
    status: 'draft',
    created_at: '2026-03-15T14:00:00Z',
  },
  {
    id: 6,
    invoice_number: 'INV-2026-006',
    booking_id: 6,
    client_id: 3, client_name: 'Safari Tours International', client_type: 'corporate',
    client_email: 'j.phiri@safaritours.com',
    company_reg_number: 'STI-099-2018',
    line_items: [
      { description: 'Room 401 — Suite (2 nights)', quantity: 2, unit_price: 2800, total: 5600 },
    ],
    subtotal: 5600, tax_rate: 16, tax_amount: 896, total_amount: 6496,
    status: 'overdue',
    issued_date: '2026-03-16',
    due_date: '2026-03-17',
    created_at: '2026-03-16T09:30:00Z',
  },
]
