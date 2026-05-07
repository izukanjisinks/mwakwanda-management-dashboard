export interface OverstayedPayload {
  booking_number: string
  room_name: string
  client_name: string
  original_check_out: string
  extended_to: string
}

export interface OrdersClosedPayload {
  orders_closed: number
  closed_at: string
}

export interface AuditLog {
  id: string
  org_id: string
  actor_type: string
  actor_name: string
  action: 'booking.overstayed' | 'orders.closed' | string
  entity_type: string
  entity_id: string
  payload: OverstayedPayload | OrdersClosedPayload | Record<string, unknown>
  created_at: string
}

export interface PaginatedAuditLogs {
  data: AuditLog[]
  page: number
  page_size: number
  total: number
}
