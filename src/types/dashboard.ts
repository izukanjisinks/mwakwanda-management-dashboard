export interface DashboardStatCards {
  new_bookings_this_month: number
  checkins_today: number
  checkouts_today: number
}

export interface DashboardRoomSummary {
  occupied: number
  reserved: number
  available: number
  not_ready: number
}

export interface DashboardRevenuePoint {
  month: string   // "2026-01"
  revenue: number
}

export interface DashboardReservationPoint {
  day: string     // "2026-03-13"
  booked: number
  cancelled: number
}

export interface DashboardRecentBooking {
  id: string
  booking_number: string
  client_name: string
  booker_type: 'individual' | 'corporate'
  room_name: string
  room_type: string
  check_in: string
  check_out: string
  status: string
}

export interface DashboardStats {
  stat_cards: DashboardStatCards
  room_summary: DashboardRoomSummary
  revenue_by_month: DashboardRevenuePoint[]
  reservations_by_day: DashboardReservationPoint[]
  recent_bookings: DashboardRecentBooking[]
}
