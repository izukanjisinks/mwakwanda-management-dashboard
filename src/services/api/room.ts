import { apiClient } from './client'
import type { Room, RoomPayload, PaginatedRooms } from '@/types/room'

export interface RoomListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  type?: string
  is_available?: boolean
}

export interface AvailableRoomsParams extends Record<string, string | number | boolean | undefined> {
  check_in: string   // YYYY-MM-DD
  check_out: string  // YYYY-MM-DD
  type?: string
}

export const roomApi = {
  list: (params?: RoomListParams) =>
    apiClient.get<PaginatedRooms>('/rooms', { params }).then(r => r),

  listAvailable: (params: AvailableRoomsParams) =>
    apiClient.get<Room[]>('/rooms/available', { params }),

  get: (id: string) =>
    apiClient.get<Room>(`/rooms/${id}`),

  create: (payload: RoomPayload) =>
    apiClient.post<Room>('/rooms', payload),

  update: (id: string, payload: Partial<RoomPayload>) =>
    apiClient.put<Room>(`/rooms/${id}`, payload),

  setAvailability: (id: string, is_available: boolean) =>
    apiClient.patch<{ id: string; is_available: boolean }>(`/rooms/${id}/availability`, { is_available }),

  uploadImages: (id: string, images: string[]) =>
    apiClient.put<Room>(`/rooms/${id}/images`, { images }),

  delete: (id: string) =>
    apiClient.delete<void>(`/rooms/${id}`),
}
