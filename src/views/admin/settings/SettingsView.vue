<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import {
  CalendarClock, UtensilsCrossed, ShieldCheck, ChevronRight,
  ScrollText, Settings2, Database, Loader2, Info, Printer,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useSettingsStore } from '@/stores/settings'
import { useMenusStore } from '@/stores/menus'
import { useBranchesStore } from '@/stores/branches'
import { useAuthStore } from '@/stores/auth'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { branchesApi } from '@/services/api/branches'
import { useRouter } from 'vue-router'
import type { Branch } from '@/types/branch'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import MapLocationPicker from '@/components/branches/MapLocationPicker.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

const router = useRouter()
const store = useSettingsStore()
const menusStore = useMenusStore()
const branchesStore = useBranchesStore()
const authStore = useAuthStore()
const branchFilterStore = useBranchFilterStore()

const isAdmin = computed(() => authStore.userRole === 'admin')

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'general' | 'database-jobs'
const activeTab = ref<Tab>('general')

// ── Database Jobs ─────────────────────────────────────────────────────────────
const CLOSE_KEYWORD = 'close-all'
const closeConfirmOpen = ref(false)
const closeKeywordInput = ref('')
const closingOrders = ref(false)
const keywordMatches = computed(() => closeKeywordInput.value === CLOSE_KEYWORD)

function openCloseConfirm() {
  closeKeywordInput.value = ''
  closeConfirmOpen.value = true
}

async function handleCloseAllOrders() {
  closingOrders.value = true
  try {
    await menusStore.closeAllOrders()
    toast.success('All orders have been closed.')
    closeConfirmOpen.value = false
  } catch (err) {
    toast.error(getApiError(err, 'Failed to close orders.'))
  } finally {
    closingOrders.value = false
  }
}

const autoExtendCheckout = ref(false)
const autoCloseOrders = ref(false)
const originalJobs = ref({ autoExtendCheckout: false, autoCloseOrders: false })
const savingJobs = ref(false)

function syncJobsFromStore() {
  if (!store.settings) return
  autoExtendCheckout.value = store.settings.auto_extend_checkout
  autoCloseOrders.value = store.settings.auto_close_orders
  originalJobs.value = {
    autoExtendCheckout: store.settings.auto_extend_checkout,
    autoCloseOrders: store.settings.auto_close_orders,
  }
}

watch(() => store.settings, syncJobsFromStore)

function discardJobs() {
  autoExtendCheckout.value = originalJobs.value.autoExtendCheckout
  autoCloseOrders.value = originalJobs.value.autoCloseOrders
}

async function saveJobs() {
  savingJobs.value = true
  try {
    await store.updateSettings({
      auto_extend_checkout: autoExtendCheckout.value,
      auto_close_orders: autoCloseOrders.value,
    })
    toast.success('Settings saved.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to save settings.'))
  } finally {
    savingJobs.value = false
  }
}

// ── General (Profile) ─────────────────────────────────────────────────────────
interface BranchForm {
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
  is_active: boolean
  printer_ip: string
  printer_port: number
  printer_name: string
}

function emptyBranchForm(): BranchForm {
  return {
    street_address: '', city: '', country: '',
    location: null, phone: '', email: '',
    check_in_time: '14:00', check_out_time: '11:00',
    parking: false, restaurant: false, is_active: true,
    printer_ip: '', printer_port: 9100, printer_name: '',
  }
}

// Org-level fields (name + logo only)
const orgName = ref('')
const orgLogoUrl = ref('')

// Branch-level fields
const branchForm = ref<BranchForm>(emptyBranchForm())

const profileSaving = ref(false)
const profileError = ref('')
const loadingBranchData = ref(false)
const currentBranch = ref<Branch | null>(null)

// Admins use the nav filter; non-admins are locked to their own branch_id (or null = unassigned)
const effectiveBranchId = computed<string | null>(() => {
  if (isAdmin.value) return branchFilterStore.selectedBranchId
  return authStore.user?.branch_id ?? null
})

