import { ref } from 'vue'

interface ConfirmDialogOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

const open = ref(false)
const title = ref('')
const description = ref('')
const confirmText = ref('Confirm')
const cancelText = ref('Cancel')
const variant = ref<'default' | 'destructive'>('default')
const loading = ref(false)

let resolvePromise: ((value: boolean) => void) | null = null

export function useConfirmDialog() {
  function confirm(options: ConfirmDialogOptions): Promise<boolean> {
    title.value = options.title
    description.value = options.description
    confirmText.value = options.confirmText ?? 'Confirm'
    cancelText.value = options.cancelText ?? 'Cancel'
    variant.value = options.variant ?? 'default'
    loading.value = false
    open.value = true

    return new Promise<boolean>((resolve) => {
      resolvePromise = resolve
    })
  }

  function handleConfirm() {
    open.value = false
    resolvePromise?.(true)
    resolvePromise = null
  }

  function handleCancel() {
    open.value = false
    resolvePromise?.(false)
    resolvePromise = null
  }

  function handleOpenChange(val: boolean) {
    if (!val) {
      handleCancel()
    }
  }

  return {
    open,
    title,
    description,
    confirmText,
    cancelText,
    variant,
    loading,
    confirm,
    handleConfirm,
    handleCancel,
    handleOpenChange,
  }
}
