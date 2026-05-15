export interface BackofficeUser {
  id: string
  full_name: string
  email: string
  is_active: boolean
  change_password: boolean
  is_locked: boolean
  created_at: string
  updated_at?: string
  last_login?: string
}

export interface BackofficeLoginResponse {
  token: string
  user: BackofficeUser
}

export interface Organisation {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  logo_url?: string
  is_active: boolean
  created_at: string
  updated_at?: string
  last_login?: string
}

export interface ProvisionPayload {
  organization: {
    name: string
    email: string
    phone: string
    address: string
    logo_url: string
  }
  admin: {
    full_name: string
    email: string
  }
}
