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
  full_name?: string
  created_at: string
  change_password: boolean
  is_active: boolean
}

export type UserRole = 'admin' | 'client_individual' | 'client_corporate'

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
