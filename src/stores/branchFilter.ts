import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useBranchFilterStore = defineStore('branchFilter', () => {
  const selectedBranchId = ref<string | null>(null)

  function setSelectedBranch(id: string | null) {
    selectedBranchId.value = id
  }

  return { selectedBranchId, setSelectedBranch }
})
