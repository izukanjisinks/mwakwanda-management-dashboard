import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usersApi } from '@/services/api/users'
import { getApiError } from '@/utils/errors'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { SystemUser, SystemUserPayload } from '@/types/user'

export const useUsersStore = defineStore('users', () => {
  const users = ref<SystemUser[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers(page = 1, pageSize = 50) {
    const branchFilter = useBranchFilterStore()
    loading.value = true
    error.value = null
    try {
      const res = await usersApi.list({ page, page_size: pageSize, branch_id: branchFilter.apiBranchId })
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

  async function updateUser(id: string, payload: SystemUserPayload): Promise<SystemUser> {
    const updated = await usersApi.update(id, payload)
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) {
      users.value[idx] = {
        ...users.value[idx]!,
        ...updated,
        branch_id: payload.branch_id ?? undefined,
        branch_name: payload.branch_id === null ? '' : (updated.branch_name ?? ''),
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

  async function assignBranch(userId: string, branchId: string | null, branchName?: string): Promise<SystemUser> {
    console.log('Assigning branch', { userId, branchId, branchName })
    const idx = users.value.findIndex(u => u.id === userId)
    const existing = users.value[idx]
    if (!existing) throw new Error('User not found')
    const payload: SystemUserPayload = {
      full_name:   existing.full_name,
      email:       existing.email,
      role:        existing.role,
      status:      existing.status,
      branch_id:   branchId,
      branch_name: branchId === null ? '' : (branchName ?? existing.branch_name ?? ''),
    }
    const updated = await usersApi.update(userId, payload)
    users.value[idx] = {
      ...existing,
      ...updated,
      branch_id:   branchId !== null ? branchId : undefined,
      branch_name: branchId === null ? '' : (updated.branch_name ?? ''),
    }
    return users.value[idx]!
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
