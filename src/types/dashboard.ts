// Always-loaded top 3 stat cards.
export interface DashboardSummary {
  new_bookings_this_month: number
  checkins_today: number
  checkouts_today: number
}

export interface DashboardRevenuePoint {
  month: string   // "2026-01"
  revenue: number
}

export interface DashboardReservationsBreakdown {
  booked: number
  pending: number
  cancelled: number
}

export interface DashboardRecentBooking {
  id: string
  booking_number: string
  client_name: string
  booker_type: 'individual' | 'corporate'
  room_name: string
  room_type: string
  venue_name?: string
  check_in: string
  check_out: string
  status: string
}

// GET /dashboard/bookings — the Bookings tab (default).
export interface DashboardBookings {
  overstaying_guests: number
  pending_approvals: number
  revenue_by_month: DashboardRevenuePoint[]
  reservations_breakdown: DashboardReservationsBreakdown
  recent_bookings: DashboardRecentBooking[]
}

export interface DashboardOrderVolumePoint {
  day: string // "Mon", "Tue", ...
  kitchen: number
  bar: number
}

export interface DashboardOrdersByStation {
  kitchen: number
  bar: number
  bakery: number
  grill: number
}

export interface DashboardRecentOrder {
  id: string
  order_number: string
  guest: string
  station: 'kitchen' | 'bar'
  items: number
  status: 'new' | 'preparing' | 'ready'
  minutes_ago: number
}

// GET /dashboard/orders — the Orders tab.
export interface DashboardOrders {
  kitchen_backlog: number
  bar_backlog: number
  volume_by_day: DashboardOrderVolumePoint[]
  by_station: DashboardOrdersByStation
  recent_orders: DashboardRecentOrder[]
}

export interface DashboardBilledVsCollectedPoint {
  month: string // "2026-01"
  billed: number
  collected: number
}

export interface DashboardInvoicesByStatus {
  paid: number
  issued: number
  overdue: number
  draft: number
  cancelled: number
}

export interface DashboardOutstandingInvoice {
  id: string
  invoice_number: string
  client: string
  amount: number
  due_date: string
  status: 'issued' | 'overdue'
}

// GET /dashboard/invoices — the Invoices tab.
export interface DashboardInvoices {
  overdue_count: number
  overdue_amount: number
  draft_count: number
  issued_count: number
  billed_vs_collected: DashboardBilledVsCollectedPoint[]
  by_status: DashboardInvoicesByStatus
  outstanding_invoices: DashboardOutstandingInvoice[]
}
