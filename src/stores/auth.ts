import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/services/api/auth'
import type { AuthUser, AuthRole, LoginCredentials, ApiError, UserRole } from '@/types/auth'

function extractRole(role: UserRole | AuthRole | undefined): UserRole | null {
  if (!role) return null
  if (typeof role === 'string') return role
  return role.name
}

const TOKEN_KEY = 'lodge_token'

// Dev-only mock users — remove before production
const DEV_MOCK_USERS: Record<string, AuthUser & { password: string }> = {
  'admin@lodge.dev': {
    password: 'admin123',
    id: '1',
    email: 'admin@lodge.dev',
    full_name: 'Lodge Administrator',
    role: 'admin',
    created_at: new Date().toISOString(),
    change_password: false,
    is_active: true,
  },
  'manager@lodge.dev': {
    password: 'manager123',
    id: '2',
    email: 'manager@lodge.dev',
    full_name: 'Grace Mwila',
    role: 'manager',
    created_at: new Date().toISOString(),
    change_password: false,
    is_active: true,
  },
  'receptionist@lodge.dev': {
    password: 'reception123',
    id: '3',
    email: 'receptionist@lodge.dev',
    full_name: 'Peter Zulu',
    role: 'receptionist',
    created_at: new Date().toISOString(),
    change_password: false,
    is_active: true,
  },
  'cleaner@lodge.dev': {
    password: 'cleaner123',
    id: '6',
    email: 'cleaner@lodge.dev',
    full_name: 'Joseph Banda',
    role: 'cleaner',
    created_at: new Date().toISOString(),
    change_password: false,
    is_active: true,
  },
  'individual@lodge.dev': {
    password: 'client123',
    id: '2',
    email: 'individual@lodge.dev',
    full_name: 'John Smith',
    role: 'client_individual',
    created_at: new Date().toISOString(),
    change_password: false,
    is_active: true,
  },
  'corporate@lodge.dev': {
    password: 'client123',
    id: '3',
    email: 'corporate@lodge.dev',
    full_name: 'Acme Corp',
    role: 'client_corporate',
    created_at: new Date().toISOString(),
    change_password: false,
    is_active: true,
  },
}

const IS_DEV = import.meta.env.DEV

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
      case 'client_individual': return 'Individual Client'
      case 'client_corporate': return 'Corporate Client'
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
      // Dev mock bypass
      if (IS_DEV) {
        const mock = DEV_MOCK_USERS[credentials.email]
        if (mock && mock.password === credentials.password) {
          const { password: _, ...mockUser } = mock
          setToken('dev-mock-token')
          user.value = mockUser
          return true
        }
      }

      const response = await authApi.login(credentials)
      setToken(response.token)
      user.value = response.user
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

    // Dev mock bypass — token is already set, user may be null after page refresh
    if (IS_DEV && token.value === 'dev-mock-token') {
      // User was lost on refresh — can't re-fetch without a real API, so clear
      clearAuth()
      return false
    }

    try {
      user.value = await authApi.me()
      return true
    } catch {
      clearAuth()
      return false
    }
  }

  async function logout() {
    if (IS_DEV && token.value === 'dev-mock-token') {
      clearAuth()
      return
    }
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
