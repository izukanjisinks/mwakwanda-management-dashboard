import { apiClient } from './client'
import type { Invoice, InvoiceStatusUpdate, PaginatedInvoices } from '@/types/invoice'

export interface InvoiceListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  status?: string
  client_type?: string
  branch_id?: string
}

export const invoiceApi = {
  list: (params?: InvoiceListParams) =>
    apiClient.get<PaginatedInvoices>('/invoices', { params }),

  get: (id: string) =>
    apiClient.get<Invoice>(`/invoices/${id}`),

  getByBookingId: (bookingId: string) =>
    apiClient.get<Invoice>(`/invoices/booking/${bookingId}`),

  updateStatus: (id: string, payload: InvoiceStatusUpdate) =>
    apiClient.patch<Invoice>(`/invoices/${id}/status`, payload),
}
