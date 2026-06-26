<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, CalendarDays, BedDouble, UtensilsCrossed, CalendarCheck } from 'lucide-vue-next'
import { bookingApi } from '@/services/api/bookings'
import type { CorporateBookingRequest } from '@/types/booking'

export interface PersonRef {
  name: string
  email?: string
}

const props = defineProps<{
  open: boolean
  person: PersonRef | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

interface HistoryEntry {
  id: string
  booking_type: string
  status: string
  created_at: string
  reason_for_booking?: string
  company?: string
  check_in?: string
  check_out?: string
}

const history = ref<HistoryEntry[]>([])
const loading = ref(false)
const error = ref('')

watch(() => props.open, async (open) => {
  if (!open || !props.person) return
  loading.value = true
  error.value = ''
  history.value = []
  try {
    const res = await bookingApi.list({
      page: 1,
      page_size: 20,
      booker_type: 'corporate',
      ...(props.person.email ? { attendant_email: props.person.email } : { attendant_name: props.person.name }),
    })
    history.value = (res.data ?? []).map((b) => {
      const corReq = b as unknown as CorporateBookingRequest
      const payload = corReq.payload as Record<string, unknown> | undefined
      const acc = payload?.accommodation as Record<string, string> | undefined
      return {
        id: b.id,
        booking_type: corReq.booking_type ?? 'accommodation',
        status: corReq.status ?? 'pending',
        created_at: b.created_at,
        reason_for_booking: corReq.reason_for_booking,
        company: (payload?.company as Record<string, string> | undefined)?.name,
        check_in: acc?.check_in,
        check_out: acc?.check_out,
      }
    })
  } catch {
    error.value = 'Could not load booking history.'
  } finally {
    loading.value = false
  }
})

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending:   { label: 'Pending',   variant: 'outline' },
  approved:  { label: 'Approved',  variant: 'default' },
  rejected:  { label: 'Rejected',  variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
}

function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function bookingTypeIcon(type: string) {
  if (type === 'meals') return UtensilsCrossed
  if (type === 'conference' || type === 'event') return CalendarCheck
  return BedDouble
}

function bookingTypeLabel(type: string) {
  const map: Record<string, string> = { accommodation: 'Accommodation', meals: 'Meals', conference: 'Conference', event: 'Event' }
  return map[type] ?? type
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <CalendarDays class="size-5 text-primary shrink-0" />
          Booking History
        </DialogTitle>
        <DialogDescription v-if="person">
          Prior bookings for <strong>{{ person.name }}</strong>
          <span v-if="person.email" class="text-muted-foreground"> &lt;{{ person.email }}&gt;</span>
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-3 py-2">
        <!-- Loading -->
        <div v-if="loading" class="flex flex-col items-center gap-3 py-10 text-muted-foreground">
          <Loader2 class="size-6 animate-spin" />
          <p class="text-sm">Loading history…</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {{ error }}
        </div>

        <!-- Empty state -->
        <div v-else-if="history.length === 0" class="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <CalendarDays class="size-8 opacity-40" />
          <p class="text-sm">No prior bookings found for this person.</p>
        </div>

        <!-- History list -->
        <div v-else class="flex flex-col gap-2">
          <div
            v-for="entry in history"
            :key="entry.id"
            class="rounded-lg border bg-card p-4 flex flex-col gap-2"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <component :is="bookingTypeIcon(entry.booking_type)" class="size-4 text-primary shrink-0" />
                <span class="font-medium text-sm">{{ bookingTypeLabel(entry.booking_type) }}</span>
                <span v-if="entry.company" class="text-xs text-muted-foreground">· {{ entry.company }}</span>
              </div>
              <Badge :variant="statusConfig[entry.status]?.variant ?? 'outline'" class="shrink-0">
                {{ statusConfig[entry.status]?.label ?? entry.status }}
              </Badge>
            </div>

            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Submitted: {{ fmtDate(entry.created_at) }}</span>
              <span v-if="entry.check_in">Check-in: {{ fmtDate(entry.check_in) }}</span>
              <span v-if="entry.check_out">Check-out: {{ fmtDate(entry.check_out) }}</span>
            </div>

            <p v-if="entry.reason_for_booking" class="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
              {{ entry.reason_for_booking }}
            </p>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
