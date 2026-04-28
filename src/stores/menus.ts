import { defineStore } from 'pinia'
import { ref } from 'vue'
import { menusApi } from '@/services/api/menus'
import type { Menu, MenuItem, Order, MenuPayload, MenuItemPayload, PlaceInHouseOrderPayload, PlaceWalkInOrderPayload, AddOrderItemsPayload } from '@/types/menu'
import type { MenuListParams, OrderListParams } from '@/services/api/menus'

export const useMenusStore = defineStore('menus', () => {
  // ── Menus state ────────────────────────────────────────────────────────────
  const menus = ref<Menu[]>([])
  const menusTotal = ref(0)
  const menusLoading = ref(false)
  const menusError = ref<string | null>(null)

  // ── Orders state ───────────────────────────────────────────────────────────
  const orders = ref<Order[]>([])
  const ordersTotal = ref(0)
  const ordersLoading = ref(false)
  const ordersError = ref<string | null>(null)

  // ── Menu actions ───────────────────────────────────────────────────────────
  async function fetchMenus(params?: MenuListParams) {
    menusLoading.value = true
    menusError.value = null
    try {
      const res = await menusApi.list(params)
      menus.value = res.data ?? []
      menusTotal.value = res.total
    } catch (err: any) {
      menusError.value = err?.error?.message ?? 'Failed to load menus.'
    } finally {
      menusLoading.value = false
    }
  }

  async function createMenu(payload: MenuPayload): Promise<Menu> {
    const menu = await menusApi.create(payload)
    menus.value.unshift(menu)
    menusTotal.value++
    return menu
  }

  async function updateMenu(id: string, payload: Partial<MenuPayload>): Promise<Menu> {
    const updated = await menusApi.update(id, payload)
    const idx = menus.value.findIndex(m => m.id === id)
    if (idx !== -1) menus.value[idx] = updated
    return updated
  }

  async function deleteMenu(id: string): Promise<void> {
    await menusApi.delete(id)
    menus.value = menus.value.filter(m => m.id !== id)
    menusTotal.value--
  }

  // ── Menu item actions ──────────────────────────────────────────────────────
  async function createMenuItem(menuId: string, payload: MenuItemPayload): Promise<MenuItem> {
    const item = await menusApi.createItem(menuId, payload)
    const menu = menus.value.find(m => m.id === menuId)
    if (menu) {
      if (!menu.items) menu.items = []
      menu.items.push(item)
    }
    return item
  }

  async function updateMenuItem(menuId: string, itemId: string, payload: Partial<MenuItemPayload>): Promise<MenuItem> {
    const item = await menusApi.updateItem(menuId, itemId, payload)
    const menu = menus.value.find(m => m.id === menuId)
    if (menu?.items) {
      const idx = menu.items.findIndex(i => i.id === itemId)
      if (idx !== -1) menu.items[idx] = item
    }
    return item
  }

  async function deleteMenuItem(menuId: string, itemId: string): Promise<void> {
    await menusApi.deleteItem(menuId, itemId)
    const menu = menus.value.find(m => m.id === menuId)
    if (menu?.items) {
      menu.items = menu.items.filter(i => i.id !== itemId)
    }
  }

  // ── Order actions ──────────────────────────────────────────────────────────
  async function fetchOrders(params?: OrderListParams) {
    ordersLoading.value = true
    ordersError.value = null
    try {
      const res = await menusApi.listOrders(params)
      orders.value = res.data ?? []
      ordersTotal.value = res.total
    } catch (err: any) {
      ordersError.value = err?.error?.message ?? 'Failed to load orders.'
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
    if (idx !== -1) orders.value[idx] = updated
    return updated
  }

  return {
    menus, menusTotal, menusLoading, menusError,
    orders, ordersTotal, ordersLoading, ordersError,
    fetchMenus, createMenu, updateMenu, deleteMenu,
    createMenuItem, updateMenuItem, deleteMenuItem,
    fetchOrders, placeInHouseOrder, placeWalkInOrder, addOrderItems,
  }
})
