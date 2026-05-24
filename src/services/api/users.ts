import { apiClient } from './client'
import type { SystemUser, SystemUserPayload, PaginatedUsers } from '@/types/user'

export interface Role {
  id: string
  name: string
  display_name?: string
}

export const rolesApi = {
  list: () => apiClient.get<Role[]>('/roles'),
}

export interface UserListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  search?: string
  is_active?: boolean
  branch_id?: string
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
      ...(payload.branch_id ? { branch_id: payload.branch_id } : {}),
    }),

  update: (id: string, payload: Partial<SystemUserPayload>) =>
    apiClient.put<SystemUser>(`/users/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<void>(`/users/${id}`),

  changeRole: (id: string, roleId: string) =>
    apiClient.post<SystemUser>(`/admin/users/${id}/role`, { role_id: roleId }),

  lock: (id: string) =>
    apiClient.post<void>(`/users/${id}/lock`, {}),

  unlock: (id: string) =>
    apiClient.post<void>(`/users/${id}/unlock`, {}),
}
