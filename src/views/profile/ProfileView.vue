<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Mail,
  Shield,
  Calendar,
  Key,
  Briefcase,
  Building2,
  UserCircle,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-vue-next'
import { Skeleton } from '@/components/ui/skeleton'

const authStore = useAuthStore()

const passwordForm = ref({
  current_password: '',
  new_password: '',
  confirm_password: '',
})

const changingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)

const userDetails = computed(() => ({
  email: authStore.user?.email || '',
  role: authStore.roleLabel || '',
  employeeId: authStore.user?.employee_id || 'N/A',
  createdAt: authStore.user?.created_at ? new Date(authStore.user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A',
  isActive: authStore.user?.is_active || false,
  requiresPasswordChange: authStore.user?.change_password || false,
}))

async function handlePasswordChange() {
  passwordError.value = ''
  passwordSuccess.value = false

  // Validation
  if (!passwordForm.value.current_password || !passwordForm.value.new_password || !passwordForm.value.confirm_password) {
    passwordError.value = 'All password fields are required'
    return
  }

  if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
    passwordError.value = 'New passwords do not match'
    return
  }

  if (passwordForm.value.new_password.length < 8) {
    passwordError.value = 'New password must be at least 8 characters long'
    return
  }

  changingPassword.value = true

  try {
    // TODO: Implement password change API call
    // await authApi.changePassword(passwordForm.value)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    passwordSuccess.value = true
    passwordForm.value = {
      current_password: '',
      new_password: '',
      confirm_password: '',
    }

    setTimeout(() => {
      passwordSuccess.value = false
    }, 5000)
  } catch (err: any) {
    passwordError.value = err?.error?.message || 'Failed to change password'
  } finally {
    changingPassword.value = false
  }
}

function resetPasswordForm() {
  passwordForm.value = {
    current_password: '',
    new_password: '',
    confirm_password: '',
  }
  passwordError.value = ''
  passwordSuccess.value = false
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-semibold">Profile</h1>
      <p class="text-muted-foreground">
        Manage your account settings and preferences
      </p>
    </div>

    <!-- Profile Information Card -->
    <Card>
      <CardHeader>
        <div class="flex items-center gap-3">
          <div class="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle class="size-7 text-primary" />
          </div>
          <div>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your personal details and account status</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
              <Mail class="size-4 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-muted-foreground">Email Address</p>
              <p class="font-medium truncate">{{ userDetails.email }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
              <Shield class="size-4 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-muted-foreground">Role</p>
              <p class="font-medium capitalize">{{ userDetails.role }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
              <User class="size-4 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-muted-foreground">Employee ID</p>
              <p class="font-medium">{{ userDetails.employeeId }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
              <Calendar class="size-4 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-muted-foreground">Account Created</p>
              <p class="font-medium">{{ userDetails.createdAt }}</p>
            </div>
          </div>
        </div>

        <Separator />

        <!-- Account Status -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CheckCircle v-if="userDetails.isActive" class="size-4 text-green-600" />
            <AlertCircle v-else class="size-4 text-destructive" />
            <span class="text-sm font-medium">Account Status</span>
          </div>
          <span
            class="text-sm px-2.5 py-0.5 rounded-full font-medium"
            :class="userDetails.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-destructive/10 text-destructive'"
          >
            {{ userDetails.isActive ? 'Active' : 'Inactive' }}
          </span>
        </div>

        <div v-if="userDetails.requiresPasswordChange" class="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertCircle class="size-4 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div class="text-sm">
            <p class="font-medium text-amber-900 dark:text-amber-200">Password Change Required</p>
            <p class="text-amber-700 dark:text-amber-300 mt-0.5">Please update your password for security purposes.</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Change Password Card -->
    <Card>
      <CardHeader>
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Key class="size-5 text-primary" />
          </div>
          <div>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <!-- Success Message -->
        <div v-if="passwordSuccess" class="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-start gap-2">
          <CheckCircle class="size-4 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
          <p class="text-sm text-green-700 dark:text-green-300">Password changed successfully!</p>
        </div>

        <!-- Error Message -->
        <div v-if="passwordError" class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle class="size-4 text-destructive shrink-0 mt-0.5" />
          <p class="text-sm text-destructive">{{ passwordError }}</p>
        </div>

        <form @submit.prevent="handlePasswordChange" class="space-y-4">
          <div class="grid gap-2">
            <Label for="current_password">Current Password</Label>
            <Input
              id="current_password"
              type="password"
              v-model="passwordForm.current_password"
              placeholder="Enter your current password"
              :disabled="changingPassword"
              autocomplete="current-password"
            />
          </div>

          <div class="grid gap-2">
            <Label for="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              v-model="passwordForm.new_password"
              placeholder="Enter your new password"
              :disabled="changingPassword"
              autocomplete="new-password"
            />
            <p class="text-xs text-muted-foreground">Must be at least 8 characters long</p>
          </div>

          <div class="grid gap-2">
            <Label for="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              v-model="passwordForm.confirm_password"
              placeholder="Confirm your new password"
              :disabled="changingPassword"
              autocomplete="new-password"
            />
          </div>

          <div class="flex gap-3 pt-2">
            <Button type="submit" :disabled="changingPassword">
              <Loader2 v-if="changingPassword" class="size-4 mr-2 animate-spin" />
              Change Password
            </Button>
            <Button
              type="button"
              variant="outline"
              @click="resetPasswordForm"
              :disabled="changingPassword"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
