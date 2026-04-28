<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-vue-next'
import { useMenusStore } from '@/stores/menus'
import type { Order } from '@/types/menu'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import PlaceOrderDialog from '@/components/menus/PlaceOrderDialog.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

const page = ref(1)
const pageSize = 20

function setPage(n: number) { page.value = n }

const typeFilter = ref<'all' | 'in_house' | 'walk_in'>('all')
const placeOrderOpen = ref(false)

const sheetOpen = ref(false)
const sheetOrder = ref<Order | null>(null)
const sheetLoading = ref(false)

const tabs = [
  { value: 'all', label: 'All Orders' },
  { value: 'in_house', label: 'In-House' },
  { value: 'walk_in', label: 'Walk-In' },
] as const

function loadOrders() {
  store.fetchOrders({
    page: page.value,
    page_size: pageSize,
    type: typeFilter.value === 'all' ? undefined : typeFilter.value,
  })
}

onMounted(loadOrders)

watch(page, loadOrders)

function setTab(val: typeof typeFilter.value) {
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
</script>

<template>
  <DashboardHeader title="Orders" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4">
      <!-- Tabs -->
      <div class="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          :class="[
            'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
            typeFilter === tab.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ]"
          @click="setTab(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>

      <Button @click="placeOrderOpen = true">
        <Plus class="size-4 mr-2" />
        Place Order
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="store.ordersLoading" class="flex flex-col gap-2">
      <div v-for="i in 5" :key="i" class="h-12 rounded-lg bg-muted animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="store.orders.length === 0" class="flex flex-col items-center justify-center py-24 text-center gap-3">
      <ShoppingBag class="size-10 text-muted-foreground/40" />
      <p class="text-muted-foreground">No orders found.</p>
    </div>

    <!-- Table -->
    <div v-else class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Guest / Booking</TableHead>
            <TableHead>Items</TableHead>
            <TableHead class="text-right">Total</TableHead>
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
            <TableCell class="font-mono text-sm font-medium">{{ order.order_number }}</TableCell>
            <TableCell>
              <Badge :variant="order.type === 'in_house' ? 'default' : 'secondary'">
                {{ order.type === 'in_house' ? 'In-House' : 'Walk-In' }}
              </Badge>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ order.booking_id ? `Booking ${order.booking_id.slice(0, 8)}…` : '—' }}
            </TableCell>
            <TableCell class="text-sm">{{ order.items?.length ?? '—' }}</TableCell>
            <TableCell class="text-right font-semibold text-sm">ZMW {{ (order.total ?? 0).toLocaleString() }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">{{ formatDate(order.created_at) }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- Pagination -->
    <div v-if="store.ordersTotal > pageSize" class="flex items-center justify-between text-sm text-muted-foreground">
      <span>{{ store.ordersTotal }} order{{ store.ordersTotal !== 1 ? 's' : '' }}</span>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="icon" class="size-8" :disabled="page <= 1" @click="setPage(page - 1)">
          <ChevronLeft class="size-4" />
        </Button>
        <span class="text-sm">{{ page }} / {{ totalPages }}</span>
        <Button variant="outline" size="icon" class="size-8" :disabled="page >= totalPages" @click="setPage(page + 1)">
          <ChevronRight class="size-4" />
        </Button>
      </div>
    </div>
  </div>

  <!-- Place Order Dialog -->
  <PlaceOrderDialog
    v-model:open="placeOrderOpen"
    @placed="loadOrders"
  />

  <!-- Order Detail Sheet -->
  <Sheet v-model:open="sheetOpen">
    <SheetContent class="w-full sm:max-w-lg flex flex-col gap-0 p-0">
      <SheetHeader class="px-6 py-5 border-b">
        <div class="flex items-start justify-between">
          <div>
            <SheetTitle class="font-mono">{{ sheetOrder?.order_number }}</SheetTitle>
            <p class="text-sm text-muted-foreground mt-0.5">{{ sheetOrder ? formatDate(sheetOrder.created_at) : '' }}</p>
          </div>
          <Badge v-if="sheetOrder" :variant="sheetOrder.type === 'in_house' ? 'default' : 'secondary'">
            {{ sheetOrder.type === 'in_house' ? 'In-House' : 'Walk-In' }}
          </Badge>
        </div>
      </SheetHeader>

      <div class="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        <!-- Loading -->
        <div v-if="sheetLoading" class="flex flex-col gap-2">
          <div v-for="i in 4" :key="i" class="h-12 rounded-lg bg-muted animate-pulse" />
        </div>

        <template v-else-if="sheetOrder">
          <!-- Meta -->
          <div class="flex flex-col gap-2 text-sm">
            <div v-if="sheetOrder.booking_id" class="flex justify-between">
              <span class="text-muted-foreground">Booking ID</span>
              <span class="font-mono text-xs">{{ sheetOrder.booking_id }}</span>
            </div>
            <div v-if="sheetOrder.notes" class="flex justify-between">
              <span class="text-muted-foreground">Notes</span>
              <span class="text-right max-w-xs">{{ sheetOrder.notes }}</span>
            </div>
          </div>

          <!-- Items -->
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Items</p>
            <div class="flex flex-col gap-2">
              <div
                v-for="oi in sheetOrder.items"
                :key="oi.id"
                class="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-3"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium">{{ oi.menu_item?.name ?? `Item ${oi.menu_item_id.slice(0, 8)}` }}</p>
                  <p v-if="oi.notes" class="text-xs text-muted-foreground">{{ oi.notes }}</p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm font-semibold">ZMW {{ (oi.total ?? 0).toLocaleString() }}</p>
                  <p class="text-xs text-muted-foreground">× {{ oi.quantity }} @ ZMW {{ (oi.unit_price ?? 0).toLocaleString() }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Total -->
          <div class="rounded-lg bg-muted/40 px-4 py-3 flex justify-between font-semibold text-sm">
            <span>Total</span>
            <span>ZMW {{ (sheetOrder.total ?? 0).toLocaleString() }}</span>
          </div>
        </template>
      </div>
    </SheetContent>
  </Sheet>
</template>
