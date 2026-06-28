import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoiceApi } from '@/services/api/invoices'
import { getApiError } from '@/utils/errors'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { Invoice, InvoiceStatus, InvoiceStatusUpdate } from '@/types/invoice'

export const useInvoicesStore = defineStore('invoices', () => {
  const invoices = ref<Invoice[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchInvoices(page = 1, pageSize = 20, status?: string, clientType?: string) {
    const branchFilter = useBranchFilterStore()
    loading.value = true
    error.value = null
    try {
      const res = await invoiceApi.list({ page, page_size: pageSize, status, client_type: clientType, branch_id: branchFilter.apiBranchId })
      invoices.value = res.data ?? []
      total.value = res.total
    } catch (err) {
      error.value = getApiError(err, 'Failed to load invoices.')
    } finally {
      loading.value = false
    }
  }

  async function updateStatus(id: string, status: InvoiceStatus, paid_date?: string, proof_of_payment_url?: string): Promise<Invoice> {
    const payload: InvoiceStatusUpdate = { status, paid_date, proof_of_payment_url }
    const updated = await invoiceApi.updateStatus(id, payload)
    const idx = invoices.value.findIndex(i => i.id === id)
    if (idx !== -1) invoices.value[idx] = updated
    return updated
  }

  async function fetchByBookingId(bookingId: string): Promise<Invoice> {
    return invoiceApi.getByBookingId(bookingId)
  }

  async function notifyApprover(id: string): Promise<Invoice> {
    const updated = await invoiceApi.notifyApprover(id)
    const idx = invoices.value.findIndex(i => i.id === id)
    if (idx !== -1) invoices.value[idx] = updated
    return updated
  }

  async function sendInvoiceEmail(id: string, pdfBase64: string): Promise<void> {
    await invoiceApi.sendEmail(id, pdfBase64)
  }

  async function sendPaymentConfirmation(id: string): Promise<void> {
    await invoiceApi.sendPaymentConfirmation(id)
  }

  return { invoices, total, loading, error, fetchInvoices, updateStatus, fetchByBookingId, notifyApprover, sendInvoiceEmail, sendPaymentConfirmation }
})
