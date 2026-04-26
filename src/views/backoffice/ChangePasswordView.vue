<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBackofficeStore } from '@/stores/backoffice'
import { backofficeApi } from '@/services/api/backoffice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock } from 'lucide-vue-next'

const router = useRouter()
const store = useBackofficeStore()

const form = ref({ old_password: '', new_password: '', confirm_password: '' })
const saving = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  if (form.value.new_password !== form.value.confirm_password) {
    error.value = 'New passwords do not match.'
    return
  }
  if (form.value.new_password.length < 8) {
    error.value = 'New password must be at least 8 characters.'
    return
  }
  saving.value = true
  try {
    await backofficeApi.changePassword(form.value.old_password, form.value.new_password)
    if (store.user) store.user.change_password = false
    await store.fetchMe()
    router.push({ name: 'backoffice-dashboard' })
  } catch (err: any) {
    error.value = err?.error?.message ?? 'Failed to change password.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="w-full max-w-md">
      <div class="rounded-2xl border border-border/40 bg-card/70 p-8 shadow-2xl shadow-primary/5 backdrop-blur-xl">
        <div class="flex flex-col items-center gap-3 text-center mb-8">
          <div class="flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Lock class="size-6 text-primary" />
          </div>
          <div>
            <h1 class="text-2xl font-bold tracking-tight">Change Password Required</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              For security reasons, you must set a new password before continuing.
            </p>
          </div>
        </div>

        <div v-if="error" class="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p class="text-sm text-destructive text-center">{{ error }}</p>
        </div>

        <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
          <div class="grid gap-2">
            <Label for="old">Current Password</Label>
            <Input id="old" v-model="form.old_password" type="password" required autocomplete="current-password" />
          </div>
          <div class="grid gap-2">
            <Label for="new">New Password</Label>
            <Input id="new" v-model="form.new_password" type="password" placeholder="At least 8 characters" required autocomplete="new-password" />
          </div>
          <div class="grid gap-2">
            <Label for="confirm">Confirm New Password</Label>
            <Input id="confirm" v-model="form.confirm_password" type="password" required autocomplete="new-password" />
          </div>
          <Button type="submit" :disabled="saving" class="mt-2 h-11 w-full">
            <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
            Set New Password
          </Button>
        </form>
      </div>

      <p class="mt-6 text-center text-xs text-muted-foreground">
        Signed in as <span class="font-medium">{{ store.user?.email }}</span>
      </p>
    </div>
  </div>
</template>
