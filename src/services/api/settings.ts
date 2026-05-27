import { apiClient } from './client'
import type { OrgSettings, OrgSettingsPayload, LodgeProfile, LodgeProfilePayload, PasswordPolicy } from '@/types/settings'

export const settingsApi = {
  get: () =>
    apiClient.get<OrgSettings>('/settings'),

  update: (payload: OrgSettingsPayload) =>
    apiClient.put<OrgSettings>('/settings', payload),
}

export const passwordPolicyApi = {
  get: () =>
    apiClient.get<PasswordPolicy>('/password-policy'),

  update: (payload: PasswordPolicy) =>
    apiClient.put<PasswordPolicy>('/password-policy', payload),
}

export const orgApi = {
  get: (orgId: string) =>
    apiClient.get<LodgeProfile>(`/organization/${orgId}`),

  update: (payload: LodgeProfilePayload) =>
    apiClient.put<LodgeProfile>('/organization', payload),
}
