import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usersApi } from '@/services/api/users'
import { getApiError } from '@/utils/errors'
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
    } catch (err) {
      error.value = getApiError(err, 'Failed to load users.')
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
    if (idx !== -1) {
      users.value[idx] = {
        ...users.value[idx]!,
        ...updated,
        ...(payload.branch_id !== undefined ? { branch_id: payload.branch_id || undefined } : {}),
      }
      return users.value[idx]!
    }
    return updated
  }

  async function deleteUser(id: string): Promise<void> {
    await usersApi.delete(id)
    users.value = users.value.filter(u => u.id !== id)
    total.value--
  }

  async function changeRole(id: string, roleId: string): Promise<SystemUser> {
    const updated = await usersApi.changeRole(id, roleId)
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) users.value[idx] = updated
    return updated
  }

  async function assignBranch(userId: string, branchId: string | null): Promise<SystemUser> {
    const updated = await usersApi.update(userId, { branch_id: branchId ?? undefined })
    const idx = users.value.findIndex(u => u.id === userId)
    if (idx !== -1) {
      users.value[idx] = {
        ...users.value[idx]!,
        ...updated,
        branch_id: branchId !== null ? branchId : undefined,
      }
      return users.value[idx]!
    }
    return updated
  }

  async function lockUser(id: string): Promise<void> {
    await usersApi.lock(id)
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) users.value[idx]!.is_locked = true
  }

  async function unlockUser(id: string): Promise<void> {
    await usersApi.unlock(id)
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) users.value[idx]!.is_locked = false
  }

  return { users, total, loading, error, fetchUsers, createUser, updateUser, changeRole, deleteUser, assignBranch, lockUser, unlockUser }
})
