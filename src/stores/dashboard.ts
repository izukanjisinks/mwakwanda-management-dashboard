import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dashboardApi } from '@/services/api/dashboard'
import { getApiError } from '@/utils/errors'
import type { DashboardStats } from '@/types/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<DashboardStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStats() {
    loading.value = true
    error.value = null
    try {
      stats.value = await dashboardApi.stats()
    } catch (err) {
      error.value = getApiError(err, 'Failed to load dashboard stats.')
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, error, fetchStats }
})
