import { apiClient } from './client'
import type { SystemUser, SystemUserPayload, PaginatedUsers } from '@/types/user'

export interface UserListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  search?: string
  is_active?: boolean
}

export const usersApi = {
  list: (params?: UserListParams) =>
    apiClient.get<PaginatedUsers>('/users', { params }),

  get: (id: string) =>
    apiClient.get<SystemUser>(`/users/${id}`),

  create: (payload: SystemUserPayload) =>
    apiClient.post<SystemUser>('/users', {
      full_name: payload.full_name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      status: payload.status,
    }),

  update: (id: string, payload: Partial<SystemUserPayload>) =>
    apiClient.put<SystemUser>(`/users/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<void>(`/users/${id}`),

  lock: (id: string) =>
    apiClient.post<void>(`/users/${id}/lock`, {}),

  unlock: (id: string) =>
    apiClient.post<void>(`/users/${id}/unlock`, {}),
}
