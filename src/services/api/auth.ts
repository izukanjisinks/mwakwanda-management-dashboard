import { apiClient } from './client'
import type { LoginCredentials, LoginResult, AuthUser } from '@/types/auth'

export const authApi = {
  login(credentials: LoginCredentials): Promise<LoginResult> {
    return apiClient.post<LoginResult>('/auth/login', credentials, false)
  },

  me(): Promise<AuthUser> {
    return apiClient.get<AuthUser>('/auth/me')
  },

  logout(): Promise<void> {
    return apiClient.post<void>('/auth/logout')
  },
}
