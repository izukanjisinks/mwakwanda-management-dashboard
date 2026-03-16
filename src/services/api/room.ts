import { apiClient } from './client'
import type { Room, RoomPayload } from '@/types/room'

export const roomApi = {
  list: () => apiClient.get<Room[]>('/rooms'),
  get: (id: number) => apiClient.get<Room>(`/rooms/${id}`),
  create: (payload: RoomPayload) => apiClient.post<Room>('/rooms', payload),
  update: (id: number, payload: Partial<RoomPayload>) => apiClient.put<Room>(`/rooms/${id}`, payload),
  delete: (id: number) => apiClient.delete<void>(`/rooms/${id}`),
}
