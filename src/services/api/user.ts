import { apiClient } from './client'
import type { SystemUser, UsersResponse, CreateUserPayload, UpdateUserPayload } from '@/types/user'

export const userApi = {
  async getUsers(): Promise<UsersResponse> {
    return apiClient.get<UsersResponse>('/users')
  },

  async createUser(payload: CreateUserPayload): Promise<SystemUser> {
    return apiClient.post<SystemUser>('/users', payload)
  },

  async updateUser(userId: string, payload: UpdateUserPayload): Promise<SystemUser> {
    return apiClient.put<SystemUser>(`/users/${userId}`, payload)
  },

  async deleteUser(userId: string): Promise<void> {
    return apiClient.delete(`/users/${userId}`)
  },

  async changeRole(userId: string, roleId: string): Promise<SystemUser> {
    return apiClient.patch<SystemUser>(`/users/${userId}/role`, { role_id: roleId })
  },

  async resetPassword(userId: string): Promise<void> {
    return apiClient.post(`/auth/reset-password`, {
      "user_id": userId,
    })
  },
}
