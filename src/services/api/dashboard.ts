import { apiClient } from './client'
import type { DashboardData, AdminDashboardData } from '@/types/dashboard'

export const dashboardApi = {
  getDashboard(): Promise<DashboardData> {
    return apiClient.get<DashboardData>('/hr/dashboard/me')
  },

  getAdminDashboard(params?: { from?: string; to?: string }): Promise<AdminDashboardData> {
    return apiClient.get<AdminDashboardData>('/hr/dashboard/admin', { params })
  },
}
