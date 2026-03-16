export interface UserRole {
  role_id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

export interface SystemUser {
  user_id: string
  email: string
  role_id: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
  change_password: boolean
  is_locked: boolean
}

export interface CreateUserPayload {
  email: string
  password: string
  role_id: string
  is_active?: boolean
}

export interface UsersResponse {
  data: SystemUser[]
  page: number
  page_size: number
  total: number
}

export interface UpdateUserPayload {
  email?: string
  role_id?: string
  is_active?: boolean
  change_password?: boolean
  is_locked?: boolean
}
