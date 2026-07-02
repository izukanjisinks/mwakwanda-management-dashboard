export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'

export type ClientType = 'individual' | 'corporate'

export interface BookingRoomAssignment {
  id: string
  booking_id: string
  room_id: string
  attendee_id?: string
  check_in: string  // booked check-in date
  check_out: string // booked check-out date
  status: string
  checked_in_at?: string  // actual check-in timestamp (null until checked in)
  checked_out_at?: string // actual check-out timestamp (null until checked out)
  room_name?: string
  attendee_name?: string
  nights?: number
  room_cost?: number
  created_at: string
  updated_at: string
}

export interface BookingAttendee {
  id: string
  booking_id: string
  corporate_guest_id?: string
  full_name: string
  email?: string
  phone?: string
  identification_card?: string
  dietary_notes?: string
  special_needs?: string
  is_lead_contact: boolean
  room_assignment?: BookingRoomAssignment
  created_at: string
}

export interface BookingMetadata {
  booked_by?: CorBookingPerson
  approver?: CorBookingPerson
  company?: CorBookingCompany
  accommodation?: CorBookingAccommodation
  attendants?: CorBookingAttendant[]
}

export interface Booking {
  id: string
  booking_number: string
  org_id: string
  branch_id?: string
  booking_type: string
  booker_type: string
  booker_name: string
  booker_email?: string
  booker_phone?: string
  web_user_id?: string
  cor_profile_id?: string
  company_id?: string
  request_id?: string
  total_amount: number
  status: BookingStatus
  special_requests?: string
  overstayed: boolean
  venue_id?: string
  venue_name?: string
  company_name?: string
  profile_name?: string
  branch_name?: string
  metadata?: BookingMetadata
  attendees?: BookingAttendee[]
  assignments?: BookingRoomAssignment[]
  events?: BookingEvent[]
  created_at: string
  updated_at: string
}

// A venue reservation behind a conference/event booking.
export interface BookingEvent {
  id: string
  booking_id: string
  venue_id?: string
  event_type: string
  start_date: string
  end_date: string
  start_time?: string
  end_time?: string
  pax_count: number
  price: number
  catering_required: boolean
  notes?: string
  venue_name?: string
  days?: number
  created_at: string
  updated_at: string
}

// Walk-in booking created by staff — POST /api/v1/bookings/individual
export interface CreateIndividualBookingPayload {
  booker_name: string
  booker_email?: string
  booker_phone?: string
  identification_card?: string
  room_id: string
  check_in: string   // YYYY-MM-DD
  check_out: string  // YYYY-MM-DD
  special_requests?: string
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

// ── Individual booking request ───────────────────────────────────────────────

export interface IndividualBookingRequest {
  id: string
  org_id: string
  web_user_id?: string
  booker_name: string
  booker_email?: string
  booker_phone?: string
  booking_type: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  notes?: string
  documents?: string[]
  // Unified envelope from accommodationBooking.js. Legacy flat fields
  // (room_id/check_in at top level) are kept optional for old requests.
  payload?: {
    room_id?: string
    check_in?: string
    check_out?: string
    special_requests?: string
    booked_by?: { name?: string; email?: string; phone?: string }
    participant_mode?: string
    attendants?: Array<{
      full_name?: string
      email?: string
      phone?: string
      id_number?: string
      is_lead_contact?: boolean
    }>
    accommodation?: {
      check_in?: string
      check_out?: string
      notes?: string
      rooms?: Array<{
        room_id: string
        room_name?: string
        room_type?: string
        rate_per_night?: number
        attendant_idx?: number
        slot_index?: number
      }>
    }
  }
  room_name?: string
  created_at: string
  updated_at: string
}

// ── Corporate booking request (new implementation) ───────────────────────────

export interface CorBookingGuest {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  identification_card?: string
  check_in?: string
  check_out?: string
  room_type?: string
}

export interface CorBookingAuthoriser {
  name?: string
  email?: string
  phone?: string
  title?: string
  department?: string
  gl_code?: string
}

export interface CorBookingCompany {
  name?: string
  tpin?: string
  email?: string
  phone?: string
  gl_code?: string
  industry?: string
  branch_name?: string
  cost_center?: string
  department_name?: string
  cost_center_type?: string
}

export interface CorBookingPerson {
  name?: string
  email?: string
  phone?: string
  title?: string
  job_title?: string
  man_number?: string
}

export interface CorBookingAttendant {
  full_name?: string
  email?: string
  phone?: string
  id_number?: string
  is_lead_contact?: boolean
}

export interface CorBookingAccommodation {
  check_in?: string
  check_out?: string
  room_count?: number
  room_type_preference?: string
  rooms?: Array<{
    room_id: string
    room_name?: string
    room_type?: string
    rate_per_night?: number
    attendant_idx?: number
    slot_index?: number
  }>
}

export interface CorporateBookingPayload {
  org_id?: string
  source?: string
  currency?: string
  booking_type?: string
  booking_context?: string
  participant_mode?: string
  participant_count?: number
  branch_id?: string
  documents?: string[]
  company?: CorBookingCompany
  approver?: CorBookingPerson
  booked_by?: CorBookingPerson
  attendants?: CorBookingAttendant[]
  accommodation?: CorBookingAccommodation
  guests?: Array<Record<string, string>>
  // event / meals / conference sub-objects remain unstructured
  [key: string]: unknown
}

export interface CorporateBookingRequest {
  id: string
  org_id: string
  branch_id?: string
  cor_profile_id?: string
  company_id?: string
  booking_type: 'accommodation' | 'meals' | 'conference' | 'event'
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reason_for_booking?: string
  notes?: string
  authoriser_name?: string
  authoriser_email?: string
  authoriser_phone?: string
  authoriser_title?: string
  authoriser_department?: string
  authoriser_gl_code?: string
  documents?: string[]
  payload?: CorporateBookingPayload
  company_name?: string
  branch_name?: string
  profile_name?: string
  meals_summary?: MealsRequestSummary
  created_at: string
  updated_at: string
}

// Price-resolved view of a meals request — menu_item_ids in the payload resolved to
// their current name + price, with per-line/per-guest/grand totals for display.
export interface MealsSummaryItem {
  menu_item_id: string
  name: string
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
}

export interface MealsSummaryGuest {
  name: string
  identification_card?: string
  items: MealsSummaryItem[]
  subtotal: number
}

export interface MealsRequestSummary {
  from?: string
  to?: string
  headcount?: number
  dietary_notes?: string
  guests?: MealsSummaryGuest[]
  buffet_items?: MealsSummaryItem[]
  estimated_total: number
}
