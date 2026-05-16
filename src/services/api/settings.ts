import { apiClient } from './client'
import type { OrgSettings, OrgSettingsPayload, LodgeProfile, LodgeProfilePayload } from '@/types/settings'

export const settingsApi = {
  get: () =>
    apiClient.get<OrgSettings>('/settings'),

  update: (payload: OrgSettingsPayload) =>
    apiClient.put<OrgSettings>('/settings', payload),
}

export const lodgeProfileApi = {
  get: () =>
    apiClient.get<LodgeProfile>('/settings/profile'),

  update: (payload: LodgeProfilePayload) =>
    apiClient.put<LodgeProfile>('/settings/profile', payload),
}
