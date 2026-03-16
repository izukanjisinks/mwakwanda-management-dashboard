import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { roomApi } from '@/services/api/room'
import type { Room, RoomPayload, RoomSummary } from '@/types/room'

export const useRoomsStore = defineStore('rooms', () => {
  const rooms = ref<Room[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Dashboard summary — derived from local state
  const summary = computed<RoomSummary>(() => ({
    occupied: rooms.value.filter(r => r.status === 'occupied').length,
    reserved: rooms.value.filter(r => r.status === 'reserved').length,
    available: rooms.value.filter(r => r.status === 'available').length,
    not_ready: rooms.value.filter(r => r.status === 'not_ready').length,
  }))

  async function fetchRooms() {
    loading.value = true
    error.value = null
    try {
      rooms.value = await roomApi.list()
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load rooms.'

      // Dev fallback — seed mock data so dashboard is never empty
      if (import.meta.env.DEV && rooms.value.length === 0) {
        rooms.value = DEV_MOCK_ROOMS
      }
    } finally {
      loading.value = false
    }
  }

  async function createRoom(payload: RoomPayload): Promise<Room> {
    const room = await roomApi.create(payload)
    rooms.value.push(room)
    return room
  }

  async function updateRoom(id: number, payload: Partial<RoomPayload>): Promise<Room> {
    const updated = await roomApi.update(id, payload)
    const idx = rooms.value.findIndex(r => r.id === id)
    if (idx !== -1) rooms.value[idx] = updated
    return updated
  }

  async function deleteRoom(id: number): Promise<void> {
    await roomApi.delete(id)
    rooms.value = rooms.value.filter(r => r.id !== id)
  }

  return { rooms, loading, error, summary, fetchRooms, createRoom, updateRoom, deleteRoom }
})

// Dev mock data — removed in production builds automatically (tree-shaken)
const DEV_MOCK_ROOMS: Room[] = [
  { id: 1, name: 'Room 101', type: 'single', capacity: 1, price_per_night: 850, amenities: ['Wi-Fi', 'Air Conditioning', 'TV'], status: 'occupied', description: 'Cozy single room with mountain view.', created_at: '2025-01-01T00:00:00Z' },
  { id: 2, name: 'Room 202', type: 'double', capacity: 2, price_per_night: 1200, amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Mini Bar'], status: 'occupied', description: 'Spacious double room with garden view.', created_at: '2025-01-01T00:00:00Z' },
  { id: 3, name: 'Room 303', type: 'suite', capacity: 4, price_per_night: 2500, amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Mini Bar', 'Jacuzzi', 'Balcony'], status: 'reserved', description: 'Luxury suite with panoramic views.', created_at: '2025-01-01T00:00:00Z' },
  { id: 4, name: 'Room 105', type: 'double', capacity: 2, price_per_night: 1200, amenities: ['Wi-Fi', 'Air Conditioning', 'TV'], status: 'occupied', description: 'Comfortable double room near the pool.', created_at: '2025-01-01T00:00:00Z' },
  { id: 5, name: 'Cabin 07', type: 'cabin', capacity: 6, price_per_night: 3200, amenities: ['Wi-Fi', 'Fireplace', 'Full Kitchen', 'Private Deck'], status: 'available', description: 'Secluded cabin in the forest.', created_at: '2025-01-01T00:00:00Z' },
  { id: 6, name: 'Room 210', type: 'single', capacity: 1, price_per_night: 850, amenities: ['Wi-Fi', 'Air Conditioning', 'TV'], status: 'available', description: 'Standard single room on the second floor.', created_at: '2025-01-01T00:00:00Z' },
  { id: 7, name: 'Conference A', type: 'conference', capacity: 20, price_per_night: 5000, amenities: ['Wi-Fi', 'Projector', 'Whiteboard', 'AV Equipment'], status: 'not_ready', description: 'Large conference room for events.', created_at: '2025-01-01T00:00:00Z' },
  { id: 8, name: 'Room 401', type: 'suite', capacity: 4, price_per_night: 2800, amenities: ['Wi-Fi', 'Air Conditioning', 'TV', 'Mini Bar', 'Balcony'], status: 'occupied', description: 'Premium suite on the top floor.', created_at: '2025-01-01T00:00:00Z' },
]
