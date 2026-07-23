import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dashboardApi } from '@/services/api/dashboard'
import { getApiError } from '@/utils/errors'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { DashboardSummary, DashboardBookings, DashboardOrders, DashboardInvoices } from '@/types/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref<DashboardSummary | null>(null)
  const summaryLoading = ref(false)

  const bookings = ref<DashboardBookings | null>(null)
  const bookingsLoading = ref(false)

  const orders = ref<DashboardOrders | null>(null)
  const ordersLoading = ref(false)

  const invoices = ref<DashboardInvoices | null>(null)
  const invoicesLoading = ref(false)

  const error = ref<string | null>(null)

  async function fetchSummary() {
    const branchFilter = useBranchFilterStore()
    summaryLoading.value = true
    error.value = null
    try {
      summary.value = await dashboardApi.summary({ branch_id: branchFilter.apiBranchId })
    } catch (err) {
      error.value = getApiError(err, 'Failed to load dashboard summary.')
    } finally {
      summaryLoading.value = false
    }
  }

  async function fetchBookings() {
    const branchFilter = useBranchFilterStore()
    bookingsLoading.value = true
    try {
      bookings.value = await dashboardApi.bookings({ branch_id: branchFilter.apiBranchId })
    } catch (err) {
      error.value = getApiError(err, 'Failed to load bookings summary.')
    } finally {
      bookingsLoading.value = false
    }
  }

  async function fetchOrders() {
    const branchFilter = useBranchFilterStore()
    ordersLoading.value = true
    try {
      orders.value = await dashboardApi.orders({ branch_id: branchFilter.apiBranchId })
    } catch (err) {
      error.value = getApiError(err, 'Failed to load orders summary.')
    } finally {
      ordersLoading.value = false
    }
  }

  async function fetchInvoices() {
    const branchFilter = useBranchFilterStore()
    invoicesLoading.value = true
    try {
      invoices.value = await dashboardApi.invoices({ branch_id: branchFilter.apiBranchId })
    } catch (err) {
      error.value = getApiError(err, 'Failed to load invoices summary.')
    } finally {
      invoicesLoading.value = false
    }
  }

  return {
    summary, summaryLoading, fetchSummary,
    bookings, bookingsLoading, fetchBookings,
    orders, ordersLoading, fetchOrders,
    invoices, invoicesLoading, fetchInvoices,
  }
})
