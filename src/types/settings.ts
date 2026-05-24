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
  // Location
  address: string
  city: string
  country: string
  latitude?: number | null
  longitude?: number | null
  google_maps_url?: string
  // Lodge hours
  check_in_time: string
  check_out_time: string
  // Parking
  has_parking: boolean
  parking_details?: string
  // Restaurant
  has_restaurant: boolean
  restaurant_name?: string
  restaurant_opens?: string
  restaurant_closes?: string
  restaurant_description?: string
  created_at?: string
  updated_at?: string
}

export interface LodgeProfilePayload {
  address?: string
  city?: string
  country?: string
  latitude?: number | null
  longitude?: number | null
  google_maps_url?: string
  check_in_time?: string
  check_out_time?: string
  has_parking?: boolean
  parking_details?: string
  has_restaurant?: boolean
  restaurant_name?: string
  restaurant_opens?: string
  restaurant_closes?: string
  restaurant_description?: string
}
