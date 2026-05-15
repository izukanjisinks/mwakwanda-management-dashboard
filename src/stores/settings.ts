import { defineStore } from 'pinia'
import { ref } from 'vue'
import { settingsApi } from '@/services/api/settings'
import type { OrgSettings, OrgSettingsPayload } from '@/types/settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<OrgSettings | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSettings() {
    loading.value = true
    error.value = null
    try {
      settings.value = await settingsApi.get()
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load settings.'
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(payload: OrgSettingsPayload): Promise<OrgSettings> {
    const updated = await settingsApi.update(payload)
    settings.value = updated
    return updated
  }

  return { settings, loading, error, fetchSettings, updateSettings }
})
