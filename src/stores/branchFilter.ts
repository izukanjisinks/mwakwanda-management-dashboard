import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBranchFilterStore = defineStore('branchFilter', () => {
  // null = All Branches, any string = a real branch id (including the main branch)
  const selectedBranchId = ref<string | null>(null)

  const apiBranchId = computed<string | undefined>(() =>
    selectedBranchId.value ?? undefined,
  )

  function setSelectedBranch(id: string | null) {
    selectedBranchId.value = id
  }

  return { selectedBranchId, apiBranchId, setSelectedBranch }
})
