export interface PayrollPeriod {
  id: string
  start_date: string
  end_date: string
  status: 'OPEN' | 'PROCESSING' | 'COMPLETED'
  processed_by: string | null
  processed_by_name: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

export interface GetPayrollPeriodsResponse {
  data: PayrollPeriod[]
  page: number
  page_size: number
  total: number
}

export interface Payslip {
  id: string
  employee_id: string
  month: number
  year: number
  base_salary: number
  housing_allowance: number
  transport_allowance: number
  medical_allowance: number
  gross_salary: number
  income_tax: number
  leave_days: number
  net_salary: number
  created_at: string
  updated_at: string
  employee_name: string
  position_name: string
}

export interface GetPayslipsResponse {
  data: Payslip[]
  page: number
  page_size: number
  total: number
}
