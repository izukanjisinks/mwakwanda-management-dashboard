import type { ClientType } from './booking'

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'

export interface InvoiceLineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Invoice {
  id: number
  invoice_number: string
  booking_id: number
  client_id: number
  client_name: string
  client_type: ClientType
  // Individual fields
  client_email?: string
  // Corporate extra fields
  company_reg_number?: string
  line_items: InvoiceLineItem[]
  subtotal: number
  tax_rate: number       // percentage e.g. 16
  tax_amount: number
  total_amount: number
  status: InvoiceStatus
  issued_date?: string   // ISO date
  due_date?: string      // ISO date
  paid_date?: string     // ISO date
  notes?: string
  created_at: string
}

export interface InvoicePayload {
  booking_id: number
  notes?: string
  tax_rate?: number
  due_date?: string
}

export interface InvoiceStatusUpdate {
  status: InvoiceStatus
  paid_date?: string
}
