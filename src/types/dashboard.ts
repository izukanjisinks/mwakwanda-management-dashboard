export interface AdminDashboardData {
  total_employees: number
  total_departments: number
  active_payrolls: number
  recent_hires: RecentHire[]
  leave_requests: LeaveRequestsSummary
  monthly_payroll_cost: MonthlyPayrollCost[]
  hiring_trend: HiringTrend[]
}

export interface RecentHire {
  first_name: string
  last_name: string
  position: string
  hire_date: string
}

export interface LeaveRequestsSummary {
  pending_requests: number
  approved_requests: number
  rejected_requests: number
}

export interface MonthlyPayrollCost {
  month: string
  year: number
  total_net_salary: number
}

export interface HiringTrend {
  month: string
  year: number
  new_hires: number
}

export interface DashboardData {
  employee_details: EmployeeDetails
  holidays_this_month: HolidaysThisMonth
  leave_days_this_month: number
  yearly_entitlement: number
  leave_requests: number
}

export interface EmployeeDetails {
  employee_name: string
  address: string
  role: string
  position: string
  employment_period: number
  department: string
  supervisor: string
  position_code: string
}

export interface HolidaysThisMonth {
  total: number
  details: HolidayDetail[]
}

export interface HolidayDetail {
  name: string
  date: string
}
