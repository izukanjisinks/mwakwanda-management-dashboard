import { apiClient } from './client'
import type {
  Menu,
  MenuItem,
  Order,
  PaginatedMenus,
  PaginatedOrders,
  MenuPayload,
  MenuItemPayload,
  PlaceInHouseOrderPayload,
  PlaceWalkInOrderPayload,
  AddOrderItemsPayload,
} from '@/types/menu'

export interface MenuListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  is_active?: boolean
}

export interface OrderListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  type?: 'in_house' | 'walk_in'
  booking_id?: string
}

export const menusApi = {
  // ── Menus ──────────────────────────────────────────────────────────────────
  list: (params?: MenuListParams) =>
    apiClient.get<PaginatedMenus>('/menus', { params }),

  get: (id: string) =>
    apiClient.get<Menu>(`/menus/${id}`),

  create: (payload: MenuPayload) =>
    apiClient.post<Menu>('/menus', payload),

  update: (id: string, payload: Partial<MenuPayload>) =>
    apiClient.put<Menu>(`/menus/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<void>(`/menus/${id}`),

  // ── Menu Items ─────────────────────────────────────────────────────────────
  createItem: (menuId: string, payload: MenuItemPayload) =>
    apiClient.post<MenuItem>(`/menus/${menuId}/items`, payload),

  updateItem: (menuId: string, itemId: string, payload: Partial<MenuItemPayload>) =>
    apiClient.put<MenuItem>(`/menus/${menuId}/items/${itemId}`, payload),

  deleteItem: (menuId: string, itemId: string) =>
    apiClient.delete<void>(`/menus/${menuId}/items/${itemId}`),

  // ── Orders ─────────────────────────────────────────────────────────────────
  listOrders: (params?: OrderListParams) =>
    apiClient.get<PaginatedOrders>('/orders', { params }),

  getOrder: (id: string) =>
    apiClient.get<Order>(`/orders/${id}`),

  placeInHouseOrder: (payload: PlaceInHouseOrderPayload) =>
    apiClient.post<Order>('/orders', payload),

  placeWalkInOrder: (payload: PlaceWalkInOrderPayload) =>
    apiClient.post<Order>('/orders/walk-in', payload),

  addOrderItems: (orderId: string, payload: AddOrderItemsPayload) =>
    apiClient.post<Order>(`/orders/${orderId}/items`, payload),
}
