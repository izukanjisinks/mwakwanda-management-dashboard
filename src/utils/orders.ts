import type { Order, OrderItem, MenuCategory } from '@/types/menu'

// The single category that routes an item to the bar board instead of the
// kitchen board. Order items carry their category directly from the backend
// (see OrderItem.category) — no client-side lookup needed.
const BAR_CATEGORY: MenuCategory = 'drinks'

export function isBarCategory(category?: MenuCategory): boolean {
  return category === BAR_CATEGORY
}

function resolveItemCategory(item: OrderItem): MenuCategory | undefined {
  return item.category ?? item.menu_item?.category
}

export function isBarItem(item: OrderItem): boolean {
  return isBarCategory(resolveItemCategory(item))
}

export function hasBarItems(order: Order): boolean {
  return (order.items ?? []).some(oi => isBarItem(oi))
}

export function hasNonBarItems(order: Order): boolean {
  return (order.items ?? []).some(oi => !isBarItem(oi))
}
