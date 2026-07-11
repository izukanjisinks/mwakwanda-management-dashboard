import { mealCollectionApi } from './meal-collection'
import { mealCollectionMockApi } from './meal-collection.mock'

// Swappable backend for the meal collection module (see docs/Resident_meal_collection.md).
// Defaults to the in-memory mock since the real /meal-sessions, /meal-cards, and
// /meal-collections endpoints don't exist server-side yet. Set
// VITE_MEAL_COLLECTION_MOCK=false once they do to cut over.
const useMock = import.meta.env.VITE_MEAL_COLLECTION_MOCK !== 'false'

export const mealCollection = useMock ? mealCollectionMockApi : mealCollectionApi
