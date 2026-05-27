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
  email?: string
  phone?: string
  logo_url?: string
  street_address?: string
  city?: string
  country?: string
  location?: string | null
  parking?: boolean
  restaurant?: boolean
  check_in_time?: string | null
  check_out_time?: string | null
  is_active: boolean
  created_at: string
  updated_at?: string
}

export interface ProvisionPayload {
  organization: {
    name: string
    email: string
    phone?: string
    logo_url?: string
    street_address?: string
    city?: string
    country?: string
    location?: string | null
    parking?: boolean
    restaurant?: boolean
    check_in_time?: string | null
    check_out_time?: string | null
  }
  admin: {
    full_name: string
    email: string
  }
}