const hasBranchSelected  = computed(() => !!effectiveBranchId.value)
const isUnassignedNonAdmin = computed(() => !isAdmin.value && !authStore.user?.branch_id)

function parseTime(val?: string | null): string {
  if (!val) return ''
  if (val.includes('T')) return (val.split('T')[1] ?? '').substring(0, 5)
  return val.substring(0, 5)
}

function syncOrgFromStore() {
  orgName.value    = store.lodgeProfile?.name     ?? ''
  orgLogoUrl.value = store.lodgeProfile?.logo_url ?? ''
}

function syncBranchForm(b: Branch) {
  branchForm.value = {
    street_address: b.street_address ?? '',
    city:           b.city           ?? '',
    country:        b.country        ?? '',
    location:       b.location       ?? null,
    phone:          b.phone          ?? '',
    email:          b.email          ?? '',
    check_in_time:  parseTime(b.check_in_time)  || '14:00',
    check_out_time: parseTime(b.check_out_time) || '11:00',
    parking:        b.parking    ?? false,
    restaurant:     b.restaurant ?? false,
    is_active:      b.is_active  ?? true,
    printer_ip:     b.printer_ip   ?? '',
    printer_port:   b.printer_port || 9100,
    printer_name:   b.printer_name ?? '',
  }
}

watch(() => store.lodgeProfile, syncOrgFromStore)

watch(effectiveBranchId, async (id) => {
  profileError.value = ''
  currentBranch.value = null
  branchForm.value = emptyBranchForm()
  if (!id) return

  loadingBranchData.value = true
  try {
    const b = await branchesApi.get(id)
    currentBranch.value = b
    syncBranchForm(b)
  } catch {
    toast.error('Failed to load branch details.')
  } finally {
    loadingBranchData.value = false
  }
})

async function saveProfile() {
  profileError.value = ''
  if (!orgName.value.trim()) { profileError.value = 'Organisation name is required.'; return }
  profileSaving.value = true
  try {
    const id = effectiveBranchId.value

    if (!id) {
      // No branch selected — admins can still save org name + logo
      await store.updateLodgeProfile({
        name:     orgName.value.trim(),
        logo_url: orgLogoUrl.value?.trim() || undefined,
      })
      toast.success('Organisation details saved.')
      return
    }

    // Branch selected: save org name/logo (admin only) + branch physical data in parallel
    const branchSave = branchesStore.updateBranch(id, {
      branch_code:    currentBranch.value?.branch_code ?? '',
      name:           currentBranch.value?.name        ?? '',
      street_address: branchForm.value.street_address.trim(),
      city:           branchForm.value.city.trim(),
      country:        branchForm.value.country.trim(),
      location:       branchForm.value.location        ?? null,
      phone:          branchForm.value.phone?.trim()   || undefined,
      email:          branchForm.value.email?.trim()   || undefined,
      check_in_time:  parseTime(branchForm.value.check_in_time)  || null,
      check_out_time: parseTime(branchForm.value.check_out_time) || null,
      parking:        branchForm.value.parking,
      restaurant:     branchForm.value.restaurant,
      is_active:      branchForm.value.is_active,
      printer_ip:     branchForm.value.printer_ip.trim()   || null,
      printer_port:   branchForm.value.printer_port || 9100,
      printer_name:   branchForm.value.printer_name.trim() || null,
    })
    const saves: Promise<unknown>[] = [branchSave]

    if (isAdmin.value) {
      saves.push(store.updateLodgeProfile({
        name:     orgName.value.trim(),
        logo_url: orgLogoUrl.value?.trim() || undefined,
      }))
    }

    await Promise.all(saves)
    // Refresh currentBranch from the save result so the Test Print button
    // enables immediately once a printer_ip has been saved, no reload needed.
    currentBranch.value = await branchSave
    toast.success('Settings saved.')
  } catch (err) {
    profileError.value = getApiError(err, 'Failed to save.')
    toast.error(profileError.value)
  } finally {
    profileSaving.value = false
  }
}

