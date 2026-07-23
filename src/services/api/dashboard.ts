import { apiClient } from './client'
import type { DashboardSummary, DashboardBookings, DashboardOrders, DashboardInvoices } from '@/types/dashboard'

export const dashboardApi = {
  summary: (params?: { branch_id?: string }) =>
    apiClient.get<DashboardSummary>('/dashboard/summary', { params }),

  bookings: (params?: { branch_id?: string }) =>
    apiClient.get<DashboardBookings>('/dashboard/bookings', { params }),

  orders: (params?: { branch_id?: string }) =>
    apiClient.get<DashboardOrders>('/dashboard/orders', { params }),

  invoices: (params?: { branch_id?: string }) =>
    apiClient.get<DashboardInvoices>('/dashboard/invoices', { params }),
}
