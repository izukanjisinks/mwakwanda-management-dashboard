export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthRole {
  role_id: string
  name: string
}

export interface AuthUser {
  user_id: string
  email: string
  role: AuthRole
  full_name?: string
  created_at: string
  change_password: boolean
  is_active: boolean
}

export type UserRole = 'admin' | 'manager' | 'receptionist' | 'cleaner'

export interface LoginResponse {
  token: string
  expires_at: string
  user: AuthUser
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: string[]
  }
}