// ── Printer test ──────────────────────────────────────────────────────────────
// Only enabled once a printer IP is actually saved on the branch (currentBranch),
// not just typed into the unsaved form — the test dials whatever the backend has
// on record, so testing an unsaved edit would be misleading.
const testingPrinter = ref(false)

const canTestPrinter = computed(() => !!currentBranch.value?.printer_ip)

async function testPrinter() {
  if (!effectiveBranchId.value) return
  testingPrinter.value = true
  try {
    await branchesApi.testPrint(effectiveBranchId.value)
    toast.success('Test print sent — check the printer.')
  } catch (err) {
    toast.error(getApiError(err, 'Test print failed.'))
  } finally {
    testingPrinter.value = false
  }
}

function discardProfile() {
  syncOrgFromStore()
  if (currentBranch.value) syncBranchForm(currentBranch.value)
  else branchForm.value = emptyBranchForm()
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([
    store.fetchSettings().then(syncJobsFromStore),
    store.fetchLodgeProfile(),
    branchesStore.fetchBranches(),
  ])

  syncOrgFromStore()

  const id = effectiveBranchId.value
  if (id) {
    loadingBranchData.value = true
    try {
      const b = await branchesApi.get(id)
      currentBranch.value = b
      syncBranchForm(b)
    } catch {
      toast.error('Failed to load branch details.')
    } finally {
      loadingBranchData.value = false
    }
  }
})
</script>

