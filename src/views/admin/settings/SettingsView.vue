<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { CalendarClock, UtensilsCrossed, ShieldCheck, ChevronRight, ScrollText } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useSettingsStore } from '@/stores/settings'
import { useMenusStore } from '@/stores/menus'
import { useRouter } from 'vue-router'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const router = useRouter()
const store = useSettingsStore()
const menusStore = useMenusStore()

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

// Local form state — mirrors API fields
const autoExtendCheckout = ref(false)
const autoCloseOrders = ref(false)

// Track original values to know if there are unsaved changes
const original = ref({ autoExtendCheckout: false, autoCloseOrders: false })

const saving = ref(false)

onMounted(async () => {
  await store.fetchSettings()
  syncFromStore()
})

function syncFromStore() {
  if (!store.settings) return
  autoExtendCheckout.value = store.settings.auto_extend_checkout
  autoCloseOrders.value = store.settings.auto_close_orders
  original.value = {
    autoExtendCheckout: store.settings.auto_extend_checkout,
    autoCloseOrders: store.settings.auto_close_orders,
  }
}

watch(() => store.settings, syncFromStore)

function discard() {
  autoExtendCheckout.value = original.value.autoExtendCheckout
  autoCloseOrders.value = original.value.autoCloseOrders
}

async function save() {
  saving.value = true
  try {
    await store.updateSettings({
      auto_extend_checkout: autoExtendCheckout.value,
      auto_close_orders: autoCloseOrders.value,
    })
    toast.success('Settings saved.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to save settings.'))
  } finally {
    saving.value = false
  }
}

</script>

<template>
  <DashboardHeader title="Settings" />

  <div class="flex flex-col gap-8 p-6 flex-1 min-h-0">
    <!-- Section: Database Jobs -->
    <section>
      <h2 class="text-base font-semibold flex items-center gap-2 mb-4">
        <div class="size-5 rounded bg-primary/10 flex items-center justify-center">
          <div class="size-2.5 rounded-sm border-2 border-primary" />
        </div>
        Database Jobs
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Overstay Management -->
        <div class="rounded-xl border bg-card flex flex-col p-5 gap-4">
          <div class="flex items-start justify-between gap-2">
            <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarClock class="size-4 text-primary" />
            </div>
            <span class="flex items-center gap-1.5 text-xs font-semibold">
              <span
                :class="[
                  'size-1.5 rounded-full',
                  autoExtendCheckout ? 'bg-emerald-500' : 'bg-muted-foreground/50',
                ]"
              />
              <span
                :class="[
                  autoExtendCheckout
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground',
                ]"
              >
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

          <!-- Toggle -->
          <div class="flex items-center justify-between pt-1 border-t">
            <span class="text-xs text-muted-foreground">Auto-update Overstay Checkouts</span>
            <button
              type="button"
              :class="[
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                autoExtendCheckout ? 'bg-primary' : 'bg-input',
              ]"
              @click="autoExtendCheckout = !autoExtendCheckout"
            >
              <span
                :class="[
                  'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform',
                  autoExtendCheckout ? 'translate-x-4' : 'translate-x-0',
                ]"
              />
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
              <span
                :class="[
                  'size-1.5 rounded-full',
                  autoCloseOrders ? 'bg-emerald-500' : 'bg-muted-foreground/50',
                ]"
              />
              <span
                :class="[
                  autoCloseOrders
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground',
                ]"
              >
                {{ autoCloseOrders ? 'RUNNING' : 'IDLE' }}
              </span>
            </span>
          </div>

          <div class="flex-1">
            <p class="font-semibold text-sm mb-1.5">Order Lifecycle</p>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Automatically marks all orders from the previous day as "Closed" at midnight. If disabled, orders must be closed manually using the button below to start each day with a fresh list.
            </p>
          </div>

          <!-- Toggle -->
          <div class="flex flex-col gap-3 pt-1 border-t">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Daily Order Reset</span>
              <button
                type="button"
                :class="[
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  autoCloseOrders ? 'bg-primary' : 'bg-input',
                ]"
                @click="autoCloseOrders = !autoCloseOrders"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform',
                    autoCloseOrders ? 'translate-x-4' : 'translate-x-0',
                  ]"
                />
              </button>
            </div>
            <Button
              v-if="!autoCloseOrders"
              class="w-full"
              @click="openCloseConfirm"
            >
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
    </section>

    <!-- Spacer pushes footer to bottom -->
    <div class="flex-1" />

    <!-- Footer actions -->
    <div class="flex items-center justify-end gap-3 py-4 border-t">
      <Button variant="ghost" :disabled="saving" @click="discard">
        Discard Changes
      </Button>
      <Button :disabled="saving || store.loading" @click="save">
        Save All Settings
      </Button>
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
        <Input
          v-model="closeKeywordInput"
          placeholder="close-all"
          @keydown.enter="keywordMatches && handleCloseAllOrders()"
        />
      </div>

      <DialogFooter class="px-6 pb-6 pt-2 flex-col gap-2 sm:flex-col">
        <Button
          class="w-full py-5"
          :disabled="!keywordMatches || closingOrders"
          @click="handleCloseAllOrders"
        >
          Close All Orders
        </Button>
        <Button
          variant="ghost"
          class="w-full py-5"
          :disabled="closingOrders"
          @click="closeConfirmOpen = false"
        >
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
