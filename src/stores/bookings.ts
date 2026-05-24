import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bookingApi } from '@/services/api/bookings'
import { getApiError } from '@/utils/errors'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { Booking, BookingPayload, BookingUpdatePayload, BookingStatus } from '@/types/booking'

export const useBookingsStore = defineStore('bookings', () => {
  const bookings = ref<Booking[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchBookings(page = 1, pageSize = 10, status?: string, overstayed?: boolean, from?: string, to?: string, corporateClientId?: string) {
    const branchFilter = useBranchFilterStore()
    loading.value = true
    error.value = null
    try {
      const res = await bookingApi.list({ page, page_size: pageSize, status, overstayed, from, to, corporate_client_id: corporateClientId, branch_id: branchFilter.selectedBranchId ?? undefined })
      bookings.value = res.data ?? []
      total.value = res.total
    } catch (err) {
      error.value = getApiError(err, 'Failed to load bookings.')
    } finally {
      loading.value = false
    }
  }

  async function createBooking(payload: BookingPayload): Promise<Booking> {
    const booking = await bookingApi.create(payload)
    bookings.value.unshift(booking)
    total.value++
    return booking
  }

  async function updateBooking(id: string, payload: BookingUpdatePayload): Promise<Booking> {
    const updated = await bookingApi.update(id, payload)
    const idx = bookings.value.findIndex(b => b.id === id)
    if (idx !== -1) bookings.value[idx] = updated
    return updated
  }

  async function updateStatus(id: string, status: BookingStatus): Promise<Booking> {
    const updated = await bookingApi.updateStatus(id, { status })
    const idx = bookings.value.findIndex(b => b.id === id)
    if (idx !== -1) bookings.value[idx] = updated
    return updated
  }

  async function clearOverstayed(id: string): Promise<void> {
    const updated = await bookingApi.clearOverstayed(id)
    const idx = bookings.value.findIndex(b => b.id === id)
    if (idx !== -1) bookings.value[idx] = updated
  }

  async function deleteBooking(id: string): Promise<void> {
    await bookingApi.delete(id)
    bookings.value = bookings.value.filter(b => b.id !== id)
    total.value--
  }

  return { bookings, total, loading, error, fetchBookings, createBooking, updateBooking, updateStatus, clearOverstayed, deleteBooking }
})
