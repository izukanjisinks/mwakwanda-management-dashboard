import { defineStore } from 'pinia'
import { ref } from 'vue'
import { menusApi } from '@/services/api/menus'
import { getApiError } from '@/utils/errors'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type { Menu, MenuItem, Order, MenuPayload, MenuItemPayload, PlaceInHouseOrderPayload, PlaceWalkInOrderPayload, AddOrderItemsPayload } from '@/types/menu'
import type { OrderListParams } from '@/services/api/menus'

export const useMenusStore = defineStore('menus', () => {
  // ── Single org menu state ──────────────────────────────────────────────────
  const menu = ref<Menu | null>(null)
  const menuLoading = ref(false)
  const menuError = ref<string | null>(null)
  const itemsPage = ref(1)
  const itemsTotal = ref(0)
  const itemsPageSize = 6

  // ── Orders state ───────────────────────────────────────────────────────────
  const orders = ref<Order[]>([])
  const ordersTotal = ref(0)
  const ordersLoading = ref(false)
  const ordersError = ref<string | null>(null)

  // ── Menu actions ───────────────────────────────────────────────────────────
  async function fetchMenu(page = 1, category?: string) {
    menuLoading.value = true
    menuError.value = null
    try {
      const res = await menusApi.getMenu({ page, page_size: itemsPageSize, category: category || undefined })
      menu.value = res
      itemsPage.value = res.items?.page ?? 1
      itemsTotal.value = res.items?.total ?? 0
    } catch (err) {
      menuError.value = getApiError(err, 'Failed to load menu.')
    } finally {
      menuLoading.value = false
    }
  }

  async function upsertMenu(payload: Partial<MenuPayload>): Promise<Menu> {
    const updated = await menusApi.upsertMenu(payload)
    if (menu.value) menu.value = { ...menu.value, ...updated }
    return updated
  }

  // ── Menu item actions ──────────────────────────────────────────────────────
  const currentCategory = ref<string | undefined>(undefined)

  async function createMenuItem(payload: MenuItemPayload): Promise<MenuItem> {
    const item = await menusApi.createItem(payload)
    await fetchMenu(itemsPage.value, currentCategory.value)
    return item
  }

  async function updateMenuItem(itemId: string, payload: Partial<MenuItemPayload>): Promise<MenuItem> {
    const item = await menusApi.updateItem(itemId, payload)
    if (menu.value?.items) {
      const idx = menu.value.items.data.findIndex(i => i.id === itemId)
      if (idx !== -1) menu.value.items.data[idx] = item
    }
    return item
  }

  async function deleteMenuItem(itemId: string): Promise<void> {
    await menusApi.deleteItem(itemId)
    const newTotal = itemsTotal.value - 1
    const maxPage = Math.max(1, Math.ceil(newTotal / itemsPageSize))
    await fetchMenu(Math.min(itemsPage.value, maxPage), currentCategory.value)
  }

  // ── Order actions ──────────────────────────────────────────────────────────
  async function fetchOrders(params?: OrderListParams) {
    const branchFilter = useBranchFilterStore()
    ordersLoading.value = true
    ordersError.value = null
    try {
      const res = await menusApi.listOrders({ ...params, branch_id: branchFilter.apiBranchId })
      orders.value = res.data ?? []
      ordersTotal.value = res.total
    } catch (err) {
      ordersError.value = getApiError(err, 'Failed to load orders.')
    } finally {
      ordersLoading.value = false
    }
  }

  async function placeInHouseOrder(payload: PlaceInHouseOrderPayload): Promise<Order> {
    const order = await menusApi.placeInHouseOrder(payload)
    orders.value.unshift(order)
    ordersTotal.value++
    return order
  }

  async function placeWalkInOrder(payload: PlaceWalkInOrderPayload): Promise<Order> {
    const order = await menusApi.placeWalkInOrder(payload)
    orders.value.unshift(order)
    ordersTotal.value++
    return order
  }

  async function addOrderItems(orderId: string, payload: AddOrderItemsPayload): Promise<Order> {
    const updated = await menusApi.addOrderItems(orderId, payload)
    const idx = orders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) orders.value.splice(idx, 1, updated)
    return updated
  }

  async function removeOrderItem(orderId: string, itemId: string): Promise<Order> {
    await menusApi.removeOrderItem(orderId, itemId)
    const updated = await menusApi.getOrder(orderId)
    const idx = orders.value.findIndex(o => o.id === orderId)
    if (idx !== -1) orders.value.splice(idx, 1, updated)
    return updated
  }

  async function closeAllOrders(): Promise<void> {
    await menusApi.closeAllOrders()
  }

  return {
    menu, menuLoading, menuError, itemsPage, itemsTotal, itemsPageSize, currentCategory,
    orders, ordersTotal, ordersLoading, ordersError,
    fetchMenu, upsertMenu,
    createMenuItem, updateMenuItem, deleteMenuItem,
    fetchOrders, placeInHouseOrder, placeWalkInOrder, addOrderItems, removeOrderItem, closeAllOrders,
  }
})
