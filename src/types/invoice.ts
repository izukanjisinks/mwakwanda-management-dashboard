import type { ClientType } from './booking'

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  booking_id: string
  client_id: string
  client_name: string
  client_type: ClientType
  client_email?: string
  line_items: InvoiceLineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  status: InvoiceStatus
  issued_date?: string
  due_date?: string
  paid_date?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface InvoiceStatusUpdate {
  status: InvoiceStatus
  paid_date?: string
  notes?: string | null
}

export interface PaginatedInvoices {
  data: Invoice[]
  page: number
  page_size: number
  total: number
}
