export interface PasswordPolicy {
  id: string
  min_length: number
  require_uppercase: boolean
  require_lowercase: boolean
  require_numbers: boolean
  require_special_chars: boolean
  max_failed_attempts: number
  lockout_duration_mins: number
  password_expiry_days: number
  otp_length: number
  otp_expiry_mins: number
  session_timeout_mins: number
  created_at: string
  updated_at: string
}

export interface UpdatePasswordPolicyPayload {
  min_length?: number
  require_uppercase?: boolean
  require_lowercase?: boolean
  require_numbers?: boolean
  require_special_chars?: boolean
  max_failed_attempts?: number
  lockout_duration_mins?: number
  password_expiry_days?: number
  otp_length?: number
  otp_expiry_mins?: number
  session_timeout_mins?: number
}
