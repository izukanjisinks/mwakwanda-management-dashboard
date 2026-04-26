import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usersApi } from '@/services/api/users'
import type { SystemUser, SystemUserPayload } from '@/types/user'

export const useUsersStore = defineStore('users', () => {
  const users = ref<SystemUser[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers(page = 1, pageSize = 50) {
    loading.value = true
    error.value = null
    try {
      const res = await usersApi.list({ page, page_size: pageSize })
      users.value = res.data ?? []
      total.value = res.total
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load users.'
    } finally {
      loading.value = false
    }
  }

  async function createUser(payload: SystemUserPayload): Promise<SystemUser> {
    const user = await usersApi.create(payload)
    users.value.push(user)
    total.value++
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
    total.value--
  }

  async function lockUser(id: string): Promise<void> {
    await usersApi.lock(id)
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) users.value[idx].is_locked = true
  }

  async function unlockUser(id: string): Promise<void> {
    await usersApi.unlock(id)
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) users.value[idx].is_locked = false
  }

  return { users, total, loading, error, fetchUsers, createUser, updateUser, deleteUser, lockUser, unlockUser }
})
