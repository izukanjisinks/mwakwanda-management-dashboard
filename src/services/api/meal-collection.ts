import { apiClient } from './client'
import type {
  MealSession, MealSessionListParams, PaginatedMealSessions,
  MealSessionCreatePayload, MealSessionUpdatePayload, MealSessionStatusUpdate, UpdateGracePeriodPayload,
  MealCollectionLogEntry,
  MealCollectRequest, MealCollectionResult,
  MealCardAssignment, MealCardListParams, AssignCardPayload, UpdateCardPayload, ReplaceCardPayload,
  SyncScansPayload, SyncScansResponse, CurrentStay,
} from '@/types/meal-collection'

// Real backend adapter — see meal-collection.mock.ts for the swappable
// in-memory stand-in used until these endpoints exist server-side
// (selected via meal-collection-adapter.ts / VITE_MEAL_COLLECTION_MOCK).
export const mealCollectionApi = {
  // ── Sessions ─────────────────────────────────────────────────────────────
  listSessions: (params?: MealSessionListParams) =>
    apiClient.get<PaginatedMealSessions>('/meal-sessions', { params }),

  getSession: (id: string) =>
    apiClient.get<MealSession>(`/meal-sessions/${id}`),

  createSession: (payload: MealSessionCreatePayload) =>
    apiClient.post<MealSession>('/meal-sessions', payload),

  updateSession: (id: string, payload: MealSessionUpdatePayload) =>
    apiClient.put<MealSession>(`/meal-sessions/${id}`, payload),

  deleteSession: (id: string) =>
    apiClient.delete<void>(`/meal-sessions/${id}`),

  updateSessionStatus: (id: string, payload: MealSessionStatusUpdate) =>
    apiClient.put<MealSession>(`/meal-sessions/${id}/status`, payload),

  updateGracePeriod: (id: string, payload: UpdateGracePeriodPayload) =>
    apiClient.put<MealSession>(`/meal-sessions/${id}/grace-period`, payload),

  listCollections: (id: string) =>
    apiClient.get<MealCollectionLogEntry[]>(`/meal-sessions/${id}/collections`),

  // ── Collect (match + charge, atomic) ───────────────────────────────────────
  collect: (sessionId: string, payload: MealCollectRequest) =>
    apiClient.post<MealCollectionResult>(`/meal-sessions/${sessionId}/collect`, payload),

  // ── RFID card assignments ───────────────────────────────────────────────────
  listCards: (params?: MealCardListParams) =>
    apiClient.get<MealCardAssignment[]>('/meal-cards', { params }),

  assignCard: (payload: AssignCardPayload) =>
    apiClient.post<MealCardAssignment>('/meal-cards', payload),

  // Partial update — occupant edit, room reassignment, active/inactive toggle.
  updateCard: (id: string, payload: UpdateCardPayload) =>
    apiClient.patch<MealCardAssignment>(`/meal-cards/${id}`, payload),

  replaceCard: (id: string, payload: ReplaceCardPayload) =>
    apiClient.put<MealCardAssignment>(`/meal-cards/${id}/replace`, payload),

  voidCard: (id: string) =>
    apiClient.put<MealCardAssignment>(`/meal-cards/${id}/void`),

  // Powers the "pick a checked-in guest" dropdown on the card assignment
  // dialog. Defined here (not on roomApi) since this feature is its only
  // consumer and it needs to go through the same mock/real swap as the rest
  // of this module. 404/null when the room has no active stay.
  getCurrentStay: (roomId: string) =>
    apiClient.get<CurrentStay>(`/rooms/${roomId}/current-stay`),

  // ── Offline sync ─────────────────────────────────────────────────────────
  syncScans: (payload: SyncScansPayload) =>
    apiClient.post<SyncScansResponse>('/meal-collections/sync', payload),
}
