<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { passwordApi } from '@/services/api/password'
import type { PasswordPolicy } from '@/types/password'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import ResultDialog from '@/components/common/ResultDialog.vue'
import { ShieldCheck, Loader2, Save, AlertCircle } from 'lucide-vue-next'

const policy = ref<PasswordPolicy | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

// Result dialog state
const resultDialog = ref({
  open: false,
  type: 'success' as 'success' | 'error',
  title: '',
  message: '',
})

// Form data
const formData = ref({
  min_length: 10,
  require_uppercase: true,
  require_lowercase: true,
  require_numbers: true,
  require_special_chars: true,
  max_failed_attempts: 3,
  lockout_duration_mins: 30,
  password_expiry_days: 90,
  otp_length: 6,
  otp_expiry_mins: 5,
  session_timeout_mins: 30,
})

async function loadPolicy() {
  loading.value = true
  error.value = null
  try {
    const data = await passwordApi.getPasswordPolicy()
    console.log('API response:', JSON.stringify(data, null, 2))

    // Set formData BEFORE policy so the switches render with correct values
    // (the template gates on `policy` being non-null)
    formData.value = {
      min_length: data.min_length,
      require_uppercase: Boolean(data.require_uppercase),
      require_lowercase: Boolean(data.require_lowercase),
      require_numbers: Boolean(data.require_numbers),
      require_special_chars: Boolean(data.require_special_chars),
      max_failed_attempts: data.max_failed_attempts,
      lockout_duration_mins: data.lockout_duration_mins,
      password_expiry_days: data.password_expiry_days,
      otp_length: data.otp_length,
      otp_expiry_mins: data.otp_expiry_mins,
      session_timeout_mins: data.session_timeout_mins,
    }

    policy.value = data
  } catch (err) {
    console.error('Failed to load password policy:', err)
    error.value = 'Failed to load password policy'
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  error.value = null

  try {
    const updatedPolicy = await passwordApi.updatePasswordPolicy(formData.value)
    policy.value = updatedPolicy

    // Update form data to reflect the saved state from database - ensure booleans
    formData.value = {
      min_length: updatedPolicy.min_length,
      require_uppercase: Boolean(updatedPolicy.require_uppercase),
      require_lowercase: Boolean(updatedPolicy.require_lowercase),
      require_numbers: Boolean(updatedPolicy.require_numbers),
      require_special_chars: Boolean(updatedPolicy.require_special_chars),
      max_failed_attempts: updatedPolicy.max_failed_attempts,
      lockout_duration_mins: updatedPolicy.lockout_duration_mins,
      password_expiry_days: updatedPolicy.password_expiry_days,
      otp_length: updatedPolicy.otp_length,
      otp_expiry_mins: updatedPolicy.otp_expiry_mins,
      session_timeout_mins: updatedPolicy.session_timeout_mins,
    }

    // Show success dialog
    resultDialog.value = {
      open: true,
      type: 'success',
      title: 'Password Policy Updated',
      message: 'The password policy has been updated successfully. All new password validations will use these settings.',
    }
  } catch (err: any) {
    console.error('Failed to update password policy:', err)

    // Show error dialog
    resultDialog.value = {
      open: true,
      type: 'error',
      title: 'Failed to Update Password Policy',
      message: err?.response?.data?.message || 'Failed to update password policy. You may not have permission to perform this action.',
    }
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadPolicy()
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldCheck class="w-8 h-8 text-primary" />
          Password Policy
        </h1>
        <p class="text-muted-foreground mt-1">
          Configure password complexity, security settings, and authentication policies
        </p>
      </div>
    </div>

    <!-- Error Message (for loading errors) -->
    <div v-if="error" class="rounded-lg border border-destructive bg-destructive/10 p-4">
      <p class="text-sm text-destructive flex items-center gap-2">
        <AlertCircle class="w-4 h-4" />
        {{ error }}
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Policy Settings -->
    <div v-else-if="policy" class="grid gap-6">
      <!-- Password Complexity -->
      <div class="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <h2 class="text-xl font-semibold flex items-center gap-2">
            Password Complexity Requirements
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            Define the minimum requirements for user passwords
          </p>
        </div>

        <div class="grid gap-6">
          <!-- Min Length -->
          <div class="grid gap-2">
            <Label for="min-length">Minimum Password Length</Label>
            <input
              id="min-length"
              v-model.number="formData.min_length"
              type="number"
              min="6"
              max="128"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p class="text-xs text-muted-foreground">
              Minimum number of characters required (6-128)
            </p>
          </div>

          <!-- Complexity Toggles -->
          <div class="grid gap-4">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label>Require Uppercase Letters</Label>
                <p class="text-xs text-muted-foreground">At least one uppercase letter (A-Z)</p>
              </div>
              <Switch
                v-model="formData.require_uppercase"
              />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label>Require Lowercase Letters</Label>
                <p class="text-xs text-muted-foreground">At least one lowercase letter (a-z)</p>
              </div>
              <Switch
              v-model="formData.require_lowercase"
              />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label>Require Numbers</Label>
                <p class="text-xs text-muted-foreground">At least one numeric digit (0-9)</p>
              </div>
              <Switch
              v-model="formData.require_numbers"
              />
            </div>

            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <Label>Require Special Characters</Label>
                <p class="text-xs text-muted-foreground">At least one special character (!@#$%^&*)</p>
              </div>
              <Switch
                v-model="formData.require_special_chars"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Security Settings -->
      <div class="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <h2 class="text-xl font-semibold">Security Settings</h2>
          <p class="text-sm text-muted-foreground mt-1">
            Configure account lockout and password expiration policies
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <div class="grid gap-2">
            <Label for="max-failed-attempts">Maximum Failed Login Attempts</Label>
            <input
              id="max-failed-attempts"
              v-model.number="formData.max_failed_attempts"
              type="number"
              min="1"
              max="10"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p class="text-xs text-muted-foreground">
              Account locks after this many failed attempts
            </p>
          </div>

          <div class="grid gap-2">
            <Label for="lockout-duration">Lockout Duration (minutes)</Label>
            <input
              id="lockout-duration"
              v-model.number="formData.lockout_duration_mins"
              type="number"
              min="1"
              max="1440"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p class="text-xs text-muted-foreground">
              How long the account remains locked
            </p>
          </div>

          <div class="grid gap-2">
            <Label for="password-expiry">Password Expiry (days)</Label>
            <input
              id="password-expiry"
              v-model.number="formData.password_expiry_days"
              type="number"
              min="0"
              max="365"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p class="text-xs text-muted-foreground">
              Force password change after this many days (0 = never)
            </p>
          </div>

          <div class="grid gap-2">
            <Label for="session-timeout">Session Timeout (minutes)</Label>
            <input
              id="session-timeout"
              v-model.number="formData.session_timeout_mins"
              type="number"
              min="5"
              max="1440"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p class="text-xs text-muted-foreground">
              Automatic logout after inactivity
            </p>
          </div>
        </div>
      </div>

      <!-- OTP Settings -->
      <div class="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <h2 class="text-xl font-semibold">OTP Settings</h2>
          <p class="text-sm text-muted-foreground mt-1">
            Configure one-time password settings for enhanced security
          </p>
        </div>

        <div class="grid gap-6 md:grid-cols-2">
          <div class="grid gap-2">
            <Label for="otp-length">OTP Length</Label>
            <input
              id="otp-length"
              v-model.number="formData.otp_length"
              type="number"
              min="4"
              max="8"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p class="text-xs text-muted-foreground">
              Number of digits in OTP (4-8)
            </p>
          </div>

          <div class="grid gap-2">
            <Label for="otp-expiry">OTP Expiry (minutes)</Label>
            <input
              id="otp-expiry"
              v-model.number="formData.otp_expiry_mins"
              type="number"
              min="1"
              max="30"
              class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <p class="text-xs text-muted-foreground">
              How long OTP remains valid
            </p>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end">
        <Button @click="handleSave" :disabled="saving" size="lg">
          <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
          <Save v-else class="w-4 h-4 mr-2" />
          {{ saving ? 'Saving...' : 'Save Changes' }}
        </Button>
      </div>

      <!-- Last Updated Info -->
      <div v-if="policy.updated_at" class="text-xs text-muted-foreground text-center">
        Last updated: {{ new Date(policy.updated_at).toLocaleString() }}
      </div>
    </div>

    <!-- Result Dialog -->
    <ResultDialog
      :open="resultDialog.open"
      :type="resultDialog.type"
      :title="resultDialog.title"
      :message="resultDialog.message"
      @update:open="(val) => (resultDialog.open = val)"
    />
  </div>
</template>
