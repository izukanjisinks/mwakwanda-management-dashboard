import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bookingApi } from '@/services/api/bookings'
import type { Booking, BookingPayload, BookingStatus } from '@/types/booking'

export const useBookingsStore = defineStore('bookings', () => {
  const bookings = ref<Booking[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBookings() {
    loading.value = true
    error.value = null
    try {
      bookings.value = await bookingApi.list()
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load bookings.'
      if (import.meta.env.DEV && bookings.value.length === 0) {
        bookings.value = DEV_MOCK_BOOKINGS
      }
    } finally {
      loading.value = false
    }
  }

  async function createBooking(payload: BookingPayload): Promise<Booking> {
    const booking = await bookingApi.create(payload)
    bookings.value.unshift(booking)
    return booking
  }

  async function updateStatus(id: number, status: BookingStatus): Promise<Booking> {
    const updated = await bookingApi.updateStatus(id, { status })
    const idx = bookings.value.findIndex(b => b.id === id)
    if (idx !== -1) bookings.value[idx] = updated
    return updated
  }

  async function updateBooking(id: number, payload: Partial<BookingPayload>): Promise<Booking> {
    const updated = await bookingApi.update(id, payload)
    const idx = bookings.value.findIndex(b => b.id === id)
    if (idx !== -1) bookings.value[idx] = updated
    return updated
  }

  async function deleteBooking(id: number): Promise<void> {
    await bookingApi.delete(id)
    bookings.value = bookings.value.filter(b => b.id !== id)
  }

  return { bookings, loading, error, fetchBookings, createBooking, updateStatus, updateBooking, deleteBooking }
})

// Dev mock data
const DEV_MOCK_BOOKINGS: Booking[] = [
  {
    id: 1,
    room_id: 3, room_name: 'Room 303',
    client_id: 1, client_name: 'John Mwale', client_type: 'individual',
    check_in: '2026-03-18', check_out: '2026-03-21',
    guests: 2, status: 'confirmed',
    special_requests: 'Late check-in after 10 PM',
    meal_plan_id: 2, meal_plan_name: 'Half Board',
    meal_cost: 2100, room_cost: 7500, total_amount: 9600,
    created_at: '2026-03-10T09:00:00Z',
  },
  {
    id: 2,
    room_id: 1, room_name: 'Room 101',
    client_id: 3, client_name: 'David Banda', client_type: 'individual',
    check_in: '2026-03-17', check_out: '2026-03-19',
    guests: 1, status: 'checked_in',
    meal_plan_id: 1, meal_plan_name: 'Bed & Breakfast',
    meal_cost: 300, room_cost: 1700, total_amount: 2000,
    created_at: '2026-03-12T11:30:00Z',
  },
  {
    id: 3,
    room_id: 7, room_name: 'Conference A',
    client_id: 1, client_name: 'Zambia National Bank', client_type: 'corporate',
    check_in: '2026-03-20', check_out: '2026-03-21',
    guests: 15, status: 'confirmed',
    special_requests: 'Projector setup and catering for 15 people',
    meal_plan_id: 3, meal_plan_name: 'Full Board',
    meal_cost: 8250, room_cost: 5000, total_amount: 13250,
    created_at: '2026-03-14T08:00:00Z',
  },
  {
    id: 4,
    room_id: 5, room_name: 'Cabin 07',
    client_id: 6, client_name: 'Pierre Dubois', client_type: 'individual',
    check_in: '2026-03-25', check_out: '2026-03-30',
    guests: 4, status: 'pending',
    meal_plan_id: null, meal_plan_name: null,
    meal_cost: 0, room_cost: 16000, total_amount: 16000,
    created_at: '2026-03-15T14:00:00Z',
  },
  {
    id: 5,
    room_id: 2, room_name: 'Room 202',
    client_id: 2, client_name: 'Sarah Johnson', client_type: 'individual',
    check_in: '2026-03-10', check_out: '2026-03-14',
    guests: 2, status: 'checked_out',
    meal_plan_id: 1, meal_plan_name: 'Bed & Breakfast',
    meal_cost: 1200, room_cost: 4800, total_amount: 6000,
    created_at: '2026-03-05T10:00:00Z',
  },
  {
    id: 6,
    room_id: 8, room_name: 'Room 401',
    client_id: 3, client_name: 'Safari Tours International', client_type: 'corporate',
    check_in: '2026-04-01', check_out: '2026-04-03',
    guests: 3, status: 'confirmed',
    meal_plan_id: 2, meal_plan_name: 'Half Board',
    meal_cost: 2100, room_cost: 5600, total_amount: 7700,
    created_at: '2026-03-16T09:30:00Z',
  },
  {
    id: 7,
    room_id: 6, room_name: 'Room 210',
    client_id: 5, client_name: 'Mutale Chanda', client_type: 'individual',
    check_in: '2026-03-15', check_out: '2026-03-16',
    guests: 1, status: 'cancelled',
    meal_plan_id: null, meal_plan_name: null,
    meal_cost: 0, room_cost: 850, total_amount: 850,
    created_at: '2026-03-13T16:00:00Z',
  },
]
