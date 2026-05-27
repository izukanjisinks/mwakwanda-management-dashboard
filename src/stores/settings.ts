import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi, orgApi } from '@/services/api/settings'
import { getApiError } from '@/utils/errors'
import { useAuthStore } from '@/stores/auth'
import type { OrgSettings, OrgSettingsPayload, LodgeProfile, LodgeProfilePayload } from '@/types/settings'

export const useSettingsStore = defineStore('settings', () => {
  const authStore = useAuthStore()

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
    const orgId = authStore.user?.org_id
    if (!orgId) return
    profileLoading.value = true
    profileError.value = null
    try {
      lodgeProfile.value = await orgApi.get(orgId)
    } catch (err) {
      profileError.value = getApiError(err, 'Failed to load lodge profile.')
    } finally {
      profileLoading.value = false
    }
  }

  async function updateLodgeProfile(payload: LodgeProfilePayload): Promise<LodgeProfile> {
    const updated = await orgApi.update(payload)
    lodgeProfile.value = updated
    if (authStore.user) {
      if (payload.name !== undefined)     authStore.user.org_name     = payload.name
      if (payload.logo_url !== undefined) authStore.user.org_logo_url = payload.logo_url ?? undefined
    }
    return updated
  }

  return {
    settings, loading, error, fetchSettings, updateSettings,
    lodgeProfile, profileLoading, profileError, fetchLodgeProfile, updateLodgeProfile,
  }
})
