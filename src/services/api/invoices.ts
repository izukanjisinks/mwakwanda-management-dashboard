import { apiClient } from './client'
import type { Invoice, InvoicePayload, InvoiceStatusUpdate } from '@/types/invoice'

export const invoiceApi = {
  list: () => apiClient.get<Invoice[]>('/invoices'),
  get: (id: number) => apiClient.get<Invoice>(`/invoices/${id}`),
  create: (payload: InvoicePayload) => apiClient.post<Invoice>('/invoices', payload),
  updateStatus: (id: number, payload: InvoiceStatusUpdate) => apiClient.put<Invoice>(`/invoices/${id}/status`, payload),
  delete: (id: number) => apiClient.delete<void>(`/invoices/${id}`),
  myInvoices: () => apiClient.get<Invoice[]>('/invoices/mine'),
}
