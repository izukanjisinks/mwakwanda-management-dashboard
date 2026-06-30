import { apiClient } from './client'
import type {
  Menu,
  MenuItem,
  Order,
  PaginatedOrders,
  MenuPayload,
  MenuItemPayload,
  PlaceInHouseOrderPayload,
  PlaceWalkInOrderPayload,
  AddOrderItemsPayload,
  UpdateOrderItemPayload,
  CloseWalkInOrderPayload,
  InHouseGuest,
} from '@/types/menu'
import type { Invoice } from '@/types/invoice'

export interface MenuItemsParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
}

export interface OrderListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  type?: 'in_house' | 'walk_in'
  status?: 'open' | 'closed'
  from?: string
  to?: string
  booking_id?: string
  branch_id?: string
}

export const menusApi = {
  // ── Single org menu ────────────────────────────────────────────────────────
  getMenu: (params?: MenuItemsParams) =>
    apiClient.get<Menu>('/menu', { params }),

  upsertMenu: (payload: Partial<MenuPayload>) =>
    apiClient.put<Menu>('/menu', payload),

  // ── Menu Items ─────────────────────────────────────────────────────────────
  createItem: (payload: MenuItemPayload) =>
    apiClient.post<MenuItem>('/menu/items', payload),

  updateItem: (itemId: string, payload: Partial<MenuItemPayload>) =>
    apiClient.put<MenuItem>(`/menu/items/${itemId}`, payload),

  deleteItem: (itemId: string) =>
    apiClient.delete<void>(`/menu/items/${itemId}`),

  // ── Orders ─────────────────────────────────────────────────────────────────
  listInHouseGuests: () =>
    apiClient.get<InHouseGuest[]>('/orders/in-house-guests'),

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

  updateOrderItem: (orderId: string, itemId: string, payload: UpdateOrderItemPayload) =>
    apiClient.patch<Order>(`/orders/${orderId}/items/${itemId}`, payload),

  removeOrderItem: (orderId: string, itemId: string) =>
    apiClient.delete<Order>(`/orders/${orderId}/items/${itemId}`),

  closeAllOrders: () =>
    apiClient.patch<void>('/orders/close-all'),

  // Close a walk-in order and generate a standalone invoice from its items.
  // Backend: POST /orders/{id}/invoice → closes the order, creates Invoice, returns Invoice.
  convertToInvoice: (orderId: string, payload: CloseWalkInOrderPayload) =>
    apiClient.post<Invoice>(`/orders/${orderId}/invoice`, payload),
}
