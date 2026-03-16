export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'

export type ClientType = 'individual' | 'corporate'

export interface Booking {
  id: number
  room_id: number
  room_name: string
  client_id: number
  client_name: string
  client_type: ClientType
  check_in: string   // ISO date string YYYY-MM-DD
  check_out: string  // ISO date string YYYY-MM-DD
  guests: number
  status: BookingStatus
  special_requests?: string
  meal_plan_id?: number | null
  meal_plan_name?: string | null
  meal_cost: number  // pre-calculated: price_per_person_per_night × guests × nights
  room_cost: number
  total_amount: number
  created_at: string
}

export interface BookingPayload {
  room_id: number
  client_id: number
  client_type: ClientType
  check_in: string
  check_out: string
  guests: number
  special_requests?: string
  meal_plan_id?: number | null
}

export interface BookingStatusUpdate {
  status: BookingStatus
}
