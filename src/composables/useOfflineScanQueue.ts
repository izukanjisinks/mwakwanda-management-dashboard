import { computed } from 'vue'
import { useOnline, useStorage } from '@vueuse/core'
import { mealCollection } from '@/services/api/meal-collection-adapter'
import type { ScanQueueEntry, SyncScansResponse } from '@/types/meal-collection'

const STORAGE_KEY = 'meal-collection-scan-queue'

// Generic offline-queue primitive for meal collection scans: connectivity
// detection + a localStorage-backed pending list + a sync call. Deliberately
// has no knowledge of the meal-session store — callers own what happens to
// their own state after a flush (e.g. re-fetching the active session's
// collections so provisional entries get replaced by authoritative ones).
export function useOfflineScanQueue() {
  const isOnline = useOnline()
  const queue = useStorage<ScanQueueEntry[]>(STORAGE_KEY, [])
  const syncingRef = useStorage('meal-collection-scan-queue-syncing', false)

  const pendingCount = computed(() => queue.value.length)

  function enqueue(entry: ScanQueueEntry) {
    queue.value = [...queue.value, entry]
  }

  async function flush(): Promise<SyncScansResponse | null> {
    if (syncingRef.value || queue.value.length === 0) return null
    syncingRef.value = true
    const toSync = [...queue.value]
    try {
      const response = await mealCollection.syncScans({ scans: toSync })
      const sentKeys = new Set(toSync.map(e => e.idempotency_key))
      queue.value = queue.value.filter(e => !sentKeys.has(e.idempotency_key))
      return response
    } catch {
      // Stay queued — the caller (or the next reconnect) can retry.
      return null
    } finally {
      syncingRef.value = false
    }
  }

  return { isOnline, queue, pendingCount, syncing: syncingRef, enqueue, flush }
}

// A native fetch() rejection (no connectivity) surfaces as a TypeError, distinct
// from the ApiError shape apiClient throws for a reachable-but-failed request.
// navigator.onLine can lag reality, so scan() treats this as a second fail-open
// trigger regardless of the reported connectivity state.
export function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError
}
