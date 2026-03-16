export interface MealPlan {
  id: number
  name: string                // e.g. "Full Board"
  price_per_person_per_night: number
  includes: string[]          // e.g. ["Breakfast", "Lunch", "Dinner"]
  description?: string
  is_active: boolean
  created_at: string
}

export interface MealPlanPayload {
  name: string
  price_per_person_per_night: number
  includes: string[]
  description?: string
  is_active: boolean
}
