<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Minus, ChevronLeft, ChevronRight, ShoppingBag, Trash2, X, FileText, User, AlertTriangle, Clock } from 'lucide-vue-next'
import { useMenusStore } from '@/stores/menus'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { Order } from '@/types/menu'
import type { Invoice } from '@/types/invoice'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import PlaceOrderDialog from '@/components/menus/PlaceOrderDialog.vue'
import AddOrderItemsDialog from '@/components/menus/AddOrderItemsDialog.vue'
import CloseWalkInTabDialog from '@/components/menus/CloseWalkInTabDialog.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { menusApi } from '@/services/api/menus'

const store = useMenusStore()
const branchFilterStore = useBranchFilterStore()

const page = ref(1)
const pageSize = 10

function setPage(n: number) { page.value = n }

const statusFilter = ref<'open' | 'closed'>('open')
const typeFilter = ref<'all' | 'in_house' | 'walk_in'>('all')
const dateFrom = ref('')
const dateTo = ref('')
const placeOrderOpen = ref(false)

const sheetOpen = ref(false)
const sheetOrder = ref<Order | null>(null)
const sheetLoading = ref(false)

const addItemsOpen = ref(false)
const closeTabOpen = ref(false)

function onTabInvoiced(_invoice: Invoice) {
  sheetOpen.value = false
  closeTabOpen.value = false
  loadOrders()
}

const statusTabs = [
  { value: 'open', label: 'Active' },
  { value: 'closed', label: 'Closed' },
] as const

const typeTabs = [
  { value: 'all', label: 'All' },
  { value: 'in_house', label: 'In-House' },
  { value: 'walk_in', label: 'Walk-In' },
] as const

function loadOrders() {
  store.fetchOrders({
    page: page.value,
    page_size: pageSize,
    status: statusFilter.value,
    type: typeFilter.value === 'all' ? undefined : typeFilter.value,
    from: dateFrom.value || undefined,
    to: dateTo.value || undefined,
  })
}

function clearDateRange() {
  dateFrom.value = ''
  dateTo.value = ''
  setPage(1)
  loadOrders()
}

onMounted(loadOrders)
watch(() => branchFilterStore.selectedBranchId, () => { page.value = 1; loadOrders() })

watch(page, loadOrders)

function setStatusTab(val: typeof statusFilter.value) {
  statusFilter.value = val
  typeFilter.value = 'all'
  setPage(1)
  loadOrders()
}

function setTypeTab(val: typeof typeFilter.value) {
  typeFilter.value = val
  setPage(1)
  loadOrders()
}

const totalPages = computed(() => Math.max(1, Math.ceil(store.ordersTotal / pageSize)))

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function openSheet(order: Order) {
  sheetOrder.value = order
  sheetOpen.value = true
  sheetLoading.value = true
  try {
    const full = await menusApi.getOrder(order.id)
    sheetOrder.value = full
  } catch {
    // Keep showing basic data
  } finally {
    sheetLoading.value = false
  }
}

async function refreshSheet() {
  if (!sheetOrder.value) return
  try {
    const full = await menusApi.getOrder(sheetOrder.value.id)
    sheetOrder.value = full
    const idx = store.orders.findIndex(o => o.id === full.id)
    if (idx !== -1) store.orders[idx] = full
  } catch {}
}

const removingItemId = ref<string | null>(null)
const updatingItemId = ref<string | null>(null)

async function removeItem(itemId: string) {
  if (!sheetOrder.value) return
  removingItemId.value = itemId
  try {
    const updated = await store.removeOrderItem(sheetOrder.value.id, itemId)
    sheetOrder.value = updated
  } catch {
    // silently keep current state
  } finally {
    removingItemId.value = null
  }
}

const MEAL_PERIOD_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  brunch: 'Brunch',
  lunch: 'Lunch',
  dinner: 'Dinner',
  supper: 'Supper',
}

function hasAllergyNote(note?: string) {
  return note ? /allerg|intoleran|gluten|nut|dairy|vegan|halal|kosher/i.test(note) : false
}

function formatScheduledDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const groupedByAttendee = computed(() => {
  const items = sheetOrder.value?.items ?? []
  if (!items.length) return []
  const map = new Map<string, { attendeeId: string; attendeeName: string; items: typeof items }>()
  for (const item of items) {
    const key = item.attendee_id ?? item.attendee_name ?? '__unknown__'
    if (!map.has(key)) {
      map.set(key, { attendeeId: key, attendeeName: item.attendee_name ?? 'Guest', items: [] })
    }
    map.get(key)!.items.push(item)
  }
  return [...map.values()]
})

