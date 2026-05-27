import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { branchesApi } from '@/services/api/branches'
import { getApiError } from '@/utils/errors'
import type { Branch, BranchPayload } from '@/types/branch'

export const useBranchesStore = defineStore('branches', () => {
  const branches = ref<Branch[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const mainBranch = computed<Branch | undefined>(() =>
    branches.value.find(b => b.is_main),
  )

  async function fetchBranches() {
    loading.value = true
    error.value = null
    try {
      const res = await branchesApi.list()
      if (Array.isArray(res)) {
        branches.value = res
        total.value = res.length
      } else {
        branches.value = res.data ?? []
        total.value = res.total ?? res.data?.length ?? 0
      }
    } catch (err) {
      error.value = getApiError(err, 'Failed to load branches.')
    } finally {
      loading.value = false
    }
  }

  async function createBranch(payload: BranchPayload): Promise<Branch> {
    const branch = await branchesApi.create(payload)
    branches.value.push(branch)
    total.value++
    return branch
  }

  async function updateBranch(id: string, payload: Partial<BranchPayload>): Promise<Branch> {
    const updated = await branchesApi.update(id, payload)
    const idx = branches.value.findIndex(b => b.id === id)
    if (idx !== -1) branches.value[idx] = updated
    return updated
  }

  async function deleteBranch(id: string): Promise<void> {
    await branchesApi.delete(id)
    branches.value = branches.value.filter(b => b.id !== id)
    total.value--
  }

  return { branches, total, loading, error, mainBranch, fetchBranches, createBranch, updateBranch, deleteBranch }
})
