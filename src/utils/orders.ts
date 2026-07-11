import type { Order, OrderItem, Menu, MenuCategory } from '@/types/menu'

// The menu currently has two overlapping "drink" categories with no
// distinction enforced anywhere else — both count as bar-relevant until
// that's consolidated into one.
const BAR_CATEGORIES: MenuCategory[] = ['beverage', 'drinks']

export function isBarCategory(category?: MenuCategory): boolean {
  return !!category && BAR_CATEGORIES.includes(category)
}

// order.items[].menu_item isn't always populated by the backend (orders
// often carry a flat item_name instead) — build this map once from
// menusApi.getMenu() and pass it in so category lookup stays correct
// either way.
export function buildCategoryMap(menu: Menu): Map<string, MenuCategory> {
  const map = new Map<string, MenuCategory>()
  for (const item of menu.items?.data ?? []) {
    if (item.category) map.set(item.id, item.category)
  }
  return map
}

function resolveItemCategory(item: OrderItem, categoryById: Map<string, MenuCategory>): MenuCategory | undefined {
  return item.menu_item?.category ?? categoryById.get(item.menu_item_id)
}

export function isBarItem(item: OrderItem, categoryById: Map<string, MenuCategory>): boolean {
  return isBarCategory(resolveItemCategory(item, categoryById))
}

export function hasBarItems(order: Order, categoryById: Map<string, MenuCategory>): boolean {
  return (order.items ?? []).some(oi => isBarItem(oi, categoryById))
}

export function hasNonBarItems(order: Order, categoryById: Map<string, MenuCategory>): boolean {
  return (order.items ?? []).some(oi => !isBarItem(oi, categoryById))
}
