import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mealsApi } from '@/services/api/meals'
import type { MealPlan, MealPlanPayload } from '@/types/meal'

export const useMealsStore = defineStore('meals', () => {
  const plans = ref<MealPlan[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activePlans = computed(() => plans.value.filter(p => p.is_active))

  async function fetchPlans() {
    loading.value = true
    error.value = null
    try {
      plans.value = await mealsApi.list()
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load meal plans.'
      if (import.meta.env.DEV && plans.value.length === 0) {
        plans.value = DEV_MOCK_PLANS
      }
    } finally {
      loading.value = false
    }
  }

  async function createPlan(payload: MealPlanPayload): Promise<MealPlan> {
    const plan = await mealsApi.create(payload)
    plans.value.push(plan)
    return plan
  }

  async function updatePlan(id: number, payload: Partial<MealPlanPayload>): Promise<MealPlan> {
    const updated = await mealsApi.update(id, payload)
    const idx = plans.value.findIndex(p => p.id === id)
    if (idx !== -1) plans.value[idx] = updated
    return updated
  }

  async function deletePlan(id: number): Promise<void> {
    await mealsApi.delete(id)
    plans.value = plans.value.filter(p => p.id !== id)
  }

  return { plans, activePlans, loading, error, fetchPlans, createPlan, updatePlan, deletePlan }
})

const DEV_MOCK_PLANS: MealPlan[] = [
  {
    id: 1,
    name: 'Bed & Breakfast',
    price_per_person_per_night: 150,
    includes: ['Breakfast'],
    description: 'Start your day with a full continental breakfast.',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Half Board',
    price_per_person_per_night: 350,
    includes: ['Breakfast', 'Dinner'],
    description: 'Breakfast and a three-course dinner included.',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Full Board',
    price_per_person_per_night: 550,
    includes: ['Breakfast', 'Lunch', 'Dinner'],
    description: 'All three meals included throughout your stay.',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 4,
    name: 'All Inclusive',
    price_per_person_per_night: 850,
    includes: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Non-alcoholic Drinks'],
    description: 'Unlimited meals and non-alcoholic beverages all day.',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 5,
    name: 'Room Only',
    price_per_person_per_night: 0,
    includes: [],
    description: 'No meals included.',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
]
