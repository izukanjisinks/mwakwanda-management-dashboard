import { ref } from 'vue'

const showForbiddenDialog = ref(false)
const forbiddenResourceName = ref<string | undefined>(undefined)

export function useForbiddenHandler() {
  function showForbidden(resourceName?: string) {
    forbiddenResourceName.value = resourceName
    showForbiddenDialog.value = true
  }

  function hideForbidden() {
    showForbiddenDialog.value = false
    forbiddenResourceName.value = undefined
  }

  return {
    showForbiddenDialog,
    forbiddenResourceName,
    showForbidden,
    hideForbidden,
  }
}
