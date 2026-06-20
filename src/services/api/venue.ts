import { apiClient } from './client'
import type { Venue, VenuePayload, PaginatedVenues } from '@/types/venue'

export interface VenueListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  venue_type?: string
  is_available?: boolean
  branch_id?: string
}

export const venueApi = {
  list: (params?: VenueListParams) =>
    apiClient.get<PaginatedVenues>('/venues', { params }).then(r => r),

  get: (id: string) =>
    apiClient.get<Venue>(`/venues/${id}`),

  create: (payload: VenuePayload) =>
    apiClient.post<Venue>('/venues', payload),

  update: (id: string, payload: Partial<VenuePayload>) =>
    apiClient.put<Venue>(`/venues/${id}`, payload),

  setAvailability: (id: string, is_available: boolean) =>
    apiClient.patch<{ id: string; is_available: boolean }>(`/venues/${id}/availability`, { is_available }),

  uploadImages: (id: string, images: string[]) =>
    apiClient.put<Venue>(`/venues/${id}/images`, { images }),

  delete: (id: string) =>
    apiClient.delete<void>(`/venues/${id}`),
}
