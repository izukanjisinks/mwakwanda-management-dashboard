import type { Order, OrderItem, ProductionArea } from '@/types/menu'

// The production area that routes an item to the bar board instead of the
// kitchen board. Order items carry this from their linked menu item — either
// directly (see below) or via the nested menu_item relation.
const BAR_AREA: ProductionArea = 'bar'

export function isBarArea(area?: ProductionArea): boolean {
  return area === BAR_AREA
}

export function itemProductionArea(item: OrderItem): ProductionArea | undefined {
  return item.production_area ?? item.menu_item?.production_area
}

export function isBarItem(item: OrderItem): boolean {
  return isBarArea(itemProductionArea(item))
}

export function hasBarItems(order: Order): boolean {
  return (order.items ?? []).some(oi => isBarItem(oi))
}

export function hasNonBarItems(order: Order): boolean {
  return (order.items ?? []).some(oi => !isBarItem(oi))
}

// True once the station a production area routes to has already been marked
// ready — new items for that area shouldn't be silently folded in after that,
// since they'd bypass its prep tracking. 'new'/'preparing'/undefined (the
// station hasn't touched this order yet) all still count as open.
export function isAreaLocked(order: Order, area?: ProductionArea): boolean {
  return isBarArea(area) ? order.bar_status === 'ready' : order.kitchen_status === 'ready'
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
export function isAreaRemovalLocked(order: Order, area?: ProductionArea): boolean {
  const status = isBarArea(area) ? order.bar_status : order.kitchen_status
  return status === 'preparing' || status === 'ready'
}
