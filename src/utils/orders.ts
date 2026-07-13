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

// True once the station a category routes to has already been marked ready
// — new items of that category shouldn't be silently folded in after that,
// since they'd bypass its prep tracking. 'new'/'preparing'/undefined (the
// station hasn't touched this order yet) all still count as open.
export function isCategoryLocked(order: Order, category?: MenuCategory): boolean {
  return isBarCategory(category) ? order.bar_status === 'ready' : order.kitchen_status === 'ready'
}

// Whether there's any station left that could still take a new item —
// drives whether "Add Items" is reachable at all. Only false once both
// stations are ready, since e.g. a drink can always be added to a
// kitchen-ready order as long as the bar hasn't wrapped up too.
export function canAddAnyItems(order: Order): boolean {
  return order.kitchen_status !== 'ready' || order.bar_status !== 'ready'
}

// Once a station has started on an item (preparing or further), it can no
// longer be removed or have its quantity reduced — pulling it out mid-prep
// risks the station making it anyway. Removal only stays open while that
// station hasn't started yet ('new', or hasn't touched the order at all).
export function isCategoryRemovalLocked(order: Order, category?: MenuCategory): boolean {
  const status = isBarCategory(category) ? order.bar_status : order.kitchen_status
  return status === 'preparing' || status === 'ready'
}
