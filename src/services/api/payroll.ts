import { apiClient } from './client'
import type { PayrollPeriod, GetPayrollPeriodsResponse, GetPayslipsResponse } from '@/types/payroll'

export interface CreatePayrollPeriodPayload {
  start_date: string
  end_date: string
}

export const payrollApi = {
  async getPayrollPeriods(params?: {
    page?: number
    page_size?: number
  }): Promise<GetPayrollPeriodsResponse> {
    return apiClient.get('/hr/payrolls', { params })
  },

  async createPayrollPeriod(payload: CreatePayrollPeriodPayload): Promise<PayrollPeriod> {
    return apiClient.post<PayrollPeriod>('/hr/payrolls', payload)
  },

  async runPayroll(periodId: string): Promise<void> {
    return apiClient.post(`/hr/payrolls/${periodId}/process`)
  },

  async getMyPayslips(): Promise<GetPayslipsResponse> {
    return apiClient.get<GetPayslipsResponse>('/hr/payslips/me')
  },
}
