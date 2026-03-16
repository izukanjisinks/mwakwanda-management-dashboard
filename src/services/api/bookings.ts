import { apiClient } from './client'
import type { Booking, BookingPayload, BookingStatusUpdate } from '@/types/booking'

export const bookingApi = {
  list: () => apiClient.get<Booking[]>('/bookings'),
  get: (id: number) => apiClient.get<Booking>(`/bookings/${id}`),
  create: (payload: BookingPayload) => apiClient.post<Booking>('/bookings', payload),
  updateStatus: (id: number, payload: BookingStatusUpdate) => apiClient.put<Booking>(`/bookings/${id}/status`, payload),
  update: (id: number, payload: Partial<BookingPayload>) => apiClient.put<Booking>(`/bookings/${id}`, payload),
  delete: (id: number) => apiClient.delete<void>(`/bookings/${id}`),
  myBookings: () => apiClient.get<Booking[]>('/bookings/mine'),
}
