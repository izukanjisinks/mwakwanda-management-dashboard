import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bookingApi } from '@/services/api/bookings'
import { getApiError } from '@/utils/errors'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { Booking, BookingStatus } from '@/types/booking'

export const useBookingsStore = defineStore('bookings', () => {
  const bookings = ref<Booking[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBookings(
    page = 1,
    pageSize = 10,
    bookerType?: string,
    status?: string,
    bookingType?: string,
  ) {
    const branchFilter = useBranchFilterStore()
    loading.value = true
    error.value = null
    try {
      const res = await bookingApi.list({
        page,
        page_size: pageSize,
        booker_type: bookerType,
        booking_type: bookingType,
        status,
        branch_id: branchFilter.apiBranchId,
      })
      bookings.value = res.data ?? []
      total.value = res.total
    } catch (err) {
      error.value = getApiError(err, 'Failed to load bookings.')
    } finally {
      loading.value = false
    }
  }

  // Event bookings are corporate bookings of type 'event'. The specific kind
  // (conference, gala, wedding, …) lives in event_type on the venue reservation.
  async function fetchEventBookings(page = 1, pageSize = 10, status?: string) {
    const branchFilter = useBranchFilterStore()
    loading.value = true
    error.value = null
    try {
      const res = await bookingApi.list({
        page, page_size: pageSize, booking_type: 'event', status, branch_id: branchFilter.apiBranchId,
      })
      bookings.value = res.data ?? []
      total.value = res.total
    } catch (err) {
      error.value = getApiError(err, 'Failed to load event bookings.')
    } finally {
      loading.value = false
    }
  }

  async function updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const updated = await bookingApi.updateStatus(id, { status })
    const idx = bookings.value.findIndex(b => b.id === id)
    if (idx !== -1) bookings.value[idx] = updated
    return updated
  }

  async function deleteBooking(id: string): Promise<void> {
    await bookingApi.delete(id)
    bookings.value = bookings.value.filter(b => b.id !== id)
    total.value--
  }

  return { bookings, total, loading, error, fetchBookings, fetchEventBookings, updateStatus, deleteBooking }
})
