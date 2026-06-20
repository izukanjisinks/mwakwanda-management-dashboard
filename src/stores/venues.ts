import { defineStore } from 'pinia'
import { ref } from 'vue'
import { venueApi } from '@/services/api/venue'
import { getApiError } from '@/utils/errors'
import { uploadVenueImage, deleteVenueImage, deleteAllVenueImages } from '@/services/storage'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { Venue, VenuePayload } from '@/types/venue'

export const useVenuesStore = defineStore('venues', () => {
  const venues = ref<Venue[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchVenues(page = 1, pageSize = 20) {
    const branchFilter = useBranchFilterStore()
    loading.value = true
    error.value = null
    try {
      const res = await venueApi.list({ page, page_size: pageSize, branch_id: branchFilter.apiBranchId })
      venues.value = res.data ?? []
      total.value = res.total
    } catch (err) {
      error.value = getApiError(err, 'Failed to load venues.')
    } finally {
      loading.value = false
    }
  }

  async function createVenue(payload: VenuePayload): Promise<Venue> {
    const venue = await venueApi.create(payload)
    venues.value.push(venue)
    total.value++
    return venue
  }

  async function updateVenue(id: string, payload: Partial<VenuePayload>): Promise<Venue> {
    const updated = await venueApi.update(id, payload)
    const idx = venues.value.findIndex(v => v.id === id)
    if (idx !== -1) venues.value[idx] = updated
    return updated
  }

  async function setAvailability(id: string, is_available: boolean): Promise<void> {
    await venueApi.setAvailability(id, is_available)
    const idx = venues.value.findIndex(v => v.id === id)
    if (idx !== -1) venues.value[idx]!.is_available = is_available
  }

  async function uploadImages(id: string, files: File[], existingUrls: string[] = []): Promise<Venue> {
    const originalUrls = venues.value.find(v => v.id === id)?.images ?? []
    const removedUrls = originalUrls.filter(u => !existingUrls.includes(u))
    await Promise.all(removedUrls.map(u => deleteVenueImage(u)))
    const newUrls = await Promise.all(files.map(f => uploadVenueImage(id, f)))
    const payload = [...existingUrls, ...newUrls]
    const updated = await venueApi.uploadImages(id, payload)
    const idx = venues.value.findIndex(v => v.id === id)
    if (idx !== -1) venues.value[idx] = updated
    return updated
  }

  async function deleteVenue(id: string): Promise<void> {
    const venue = venues.value.find(v => v.id === id)
    await venueApi.delete(id)
    if (venue?.images?.length) await deleteAllVenueImages(venue.images)
    venues.value = venues.value.filter(v => v.id !== id)
    total.value--
  }

  return { venues, total, loading, error, fetchVenues, createVenue, updateVenue, setAvailability, uploadImages, deleteVenue }
})
