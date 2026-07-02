import { apiClient } from './client'
import type { CorporateBookingRequest, IndividualBookingRequest } from '@/types/booking'

export interface BookingRequestListParams extends Record<string, string | number | undefined> {
  page?: number
  page_size?: number
  status?: string
  type?: string
}

export interface PaginatedBookingRequests {
  data: CorporateBookingRequest[]
  page: number
  page_size: number
  total: number
}

export interface MaterialiseAssignment {
  guest_index: number
  room_id: string
  room_name?: string
  room_type?: string
}

export interface MaterialiseEventSession {
  session_index: number
  venue_id: string
  venue_name?: string
  event_date?: string
  start_time?: string
  end_time?: string
}

export const bookingRequestApi = {
  // Corporate
  list: (params?: BookingRequestListParams) =>
    apiClient.get<PaginatedBookingRequests>('/booking-requests', { params }),

  get: (id: string) =>
    apiClient.get<CorporateBookingRequest>(`/booking-requests/${id}`),

  approve: (id: string) =>
    apiClient.put<void>(`/booking-requests/${id}/approve`),

  reject: (id: string) =>
    apiClient.put<void>(`/booking-requests/${id}/reject`),

  cancel: (id: string) =>
    apiClient.put<void>(`/booking-requests/${id}/cancel`),

  materialise: (requestId: string, assignments: MaterialiseAssignment[]) =>
    apiClient.post<import('@/types/booking').Booking>(
      `/booking-requests/${requestId}/materialise`,
      { assignments },
    ),

  materialiseEvent: (requestId: string, sessions: MaterialiseEventSession[]) =>
    apiClient.post<import('@/types/booking').Booking>(
      `/booking-requests/${requestId}/materialise-event`,
      { sessions },
    ),

  materialiseIndividualEvent: (requestId: string, sessions: MaterialiseEventSession[]) =>
    apiClient.post<import('@/types/booking').Booking>(
      `/booking-requests/individual/${requestId}/materialise-event`,
      { sessions },
    ),

  // Individual
  getIndividual: (id: string) =>
    apiClient.get<IndividualBookingRequest>(`/booking-requests/individual/${id}`),

  approveIndividual: (
    id: string,
    body?: {
      assignments?: Array<{
        attendant_idx: number
        room_id: string
        room_name?: string
        check_in?: string
        check_out?: string
      }>
    },
  ) =>
    apiClient.put<import('@/types/booking').Booking>(`/booking-requests/individual/${id}/approve`, body ?? {}),

  rejectIndividual: (id: string) =>
    apiClient.put<void>(`/booking-requests/individual/${id}/reject`),

  cancelIndividual: (id: string) =>
    apiClient.put<void>(`/booking-requests/individual/${id}/cancel`),
}