async function updateQuantity(itemId: string, newQty: number) {
  if (!sheetOrder.value || newQty < 1) return
  updatingItemId.value = itemId
  try {
    const updated = await store.updateOrderItem(sheetOrder.value.id, itemId, newQty)
    sheetOrder.value = updated
  } catch {
    // silently keep current state
  } finally {
    updatingItemId.value = null
  }
}
</script>

<template>
  <DashboardHeader title="Orders" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-2">
        <!-- Status tabs: Active / Closed -->
        <div class="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            type="button"
            :class="[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              statusFilter === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="setStatusTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Type tabs: All / In-House / Walk-In -->
        <div class="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          <button
            v-for="tab in typeTabs"
            :key="tab.value"
            type="button"
            :class="[
              'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
              typeFilter === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="setTypeTab(tab.value)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Date range -->
      <div class="flex items-center gap-2">
        <Input
          v-model="dateFrom"
          type="date"
          class="h-9 w-36 text-sm"
          @change="setPage(1); loadOrders()"
        />
        <span class="text-muted-foreground text-sm">—</span>
        <Input
          v-model="dateTo"
          type="date"
          class="h-9 w-36 text-sm"
          :min="dateFrom || undefined"
          @change="setPage(1); loadOrders()"
        />
        <button
          v-if="dateFrom || dateTo"
          type="button"
          class="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          @click="clearDateRange"
        >
          <X class="size-4" />
        </button>
      </div>

      <Button @click="placeOrderOpen = true">
        <Plus class="size-4 mr-2" />
        Place Order
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <!-- Loading -->
      <div v-if="store.ordersLoading" class="flex flex-col gap-2 p-4">
        <div v-for="i in 5" :key="i" class="h-12 rounded-lg bg-muted animate-pulse" />
      </div>

      <!-- Empty -->
      <div v-else-if="store.orders.length === 0" class="flex flex-col items-center justify-center py-24 text-center gap-3">
        <ShoppingBag class="size-10 text-muted-foreground/40" />
        <p class="text-muted-foreground">No orders found.</p>
      </div>

      <!-- Rows -->
      <Table v-else class="table-fixed w-full">
        <colgroup>
          <col class="w-[14%]" />
          <col class="w-[12%]" />
          <col class="w-[20%]" />
          <col class="w-[14%]" />
          <col class="w-[18%]" />
          <col class="w-[22%]" />
        </colgroup>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>Order #</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Booking #</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Placed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="order in store.orders"
            :key="order.id"
            class="cursor-pointer hover:bg-muted/40"
            @click="openSheet(order)"
          >
            <TableCell class="font-mono text-sm font-semibold">{{ order.order_number }}</TableCell>
            <TableCell>
              <Badge :variant="order.type === 'in_house' ? 'default' : 'secondary'">
                {{ order.type === 'in_house' ? 'In-House' : 'Walk-In' }}
              </Badge>
            </TableCell>
            <TableCell>
              <div v-if="order.attendee_name" class="text-sm font-medium truncate">{{ order.attendee_name }}</div>
              <div v-else-if="order.client_name" class="text-sm font-medium truncate">{{ order.client_name }}</div>
              <div v-if="order.company_name && order.company_name !== order.client_name" class="text-xs text-muted-foreground mt-0.5 truncate">{{ order.company_name }}</div>
              <div v-if="order.room_name" class="text-xs text-muted-foreground mt-0.5 truncate">{{ order.room_name }}</div>
              <div v-if="!order.attendee_name && !order.client_name && !order.room_name" class="text-sm text-muted-foreground">—</div>
            </TableCell>
            <TableCell class="font-mono text-sm text-muted-foreground">{{ order.booking_number ?? '—' }}</TableCell>
            <TableCell class="font-semibold text-sm">ZMW {{ (order.total ?? 0).toLocaleString() }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">{{ formatDate(order.created_at) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <div class="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
        <span>{{ store.ordersTotal }} order{{ store.ordersTotal !== 1 ? 's' : '' }}</span>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" class="size-8" :disabled="page <= 1" @click="setPage(page - 1)">
            <ChevronLeft class="size-4" />
          </Button>
          <span>{{ page }} / {{ totalPages }}</span>
          <Button variant="outline" size="icon" class="size-8" :disabled="page >= totalPages" @click="setPage(page + 1)">
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Place Order Dialog -->
  <PlaceOrderDialog
    v-model:open="placeOrderOpen"
    @placed="loadOrders"
  />

  <!-- Add Items Dialog -->
  <AddOrderItemsDialog
    v-if="sheetOrder"
    v-model:open="addItemsOpen"
    :order-id="sheetOrder.id"
    :order-number="sheetOrder.order_number"
    @added="refreshSheet"
  />

  <!-- Close Walk-In Tab & Invoice Dialog -->
  <CloseWalkInTabDialog
    v-if="sheetOrder"
    :open="closeTabOpen"
    :order="sheetOrder"
    @update:open="closeTabOpen = $event"
    @invoiced="onTabInvoiced"
  />

  <!-- Order Detail Sheet -->
  <Sheet v-model:open="sheetOpen">
    <SheetContent class="w-full sm:max-w-lg flex flex-col gap-0 p-0">
      <SheetHeader class="px-6 pt-5 pb-4 border-b">
        <div class="flex items-start gap-3 pr-8">
          <div class="flex-1 min-w-0">
            <SheetTitle class="font-mono text-lg">{{ sheetOrder?.order_number }}</SheetTitle>
            <p class="text-sm text-muted-foreground mt-0.5">{{ sheetOrder ? formatDate(sheetOrder.created_at) : '' }}</p>
          </div>
          <Badge v-if="sheetOrder" :variant="sheetOrder.type === 'in_house' ? 'default' : 'secondary'" class="mt-1 shrink-0">
            {{ sheetOrder.type === 'in_house' ? 'In-House' : 'Walk-In' }}
          </Badge>
        </div>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
        <!-- Loading -->
        <div v-if="sheetLoading" class="flex flex-col gap-2">
          <div v-for="i in 4" :key="i" class="h-12 rounded-lg bg-muted animate-pulse" />
        </div>

        <template v-else-if="sheetOrder">
          <!-- Order meta card -->
          <div class="rounded-xl border px-4 py-3.5 flex flex-col gap-2">
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</p>
            <div class="flex flex-col gap-1.5 text-sm">
              <div v-if="sheetOrder.client_name" class="flex justify-between">
                <span class="text-muted-foreground">Guest</span>
                <span class="font-medium">{{ sheetOrder.client_name }}</span>
              </div>
              <div v-if="sheetOrder.company_name && sheetOrder.company_name !== sheetOrder.client_name" class="flex justify-between">
                <span class="text-muted-foreground">Company</span>
                <span class="font-medium">{{ sheetOrder.company_name }}</span>
              </div>
              <div v-if="sheetOrder.room_name" class="flex justify-between">
                <span class="text-muted-foreground">Room</span>
                <span class="font-medium">{{ sheetOrder.room_name }}</span>
              </div>
              <div v-if="sheetOrder.booking_number || sheetOrder.booking_id" class="flex justify-between">
                <span class="text-muted-foreground">Booking</span>
                <span class="font-mono">{{ sheetOrder.booking_number ?? sheetOrder.booking_id }}</span>
              </div>
              <div v-if="sheetOrder.meal_period" class="flex justify-between">
                <span class="text-muted-foreground">Meal Period</span>
                <span class="font-medium capitalize">{{ MEAL_PERIOD_LABELS[sheetOrder.meal_period] ?? sheetOrder.meal_period }}</span>
              </div>
              <div v-if="sheetOrder.serving_time || sheetOrder.scheduled_for" class="flex justify-between">
                <span class="text-muted-foreground">Serving Time</span>
                <span class="font-medium flex items-center gap-1.5">
                  <Clock class="size-3.5 text-muted-foreground" />
                  {{ sheetOrder.serving_time ?? '' }}
                  <span v-if="sheetOrder.scheduled_for" class="text-muted-foreground font-normal">
                    · {{ formatScheduledDate(sheetOrder.scheduled_for) }}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <!-- Notes / Allergy warning -->
          <div
            v-if="sheetOrder.notes"
            class="rounded-lg px-4 py-3 text-sm flex gap-2.5 items-start"
            :class="hasAllergyNote(sheetOrder.notes)
              ? 'bg-red-50 border border-red-300 text-red-800 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300'
              : 'bg-muted/50 border text-muted-foreground'"
          >
            <AlertTriangle v-if="hasAllergyNote(sheetOrder.notes)" class="size-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span>{{ sheetOrder.notes }}</span>
          </div>

          <!-- Items grouped by attendee -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</p>
              <span v-if="groupedByAttendee.length > 1" class="text-xs text-muted-foreground">
                {{ groupedByAttendee.length }} guests
              </span>
            </div>

            <div class="flex flex-col gap-5">
              <div v-for="group in groupedByAttendee" :key="group.attendeeId">
                <!-- Attendee header -->
                <div class="flex items-center gap-2 mb-2">
                  <div class="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User class="size-3.5 text-primary" />
                  </div>
                  <p class="text-sm font-semibold flex-1 min-w-0 truncate">{{ group.attendeeName }}</p>
                  <p class="text-xs text-muted-foreground tabular-nums shrink-0">
                    ZMW {{ group.items.reduce((s, i) => s + (i.subtotal ?? i.total ?? 0), 0).toLocaleString() }}
                  </p>
                </div>

                <!-- This attendee's items -->
                <div class="ml-8 flex flex-col gap-1.5">
                  <div
                    v-for="oi in group.items"
                    :key="oi.id"
                    class="rounded-lg border bg-card px-3 py-2.5 flex items-center gap-3"
                  >
                    <!-- Quantity -->
                    <span class="text-base font-black tabular-nums text-primary leading-none w-5 text-right shrink-0">{{ oi.quantity }}</span>
                    <span class="text-xs text-muted-foreground shrink-0">×</span>

                    <!-- Name + item notes -->
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium leading-snug">{{ oi.item_name ?? oi.menu_item?.name ?? `Item ${oi.menu_item_id.slice(0, 8)}` }}</p>
                      <p v-if="oi.notes" class="text-xs text-muted-foreground italic mt-0.5">{{ oi.notes }}</p>
                    </div>

                    <!-- Subtotal -->
                    <div class="text-right shrink-0">
                      <p class="text-sm font-semibold">ZMW {{ (oi.subtotal ?? oi.total ?? 0).toLocaleString() }}</p>
                      <p v-if="oi.unit_price && oi.quantity > 1" class="text-xs text-muted-foreground">@ {{ oi.unit_price.toLocaleString() }}</p>
                    </div>

                    <!-- Quantity stepper (walk-in open orders only) -->
                    <div
                      v-if="sheetOrder.type === 'walk_in' && sheetOrder.status === 'open'"
                      class="flex items-center shrink-0"
                    >
                      <button
                        type="button"
                        class="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                        :disabled="oi.quantity <= 1 || updatingItemId === oi.id || removingItemId === oi.id"
                        @click.stop="updateQuantity(oi.id, oi.quantity - 1)"
                      >
                        <Minus class="size-3" />
                      </button>
                      <span class="w-7 text-center text-sm font-medium tabular-nums select-none">
                        <svg v-if="updatingItemId === oi.id" class="size-3.5 animate-spin mx-auto text-muted-foreground" viewBox="0 0 24 24" fill="none">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        <template v-else>{{ oi.quantity }}</template>
                      </span>
                      <button
                        type="button"
                        class="size-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
                        :disabled="updatingItemId === oi.id || removingItemId === oi.id"
                        @click.stop="updateQuantity(oi.id, oi.quantity + 1)"
                      >
                        <Plus class="size-3" />
                      </button>
                    </div>

                    <!-- Delete -->
                    <button
                      type="button"
                      class="shrink-0 size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      :disabled="removingItemId === oi.id || updatingItemId === oi.id"
                      @click.stop="removeItem(oi.id)"
                    >
                      <Trash2 v-if="removingItemId !== oi.id" class="size-3.5" />
                      <svg v-else class="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Order total -->
          <div class="rounded-lg bg-muted/40 px-4 py-3 flex justify-between font-semibold text-sm">
            <span>Order Total</span>
            <span>ZMW {{ (sheetOrder.total ?? 0).toLocaleString() }}</span>
          </div>
        </template>
      </div>

      <!-- Actions — pinned to bottom -->
      <div v-if="sheetOrder" class="px-6 pb-6 pt-3 border-t flex flex-col gap-2">
        <Button
          v-if="sheetOrder.type === 'walk_in' && sheetOrder.status === 'open'"
          class="w-full"
          @click="closeTabOpen = true"
        >
          <FileText class="size-4 mr-2" />
          Close Tab &amp; Generate Invoice
        </Button>
        <Button
          :variant="sheetOrder.type === 'walk_in' && sheetOrder.status === 'open' ? 'outline' : 'default'"
          class="w-full"
          @click="addItemsOpen = true"
        >
          <Plus class="size-4 mr-2" />
          Add More Items
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>
