export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'

export type ClientType = 'individual' | 'corporate'

export interface Booking {
  id: string
  user_id: string
  room_id: string
  room_name: string
  client_id: string
  client_name: string
  client_type: ClientType
  meal_plan_id?: string | null
  meal_plan_name?: string | null
  check_in: string
  check_out: string
  guests: number
  nights: number
  room_cost: number
  meal_cost: number
  total_amount: number
  status: BookingStatus
  special_requests?: string
  created_at: string
  updated_at: string
}

export interface BookingPayload {
  room_id: string
  client_id: string
  client_type: ClientType
  meal_plan_id?: string | null
  check_in: string   // ISO timestamp
  check_out: string  // ISO timestamp
  guests: number
  special_requests?: string
}

export interface BookingUpdatePayload {
  check_in?: string
  check_out?: string
  guests?: number
  meal_plan_id?: string | null
  special_requests?: string
}

export interface BookingStatusUpdate {
  status: BookingStatus
}

export interface PaginatedBookings {
  data: Booking[]
  page: number
  page_size: number
  total: number
}
