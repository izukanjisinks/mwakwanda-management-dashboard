import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUsersStore } from '@/stores/users'
import type { RoomCleaningAssignment, CleaningFrequency } from '@/types/cleaning'

const MOCK_ASSIGNMENTS: RoomCleaningAssignment[] = [
  { room_id: '1', staff_id: '6', frequency: 'daily' },
  { room_id: '1', staff_id: '7', frequency: 'daily' },
  { room_id: '2', staff_id: '8', frequency: 'daily' },
  { room_id: '3', staff_id: '6', frequency: 'after_checkout' },
  { room_id: '5', staff_id: '9', frequency: 'every_2_days' },
  { room_id: '7', staff_id: '7', frequency: 'weekly' },
]

export const useCleaningStore = defineStore('cleaning', () => {
  const usersStore = useUsersStore()
  const assignments = ref<RoomCleaningAssignment[]>([])
  const loading = ref(false)

  // Cleaners come directly from the users store — active only
  const cleaners = computed(() =>
    usersStore.users.filter(u => u.role === 'cleaner' && u.status === 'active')
  )

  function getAssignmentsForRoom(roomId: string): RoomCleaningAssignment[] {
    return assignments.value.filter(a => a.room_id === roomId)
  }

  function init() {
    if (assignments.value.length === 0) {
      assignments.value = [...MOCK_ASSIGNMENTS]
    }
  }

  async function assign(roomId: string, staffId: string, frequency: CleaningFrequency) {
    assignments.value = assignments.value.filter(
      a => !(a.room_id === roomId && a.staff_id === staffId)
    )
    assignments.value.push({ room_id: roomId, staff_id: staffId, frequency })
  }

  async function unassign(roomId: string, staffId: string) {
    assignments.value = assignments.value.filter(
      a => !(a.room_id === roomId && a.staff_id === staffId)
    )
  }

  async function updateFrequency(roomId: string, staffId: string, frequency: CleaningFrequency) {
    const idx = assignments.value.findIndex(
      a => a.room_id === roomId && a.staff_id === staffId
    )
    const existing = assignments.value[idx]
    if (existing) assignments.value[idx] = { ...existing, frequency }
  }

  return { cleaners, assignments, loading, getAssignmentsForRoom, init, assign, unassign, updateFrequency }
})
