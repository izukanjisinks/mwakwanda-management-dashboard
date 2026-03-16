import { apiClient } from './client'
import type { PasswordPolicy, UpdatePasswordPolicyPayload } from '@/types/password'

export interface GeneratePasswordResponse {
  password: string
}

export interface ChangePasswordPayload {
  old_password: string
  new_password: string
}

export const passwordApi = {
  getPasswordPolicy(): Promise<PasswordPolicy> {
    return apiClient.get<PasswordPolicy>('/password-policy')
  },

  updatePasswordPolicy(payload: UpdatePasswordPolicyPayload): Promise<PasswordPolicy> {
    return apiClient.put<PasswordPolicy>('/password-policy', payload)
  },

  generatePassword(): Promise<GeneratePasswordResponse> {
    return apiClient.get<GeneratePasswordResponse>('/password-policy/generate')
  },

  changePassword(payload: ChangePasswordPayload): Promise<void> {
    return apiClient.post('/auth/change-password', payload)
  },
}
