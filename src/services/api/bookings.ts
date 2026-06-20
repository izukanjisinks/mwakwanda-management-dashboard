import { apiClient } from './client'
import type {
  Booking, BookingStatusUpdate, PaginatedBookings,
  BookingRoomAssignment, BookingAttendee, CreateIndividualBookingPayload,
} from '@/types/booking'

export interface BookingListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  status?: string
  booker_type?: string
  booking_type?: string
  branch_id?: string
}

export const bookingApi = {
  list: (params?: BookingListParams) =>
    apiClient.get<PaginatedBookings>('/bookings', { params }),

  get: (id: string) =>
    apiClient.get<Booking>(`/bookings/${id}`),

  createIndividual: (payload: CreateIndividualBookingPayload) =>
    apiClient.post<Booking>('/bookings/individual', payload),

  updateStatus: (id: string, payload: BookingStatusUpdate) =>
    apiClient.put<Booking>(`/bookings/${id}/status`, payload),

  checkIn: (id: string) =>
    apiClient.put<Booking>(`/bookings/${id}/checkin`),

  checkOut: (id: string) =>
    apiClient.put<Booking>(`/bookings/${id}/checkout`),

  delete: (id: string) =>
    apiClient.delete<void>(`/bookings/${id}`),

  // ── Room assignments ──────────────────────────────────────────────────────
  listAssignments: (bookingId: string) =>
    apiClient.get<BookingRoomAssignment[]>(`/bookings/${bookingId}/assignments`),

  checkInAssignment: (bookingId: string, assignId: string) =>
    apiClient.put<BookingRoomAssignment>(`/bookings/${bookingId}/assignments/${assignId}/checkin`),

  checkOutAssignment: (bookingId: string, assignId: string) =>
    apiClient.put<BookingRoomAssignment>(`/bookings/${bookingId}/assignments/${assignId}/checkout`),

  // ── Attendees ─────────────────────────────────────────────────────────────
  listAttendees: (bookingId: string) =>
    apiClient.get<BookingAttendee[]>(`/bookings/${bookingId}/attendees`),
}
