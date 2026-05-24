<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ShieldCheck, FileText, Info, ArrowLeft, Save } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { passwordPolicyApi } from '@/services/api/settings'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const router = useRouter()

const minLength = ref(8)
const requireUppercase = ref(true)
const requireLowercase = ref(true)
const requireNumbers = ref(true)
const requireSpecial = ref(true)
const expiryDays = ref(90)
const maxAttempts = ref(5)
const lockoutMinutes = ref(30)

const saving = ref(false)
const loading = ref(false)

const complexityCount = computed(() =>
  [requireUppercase.value, requireLowercase.value, requireNumbers.value, requireSpecial.value].filter(Boolean).length,
)
const complexityLabel = computed(() => {
  const c = complexityCount.value
  if (c === 4) return 'High (4/4)'
  if (c >= 2) return `Medium (${c}/4)`
  return `Low (${c}/4)`
})

onMounted(async () => {
  loading.value = true
  try {
    const policy = await passwordPolicyApi.get()
    minLength.value = policy.min_length
    requireUppercase.value = policy.require_uppercase
    requireLowercase.value = policy.require_lowercase
    requireNumbers.value = policy.require_numbers
    requireSpecial.value = policy.require_special_chars
    expiryDays.value = policy.password_expiry_days
    maxAttempts.value = policy.max_failed_attempts
    lockoutMinutes.value = policy.lockout_duration_mins
  } catch {
    // use defaults if no policy set yet
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  try {
    await passwordPolicyApi.update({
      min_length: minLength.value,
      require_uppercase: requireUppercase.value,
      require_lowercase: requireLowercase.value,
      require_numbers: requireNumbers.value,
      require_special_chars: requireSpecial.value,
      password_expiry_days: expiryDays.value,
      max_failed_attempts: maxAttempts.value,
      lockout_duration_mins: lockoutMinutes.value,
    })
    toast.success('Password policy saved.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to save password policy.'))
  } finally {
    saving.value = false
  }
}

function discard() {
  minLength.value = 8
  requireUppercase.value = true
  requireLowercase.value = true
  requireNumbers.value = true
  requireSpecial.value = true
  expiryDays.value = 90
  maxAttempts.value = 5
  lockoutMinutes.value = 30
}
</script>

<template>
  <DashboardHeader title="Password Policy" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Back -->
    <div>
      <Button variant="ghost" class="-ml-2" @click="router.push({ name: 'settings' })">
        <ArrowLeft class="size-4 mr-2" />
        Back to Settings
      </Button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left: requirements -->
      <div class="lg:col-span-2 flex flex-col gap-6">
        <!-- Password Requirements card -->
        <div class="rounded-xl border bg-card p-6 flex flex-col gap-6">
          <div class="flex items-center gap-2">
            <ShieldCheck class="size-5 text-primary" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password Requirements</h3>
          </div>
          <hr class="border-border" />

          <!-- Min length -->
          <div class="flex flex-col gap-1.5">
            <Label for="min-length">Minimum Password Length</Label>
            <Input
              id="min-length"
              v-model.number="minLength"
              type="number"
              min="6"
              max="32"
              class="w-28"
            />
            <p class="text-xs text-muted-foreground italic">Must be between 6 and 32 characters long.</p>
          </div>

          <!-- Complexity toggles -->
          <div class="flex flex-col gap-1.5">
            <Label>Complexity Requirements</Label>
            <div class="flex flex-col gap-4 mt-2">
              <div class="flex items-center justify-between">
                <span class="text-sm">Must contain uppercase letters</span>
                <button
                  type="button"
                  :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', requireUppercase ? 'bg-primary' : 'bg-input']"
                  @click="requireUppercase = !requireUppercase"
                >
                  <span :class="['pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform', requireUppercase ? 'translate-x-4' : 'translate-x-0']" />
                </button>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm">Must contain lowercase letters</span>
                <button
                  type="button"
                  :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', requireLowercase ? 'bg-primary' : 'bg-input']"
                  @click="requireLowercase = !requireLowercase"
                >
                  <span :class="['pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform', requireLowercase ? 'translate-x-4' : 'translate-x-0']" />
                </button>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm">Must contain numbers</span>
                <button
                  type="button"
                  :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', requireNumbers ? 'bg-primary' : 'bg-input']"
                  @click="requireNumbers = !requireNumbers"
                >
                  <span :class="['pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform', requireNumbers ? 'translate-x-4' : 'translate-x-0']" />
                </button>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm">Must contain special characters</span>
                <button
                  type="button"
                  :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', requireSpecial ? 'bg-primary' : 'bg-input']"
                  @click="requireSpecial = !requireSpecial"
                >
                  <span :class="['pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform', requireSpecial ? 'translate-x-4' : 'translate-x-0']" />
                </button>
              </div>
            </div>
          </div>

          <!-- Expiry -->
          <div class="flex flex-col gap-1.5">
            <Label for="expiry">Password Expiry</Label>
            <div class="relative w-28">
              <Input
                id="expiry"
                v-model.number="expiryDays"
                type="number"
                min="0"
                class="pr-10"
              />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">days</span>
            </div>
            <p class="text-xs text-muted-foreground italic">Users will be prompted to change their password after this interval.</p>
          </div>
        </div>

        <!-- Account Lockout card -->
        <div class="rounded-xl border bg-card p-6 flex flex-col gap-6">
          <div class="flex items-center gap-2">
            <ShieldCheck class="size-5 text-primary" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Lockout</h3>
          </div>
          <hr class="border-border" />

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div class="flex flex-col gap-1.5">
              <Label for="max-attempts">Max Failed Attempts</Label>
              <div class="relative w-28">
                <Input
                  id="max-attempts"
                  v-model.number="maxAttempts"
                  type="number"
                  min="1"
                  max="20"
                  class="pr-16"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">attempts</span>
              </div>
              <p class="text-xs text-muted-foreground italic">Account is locked after this many consecutive failures.</p>
            </div>
            <div class="flex flex-col gap-1.5">
              <Label for="lockout">Lockout Duration</Label>
              <div class="relative w-28">
                <Input
                  id="lockout"
                  v-model.number="lockoutMinutes"
                  type="number"
                  min="1"
                  class="pr-10"
                />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">min</span>
              </div>
              <p class="text-xs text-muted-foreground italic">How long the account remains locked before auto-unlock.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: summary + actions -->
      <div class="flex flex-col gap-4">
        <!-- Summary -->
        <div class="rounded-xl border bg-card p-6 flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <FileText class="size-5 text-primary" />
            <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Policy Summary</h3>
          </div>
          <hr class="border-border" />

          <dl class="flex flex-col gap-3">
            <div class="flex justify-between text-sm">
              <dt class="text-muted-foreground">Min Length</dt>
              <dd class="font-medium">{{ minLength }} Characters</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-muted-foreground">Complexity</dt>
              <dd class="font-medium">{{ complexityLabel }}</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-muted-foreground">Expiry</dt>
              <dd class="font-medium">{{ expiryDays }} Days</dd>
            </div>
            <div class="flex justify-between text-sm pt-3 border-t">
              <dt class="text-muted-foreground">Max Attempts</dt>
              <dd class="font-medium">{{ maxAttempts }} Attempts</dd>
            </div>
            <div class="flex justify-between text-sm">
              <dt class="text-muted-foreground">Lockout</dt>
              <dd class="font-medium">{{ lockoutMinutes }} Minutes</dd>
            </div>
          </dl>

          <div class="flex items-start gap-2 rounded-lg bg-muted/50 p-3 mt-1">
            <Info class="size-4 text-primary shrink-0 mt-0.5" />
            <p class="text-xs text-muted-foreground">Changes will take effect for all users upon their next login session.</p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2">
          <Button class="w-full" :disabled="saving" @click="save">
            <Save class="size-4 mr-2" />
            {{ saving ? 'Saving…' : 'Save Policy' }}
          </Button>
          <Button variant="outline" class="w-full" :disabled="saving" @click="discard">
            Discard Changes
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
