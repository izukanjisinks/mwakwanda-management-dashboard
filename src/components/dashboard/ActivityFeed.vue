<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { CalendarClock, UtensilsCrossed } from 'lucide-vue-next'
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
      <CardTitle class="text-base font-medium">Recent Activity</CardTitle>
    </CardHeader>
    <CardContent class="flex-1">
      <!-- Loading -->
      <div v-if="loading" class="flex flex-col gap-4">
        <div v-for="i in 4" :key="i" class="flex gap-3 pl-6">
          <div class="h-4 w-4 rounded-full bg-muted animate-pulse shrink-0" />
          <div class="flex flex-col gap-1.5 flex-1">
            <div class="h-3 w-24 bg-muted animate-pulse rounded" />
            <div class="h-3 w-full bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="logs.length === 0" class="flex flex-col items-center justify-center py-10 text-center gap-2">
        <p class="text-sm text-muted-foreground">No recent activity.</p>
      </div>

      <!-- Feed -->
      <div v-else class="relative space-y-6">
        <!-- Timeline line -->
        <div class="absolute left-[7px] top-2 h-[calc(100%-16px)] w-0.5 bg-border" />

        <div
          v-for="log in logs"
          :key="log.id"
          class="relative flex gap-3 pl-6"
        >
          <!-- Dot -->
          <div
            :class="[
              'absolute left-0 top-1 size-4 rounded-full border-2 border-background flex items-center justify-center',
              log.action === 'booking.overstayed' ? 'bg-amber-500' : 'bg-primary',
            ]"
          />

          <div class="flex flex-col gap-0.5">
            <span class="text-xs text-muted-foreground">{{ formatTime(log.created_at) }}</span>

            <!-- booking.overstayed -->
            <template v-if="log.action === 'booking.overstayed'">
              <div class="flex items-center gap-1.5">
                <CalendarClock class="size-3.5 text-amber-500 shrink-0" />
                <span class="text-sm font-medium">Overstay detected</span>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                <span class="font-medium text-foreground">{{ asOverstayed(log).client_name }}</span>
                in {{ asOverstayed(log).room_name }}
                ({{ asOverstayed(log).booking_number }}) —
                was due {{ asOverstayed(log).original_check_out }},
                extended to {{ asOverstayed(log).extended_to }}.
              </p>
            </template>

            <!-- orders.closed -->
            <template v-else-if="log.action === 'orders.closed'">
              <div class="flex items-center gap-1.5">
                <UtensilsCrossed class="size-3.5 text-primary shrink-0" />
                <span class="text-sm font-medium">Orders closed</span>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                <span class="font-medium text-foreground">{{ asOrdersClosed(log).orders_closed }}</span>
                order{{ asOrdersClosed(log).orders_closed !== 1 ? 's' : '' }} automatically closed for the day.
              </p>
            </template>

            <!-- fallback -->
            <template v-else>
              <span class="text-sm font-medium">{{ log.action }}</span>
              <p class="text-xs text-muted-foreground">{{ log.actor_name }}</p>
            </template>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
