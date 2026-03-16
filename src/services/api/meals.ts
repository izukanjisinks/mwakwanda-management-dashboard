import { apiClient } from './client'
import type { MealPlan, MealPlanPayload } from '@/types/meal'

export const mealsApi = {
  list: () => apiClient.get<MealPlan[]>('/meals'),
  create: (payload: MealPlanPayload) => apiClient.post<MealPlan>('/meals', payload),
  update: (id: number, payload: Partial<MealPlanPayload>) => apiClient.put<MealPlan>(`/meals/${id}`, payload),
  delete: (id: number) => apiClient.delete<void>(`/meals/${id}`),
}
