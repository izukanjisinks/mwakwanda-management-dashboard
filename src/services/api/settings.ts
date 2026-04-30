import { apiClient } from './client'
import type { OrgSettings, OrgSettingsPayload } from '@/types/settings'

export const settingsApi = {
  get: () =>
    apiClient.get<OrgSettings>('/settings'),

  update: (payload: OrgSettingsPayload) =>
    apiClient.put<OrgSettings>('/settings', payload),
}
