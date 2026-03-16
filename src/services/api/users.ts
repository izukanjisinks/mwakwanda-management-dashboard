import { apiClient } from './client'
import type { SystemUser, SystemUserPayload } from '@/types/user'

export const usersApi = {
  list: () => apiClient.get<SystemUser[]>('/users'),
  get: (id: string) => apiClient.get<SystemUser>(`/users/${id}`),
  create: (payload: SystemUserPayload) => apiClient.post<SystemUser>('/users', payload),
  update: (id: string, payload: Partial<SystemUserPayload>) => apiClient.put<SystemUser>(`/users/${id}`, payload),
  delete: (id: string) => apiClient.delete<void>(`/users/${id}`),
}
