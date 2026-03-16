<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog.vue'
import hrLogo from '@/assets/logo/hr-logo-sm.jpg'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showChangePasswordDialog = ref(false)

async function handleSubmit() {
  const success = await authStore.login({ email: email.value, password: password.value })
  if (success) {
    if (authStore.user?.change_password) {
      showChangePasswordDialog.value = true
    } else {
      router.push({ name: 'dashboard' })
    }
  }
}

function handlePasswordChanged() {
  showChangePasswordDialog.value = false
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-4 bg-muted/40">
    <Card class="w-full max-w-md overflow-hidden">
      <CardContent class="p-8 md:p-10">
        <form class="flex flex-col gap-6" @submit.prevent="handleSubmit">
          <!-- Header -->
          <div class="flex flex-col items-center gap-2 text-center">
            <img :src="hrLogo" alt="HR System" class="h-16 w-auto" />
            <h1 class="text-3xl font-bold tracking-tight">Welcome Back</h1>
            <p class="text-muted-foreground text-balance">
              Sign in to your account
            </p>
          </div>

          <!-- Error Message -->
          <div
            v-if="authStore.error"
            class="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <p class="text-sm text-destructive text-center">{{ authStore.error }}</p>
          </div>

          <!-- Form Fields -->
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="email">Email</Label>
              <Input
                id="email"
                v-model="email"
                type="email"
                placeholder="you@company.com"
                required
                autocomplete="email"
              />
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <Label for="password">Password</Label>
                <a
                  href="#"
                  class="text-sm text-primary underline-offset-4 hover:underline"
                  @click.prevent
                >
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                v-model="password"
                type="password"
                placeholder="••••••••"
                required
                autocomplete="current-password"
              />
            </div>

            <Button type="submit" class="w-full" :disabled="authStore.loading">
              {{ authStore.loading ? 'Signing in...' : 'Sign In' }}
            </Button>
          </div>

          <!-- Footer -->
          <p class="text-xs text-center text-muted-foreground px-8">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </CardContent>
    </Card>

    <!-- Change Password Dialog -->
    <ChangePasswordDialog
      :open="showChangePasswordDialog"
      :current-password="password"
      @update:open="(val) => (showChangePasswordDialog = val)"
      @success="handlePasswordChanged"
    />
  </div>
</template>
