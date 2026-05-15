export interface LoginCredentials {
  email: string
  password: string
  org_id?: string
}

export interface AuthRole {
  role_id: string
  name: string
  description?: string
  created_at?: string
  updated_at?: string
}

export interface AuthUser {
  user_id: string
  email: string
  role: AuthRole
  full_name?: string
  org_id?: string
  org_name?: string
  org_logo_url?: string
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

export interface OrgOption {
  org_id: string
  name: string
}

export interface MultiOrgLoginResponse {
  requires_org_selection: true
  organizations: OrgOption[]
}

export type LoginResult = LoginResponse | MultiOrgLoginResponse

export interface ApiError {
  error: {
    code: string
    message: string
    details?: string[]
  }
}
