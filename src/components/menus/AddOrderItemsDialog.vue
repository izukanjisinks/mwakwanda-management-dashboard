<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Loader2, Minus, Plus, Search, ShoppingCart, Lock } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { isAreaLocked } from '@/utils/orders'
import { useMenusStore } from '@/stores/menus'
import { menusApi } from '@/services/api/menus'
import type { MenuItem, Order } from '@/types/menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const props = defineProps<{
  open: boolean
  order: Order
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  added: []
}>()

const store = useMenusStore()

const itemSearch = ref('')
const cart = ref<Map<string, { item: MenuItem; qty: number }>>(new Map())
const adding = ref(false)

// Fetched directly (not through the store's paginated fetchMenu, which is
// sized for the admin Menu Management table) — this dialog needs the whole
// catalog to pick from, not one page of it.
const availableMenuItems = ref<MenuItem[]>([])
const menuLoading = ref(false)

watch(
  () => props.open,
  async (val) => {
    if (!val) return
    cart.value = new Map()
    itemSearch.value = ''
    menuLoading.value = true
    try {
      const menu = await menusApi.getMenu({ page_size: 500 })
      availableMenuItems.value = menu.items?.data ?? []
    } catch (err) {
      availableMenuItems.value = []
      toast.error(getApiError(err, 'Failed to load menu items.'))
    } finally {
      menuLoading.value = false
    }
  },
)

// ── Cart helpers ────────────────────────────────────────────────────────────

// Once a production area's station (kitchen or bar) has marked its side of
// this order ready, new items for that area shouldn't be folded in — the
// other station's items stay addable independently. See utils/orders.ts.
function isLocked(item: MenuItem): boolean {
  return isAreaLocked(props.order, item.production_area)
}

function addToCart(item: MenuItem) {
  if (isLocked(item)) return
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

const cartCount = computed(() => {
  let n = 0
  for (const { qty } of cart.value.values()) n += qty
  return n
})

const cartTotal = computed(() => {
  let t = 0
  for (const { item, qty } of cart.value.values()) t += item.price * qty
  return t
})

// ── Item list grouped by category ───────────────────────────────────────────
const itemsByCategory = computed(() => {
  const q = itemSearch.value.toLowerCase().trim()
  const available = availableMenuItems.value.filter(i => i.is_available)
  const filtered = available.filter(
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

function formatCategory(cat: string) {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Submit ──────────────────────────────────────────────────────────────────
async function handleAdd() {
  adding.value = true
  try {
    await store.addOrderItems(props.order.id, {
      items: Array.from(cart.value.values()).map(({ item, qty }) => ({
        menu_item_id: item.id,
        quantity: qty,
      })),
    })
    toast.success('Items added to order.')
    emit('added')
    emit('update:open', false)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to add items.'))
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Add Items to {{ order.order_number }}</DialogTitle>
        <DialogDescription>Select additional items to append to this order.</DialogDescription>
      </DialogHeader>

      <!-- Search + cart count -->
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

      <!-- Item list -->
      <div v-if="menuLoading" class="flex flex-col gap-2">
        <div v-for="i in 4" :key="i" class="h-14 rounded-lg bg-muted animate-pulse" />
      </div>

      <div v-else-if="itemsByCategory.length === 0" class="py-8 text-center text-sm text-muted-foreground">
        No available items found.
      </div>

      <div v-else class="flex flex-col gap-4 max-h-72 overflow-y-auto pr-1">
        <div v-for="group in itemsByCategory" :key="group.category">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {{ formatCategory(group.category) }}
          </p>
          <div class="flex flex-col gap-1.5">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="rounded-lg border bg-card px-4 py-3 flex items-center gap-3"
              :class="isLocked(item) && 'opacity-50'"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate flex items-center gap-1.5">
                  {{ item.name }}
                  <span v-if="isLocked(item)" class="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border rounded px-1 py-0.5 shrink-0">
                    <Lock class="size-2.5" /> Ready
                  </span>
                </p>
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
                <Button
                  variant="outline"
                  size="icon"
                  class="size-7"
                  :disabled="isLocked(item)"
                  :title="isLocked(item) ? 'That station has already marked this order ready.' : undefined"
                  @click="addToCart(item)"
                >
                  <Plus class="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cart summary -->
      <div v-if="cartCount > 0" class="rounded-lg bg-muted/40 px-4 py-3 flex justify-between text-sm font-semibold">
        <span>{{ cartCount }} item{{ cartCount !== 1 ? 's' : '' }} to add</span>
        <span>ZMW {{ cartTotal.toLocaleString() }}</span>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="adding" @click="emit('update:open', false)">
          Cancel
        </Button>
        <Button :disabled="adding || cartCount === 0" @click="handleAdd">
          <Loader2 v-if="adding" class="size-4 mr-2 animate-spin" />
          Add to Order
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
