import { apiClient } from './client'
import { downloadFile } from './download'
import type {
  Booking, BookingStatusUpdate, PaginatedBookings,
  BookingRoomAssignment, BookingAttendee, CreateIndividualBookingPayload,
  CreateIndividualEventBookingPayload, CreateIndividualMealBookingPayload,
  WalkInMealBookingPayload, WalkInEventBookingPayload, WalkInAccommodationBookingPayload,
  WalkInIndividualAccommodationPayload, PostBookingChargePayload,
} from '@/types/booking'
import type { Invoice } from '@/types/invoice'

export interface BookingListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  status?: string
  booker_type?: string
  booking_type?: string
  branch_id?: string
  attendant_email?: string
  attendant_name?: string
}

// Filters for a CSV export — same shape as the list, minus pagination.
export interface BookingExportParams {
  booker_type?: string
  booking_type?: string
  status?: string
  branch_id?: string
  from?: string   // YYYY-MM-DD
  to?: string     // YYYY-MM-DD
}

export const bookingApi = {
  list: (params?: BookingListParams) =>
    apiClient.get<PaginatedBookings>('/bookings', { params }),

  // Streams a CSV download (columns vary by booker/booking type). Bypasses the
  // JSON apiClient since the response is a file, not JSON.
  exportCsv: (params: BookingExportParams = {}) =>
    downloadFile('/bookings', { ...params, format: 'csv' }),

  get: (id: string) =>
    apiClient.get<Booking>(`/bookings/${id}`),

  createIndividual: (payload: CreateIndividualBookingPayload) =>
    apiClient.post<Booking>('/bookings/individual', payload),

  createIndividualEvent: (payload: CreateIndividualEventBookingPayload) =>
    apiClient.post<Booking>('/bookings/individual/event', payload),

  createIndividualMeal: (payload: CreateIndividualMealBookingPayload) =>
    apiClient.post<Booking>('/bookings/individual/meal', payload),

  // Walk-in / staff bookings — full envelope, confirmed immediately (no approval).
  // Handles both individual and corporate via booking_context in the payload.
  createMeal: (payload: WalkInMealBookingPayload) =>
    apiClient.post<Booking>('/bookings/meal', payload),

  createEvent: (payload: WalkInEventBookingPayload) =>
    apiClient.post<Booking>('/bookings/event', payload),

  // Accommodation walk-in — one room per guest. Corporate sends assignments;
  // individual sends accommodation.rooms. The server branches on booking_context.
  createAccommodation: (payload: WalkInAccommodationBookingPayload | WalkInIndividualAccommodationPayload) =>
    apiClient.post<Booking>('/bookings/accommodation', payload),

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

  // ── Charges ──────────────────────────────────────────────────────────────
  // General-purpose "post a line item to this booking's invoice" primitive.
  // Used internally by resident meal collection's /collect endpoint; also
  // usable directly for future manual-charge UIs.
  postCharge: (bookingId: string, payload: PostBookingChargePayload) =>
    apiClient.post<Invoice>(`/bookings/${bookingId}/charges`, payload),
}
