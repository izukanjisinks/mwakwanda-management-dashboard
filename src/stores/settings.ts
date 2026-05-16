import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi, lodgeProfileApi } from '@/services/api/settings'
import { getApiError } from '@/utils/errors'
import type { OrgSettings, OrgSettingsPayload, LodgeProfile, LodgeProfilePayload } from '@/types/settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<OrgSettings | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const lodgeProfile = ref<LodgeProfile | null>(null)
  const profileLoading = ref(false)
  const profileError = ref<string | null>(null)

  async function fetchSettings() {
    loading.value = true
    error.value = null
    try {
      settings.value = await settingsApi.get()
    } catch (err) {
      error.value = getApiError(err, 'Failed to load settings.')
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(payload: OrgSettingsPayload): Promise<OrgSettings> {
    const updated = await settingsApi.update(payload)
    settings.value = updated
    return updated
  }

  async function fetchLodgeProfile() {
    profileLoading.value = true
    profileError.value = null
    try {
      lodgeProfile.value = await lodgeProfileApi.get()
    } catch (err) {
      profileError.value = getApiError(err, 'Failed to load lodge profile.')
    } finally {
      profileLoading.value = false
    }
  }

  async function updateLodgeProfile(payload: LodgeProfilePayload): Promise<LodgeProfile> {
    const updated = await lodgeProfileApi.update(payload)
    lodgeProfile.value = updated
    return updated
  }

  return {
    settings, loading, error, fetchSettings, updateSettings,
    lodgeProfile, profileLoading, profileError, fetchLodgeProfile, updateLodgeProfile,
  }
})
