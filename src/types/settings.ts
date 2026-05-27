export interface OrgSettings {
  id: string
  org_id?: string
  auto_close_orders: boolean
  auto_extend_checkout: boolean
  created_at: string
  updated_at: string
}

export interface OrgSettingsPayload {
  auto_close_orders?: boolean
  auto_extend_checkout?: boolean
}

export interface PasswordPolicy {
  min_length: number
  require_uppercase: boolean
  require_lowercase: boolean
  require_numbers: boolean
  require_special_chars: boolean
  max_failed_attempts: number
  lockout_duration_mins: number
  password_expiry_days: number
  otp_length?: number
  otp_expiry_mins?: number
  session_timeout_mins?: number
}

export interface LodgeProfile {
  id?: string
  org_id?: string
  name: string
  logo_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface LodgeProfilePayload {
  name?: string
  logo_url?: string | null
}
