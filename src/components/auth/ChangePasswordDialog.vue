<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, AlertCircle, Lock } from 'lucide-vue-next'
import { apiClient } from '@/services/api/client'

const props = defineProps<{
  open: boolean
  currentPassword: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'success': []
}>()

const saving = ref(false)
const errorMessage = ref('')

const formData = ref({
  new_password: '',
  confirm_password: '',
})

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    formData.value.new_password = ''
    formData.value.confirm_password = ''
    errorMessage.value = ''
  }
})

async function handleChangePassword() {
  errorMessage.value = ''

  if (formData.value.new_password !== formData.value.confirm_password) {
    errorMessage.value = 'New passwords do not match'
    return
  }

  if (formData.value.new_password.length < 8) {
    errorMessage.value = 'New password must be at least 8 characters long'
    return
  }

  saving.value = true
  try {
    await apiClient.post('/auth/change-password', {
      old_password: props.currentPassword,
      new_password: formData.value.new_password,
    })
    emit('success')
    emit('update:open', false)
  } catch (err: any) {
    errorMessage.value =
      err?.error?.message ||
      err?.response?.data?.error?.message ||
      'Failed to change password. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[500px]" :close-disabled="true">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Lock class="w-5 h-5" />
          Change Password Required
        </DialogTitle>
        <DialogDescription>
          For security reasons, you must change your password before continuing.
        </DialogDescription>
      </DialogHeader>

      <div v-if="errorMessage" class="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle class="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div class="flex-1">
          <p class="text-sm font-medium text-destructive">Error</p>
          <p class="text-sm text-destructive/90 mt-1">{{ errorMessage }}</p>
        </div>
      </div>

      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label for="new_password">New Password *</Label>
          <Input
            id="new_password"
            v-model="formData.new_password"
            type="password"
            placeholder="Enter new password"
            required
            autocomplete="new-password"
          />
          <p class="text-xs text-muted-foreground">Must be at least 8 characters long</p>
        </div>

        <div class="grid gap-2">
          <Label for="confirm_password">Confirm New Password *</Label>
          <Input
            id="confirm_password"
            v-model="formData.confirm_password"
            type="password"
            placeholder="Confirm new password"
            required
            autocomplete="new-password"
          />
        </div>
      </div>

      <DialogFooter>
        <Button @click="handleChangePassword" :disabled="saving" class="w-full">
          <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
          Change Password
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
