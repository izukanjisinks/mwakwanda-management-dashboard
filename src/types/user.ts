export type SystemUserRole = 'admin' | 'manager' | 'receptionist' | 'cleaner'

export type SystemUserStatus = 'active' | 'inactive'

export interface SystemUser {
  id: string
  full_name: string
  email: string
  role: SystemUserRole
  status: SystemUserStatus
  last_login?: string
  created_at: string
}

export interface SystemUserPayload {
  full_name: string
  email: string
  role: SystemUserRole
  status: SystemUserStatus
  password?: string
}
