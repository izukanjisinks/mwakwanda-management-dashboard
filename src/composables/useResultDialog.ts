import { ref } from 'vue'

const resultDialogOpen = ref(false)
const resultDialogType = ref<'success' | 'error'>('success')
const resultDialogTitle = ref('')
const resultDialogMessage = ref('')

export function useResultDialog() {
  function showSuccess(title: string, message: string) {
    resultDialogType.value = 'success'
    resultDialogTitle.value = title
    resultDialogMessage.value = message
    resultDialogOpen.value = true
  }

  function showError(title: string, message: string) {
    resultDialogType.value = 'error'
    resultDialogTitle.value = title
    resultDialogMessage.value = message
    resultDialogOpen.value = true
  }

  function hideResult() {
    resultDialogOpen.value = false
  }

  return {
    resultDialogOpen,
    resultDialogType,
    resultDialogTitle,
    resultDialogMessage,
    showSuccess,
    showError,
    hideResult,
  }
}
