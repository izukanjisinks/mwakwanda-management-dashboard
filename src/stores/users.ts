import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usersApi } from '@/services/api/users'
import type { SystemUser, SystemUserPayload } from '@/types/user'

export const useUsersStore = defineStore('users', () => {
  const users = ref<SystemUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      users.value = await usersApi.list()
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load users.'
      if (import.meta.env.DEV && users.value.length === 0) {
        users.value = DEV_MOCK_USERS
      }
    } finally {
      loading.value = false
    }
  }

  async function createUser(payload: SystemUserPayload): Promise<SystemUser> {
    const user = await usersApi.create(payload)
    users.value.push(user)
    return user
  }

  async function updateUser(id: string, payload: Partial<SystemUserPayload>): Promise<SystemUser> {
    const updated = await usersApi.update(id, payload)
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) users.value[idx] = updated
    return updated
  }

  async function deleteUser(id: string): Promise<void> {
    await usersApi.delete(id)
    users.value = users.value.filter(u => u.id !== id)
  }

  return { users, loading, error, fetchUsers, createUser, updateUser, deleteUser }
})

const DEV_MOCK_USERS: SystemUser[] = [
  { id: '1', full_name: 'Admin User', email: 'admin@lodge.dev', role: 'admin', status: 'active', last_login: '2026-03-17T08:00:00Z', created_at: '2025-01-01T00:00:00Z' },
  { id: '2', full_name: 'Grace Mwila', email: 'grace@lodge.dev', role: 'manager', status: 'active', last_login: '2026-03-16T14:30:00Z', created_at: '2025-02-01T00:00:00Z' },
  { id: '3', full_name: 'Peter Zulu', email: 'peter@lodge.dev', role: 'receptionist', status: 'active', last_login: '2026-03-17T07:45:00Z', created_at: '2025-03-01T00:00:00Z' },
  { id: '4', full_name: 'Agnes Tembo', email: 'agnes@lodge.dev', role: 'receptionist', status: 'active', last_login: '2026-03-15T09:00:00Z', created_at: '2025-04-01T00:00:00Z' },
  { id: '5', full_name: 'Bwalya Chanda', email: 'bwalya@lodge.dev', role: 'receptionist', status: 'inactive', created_at: '2025-06-01T00:00:00Z' },
]
