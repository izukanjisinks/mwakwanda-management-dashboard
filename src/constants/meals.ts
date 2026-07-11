import type { CardRole } from '@/types/meal-collection'

// Shared between meal booking creation (NewWalkInBookingView.vue) and the
// meal collection module, so both reference one source of truth.
export const MEAL_PERIODS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'brunch',    label: 'Brunch' },
  { value: 'lunch',     label: 'Lunch' },
  { value: 'dinner',    label: 'Dinner' },
  { value: 'supper',    label: 'Supper' },
]

export const SERVICE_TYPES = [
  { value: 'buffet',           label: 'Buffet' },
  { value: 'individual_order', label: 'Individual Orders' },
  { value: 'mixed',            label: 'Mixed (Buffet + Exceptions)' },
]

// Resident meal collect sessions — recurrence days (docs/Resident_meal_collection.md §3.1)
export const WEEKDAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

// Fixed built-in card roles and what each is allowed to collect. A card's
// role is checked at scan time — e.g. a Room Service card is blocked from
// collecting meals even if it's physically scanned at an open session.
// can_collect_drinks has no collection flow of its own yet (no drinks
// sessions exist) — it's a capability flag for future use, not enforced.
export const CARD_ROLES: { value: CardRole; label: string; can_collect_meals: boolean; can_collect_drinks: boolean }[] = [
  { value: 'resident',     label: 'Resident',     can_collect_meals: true,  can_collect_drinks: true },
  { value: 'room_service', label: 'Room Service', can_collect_meals: false, can_collect_drinks: false },
]
