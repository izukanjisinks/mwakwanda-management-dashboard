export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'

export type ClientType = 'individual' | 'corporate'

export interface Booking {
  id: string
  booking_number: string
  user_id: string
  room_id: string
  room_name: string
  client_id: string
  client_name: string
  corporate_client_id?: string
  corporate_client_name?: string
  client_type: ClientType
  check_in: string
  check_out: string
  guests: number
  nights: number
  room_cost: number
  meal_cost?: number
  total_amount: number
  status: BookingStatus
  overstayed: boolean
  special_requests?: string
  documents?: string[]
  created_at: string
  updated_at: string
}

export interface BookingPayload {
  room_id: string
  client_id: string
  client_type: ClientType
  check_in: string   // ISO timestamp
  check_out: string  // ISO timestamp
  guests: number
  special_requests?: string
}

export interface BookingUpdatePayload {
  check_in?: string
  check_out?: string
  guests?: number
  special_requests?: string
  room_id?: string
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

export interface CorporateGuestBooking {
  booking_id: string
  booking_number: string
  client_name: string
  room_name: string
  check_in: string
  check_out: string
  guests: number
  status: string
}

export interface CorporateBookingDetail {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  company_reg_number?: string
  industry?: string
  status: string
  documents: string[]
  guests: CorporateGuestBooking[]
}
