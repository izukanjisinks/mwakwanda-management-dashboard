import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dashboardApi } from '@/services/api/dashboard'
import { bookingApi } from '@/services/api/bookings'
import { workflowApi } from '@/services/api/workflow'
import { menusApi } from '@/services/api/menus'
import { invoiceApi } from '@/services/api/invoices'
import { isInvoiceOverdue } from '@/utils/invoices'
import { getApiError } from '@/utils/errors'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { DashboardStats, DashboardNeedsAttention } from '@/types/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<DashboardStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const needsAttention = ref<DashboardNeedsAttention | null>(null)
  const needsAttentionLoading = ref(false)

  async function fetchStats() {
    const branchFilter = useBranchFilterStore()
    loading.value = true
    error.value = null
    try {
      stats.value = await dashboardApi.stats({
        branch_id: branchFilter.apiBranchId,
      })
    } catch (err) {
      error.value = getApiError(err, 'Failed to load dashboard stats.')
    } finally {
      loading.value = false
    }
  }

  // Assembled client-side from four existing list endpoints — no bulk
  // "needs attention" endpoint exists. Each call is a cheap summary-only
  // fetch (no per-record detail fan-out):
  //  - bookings: `overstayed` is a plain field on the list response itself
  //  - tasks: page_size 1, only the total count is read
  //  - orders: has_kitchen_items/has_bar_items are already on the list summary
  //  - invoices: backend doesn't reliably flip status to 'overdue', so we
  //    fetch issued+draft and compute it the same way the Invoices page does
  async function fetchNeedsAttention() {
    const branchFilter = useBranchFilterStore()
    const branchId = branchFilter.apiBranchId
    needsAttentionLoading.value = true
    try {
      const [checkedIn, pendingTasks, openOrders, issuedInvoices, draftInvoices] = await Promise.all([
        bookingApi.list({ status: 'checked_in', page: 1, page_size: 200, branch_id: branchId }),
        workflowApi.getAllTasks('pending', branchId, 1, 1),
        menusApi.listOrders({ status: 'open', page: 1, page_size: 200, branch_id: branchId }),
        invoiceApi.list({ status: 'issued', page: 1, page_size: 200, branch_id: branchId }),
        invoiceApi.list({ status: 'draft', page: 1, page_size: 200, branch_id: branchId }),
      ])

      const orders = openOrders.data ?? []
      const overdueInvoices = [...(issuedInvoices.data ?? []), ...(draftInvoices.data ?? [])].filter(isInvoiceOverdue)

      needsAttention.value = {
        overstayingGuests: (checkedIn.data ?? []).filter(b => b.overstayed).length,
        pendingApprovals: pendingTasks.total ?? pendingTasks.count ?? 0,
        kitchenBacklog: orders.filter(o => o.has_kitchen_items && o.kitchen_status !== 'ready').length,
        barBacklog: orders.filter(o => o.has_bar_items && o.bar_status !== 'ready').length,
        invoicesOverdueCount: overdueInvoices.length,
        invoicesOverdueAmount: overdueInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
      }
    } catch {
      // Non-critical summary — leave the tiles at their last-known state
      // (or absent on first load) rather than surfacing a toast for this.
    } finally {
      needsAttentionLoading.value = false
    }
  }

  return { stats, loading, error, fetchStats, needsAttention, needsAttentionLoading, fetchNeedsAttention }
})
