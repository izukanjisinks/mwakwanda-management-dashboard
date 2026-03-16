import { apiClient } from './client'
import type { LoginCredentials, LoginResponse, AuthUser } from '@/types/auth'

export const authApi = {
  login(credentials: LoginCredentials): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', credentials, false)
  },

  me(): Promise<AuthUser> {
    return apiClient.get<AuthUser>('/auth/me')
  },

  logout(): Promise<void> {
    return apiClient.post<void>('/auth/logout')
  },
}
