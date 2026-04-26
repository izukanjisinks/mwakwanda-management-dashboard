import { defineStore } from 'pinia'
import { ref } from 'vue'
import { roomApi } from '@/services/api/room'
import { uploadRoomImage, deleteRoomImage, deleteAllRoomImages } from '@/services/storage'
import type { Room, RoomPayload } from '@/types/room'

export const useRoomsStore = defineStore('rooms', () => {
  const rooms = ref<Room[]>([])
  const total = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchRooms(page = 1, pageSize = 20) {
    loading.value = true
    error.value = null
    try {
      const res = await roomApi.list({ page, page_size: pageSize })
      rooms.value = res.data ?? []
      total.value = res.total
    } catch (err: any) {
      error.value = err?.error?.message ?? 'Failed to load rooms.'
    } finally {
      loading.value = false
    }
  }

  async function createRoom(payload: RoomPayload): Promise<Room> {
    const room = await roomApi.create(payload)
    rooms.value.push(room)
    total.value++
    return room
  }

  async function updateRoom(id: string, payload: Partial<RoomPayload>): Promise<Room> {
    const updated = await roomApi.update(id, payload)
    const idx = rooms.value.findIndex(r => r.id === id)
    if (idx !== -1) rooms.value[idx] = updated
    return updated
  }

  async function setAvailability(id: string, is_available: boolean): Promise<void> {
    await roomApi.setAvailability(id, is_available)
    const idx = rooms.value.findIndex(r => r.id === id)
    if (idx !== -1) rooms.value[idx]!.is_available = is_available
  }

  async function uploadImages(id: string, files: File[], existingUrls: string[] = []): Promise<Room> {
    const originalUrls = rooms.value.find(r => r.id === id)?.images ?? []
    const removedUrls = originalUrls.filter(u => !existingUrls.includes(u))
    console.log('[rooms] removing', removedUrls.length, 'image(s) from Firebase:', removedUrls)
    await Promise.all(removedUrls.map(u => deleteRoomImage(u)))
    console.log('[rooms] uploading', files.length, 'new file(s) to Firebase...')
    const newUrls = await Promise.all(files.map(f => uploadRoomImage(id, f)))
    console.log('[rooms] Firebase upload done, new URLs:', newUrls)
    const payload = [...existingUrls, ...newUrls]
    console.log('[rooms] PUT /rooms/' + id + '/images with', payload)
    const updated = await roomApi.uploadImages(id, payload)
    console.log('[rooms] backend response:', updated)
    const idx = rooms.value.findIndex(r => r.id === id)
    if (idx !== -1) rooms.value[idx] = updated
    return updated
  }

  async function deleteRoom(id: string): Promise<void> {
    const room = rooms.value.find(r => r.id === id)
    await roomApi.delete(id)
    if (room?.images?.length) await deleteAllRoomImages(room.images)
    rooms.value = rooms.value.filter(r => r.id !== id)
    total.value--
  }

  return { rooms, total, loading, error, fetchRooms, createRoom, updateRoom, setAvailability, uploadImages, deleteRoom }
})
