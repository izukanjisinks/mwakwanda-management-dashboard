import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mealCollection } from '@/services/api/meal-collection-adapter'
import { getApiError } from '@/utils/errors'
import type {
  MealCardAssignment, MealCardListParams, AssignCardPayload, UpdateCardPayload, ReplaceCardPayload,
} from '@/types/meal-collection'

export const useMealCardsStore = defineStore('mealCards', () => {
  const cards        = ref<MealCardAssignment[]>([])
  const cardsLoading = ref(false)
  const cardsError   = ref<string | null>(null)

  async function fetchCards(params?: MealCardListParams) {
    cardsLoading.value = true
    cardsError.value = null
    try {
      cards.value = await mealCollection.listCards(params)
    } catch (err) {
      cardsError.value = getApiError(err, 'Failed to load meal cards.')
    } finally {
      cardsLoading.value = false
    }
  }

  function upsertCard(updated: MealCardAssignment) {
    const idx = cards.value.findIndex(c => c.id === updated.id)
    if (idx !== -1) cards.value.splice(idx, 1, updated)
    else cards.value = [updated, ...cards.value]
  }

  async function assignCard(payload: AssignCardPayload): Promise<MealCardAssignment> {
    const card = await mealCollection.assignCard(payload)
    cards.value = [card, ...cards.value]
    return card
  }

  // Occupant edit, room reassignment, active/inactive toggle.
  async function updateCard(id: string, payload: UpdateCardPayload): Promise<MealCardAssignment> {
    const updated = await mealCollection.updateCard(id, payload)
    upsertCard(updated)
    return updated
  }

  // Server marks the old card 'replaced' and returns the new active card —
  // mirror both sides locally so the list doesn't need a full refetch.
  async function replaceCard(id: string, payload: ReplaceCardPayload): Promise<MealCardAssignment> {
    const replacement = await mealCollection.replaceCard(id, payload)
    const oldIdx = cards.value.findIndex(c => c.id === id)
    if (oldIdx !== -1) {
      const old = cards.value[oldIdx]!
      cards.value.splice(oldIdx, 1, { ...old, status: 'replaced', updated_at: replacement.updated_at })
    }
    cards.value = [replacement, ...cards.value]
    return replacement
  }

  async function voidCard(id: string): Promise<MealCardAssignment> {
    const updated = await mealCollection.voidCard(id)
    upsertCard(updated)
    return updated
  }

  return {
    cards, cardsLoading, cardsError,
    fetchCards, assignCard, updateCard, replaceCard, voidCard,
  }
})
