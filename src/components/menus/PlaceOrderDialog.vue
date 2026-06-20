<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Loader2, Minus, Plus, ShoppingCart, Search } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useMenusStore } from '@/stores/menus'
import { menusApi } from '@/services/api/menus'
import type { MenuItem, OrderItemInput, InHouseGuest } from '@/types/menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  placed: []
}>()

const store = useMenusStore()

type Step = 'type' | 'guest' | 'items' | 'review'

const step = ref<Step>('type')
const orderType = ref<'in_house' | 'walk_in'>('in_house')
const notes = ref('')
const cart = ref<Map<string, { item: MenuItem; qty: number }>>(new Map())
const itemSearch = ref('')

// In-house guest picker
const guests = ref<InHouseGuest[]>([])
const guestSearch = ref('')
const guestsLoading = ref(false)
const selectedGuest = ref<InHouseGuest | null>(null)

const placing = ref(false)

watch(
  () => props.open,
  async (val) => {
    if (val) {
      step.value = 'type'
      orderType.value = 'in_house'
      notes.value = ''
      cart.value = new Map()
      itemSearch.value = ''
      guestSearch.value = ''
      selectedGuest.value = null
      guests.value = []
      await store.fetchMenu(1)
    }
  },
)

async function fetchGuests() {
  if (guests.value.length > 0) return
  guestsLoading.value = true
  try {
    guests.value = await menusApi.listInHouseGuests()
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load in-house guests.'))
  } finally {
    guestsLoading.value = false
  }
}

function goNext() {
  if (step.value === 'type') {
    if (orderType.value === 'in_house') {
      step.value = 'guest'
      fetchGuests()
    } else {
      step.value = 'items'
    }
  } else if (step.value === 'guest') {
    step.value = 'items'
  } else if (step.value === 'items') {
    step.value = 'review'
  }
}

function goBack() {
  if (step.value === 'guest') step.value = 'type'
  else if (step.value === 'items') step.value = orderType.value === 'in_house' ? 'guest' : 'type'
  else if (step.value === 'review') step.value = 'items'
}

// ── Cart helpers ────────────────────────────────────────────────────────────
function addToCart(item: MenuItem) {
  const existing = cart.value.get(item.id)
  cart.value.set(item.id, { item, qty: (existing?.qty ?? 0) + 1 })
  cart.value = new Map(cart.value)
}

function removeFromCart(item: MenuItem) {
  const existing = cart.value.get(item.id)
  if (!existing) return
  if (existing.qty <= 1) cart.value.delete(item.id)
  else cart.value.set(item.id, { item, qty: existing.qty - 1 })
  cart.value = new Map(cart.value)
}

function qtyFor(itemId: string) {
  return cart.value.get(itemId)?.qty ?? 0
}

const cartTotal = computed(() => {
  let t = 0
  for (const { item, qty } of cart.value.values()) t += item.price * qty
  return t
})

const cartCount = computed(() => {
  let n = 0
  for (const { qty } of cart.value.values()) n += qty
  return n
})

// ── Item list grouped by category ───────────────────────────────────────────
const availableItems = computed(() =>
  (store.menu?.items?.data ?? []).filter(i => i.is_available),
)

const itemsByCategory = computed(() => {
  const q = itemSearch.value.toLowerCase().trim()
  const filtered = availableItems.value.filter(
    i => !q || i.name.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q),
  )
  const groups = new Map<string, MenuItem[]>()
  for (const item of filtered) {
    const cat = item.category ?? 'other'
    if (!groups.has(cat)) groups.set(cat, [])
    groups.get(cat)!.push(item)
  }
  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }))
})

// ── Guest filter ────────────────────────────────────────────────────────────
const filteredGuests = computed(() => {
  const q = guestSearch.value.toLowerCase().trim()
  if (!q) return guests.value
  return guests.value.filter(
    g =>
      g.GuestName.toLowerCase().includes(q) ||
      g.RoomName.toLowerCase().includes(q) ||
      g.CompanyName.toLowerCase().includes(q),
  )
})

// ── Place order ─────────────────────────────────────────────────────────────
const orderItems = computed<OrderItemInput[]>(() =>
  Array.from(cart.value.values()).map(({ item, qty }) => ({
    menu_item_id: item.id,
    quantity: qty,
  })),
)

async function placeOrder() {
  placing.value = true
  try {
    if (orderType.value === 'in_house' && selectedGuest.value) {
      await store.placeInHouseOrder({
        booking_id: selectedGuest.value.BookingID,
        attendee_id: selectedGuest.value.AttendeeID ?? undefined,
        notes: notes.value.trim() || undefined,
        items: orderItems.value,
      })
    } else {
      await store.placeWalkInOrder({
        notes: notes.value.trim() || undefined,
        items: orderItems.value,
      })
    }
    toast.success('Order placed successfully.')
    emit('placed')
    emit('update:open', false)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to place order.'))
  } finally {
    placing.value = false
  }
}

const stepLabels: Record<Step, string> = {
  type: 'Order Type',
  guest: 'Select Guest',
  items: 'Select Items',
  review: 'Review & Place',
}

function formatCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const canProceedFromGuest = computed(() => !!selectedGuest.value)
const canProceedFromItems = computed(() => cart.value.size > 0)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Place Order — {{ stepLabels[step] }}</DialogTitle>
      </DialogHeader>

      <!-- Step: Order Type -->
      <div v-if="step === 'type'" class="flex flex-col gap-4">
        <p class="text-sm text-muted-foreground">What type of order is this?</p>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="t in [{ value: 'in_house', label: 'In-House', sub: 'Linked to a booking' }, { value: 'walk_in', label: 'Walk-In', sub: 'No booking needed' }]"
            :key="t.value"
            type="button"
            :class="[
              'rounded-xl border-2 p-4 text-left transition-all',
              orderType === t.value
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30',
            ]"
            @click="orderType = t.value as 'in_house' | 'walk_in'"
          >
            <p class="font-semibold text-sm">{{ t.label }}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{{ t.sub }}</p>
          </button>
        </div>
      </div>

      <!-- Step: Select Guest -->
      <div v-else-if="step === 'guest'" class="flex flex-col gap-4">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input v-model="guestSearch" placeholder="Search by name, room, or company…" class="pl-9" />
        </div>

        <div v-if="guestsLoading" class="flex flex-col gap-2">
          <div v-for="i in 3" :key="i" class="h-14 rounded-lg bg-muted animate-pulse" />
        </div>

        <div v-else-if="filteredGuests.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          No checked-in guests found.
        </div>

        <div v-else class="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
          <button
            v-for="g in filteredGuests"
            :key="`${g.BookingID}-${g.AttendeeID ?? 'solo'}`"
            type="button"
            :class="[
              'rounded-lg border px-4 py-3 text-left transition-all',
              selectedGuest?.BookingID === g.BookingID && selectedGuest?.AttendeeID === g.AttendeeID
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30',
            ]"
            @click="selectedGuest = g"
          >
            <p class="font-medium text-sm">{{ g.GuestName }}</p>
            <p class="text-xs text-muted-foreground">
              {{ g.RoomName || '—' }}
              <template v-if="g.CompanyName"> &middot; {{ g.CompanyName }}</template>
            </p>
          </button>
        </div>
      </div>

      <!-- Step: Select Items -->
      <div v-else-if="step === 'items'" class="flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input v-model="itemSearch" placeholder="Search items…" class="pl-9" />
          </div>
          <div v-if="cartCount > 0" class="flex items-center gap-1.5 text-sm font-medium text-primary shrink-0">
            <ShoppingCart class="size-4" />
            {{ cartCount }}
          </div>
        </div>

        <div v-if="store.menuLoading" class="flex flex-col gap-2">
          <div v-for="i in 4" :key="i" class="h-14 rounded-lg bg-muted animate-pulse" />
        </div>

        <div v-else-if="itemsByCategory.length === 0" class="py-8 text-center text-sm text-muted-foreground">
          No available items found.
        </div>

        <div v-else class="flex flex-col gap-4 max-h-72 overflow-y-auto pr-1">
          <div v-for="group in itemsByCategory" :key="group.category">
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{{ formatCategory(group.category) }}</p>
            <div class="flex flex-col gap-1.5">
              <div
                v-for="item in group.items"
                :key="item.id"
                class="rounded-lg border bg-card px-4 py-3 flex items-center gap-3"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{{ item.name }}</p>
                  <p class="text-xs text-muted-foreground">ZMW {{ item.price.toLocaleString() }}</p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <Button
                    v-if="qtyFor(item.id) > 0"
                    variant="outline"
                    size="icon"
                    class="size-7"
                    @click="removeFromCart(item)"
                  >
                    <Minus class="size-3" />
                  </Button>
                  <span v-if="qtyFor(item.id) > 0" class="w-5 text-center text-sm font-semibold">
                    {{ qtyFor(item.id) }}
                  </span>
                  <Button variant="outline" size="icon" class="size-7" @click="addToCart(item)">
                    <Plus class="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step: Review -->
      <div v-else-if="step === 'review'" class="flex flex-col gap-4">
        <div class="rounded-lg border bg-muted/30 p-4 flex flex-col gap-3">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">Type</span>
            <Badge variant="outline">{{ orderType === 'in_house' ? 'In-House' : 'Walk-In' }}</Badge>
          </div>
          <div v-if="selectedGuest" class="flex justify-between text-sm">
            <span class="text-muted-foreground">Guest</span>
            <span class="font-medium">{{ selectedGuest.GuestName }} — {{ selectedGuest.RoomName || '—' }}</span>
          </div>
          <div class="border-t pt-3 flex flex-col gap-1">
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Items</p>
            <div v-for="[id, { item, qty }] in cart" :key="id" class="flex justify-between text-sm">
              <span>{{ item.name }} <span class="text-muted-foreground">×{{ qty }}</span></span>
              <span>ZMW {{ (item.price * qty).toLocaleString() }}</span>
            </div>
          </div>
          <div class="border-t pt-3 flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span>ZMW {{ cartTotal.toLocaleString() }}</span>
          </div>
        </div>

        <div class="grid gap-2">
          <Label for="order-notes">Notes <span class="text-muted-foreground text-xs">(optional)</span></Label>
          <Textarea id="order-notes" v-model="notes" placeholder="e.g. Table 4, no allergens…" :rows="2" />
        </div>
      </div>

      <DialogFooter class="gap-2 mt-2">
        <Button v-if="step !== 'type'" variant="outline" :disabled="placing" @click="goBack">
          Back
        </Button>
        <Button v-if="step !== 'review'" variant="outline" @click="emit('update:open', false)">
          Cancel
        </Button>

        <Button
          v-if="step !== 'review'"
          :disabled="(step === 'guest' && !canProceedFromGuest) || (step === 'items' && !canProceedFromItems)"
          @click="goNext"
        >
          Next
        </Button>

        <Button
          v-if="step === 'review'"
          :disabled="placing"
          @click="placeOrder"
        >
          <Loader2 v-if="placing" class="size-4 mr-2 animate-spin" />
          Place Order
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
