import { apiClient } from './client'
import type { Booking, BookingPayload, BookingUpdatePayload, BookingStatusUpdate, PaginatedBookings } from '@/types/booking'

export interface BookingListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  status?: string
  client_type?: string
  client_id?: string
  overstayed?: boolean
  from?: string
  to?: string
}

export const bookingApi = {
  list: (params?: BookingListParams) =>
    apiClient.get<PaginatedBookings>('/bookings', { params }),

  get: (id: string) =>
    apiClient.get<Booking>(`/bookings/${id}`),

  create: (payload: BookingPayload) =>
    apiClient.post<Booking>('/bookings', payload),

  update: (id: string, payload: BookingUpdatePayload) =>
    apiClient.put<Booking>(`/bookings/${id}`, payload),

  updateStatus: (id: string, payload: BookingStatusUpdate) =>
    apiClient.patch<Booking>(`/bookings/${id}/status`, payload),

  clearOverstayed: (id: string) =>
    apiClient.patch<Booking>(`/bookings/${id}/clear-overstayed`),

  delete: (id: string) =>
    apiClient.delete<void>(`/bookings/${id}`),
}
