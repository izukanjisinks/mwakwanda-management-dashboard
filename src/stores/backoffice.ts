import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { backofficeApi } from '@/services/api/backoffice'
import type { BackofficeUser, Organisation } from '@/types/backoffice'

const TOKEN_KEY = 'lodge_backoffice_token'

export const useBackofficeStore = defineStore('backoffice', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<BackofficeUser | null>(null)
  const organisations = ref<Organisation[]>([])
  const admins = ref<BackofficeUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  function setToken(t: string) {
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const res = await backofficeApi.login(email, password)
      setToken(res.token)
      user.value = res.user
      return true
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Login failed.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      user.value = await backofficeApi.me()
    } catch {
      clearAuth()
    }
  }

  function logout() {
    clearAuth()
  }

  // Organisations
  const orgTotal = ref(0)
  async function fetchOrganisations(params?: { page?: number; page_size?: number; search?: string }) {
    loading.value = true
    error.value = null
    try {
      const res = await backofficeApi.listOrganisations(params)
      organisations.value = res.data ?? []
      orgTotal.value = res.total
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load organisations.'
    } finally {
      loading.value = false
    }
  }

  async function toggleOrgStatus(id: string, is_active: boolean) {
    const res = await backofficeApi.toggleOrganisationStatus(id, is_active)
    const idx = organisations.value.findIndex(o => o.id === id)
    if (idx !== -1) organisations.value[idx] = res
  }

  // Provisioning
  async function provision(payload: Parameters<typeof backofficeApi.provision>[0]) {
    loading.value = true
    error.value = null
    try {
      const res = await backofficeApi.provision(payload)
      organisations.value = [res.organization, ...organisations.value]
      return res
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Provisioning failed.'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Admins
  const adminTotal = ref(0)
  async function fetchAdmins(params?: { page?: number; page_size?: number; search?: string }) {
    loading.value = true
    error.value = null
    try {
      const res = await backofficeApi.listAdmins(params)
      admins.value = res.data ?? []
      adminTotal.value = res.total
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load admins.'
    } finally {
      loading.value = false
    }
  }

  async function createAdmin(data: { full_name: string; email: string }) {
    const res = await backofficeApi.createAdmin(data)
    admins.value = [res, ...admins.value]
    return res
  }

  async function toggleAdminLock(id: string, is_locked: boolean) {
    const res = await backofficeApi.toggleAdminLock(id, is_locked)
    const idx = admins.value.findIndex(a => a.id === id)
    if (idx !== -1) admins.value[idx] = res
  }

  async function resetAdminPassword(id: string) {
    return backofficeApi.resetAdminPassword(id)
  }

  async function deleteAdmin(id: string) {
    await backofficeApi.deleteAdmin(id)
    admins.value = admins.value.filter(a => a.id !== id)
  }

  return {
    token,
    user,
    organisations,
    admins,
    loading,
    error,
    isAuthenticated,
    orgTotal,
    adminTotal,
    login,
    fetchMe,
    logout,
    fetchOrganisations,
    toggleOrgStatus,
    provision,
    fetchAdmins,
    createAdmin,
    toggleAdminLock,
    resetAdminPassword,
    deleteAdmin,
  }
})
