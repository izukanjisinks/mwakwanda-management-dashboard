<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog.vue'
import OrgPickerDialog from '@/components/auth/OrgPickerDialog.vue'
import { Trees, Eye, EyeOff, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const showChangePasswordDialog = ref(false)
const submitting = ref(false)

async function handleSubmit() {
  if (submitting.value) return
  submitting.value = true

  try {
    const success = await authStore.login({ email: email.value, password: password.value })

    if (!success) return

    if (authStore.user?.change_password) {
      showChangePasswordDialog.value = true
      return
    }

    await router.push({ name: 'dashboard' })
  } finally {
    submitting.value = false
  }
}

async function handleOrgSelect(orgId: string) {
  if (submitting.value) return
  submitting.value = true

  try {
    const success = await authStore.login({ email: email.value, password: password.value, org_id: orgId })

    if (!success) return

    if (authStore.user?.change_password) {
      showChangePasswordDialog.value = true
      return
    }

    await router.push({ name: 'dashboard' })
  } finally {
    submitting.value = false
  }
}

function handlePasswordChanged() {
  showChangePasswordDialog.value = false
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="min-h-screen w-full lg:grid lg:grid-cols-2">

    <!-- Left Side — Login Form -->
    <div class="flex items-center justify-center px-6 py-12 lg:px-8">
      <div class="w-full max-w-md">

        <!-- Glass card -->
        <div class="rounded-2xl border border-border/40 bg-card/70 p-8 shadow-2xl shadow-primary/5 backdrop-blur-xl">

          <!-- Logo & Title -->
          <div class="flex flex-col items-center gap-4 text-center mb-8">
            <div class="flex items-center gap-2 lg:hidden">
                <img
                  src="@/assets/logo/MwakwandaLogoBrownLetters.svg"
                  alt="Lodge Logo"
                  class="h-75 w-75 object-contain drop-shadow-lg"/>

              <!-- <Trees class="h-8 w-8 text-primary" />
              <span class="font-serif text-2xl font-semibold tracking-tight text-foreground">
                Pine Ridge Lodge
              </span> -->
            </div>
            <div>
              <h1 class="text-3xl font-bold tracking-tight text-foreground">
                Welcome Back
              </h1>
              <p class="mt-2 text-muted-foreground">
                Sign in to your management dashboard
              </p>
            </div>
          </div>

          <!-- Error Message -->
          <div
            v-if="authStore.error"
            class="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <p class="text-sm text-destructive text-center">{{ authStore.error }}</p>
          </div>

          <!-- Form -->
          <form class="flex flex-col gap-5" @submit.prevent="handleSubmit">

            <div class="flex flex-col gap-2">
              <Label for="email" class="text-foreground/80">Email Address</Label>
              <Input
                id="email"
                v-model="email"
                type="email"
                placeholder="manager@pineridgelodge.com"
                required
                autocomplete="email"
                class="h-11 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary"
              />
            </div>

            <div class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <Label for="password" class="text-foreground/80">Password</Label>
                <a href="#" class="text-sm text-primary hover:text-primary/80 transition-colors" @click.prevent>
                  Forgot password?
                </a>
              </div>
              <div class="relative">
                <Input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Enter your password"
                  required
                  autocomplete="current-password"
                  class="h-11 pr-10 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <EyeOff v-if="showPassword" class="h-4 w-4" />
                  <Eye v-else class="h-4 w-4" />
                  <span class="sr-only">{{ showPassword ? 'Hide password' : 'Show password' }}</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              :disabled="authStore.loading || submitting"
              class="h-11 w-full text-base font-medium shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              <span v-if="authStore.loading || submitting" class="flex items-center gap-2">
                <Loader2 class="h-4 w-4 animate-spin" />
                Signing in...
              </span>
              <span v-else>Sign In</span>
            </Button>
          </form>

          <!-- Footer links -->
          <p class="mt-6 text-center text-sm text-muted-foreground">
            Need assistance?
            <a href="#" class="text-primary hover:text-primary/80 transition-colors">Contact Support</a>
          </p>
        </div>

        <!-- Terms -->
        <p class="mt-8 text-center text-xs text-muted-foreground">
          Developed by HexaPrime LTD. &copy; 2026. All rights reserved.
        </p>
      </div>
    </div>

    <!-- Right Side — Hero Image -->
    <div class="relative hidden lg:block">
      <img
        src="/lodge-hero.jpg"
        alt="Pine Ridge Lodge nestled in the mountains"
        class="absolute inset-0 h-full w-full object-cover"
      />

      <!-- Gradient overlay -->git 
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      <!-- Centered Logo Overlay -->
      <div class="absolute inset-0 flex items-center justify-center">
        <img
          src="@/assets/logo/MwakwandaDarkBackgroundLogo.svg"
          alt="Lodge Logo"
          class="h-120 w-120 object-contain drop-shadow-2xl"
        />
      </div>

      <!-- Quote overlay -->
      <!-- <div class="absolute inset-0 flex flex-col justify-end p-12">
        <div class="max-w-lg">
          <blockquote class="space-y-4">
            <p class="font-serif text-2xl font-medium leading-relaxed text-white/95">
              "Where the mountains meet the sky, and every guest becomes family."
            </p>
            <footer class="text-white/70">
              <p class="text-sm font-medium">Pine Ridge Lodge</p>
            </footer>
          </blockquote>
        </div>
      </div> -->
    </div>

  </div>

  <!-- Org Picker Dialog -->
  <OrgPickerDialog
    :open="authStore.requiresOrgSelection"
    :orgs="authStore.pendingOrgs"
    :loading="authStore.loading"
    @select="handleOrgSelect"
    @dismiss="authStore.dismissOrgSelection()"
  />

  <!-- Change Password Dialog -->
  <ChangePasswordDialog
    :open="showChangePasswordDialog"
    :current-password="password"
    @update:open="(val) => (showChangePasswordDialog = val)"
    @success="handlePasswordChanged"
  />
</template>
