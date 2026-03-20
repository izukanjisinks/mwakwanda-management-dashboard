export interface MealPlan {
  id: string
  name: string                // e.g. "Full Board"
  price_per_person_per_night: number
  includes: string[]          // e.g. ["Breakfast", "Lunch", "Dinner"]
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PaginatedMealPlans {
  data: MealPlan[]
  page: number
  page_size: number
  total: number
}

export interface MealPlanPayload {
  name: string
  price_per_person_per_night: number
  includes: string[]
  description?: string
  is_active: boolean
}
