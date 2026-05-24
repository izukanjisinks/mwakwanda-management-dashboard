import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api/auth'
import type { AuthUser, AuthRole, LoginCredentials, ApiError, UserRole, OrgOption, LoginResponse, MultiOrgLoginResponse } from '@/types/auth'

function extractRole(role: AuthRole | undefined): UserRole | null {
  if (!role) return null
  return role.name as UserRole
}

const TOKEN_KEY = 'lodge_token'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const loading = ref(false)
  const error = ref<string | null>(null)
  const pendingOrgs = ref<OrgOption[]>([])
  const requiresOrgSelection = ref(false)

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => extractRole(user.value?.role))
  const roleLabel = computed(() => {
    switch (userRole.value) {
      case 'admin': return 'Administrator'
      case 'branch_admin': return 'Branch Admin'
      case 'manager': return 'Manager'
      case 'receptionist': return 'Receptionist'
      case 'cleaner': return 'Cleaner'
      default: return ''
    }
  })

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem(TOKEN_KEY, newToken)
  }

  function clearAuth() {
    user.value = null
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  async function login(credentials: LoginCredentials): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const response = await authApi.login(credentials)

      if ('requires_org_selection' in response && response.requires_org_selection) {
        console.log('[auth] multi-org response:', response)
        pendingOrgs.value = (response as MultiOrgLoginResponse).organizations
        requiresOrgSelection.value = true
        return false
      }

      const loginResponse = response as LoginResponse
      setToken(loginResponse.token)
      user.value = loginResponse.user
      requiresOrgSelection.value = false
      pendingOrgs.value = []
      return true
    } catch (err) {
      const apiErr = err as ApiError
      error.value = apiErr?.error?.message ?? 'Login failed. Please try again.'
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchCurrentUser(): Promise<boolean> {
    if (!token.value) return false
    try {
      user.value = await authApi.me()
      return true
    } catch {
      clearAuth()
      return false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      // Proceed with local logout even if API call fails
    } finally {
      clearAuth()
    }
  }

  function dismissOrgSelection() {
    requiresOrgSelection.value = false
    pendingOrgs.value = []
  }

  return {
    user,
    token,
    loading,
    error,
    pendingOrgs,
    requiresOrgSelection,
    isAuthenticated,
    userRole,
    roleLabel,
    login,
    logout,
    fetchCurrentUser,
    clearAuth,
    setToken,
    dismissOrgSelection,
  }
})
