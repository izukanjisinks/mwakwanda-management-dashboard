import { apiClient } from './client'
import type { MealPlan, MealPlanPayload, PaginatedMealPlans } from '@/types/meal'

export interface MealPlanListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  is_active?: boolean
}

export const mealsApi = {
  list: (params?: MealPlanListParams) =>
    apiClient.get<PaginatedMealPlans>('/meal-plans', { params }),

  get: (id: string) =>
    apiClient.get<MealPlan>(`/meal-plans/${id}`),

  create: (payload: MealPlanPayload) =>
    apiClient.post<MealPlan>('/meal-plans', payload),

  update: (id: string, payload: Partial<MealPlanPayload>) =>
    apiClient.put<MealPlan>(`/meal-plans/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<void>(`/meal-plans/${id}`),
}
