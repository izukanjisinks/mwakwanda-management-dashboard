import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api/auth'
import type { AuthUser, AuthRole, LoginCredentials, ApiError, UserRole } from '@/types/auth'

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

  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => extractRole(user.value?.role))
  const roleLabel = computed(() => {
    switch (userRole.value) {
      case 'admin': return 'Administrator'
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
      setToken(response.token)
      user.value = response.user

      console.log(response)

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

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    userRole,
    roleLabel,
    login,
    logout,
    fetchCurrentUser,
    clearAuth,
    setToken,
  }
})
