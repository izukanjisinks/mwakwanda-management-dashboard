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
}

export interface BookingStatusUpdate {
  status: BookingStatus
}
