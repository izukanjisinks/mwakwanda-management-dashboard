export type SystemUserRole = 'admin' | 'branch_admin' | 'manager' | 'receptionist' | 'cleaner' | 'guest'

export type SystemUserStatus = 'active' | 'inactive'

export interface SystemUser {
  id: string
  full_name: string
  email: string
  role: SystemUserRole
  role_id?: string
  status: SystemUserStatus
  is_locked?: boolean
  last_login?: string
  branch_id?: string
  branch_name?: string
  created_at: string
  updated_at: string
}

export interface SystemUserPayload {
  full_name: string
  email: string
  role: SystemUserRole
  status: SystemUserStatus
  password?: string
  branch_id?: string | null
  branch_name?: string | null
}

export interface PaginatedUsers {
  data: SystemUser[]
  page: number
  page_size: number
  total: number
}
