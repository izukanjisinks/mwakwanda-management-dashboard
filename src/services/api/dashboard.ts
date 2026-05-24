import { apiClient } from './client'
import type { DashboardStats } from '@/types/dashboard'

export const dashboardApi = {
  stats: (params?: { branch_id?: string }) =>
    apiClient.get<DashboardStats>('/dashboard/stats', { params }),
}