<template>
  <DashboardHeader title="Settings" />

  <div class="flex flex-col min-h-0 flex-1">
    <!-- Tab bar -->
    <div class="border-b flex px-6">
      <button
        class="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
        :class="activeTab === 'general'
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'general'"
      >
        <Settings2 class="size-4" />
        General
      </button>
      <button
        class="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
        :class="activeTab === 'database-jobs'
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground'"
        @click="activeTab = 'database-jobs'"
      >
        <Database class="size-4" />
        Database Jobs
      </button>
    </div>

    <!-- ── General tab ─────────────────────────────────────────────────────── -->
    <div v-show="activeTab === 'general'" class="flex flex-col gap-5 p-6 overflow-y-auto flex-1">

      <div v-if="loadingBranchData || store.profileLoading" class="flex items-center justify-center py-16">
        <Loader2 class="size-6 animate-spin text-muted-foreground" />
      </div>

      <template v-else>
        <div v-if="profileError" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ profileError }}
        </div>

        <!-- ── Organisation (name + logo — always visible) ──────────────────── -->
        <div class="grid gap-2">
          <Label for="org_name">
            Organisation Name *
            <span v-if="!isAdmin" class="text-xs text-muted-foreground font-normal ml-1">(admin only)</span>
          </Label>
          <Input
            id="org_name"
            v-model="orgName"
            placeholder="e.g. The Meridian Inn"
            :disabled="!isAdmin"
          />
        </div>

        <div class="grid gap-2">
          <Label for="org_logo">
            Logo URL
            <span class="text-muted-foreground font-normal">(optional)</span>
            <span v-if="!isAdmin" class="text-xs text-muted-foreground font-normal ml-1">(admin only)</span>
          </Label>
          <Input
            id="org_logo"
            v-model="orgLogoUrl"
            type="url"
            placeholder="https://..."
            :disabled="!isAdmin"
          />
        </div>

        <!-- ── Unassigned non-admin notice ─────────────────────────────────── -->
        <div
          v-if="isUnassignedNonAdmin"
          class="flex items-start gap-3 rounded-lg border border-dashed p-5 text-muted-foreground"
        >
          <Info class="size-4 shrink-0 mt-0.5" />
          <div class="text-sm">
            <p class="font-medium text-foreground mb-0.5">No branch assigned</p>
            <p>You are not currently assigned to a branch. Contact your administrator to be assigned to a branch.</p>
          </div>
        </div>

        <!-- ── Admin: no branch selected notice ───────────────────────────── -->
        <div
          v-else-if="isAdmin && !hasBranchSelected"
          class="flex items-start gap-3 rounded-lg border border-dashed p-5 text-muted-foreground"
        >
          <Info class="size-4 shrink-0 mt-0.5" />
          <div class="text-sm">
            <p class="font-medium text-foreground mb-0.5">No branch selected</p>
            <p>Select a branch from the dropdown in the top navigation to view and edit its address, contact, facilities, and location settings.</p>
          </div>
        </div>

        <!-- ── Branch fields (any role with a branch selected) ────────────── -->
        <template v-if="hasBranchSelected">
          <div class="flex items-center gap-2 text-sm text-muted-foreground -mb-1">
            <span
              class="size-2 rounded-full shrink-0"
              :class="currentBranch?.is_main ? 'bg-primary' : 'bg-green-500'"
            />
            Editing settings for: <strong class="text-foreground">{{ currentBranch?.name ?? '…' }}</strong>
          </div>

          <div class="grid gap-2">
            <Label for="org_address">Street Address</Label>
            <Input id="org_address" v-model="branchForm.street_address" placeholder="e.g. 123 Cairo Road" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="org_city">City</Label>
              <Input id="org_city" v-model="branchForm.city" placeholder="e.g. Lusaka" />
            </div>
            <div class="grid gap-2">
              <Label for="org_country">Country</Label>
              <Input id="org_country" v-model="branchForm.country" placeholder="e.g. Zambia" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="org_phone">Phone</Label>
              <Input id="org_phone" v-model="branchForm.phone" type="tel" placeholder="+260 97 000 0000" />
            </div>
            <div class="grid gap-2">
              <Label for="org_email">Email</Label>
              <Input id="org_email" v-model="branchForm.email" type="email" placeholder="info@lodge.com" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="org_checkin">Check-in Time</Label>
              <Input id="org_checkin" v-model="branchForm.check_in_time" type="time" />
            </div>
            <div class="grid gap-2">
              <Label for="org_checkout">Check-out Time</Label>
              <Input id="org_checkout" v-model="branchForm.check_out_time" type="time" />
            </div>
          </div>

          <!-- ── Receipt printer ─────────────────────────────────────────────── -->
          <div class="grid gap-3 rounded-lg border p-4">
            <div>
              <p class="text-sm font-medium">Receipt Printer</p>
              <p class="text-xs text-muted-foreground">Network printer for this branch (e.g. Epson TM-T88VI over Ethernet)</p>
            </div>
            <div class="grid grid-cols-3 gap-4">
              <div class="grid gap-2 col-span-2">
                <Label for="printer_ip">Printer IP Address</Label>
                <Input id="printer_ip" v-model="branchForm.printer_ip" placeholder="e.g. 192.168.1.50" />
              </div>
              <div class="grid gap-2">
                <Label for="printer_port">Port</Label>
                <Input id="printer_port" v-model.number="branchForm.printer_port" type="number" placeholder="9100" />
              </div>
            </div>
            <div class="grid gap-2">
              <Label for="printer_name">Label <span class="text-muted-foreground font-normal">(optional)</span></Label>
              <Input id="printer_name" v-model="branchForm.printer_name" placeholder="e.g. Front Desk Receipt Printer" />
            </div>
            <div class="flex items-center justify-between gap-3 pt-1">
              <p class="text-xs text-muted-foreground">
                {{ canTestPrinter ? 'Sends a short test receipt to the saved printer.' : 'Save a printer IP first to enable testing.' }}
              </p>
              <Button
                type="button" variant="outline" size="sm"
                :disabled="!canTestPrinter || testingPrinter"
                @click="testPrinter"
              >
                <Loader2 v-if="testingPrinter" class="size-3.5 mr-1.5 animate-spin" />
                <Printer v-else class="size-3.5 mr-1.5" />
                Test Print
              </Button>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p class="text-sm font-medium">Parking</p>
                <p class="text-xs text-muted-foreground">On-site parking available</p>
              </div>
              <Switch
                :model-value="branchForm.parking"
                @update:model-value="(v) => branchForm.parking = !!v"
              />
            </div>
            <div class="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p class="text-sm font-medium">Restaurant</p>
                <p class="text-xs text-muted-foreground">On-site dining available</p>
              </div>
              <Switch
                :model-value="branchForm.restaurant"
                @update:model-value="(v) => branchForm.restaurant = !!v"
              />
            </div>
          </div>

          <div class="grid gap-2">
            <Label>Location <span class="text-muted-foreground font-normal">(optional)</span></Label>
            <MapLocationPicker v-model="branchForm.location" />
          </div>

          <div class="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p class="text-sm font-medium">Active</p>
              <p class="text-xs text-muted-foreground">Branch is operational and visible to staff</p>
            </div>
            <Switch
              :model-value="branchForm.is_active"
              @update:model-value="(v) => branchForm.is_active = !!v"
            />
          </div>
        </template>

        <!-- Save row — hidden for unassigned non-admins -->
        <div v-if="!isUnassignedNonAdmin" class="flex items-center justify-end gap-3 py-4 border-t">
          <Button variant="ghost" :disabled="profileSaving" @click="discardProfile">
            Discard Changes
          </Button>
          <Button
            v-if="isAdmin || hasBranchSelected"
            :disabled="profileSaving || store.profileLoading"
            @click="saveProfile"
          >
            <Loader2 v-if="profileSaving" class="size-4 animate-spin mr-2" />
            Save Settings
          </Button>
        </div>
      </template>
    </div>

    <!-- ── Database Jobs tab ───────────────────────────────────────────────── -->
    <div v-show="activeTab === 'database-jobs'" class="flex flex-col gap-8 p-6 flex-1">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Overstay Management -->
        <div class="rounded-xl border bg-card flex flex-col p-5 gap-4">
          <div class="flex items-start justify-between gap-2">
            <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarClock class="size-4 text-primary" />
            </div>
            <span class="flex items-center gap-1.5 text-xs font-semibold">
              <span :class="['size-1.5 rounded-full', autoExtendCheckout ? 'bg-emerald-500' : 'bg-muted-foreground/50']" />
              <span :class="autoExtendCheckout ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'">
                {{ autoExtendCheckout ? 'RUNNING' : 'IDLE' }}
              </span>
            </span>
          </div>
          <div class="flex-1">
            <p class="font-semibold text-sm mb-1.5">Overstay Management</p>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Automatically updates the checkout date to the current date for guests who have exceeded their scheduled stay.
            </p>
          </div>
          <div class="flex items-center justify-between pt-1 border-t">
            <span class="text-xs text-muted-foreground">Auto-update Overstay Checkouts</span>
            <button
              type="button"
              :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', autoExtendCheckout ? 'bg-primary' : 'bg-input']"
              @click="autoExtendCheckout = !autoExtendCheckout"
            >
              <span :class="['pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform', autoExtendCheckout ? 'translate-x-4' : 'translate-x-0']" />
            </button>
          </div>
        </div>

        <!-- Order Lifecycle -->
        <div class="rounded-xl border bg-card flex flex-col p-5 gap-4">
          <div class="flex items-start justify-between gap-2">
            <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UtensilsCrossed class="size-4 text-primary" />
            </div>
            <span class="flex items-center gap-1.5 text-xs font-semibold">
              <span :class="['size-1.5 rounded-full', autoCloseOrders ? 'bg-emerald-500' : 'bg-muted-foreground/50']" />
              <span :class="autoCloseOrders ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'">
                {{ autoCloseOrders ? 'RUNNING' : 'IDLE' }}
              </span>
            </span>
          </div>
          <div class="flex-1">
            <p class="font-semibold text-sm mb-1.5">Order Lifecycle</p>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Automatically marks all orders from the previous day as "Closed" at midnight. If disabled, orders must be closed manually.
            </p>
          </div>
          <div class="flex flex-col gap-3 pt-1 border-t">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Daily Order Reset</span>
              <button
                type="button"
                :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', autoCloseOrders ? 'bg-primary' : 'bg-input']"
                @click="autoCloseOrders = !autoCloseOrders"
              >
                <span :class="['pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform', autoCloseOrders ? 'translate-x-4' : 'translate-x-0']" />
              </button>
            </div>
            <Button v-if="!autoCloseOrders" class="w-full" @click="openCloseConfirm">
              Close Manually
            </Button>
          </div>
        </div>

        <!-- Password Policy -->
        <div class="rounded-xl border bg-card flex flex-col p-5 gap-4">
          <div class="flex items-start justify-between gap-2">
            <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck class="size-4 text-primary" />
            </div>
          </div>
          <div class="flex-1">
            <p class="font-semibold text-sm mb-1.5">Password Policy</p>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Configure security requirements for system access, including complexity, rotation, and lockout parameters.
            </p>
          </div>
          <button
            type="button"
            class="flex items-center justify-between pt-1 border-t text-xs text-muted-foreground hover:text-foreground transition-colors"
            @click="router.push({ name: 'password-policy' })"
          >
            <span class="font-medium">Policy Settings</span>
            <ChevronRight class="size-3.5" />
          </button>
        </div>

        <!-- System Logs -->
        <div class="rounded-xl border bg-card flex flex-col p-5 gap-4">
          <div class="flex items-start justify-between gap-2">
            <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ScrollText class="size-4 text-primary" />
            </div>
          </div>
          <div class="flex-1">
            <p class="font-semibold text-sm mb-1.5">System Logs</p>
            <p class="text-xs text-muted-foreground leading-relaxed">
              View a full audit trail of automated system actions, including overstay detections and daily order resets.
            </p>
          </div>
          <button
            type="button"
            class="flex items-center justify-between pt-1 border-t text-xs text-muted-foreground hover:text-foreground transition-colors"
            @click="router.push({ name: 'audit-logs' })"
          >
            <span class="font-medium">View Logs</span>
            <ChevronRight class="size-3.5" />
          </button>
        </div>
      </div>

      <div class="flex-1" />

      <div class="flex items-center justify-end gap-3 py-4 border-t">
        <Button variant="ghost" :disabled="savingJobs" @click="discardJobs">
          Discard Changes
        </Button>
        <Button :disabled="savingJobs || store.loading" @click="saveJobs">
          Save Settings
        </Button>
      </div>
    </div>
  </div>

  <!-- Close All Orders confirmation dialog -->
  <Dialog v-model:open="closeConfirmOpen">
    <DialogContent class="max-w-md gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="text-lg font-semibold">Close All Orders</DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground mt-1">
          This will mark all open orders as closed. This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <div class="px-6 py-5 flex flex-col gap-4">
        <p class="text-sm text-muted-foreground">
          Type <strong class="text-foreground font-mono">{{ CLOSE_KEYWORD }}</strong> to confirm.
        </p>
        <Input v-model="closeKeywordInput" placeholder="close-all" @keydown.enter="keywordMatches && handleCloseAllOrders()" />
      </div>
      <DialogFooter class="px-6 pb-6 pt-2 flex-col gap-2 sm:flex-col">
        <Button class="w-full py-5" :disabled="!keywordMatches || closingOrders" @click="handleCloseAllOrders">
          Close All Orders
        </Button>
        <Button variant="ghost" class="w-full py-5" :disabled="closingOrders" @click="closeConfirmOpen = false">
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
