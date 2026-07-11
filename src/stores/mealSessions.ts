import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { mealCollection } from '@/services/api/meal-collection-adapter'
import { useOfflineScanQueue, isNetworkFailure } from '@/composables/useOfflineScanQueue'
import { getApiError } from '@/utils/errors'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type {
  MealSession, MealSessionListParams, MealSessionStatus,
  MealSessionCreatePayload, MealSessionUpdatePayload,
  MealCollectionLogEntry,
  MealCollectRequest, MealCollectionResult, ScanQueueEntry,
} from '@/types/meal-collection'

// A repeat scan/entry of the same card or ID within this window (misread,
// double-tap) is swallowed client-side rather than resubmitted — a legitimate
// second visit later in the session still charges again. See
// docs/Resident_meal_collection.md §5 "Duplicate scans".
const DEBOUNCE_MS = 3000

export const useMealSessionsStore = defineStore('mealSessions', () => {
  const sessions        = ref<MealSession[]>([])
  const sessionsTotal   = ref(0)
  const sessionsLoading = ref(false)
  const sessionsError   = ref<string | null>(null)

  const activeSession     = ref<MealSession | null>(null)
  const activeCollections = ref<MealCollectionLogEntry[]>([])
  const collectLoading    = ref(false)

  const offlineQueue = useOfflineScanQueue()
  const isOnline         = offlineQueue.isOnline
  const pendingSyncCount = offlineQueue.pendingCount
  const syncingOffline   = offlineQueue.syncing

  async function fetchSessions(params?: MealSessionListParams) {
    const branchFilter = useBranchFilterStore()
    sessionsLoading.value = true
    sessionsError.value = null
    try {
      const res = await mealCollection.listSessions({ ...params, branch_id: params?.branch_id ?? branchFilter.apiBranchId })
      sessions.value = res.data ?? []
      sessionsTotal.value = res.total
    } catch (err) {
      sessionsError.value = getApiError(err, 'Failed to load meal sessions.')
    } finally {
      sessionsLoading.value = false
    }
  }

  async function createSession(payload: MealSessionCreatePayload): Promise<MealSession> {
    const created = await mealCollection.createSession(payload)
    sessions.value = [created, ...sessions.value]
    return created
  }

  async function updateSession(id: string, payload: MealSessionUpdatePayload): Promise<MealSession> {
    const updated = await mealCollection.updateSession(id, payload)
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx !== -1) sessions.value.splice(idx, 1, updated)
    if (activeSession.value?.id === id) activeSession.value = updated
    return updated
  }

  async function deleteSession(id: string): Promise<void> {
    await mealCollection.deleteSession(id)
    sessions.value = sessions.value.filter(s => s.id !== id)
  }

  async function setStatus(id: string, status: MealSessionStatus): Promise<MealSession> {
    const updated = await mealCollection.updateSessionStatus(id, { status })
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx !== -1) sessions.value.splice(idx, 1, updated)
    if (activeSession.value?.id === id) activeSession.value = updated
    return updated
  }

  async function setGracePeriod(id: string, minutes: number): Promise<MealSession> {
    const updated = await mealCollection.updateGracePeriod(id, { grace_period_minutes: minutes })
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx !== -1) sessions.value.splice(idx, 1, updated)
    if (activeSession.value?.id === id) activeSession.value = updated
    return updated
  }

  async function loadSessionForCollection(id: string) {
    sessionsError.value = null
    try {
      const [session, collections] = await Promise.all([
        mealCollection.getSession(id),
        mealCollection.listCollections(id),
      ])
      activeSession.value = session
      activeCollections.value = collections
    } catch (err) {
      sessionsError.value = getApiError(err, 'Failed to load meal session.')
    }
  }

  // ── Debounce ───────────────────────────────────────────────────────────────
  const lastCollect = ref<{ key: string; at: number } | null>(null)
  function isDebounced(sessionId: string, input: string): boolean {
    const key = `${sessionId}::${input}`
    const now = Date.now()
    if (lastCollect.value && lastCollect.value.key === key && now - lastCollect.value.at < DEBOUNCE_MS) {
      return true
    }
    lastCollect.value = { key, at: now }
    return false
  }

  // ── Offline fail-open ────────────────────────────────────────────────────────
  // Records a provisional, unconfirmed collection and queues it for sync,
  // rather than blocking collection on connectivity.
  function recordOfflineCollection(sessionId: string, payload: MealCollectRequest): MealCollectionResult {
    const entry: ScanQueueEntry = { ...payload, meal_session_id: sessionId, queued_at: new Date().toISOString() }
    offlineQueue.enqueue(entry)

    const provisional: MealCollectionLogEntry = {
      id: `offline-${payload.idempotency_key}`,
      meal_session_id: sessionId,
      method: payload.input.toUpperCase().startsWith('RFID-') ? 'card' : 'typed',
      card_uid: payload.input,
      collected_by: 'offline-device',
      collected_at: payload.client_collected_at,
      created_at: payload.client_collected_at,
    }
    activeCollections.value = [provisional, ...activeCollections.value]

    return {
      result: 'provisional',
      message: 'Recorded — pending sync (offline). Resident match not yet confirmed.',
    }
  }

  async function collect(payload: MealCollectRequest): Promise<MealCollectionResult> {
    if (!activeSession.value) throw new Error('No active session loaded.')
    const sessionId = activeSession.value.id

    if (isDebounced(sessionId, payload.input)) {
      throw new Error('Duplicate entry ignored — try again in a few seconds.')
    }

    collectLoading.value = true
    try {
      if (!isOnline.value) {
        return recordOfflineCollection(sessionId, payload)
      }
      try {
        const result = await mealCollection.collect(sessionId, payload)
        if (result.result === 'matched') {
          await refreshCollectionsQuietly(sessionId)
        }
        return result
      } catch (err) {
        // navigator.onLine can lag reality — a genuine network failure still
        // fails open even if the browser hasn't flipped isOnline yet.
        if (isNetworkFailure(err)) return recordOfflineCollection(sessionId, payload)
        throw err
      }
    } finally {
      collectLoading.value = false
    }
  }

  async function refreshCollectionsQuietly(sessionId: string) {
    try {
      activeCollections.value = await mealCollection.listCollections(sessionId)
    } catch {
      // Non-fatal — the log will catch up on the next successful refresh.
    }
  }

  // ── Sync ─────────────────────────────────────────────────────────────────────
  async function syncPendingScans() {
    await offlineQueue.flush()
    // Refresh from the server so provisional offline entries get replaced by
    // authoritative ones (and any surprise — e.g. a duplicate the offline
    // device couldn't have known about — becomes visible).
    if (activeSession.value) await loadSessionForCollection(activeSession.value.id)
  }

  watch(isOnline, (online) => { if (online) syncPendingScans() })

  return {
    sessions, sessionsTotal, sessionsLoading, sessionsError,
    activeSession, activeCollections, collectLoading,
    isOnline, pendingSyncCount, syncingOffline,
    fetchSessions, createSession, updateSession, deleteSession, setStatus, setGracePeriod,
    loadSessionForCollection, collect, syncPendingScans,
  }
})
