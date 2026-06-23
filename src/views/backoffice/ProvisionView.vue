<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBackofficeStore } from '@/stores/backoffice'
import { Loader2, CheckCircle, ChevronRight, ChevronLeft, ImagePlus, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import MapLocationPicker from '@/components/branches/MapLocationPicker.vue'
import { uploadOrgLogo } from '@/services/storage'

const router = useRouter()
const store = useBackofficeStore()

const step = ref(1)
const TOTAL_STEPS = 2
const stepLabels = ['Organisation Details', 'Admin Account']

// ── Logo picker state ─────────────────────────────────────────────────────────
const logoFile = ref<File | null>(null)
const logoPreview = ref<string>('')
const logoDragging = ref(false)
const logoInput = ref<HTMLInputElement | null>(null)

const LOGO_ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
const LOGO_MAX = 5 * 1024 * 1024

function onLogoFiles(files: FileList | File[]) {
  const file = Array.from(files)[0]
  if (!file) return
  if (!LOGO_ACCEPTED.includes(file.type)) {
    return
  }
  if (file.size > LOGO_MAX) return
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
}

function clearLogo() {
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
  logoFile.value = null
  logoPreview.value = ''
  if (logoInput.value) logoInput.value.value = ''
}

interface OrgForm {
  name: string
  logo_url: string
  street_address: string
  city: string
  country: string
  location: string | null
  phone: string
  email: string
  check_in_time: string
  check_out_time: string
  parking: boolean
  restaurant: boolean
}

const org = ref<OrgForm>({
  name: '',
  logo_url: '',
  street_address: '',
  city: '',
  country: '',
  location: null,
  phone: '',
  email: '',
  check_in_time: '14:00',
  check_out_time: '11:00',
  parking: false,
  restaurant: false,
})

const admin = ref({ full_name: '', email: '' })

const submitting = ref(false)
const submitError = ref('')
const done = ref(false)
const provisionedOrgName = ref('')

const canProceed = computed(() => {
  if (step.value === 1) return org.value.name.trim() && org.value.email.trim()
  if (step.value === 2) return admin.value.full_name.trim() && admin.value.email.trim()
  return false
})

function next() { if (step.value < TOTAL_STEPS) step.value++ }
function back() { if (step.value > 1) step.value-- }

async function submit() {
  submitting.value = true
  submitError.value = ''
  try {
    // Provision first to get the org id, then upload logo if provided.
    const res = await store.provision({
      organization: {
        name:           org.value.name.trim(),
        email:          org.value.email.trim(),
        phone:          org.value.phone?.trim()        || undefined,
        logo_url:       undefined,
        street_address: org.value.street_address.trim(),
        city:           org.value.city.trim(),
        country:        org.value.country.trim(),
        location:       org.value.location             ?? null,
        check_in_time:  org.value.check_in_time        || null,
        check_out_time: org.value.check_out_time       || null,
        parking:        org.value.parking,
        restaurant:     org.value.restaurant,
      },
      admin: { full_name: admin.value.full_name, email: admin.value.email },
    })

    if (logoFile.value) {
      try {
        const url = await uploadOrgLogo(res.organization.id, logoFile.value)
        await store.updateOrgLogo(res.organization.id, url)
      } catch {
        // Logo upload failing shouldn't block provisioning success
      }
    }

    provisionedOrgName.value = res.organization.name
    done.value = true
  } catch (err: any) {
    submitError.value = err?.error?.message ?? 'Provisioning failed. Please try again.'
  } finally {
    submitting.value = false
  }
}

function reset() {
  done.value = false
  step.value = 1
  org.value = {
    name: '', logo_url: '', street_address: '', city: '', country: '',
    location: null, phone: '', email: '',
    check_in_time: '14:00', check_out_time: '11:00',
    parking: false, restaurant: false,
  }
  admin.value = { full_name: '', email: '' }
  submitError.value = ''
  clearLogo()
}
</script>

<template>
  <div class="flex flex-col gap-6 p-6 max-w-2xl mx-auto w-full">
    <!-- Success state -->
    <div v-if="done" class="rounded-xl border bg-card p-10 text-center">
      <div class="flex size-14 items-center justify-center rounded-full bg-accent/10 mx-auto mb-4">
        <CheckCircle class="size-7 text-accent" />
      </div>
      <h2 class="text-xl font-semibold mb-2">Organisation Provisioned</h2>
      <p class="text-sm text-muted-foreground mb-6">
        <strong>{{ provisionedOrgName }}</strong> has been provisioned successfully.
        The admin will receive an email with their login credentials.
      </p>
      <div class="flex gap-3 justify-center">
        <Button variant="outline" @click="router.push({ name: 'backoffice-organizations' })">
          View Organisations
        </Button>
        <Button @click="reset">Provision Another</Button>
      </div>
    </div>

    <template v-else>
      <!-- Stepper -->
      <div class="flex items-center gap-2">
        <div v-for="(label, i) in stepLabels" :key="i" class="flex items-center gap-2">
          <div class="flex items-center gap-2">
            <div
              class="flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors"
              :class="i + 1 <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
            >
              <CheckCircle v-if="i + 1 < step" class="size-4" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span
              class="text-sm font-medium transition-colors"
              :class="i + 1 === step ? 'text-foreground' : 'text-muted-foreground'"
            >{{ label }}</span>
          </div>
          <div v-if="i < stepLabels.length - 1" class="flex-1 h-px bg-border mx-2 w-8" />
        </div>
      </div>

      <!-- Form card -->
      <div class="rounded-xl border bg-card overflow-hidden">
        <div class="px-6 py-4 border-b">
          <h2 class="font-semibold">{{ stepLabels[step - 1] }}</h2>
          <p class="text-sm text-muted-foreground mt-0.5">
            {{ step === 1
              ? 'Enter identity, contact, and facility details for the new organisation.'
              : 'Create the initial administrator account for this organisation.' }}
          </p>
        </div>

        <div class="p-6">
          <div v-if="submitError" class="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p class="text-sm text-destructive">{{ submitError }}</p>
          </div>

          <!-- Step 1: Org details -->
          <div v-if="step === 1" class="flex flex-col gap-4">
            <!-- Name -->
            <div class="grid gap-2">
              <Label for="org_name">Organisation Name <span class="text-destructive">*</span></Label>
              <Input id="org_name" v-model="org.name" placeholder="e.g. The Meridian Inn" />
            </div>

            <!-- Logo upload -->
            <div class="grid gap-2">
              <Label>Logo <span class="text-muted-foreground font-normal text-xs">(optional · JPG, PNG, WebP, SVG · max 5 MB)</span></Label>

              <!-- Preview -->
              <div v-if="logoPreview" class="relative w-24 h-24 rounded-xl border overflow-hidden bg-muted group">
                <img :src="logoPreview" alt="Logo preview" class="w-full h-full object-contain p-1" />
                <button
                  type="button"
                  class="absolute top-1 right-1 size-5 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="clearLogo"
                >
                  <X class="size-3" />
                </button>
              </div>

              <!-- Drop zone (shown when no file selected) -->
              <div
                v-else
                class="relative rounded-xl border-2 border-dashed transition-colors cursor-pointer"
                :class="logoDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40 bg-muted/20'"
                @click="logoInput?.click()"
                @dragover.prevent="logoDragging = true"
                @dragleave="logoDragging = false"
                @drop.prevent="e => { logoDragging = false; if (e.dataTransfer?.files) onLogoFiles(e.dataTransfer.files) }"
              >
                <div class="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ImagePlus class="size-5" />
                  </div>
                  <p class="text-sm font-medium text-foreground">Drag & drop or click to upload</p>
                  <p class="text-xs text-muted-foreground">JPG, PNG, WebP, SVG</p>
                </div>
              </div>

              <input
                ref="logoInput"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                class="hidden"
                @change="e => { const t = e.target as HTMLInputElement; if (t.files) onLogoFiles(t.files) }"
              />
            </div>

            <!-- Address -->
            <div class="grid gap-2">
              <Label for="org_address">Street Address</Label>
              <Input id="org_address" v-model="org.street_address" placeholder="e.g. 123 Cairo Road" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="grid gap-2">
                <Label for="org_city">City</Label>
                <Input id="org_city" v-model="org.city" placeholder="e.g. Lusaka" />
              </div>
              <div class="grid gap-2">
                <Label for="org_country">Country</Label>
                <Input id="org_country" v-model="org.country" placeholder="e.g. Zambia" />
              </div>
            </div>

            <!-- Contact -->
            <div class="grid grid-cols-2 gap-4">
              <div class="grid gap-2">
                <Label for="org_phone">Phone</Label>
                <Input id="org_phone" v-model="org.phone" type="tel" placeholder="+260 97 000 0000" />
              </div>
              <div class="grid gap-2">
                <Label for="org_email">Contact Email <span class="text-destructive">*</span></Label>
                <Input id="org_email" v-model="org.email" type="email" placeholder="ops@lodge.com" />
              </div>
            </div>

            <!-- Check-in / Check-out -->
            <div class="grid grid-cols-2 gap-4">
              <div class="grid gap-2">
                <Label for="org_checkin">Check-in Time</Label>
                <Input id="org_checkin" v-model="org.check_in_time" type="time" />
              </div>
              <div class="grid gap-2">
                <Label for="org_checkout">Check-out Time</Label>
                <Input id="org_checkout" v-model="org.check_out_time" type="time" />
              </div>
            </div>

            <!-- Facilities -->
            <div class="grid grid-cols-2 gap-3">
              <div class="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p class="text-sm font-medium">Parking</p>
                  <p class="text-xs text-muted-foreground">On-site parking available</p>
                </div>
                <Switch
                  :model-value="org.parking"
                  @update:model-value="(v) => org.parking = !!v"
                />
              </div>
              <div class="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p class="text-sm font-medium">Restaurant</p>
                  <p class="text-xs text-muted-foreground">On-site dining available</p>
                </div>
                <Switch
                  :model-value="org.restaurant"
                  @update:model-value="(v) => org.restaurant = !!v"
                />
              </div>
            </div>

            <!-- Map -->
            <div class="grid gap-2">
              <Label>Location <span class="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <MapLocationPicker v-model="org.location" />
            </div>
          </div>

          <!-- Step 2: Admin account -->
          <div v-if="step === 2" class="flex flex-col gap-4">
            <div class="grid gap-2">
              <Label for="admin_name">Full Name <span class="text-destructive">*</span></Label>
              <Input id="admin_name" v-model="admin.full_name" placeholder="Jane Doe" />
            </div>
            <div class="grid gap-2">
              <Label for="admin_email">Email Address <span class="text-destructive">*</span></Label>
              <Input id="admin_email" v-model="admin.email" type="email" placeholder="jane@lodge.com" />
            </div>
            <p class="text-xs text-muted-foreground">
              A temporary password will be generated and emailed to the admin. They will be required to change it on first login.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" :disabled="step === 1 || submitting" @click="back">
            <ChevronLeft class="size-4 mr-1" />
            Back
          </Button>
          <Button v-if="step < TOTAL_STEPS" :disabled="!canProceed" @click="next">
            Continue
            <ChevronRight class="size-4 ml-1" />
          </Button>
          <Button v-else :disabled="!canProceed || submitting" @click="submit">
            <Loader2 v-if="submitting" class="size-4 animate-spin mr-2" />
            Provision Organisation
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
