import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mealsApi } from '@/services/api/meals'
import type { MealPlan, MealPlanPayload } from '@/types/meal'

export const useMealsStore = defineStore('meals', () => {
  const plans = ref<MealPlan[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activePlans = computed(() => plans.value.filter(p => p.is_active))

  async function fetchPlans(page = 1, pageSize = 100) {
    loading.value = true
    error.value = null
    try {
      const res = await mealsApi.list({ page, page_size: pageSize })
      plans.value = res.data ?? []
      total.value = res.total
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load meal plans.'
    } finally {
      loading.value = false
    }
  }

  async function createPlan(payload: MealPlanPayload): Promise<MealPlan> {
    const plan = await mealsApi.create(payload)
    plans.value.push(plan)
    total.value++
    return plan
  }

  async function updatePlan(id: string, payload: Partial<MealPlanPayload>): Promise<MealPlan> {
    const updated = await mealsApi.update(id, payload)
    const idx = plans.value.findIndex(p => p.id === id)
    if (idx !== -1) plans.value[idx] = updated
    return updated
  }

  async function deletePlan(id: string): Promise<void> {
    await mealsApi.delete(id)
    plans.value = plans.value.filter(p => p.id !== id)
    total.value--
  }

  return { plans, total, activePlans, loading, error, fetchPlans, createPlan, updatePlan, deletePlan }
})
