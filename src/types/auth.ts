export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthRole {
  id: string
  name: UserRole
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole | AuthRole
  employee_id: string | null
  created_at: string
  change_password: boolean
  is_active: boolean
}

export type UserRole = 'super_admin' | 'hr_manager' | 'manager' | 'employee'

export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: string[]
  }
}
