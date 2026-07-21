<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CalendarClock, UtensilsCrossed, Activity } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { auditLogsApi } from '@/services/api/audit-logs'
import type { AuditLog, OverstayedPayload, OrdersClosedPayload } from '@/types/audit-log'

const logs = ref<AuditLog[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await auditLogsApi.list({ page: 1, page_size: 4 })
    logs.value = Array.isArray(res) ? res : (res as any).data ?? []
  } catch {
    // silently leave empty
  } finally {
    loading.value = false
  }
})

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function asOverstayed(log: AuditLog): OverstayedPayload {
  return log.payload as OverstayedPayload
}

function asOrdersClosed(log: AuditLog): OrdersClosedPayload {
  return log.payload as OrdersClosedPayload
}
</script>

<template>
  <Card class="flex flex-col flex-1">
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Activity</CardTitle>
    </CardHeader>
    <CardContent class="flex-1 px-0">
      <!-- Loading -->
      <div v-if="loading" class="flex flex-col gap-4 px-6">
        <div v-for="i in 4" :key="i" class="flex gap-2.5">
          <div class="size-7 rounded-lg bg-muted animate-pulse shrink-0" />
          <div class="flex flex-col gap-1.5 flex-1 pt-0.5">
            <div class="h-3 w-full bg-muted animate-pulse rounded" />
            <div class="h-2.5 w-16 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="logs.length === 0" class="flex flex-col items-center justify-center py-10 text-center gap-2">
        <p class="text-sm text-muted-foreground">No recent activity.</p>
      </div>

      <!-- Feed -->
      <div v-else class="flex flex-col">
        <div
          v-for="log in logs"
          :key="log.id"
          class="flex gap-2.5 px-6 py-2.5 border-b last:border-b-0"
        >
          <!-- booking.overstayed -->
          <template v-if="log.action === 'booking.overstayed'">
            <div class="flex size-7 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3 shrink-0">
              <CalendarClock class="size-3.5" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <p class="text-xs leading-snug">
                <span class="font-medium">{{ asOverstayed(log).client_name }}</span>
                in {{ asOverstayed(log).room_name }} ({{ asOverstayed(log).booking_number }}) marked overstayed —
                checkout auto-extended to {{ asOverstayed(log).extended_to }}
              </p>
              <span class="text-[11px] text-muted-foreground">{{ formatTime(log.created_at) }}</span>
            </div>
          </template>

          <!-- orders.closed -->
          <template v-else-if="log.action === 'orders.closed'">
            <div class="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <UtensilsCrossed class="size-3.5" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <p class="text-xs leading-snug">
                <span class="font-medium">{{ asOrdersClosed(log).orders_closed }}</span>
                order{{ asOrdersClosed(log).orders_closed !== 1 ? 's' : '' }} automatically closed for the day
              </p>
              <span class="text-[11px] text-muted-foreground">{{ formatTime(log.created_at) }}</span>
            </div>
          </template>

          <!-- fallback -->
          <template v-else>
            <div class="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
              <Activity class="size-3.5" />
            </div>
            <div class="flex flex-col gap-0.5 min-w-0">
              <p class="text-xs leading-snug">
                <span class="font-medium">{{ log.action }}</span>
                <span v-if="log.actor_name"> — {{ log.actor_name }}</span>
              </p>
              <span class="text-[11px] text-muted-foreground">{{ formatTime(log.created_at) }}</span>
            </div>
          </template>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
