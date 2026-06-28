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
  // Attendee grouping — attendee_id is the primary dedup key (NRC / passport / system ID)
  attendee_name?: string
  attendee_id?: string
  attendee_passport?: string
  booking_type?: 'accommodation' | 'meals' | 'event'
}

export interface Invoice {
  id: string
  invoice_number: string
  booking_id: string
  client_id: string
  client_name: string
  client_type: ClientType
  client_email?: string
  // Corporate billing — Bill To
  client_phone?: string
  client_tpin?: string
  client_address?: string
  client_branch?: string
  client_department?: string
  internal_order?: string
  cost_center?: string
  gl_code?: string
  // Org billing — Bill From (overrides auth store defaults when set)
  org_branch?: string
  org_email?: string
  org_phone?: string
  org_tpin?: string
  org_address?: string
  // Approver / notification
  approver_name?: string
  approver_email?: string
  notification_sent_at?: string
  line_items: InvoiceLineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  status: InvoiceStatus
  issued_date?: string
  due_date?: string
  paid_date?: string
  proof_of_payment_url?: string
  meal_purpose?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface InvoiceStatusUpdate {
  status: InvoiceStatus
  paid_date?: string
  proof_of_payment_url?: string
  notes?: string | null
}

export interface PaginatedInvoices {
  data: Invoice[]
  page: number
  page_size: number
  total: number
}
