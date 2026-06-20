<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { bookingRequestApi, type MaterialiseAssignment } from '@/services/api/booking-requests'
import { roomApi } from '@/services/api/room'
import { getApiError } from '@/utils/errors'
import { toast } from 'vue-sonner'
import type { CorporateBookingRequest, IndividualBookingRequest } from '@/types/booking'
import type { Room } from '@/types/room'
import type { WorkflowTask } from '@/types/workflow'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import TaskActionDialog from '@/components/workflow/TaskActionDialog.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import {
  ArrowLeft, FileText, ImageIcon, ExternalLink,
  CheckCircle2, XCircle, Clock, Building2, User, CalendarDays,
  BedDouble, Users, Loader2, UtensilsCrossed,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useWorkflowStore()

const taskId = computed(() => route.params.id as string)
const task = computed<WorkflowTask | undefined>(() =>
  [...store.pendingTasks, ...store.completedTasks].find(t => t.id === taskId.value),
)

const loading = ref(false)
const individualRequest = ref<IndividualBookingRequest | null>(null)
const corporateRequest = ref<CorporateBookingRequest | null>(null)

const isCorporate = computed(() => task.value?.task_details?.task_type === 'corporate_booking')

// ─── Corporate room assignment (accommodation) ────────────────────────────────
interface GuestRow {
  first_name: string
  last_name: string
  identification_card?: string
  email?: string
  check_in?: string
  check_out?: string
  room_type?: string
}

const corporateGuests = computed<GuestRow[]>(() => {
  if (!isCorporate.value) return []
  const p = corporateRequest.value?.payload as Record<string, unknown> | undefined
  if (corporateRequest.value?.booking_type !== 'accommodation') return []
  return (p?.guests as GuestRow[]) ?? []
})

const isAccommodation = computed(() =>
  isCorporate.value && corporateRequest.value?.booking_type === 'accommodation',
)

// Named guest roster on an event request (optional — booker may give headcount only).
const eventGuests = computed<GuestRow[]>(() => {
  if (corporateRequest.value?.booking_type !== 'event') return []
  const p = corporateRequest.value?.payload as Record<string, unknown> | undefined
  return (p?.guests as GuestRow[]) ?? []
})

// Price-resolved meals view (menu item names + prices + totals), built server-side.
const mealsSummary = computed(() => corporateRequest.value?.meals_summary ?? null)

// guest index → selected room id
const guestRoomSelection = ref<Record<number, string>>({})
// guest index → available rooms for that guest's dates
const guestAvailableRooms = ref<Record<number, Room[]>>({})
const roomsLoading = ref(false)

async function loadAvailableRooms() {
  if (!isAccommodation.value) return
  roomsLoading.value = true
  try {
    await Promise.all(
      corporateGuests.value.map(async (g, i) => {
        if (!g.check_in || !g.check_out) {
          guestAvailableRooms.value[i] = []
          return
        }
        const rooms = await roomApi.listAvailable({ check_in: g.check_in, check_out: g.check_out })
        guestAvailableRooms.value[i] = rooms ?? []
      }),
    )
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load available rooms.'))
  } finally {
    roomsLoading.value = false
  }
}

// Approve gating — every guest must have a room selected
const allGuestsAssigned = computed(() => {
  if (!isAccommodation.value) return true
  if (corporateGuests.value.length === 0) return false
  return corporateGuests.value.every((_, i) => !!guestRoomSelection.value[i])
})

// Prevent the same room being picked for two overlapping guests in the UI
function roomTakenByOther(guestIndex: number, roomId: string): boolean {
  return Object.entries(guestRoomSelection.value).some(
    ([idx, rid]) => Number(idx) !== guestIndex && rid === roomId,
  )
}

const documents = computed<string[]>(() => {
  if (isCorporate.value) return corporateRequest.value?.documents ?? []
  return individualRequest.value?.documents ?? []
})

// Document sheet
const docSheetOpen = ref(false)
const selectedDoc = ref<string>('')

function isPdf(url: string) {
  return url.toLowerCase().includes('.pdf')
}

function openDoc(url: string) {
  selectedDoc.value = url
  docSheetOpen.value = true
}

// Action dialog
const actionDialog = ref(false)
const dialogAction = ref<'approve' | 'reject' | null>(null)

function openAction(action: 'approve' | 'reject') {
  dialogAction.value = action
  actionDialog.value = true
}

async function handleConfirm(action: string, comments: string) {
  if (!task.value) return
  const taskType = task.value.task_details?.task_type
  const refId = task.value.task_details?.task_id
  const payload = { action, comments: comments || undefined }

  try {
    // For approve, call the domain endpoint first so the booking is created
    // before the workflow step advances
    if (action === 'approve' && refId) {
      if (taskType === 'individual_booking') {
        await bookingRequestApi.approveIndividual(refId)
      } else if (taskType === 'corporate_booking') {
        await bookingRequestApi.approve(refId)
        // Accommodation requests materialise into a booking with the rooms
        // staff assigned to each guest
        if (isAccommodation.value) {
          const assignments: MaterialiseAssignment[] = corporateGuests.value
            .map((_, i) => ({ guest_index: i, room_id: guestRoomSelection.value[i] }))
            .filter((a): a is MaterialiseAssignment => !!a.room_id)
          await bookingRequestApi.materialise(refId, assignments)
        }
      }
    }

    await store.processTask(task.value.instance_id, payload)
    toast.success(action === 'approve' ? 'Task approved.' : 'Task rejected.')
    actionDialog.value = false
    router.push({ name: 'workflow-tasks' })
  } catch (err) {
    toast.error(getApiError(err, 'Failed to process task.'))
  }
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusVariant(status: string) {
  switch (status) {
    case 'pending':     return 'secondary' as const
    case 'confirmed':   return 'default' as const
    case 'checked_in':  return 'default' as const
    case 'checked_out': return 'outline' as const
    case 'approved':    return 'default' as const
    case 'cancelled':   return 'destructive' as const
    case 'rejected':    return 'destructive' as const
    default:            return 'secondary' as const
  }
}

function bookingTypeLabel(type: string) {
  switch (type) {
    case 'accommodation': return 'Accommodation'
    case 'meals':         return 'Meals'
    case 'conference':    return 'Conference'
    case 'event':         return 'Event'
    default:              return type
  }
}

onMounted(async () => {
  if (store.tasks.length === 0) await store.fetchTasks()

  const t = task.value
  if (!t) {
    toast.error('Task not found.')
    router.push({ name: 'workflow-tasks' })
    return
  }

  const refId = t.task_details?.task_id
  if (!refId) return

  loading.value = true
  try {
    if (isCorporate.value) {
      corporateRequest.value = await bookingRequestApi.get(refId)
      // Only pending accommodation requests need a room picker
      if (isAccommodation.value && task.value?.status !== 'completed') {
        await loadAvailableRooms()
      }
    } else {
      individualRequest.value = await bookingRequestApi.getIndividual(refId)
    }
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load details.'))
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <DashboardHeader title="Task Detail" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Back -->
    <div>
      <Button variant="ghost" class="-ml-2" @click="router.push({ name: 'workflow-tasks' })">
        <ArrowLeft class="size-4 mr-2" />
        Back to Task Inbox
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="loading || store.tasksLoading" class="flex flex-col gap-4">
      <div class="h-32 rounded-xl bg-muted animate-pulse" />
      <div class="h-48 rounded-xl bg-muted animate-pulse" />
    </div>

    <template v-else-if="task">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <!-- Left: details -->
        <div class="lg:col-span-2 flex flex-col gap-6">

          <!-- Task header card -->
          <div class="rounded-xl border bg-card p-6 flex flex-col gap-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs text-muted-foreground mb-1">Step</p>
                <h2 class="text-lg font-semibold">{{ task.step_name }}</h2>
                <p v-if="task.task_details?.task_description" class="text-sm text-muted-foreground mt-1">
                  {{ task.task_details.task_description }}
                </p>
              </div>
              <Badge :variant="statusVariant(task.status)" class="shrink-0 capitalize">
                {{ task.status.replace('_', ' ') }}
              </Badge>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t text-sm">
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Submitted by</p>
                <p class="font-medium">{{ task.task_details?.sender_details?.sender_name || '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Type</p>
                <div class="flex items-center gap-1.5">
                  <Building2 v-if="isCorporate" class="size-3.5 text-muted-foreground" />
                  <User v-else class="size-3.5 text-muted-foreground" />
                  <p>{{ isCorporate ? 'Corporate' : 'Individual' }}</p>
                </div>
              </div>
              <div v-if="task.task_details?.task_ref">
                <p class="text-xs text-muted-foreground mb-0.5">Reference</p>
                <p class="font-mono text-xs">{{ task.task_details.task_ref }}</p>
              </div>
              <div v-if="task.due_date">
                <p class="text-xs text-muted-foreground mb-0.5">Due Date</p>
                <div class="flex items-center gap-1.5">
                  <Clock class="size-3.5 text-muted-foreground" />
                  <p>{{ fmt(task.due_date) }}</p>
                </div>
              </div>
              <div v-if="task.completed_at">
                <p class="text-xs text-muted-foreground mb-0.5">Completed</p>
                <p>{{ fmt(task.completed_at) }}</p>
              </div>
            </div>
          </div>

          <!-- Individual booking request details -->
          <div v-if="!isCorporate && individualRequest" class="rounded-xl border bg-card p-6 flex flex-col gap-4">
            <div class="flex items-center gap-2 mb-1">
              <BedDouble class="size-4 text-primary" />
              <h3 class="font-semibold">Booking Request</h3>
              <Badge :variant="statusVariant(individualRequest.status)" class="ml-auto capitalize text-xs">
                {{ individualRequest.status }}
              </Badge>
            </div>
            <hr class="border-border" />
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Guest</p>
                <p class="font-medium">{{ individualRequest.booker_name }}</p>
              </div>
              <div v-if="individualRequest.booker_email">
                <p class="text-xs text-muted-foreground mb-0.5">Email</p>
                <p>{{ individualRequest.booker_email }}</p>
              </div>
              <div v-if="individualRequest.booker_phone">
                <p class="text-xs text-muted-foreground mb-0.5">Phone</p>
                <p>{{ individualRequest.booker_phone }}</p>
              </div>
              <div v-if="individualRequest.room_name">
                <p class="text-xs text-muted-foreground mb-0.5">Room</p>
                <p class="font-medium">{{ individualRequest.room_name }}</p>
              </div>
              <div v-if="individualRequest.payload?.check_in">
                <p class="text-xs text-muted-foreground mb-0.5">Check-in</p>
                <div class="flex items-center gap-1.5">
                  <CalendarDays class="size-3.5 text-muted-foreground" />
                  <p>{{ fmt(individualRequest.payload.check_in) }}</p>
                </div>
              </div>
              <div v-if="individualRequest.payload?.check_out">
                <p class="text-xs text-muted-foreground mb-0.5">Check-out</p>
                <div class="flex items-center gap-1.5">
                  <CalendarDays class="size-3.5 text-muted-foreground" />
                  <p>{{ fmt(individualRequest.payload.check_out) }}</p>
                </div>
              </div>
            </div>
            <div v-if="individualRequest.payload?.special_requests" class="pt-3 border-t text-sm">
              <p class="text-xs text-muted-foreground mb-0.5">Special Requests</p>
              <p>{{ individualRequest.payload.special_requests }}</p>
            </div>
            <div v-if="individualRequest.notes" class="pt-3 border-t text-sm">
              <p class="text-xs text-muted-foreground mb-0.5">Notes</p>
              <p>{{ individualRequest.notes }}</p>
            </div>
          </div>

          <!-- Corporate booking request details -->
          <template v-if="isCorporate && corporateRequest">
            <!-- Request summary -->
            <div class="rounded-xl border bg-card p-6 flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-1">
                <Building2 class="size-4 text-primary" />
                <h3 class="font-semibold">Booking Request</h3>
                <Badge variant="outline" class="ml-auto capitalize text-xs">
                  {{ bookingTypeLabel(corporateRequest.booking_type) }}
                </Badge>
              </div>
              <hr class="border-border" />
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div v-if="corporateRequest.company_name">
                  <p class="text-xs text-muted-foreground mb-0.5">Company</p>
                  <p class="font-medium">{{ corporateRequest.company_name }}</p>
                </div>
                <div v-if="corporateRequest.branch_name">
                  <p class="text-xs text-muted-foreground mb-0.5">Branch</p>
                  <p>{{ corporateRequest.branch_name }}</p>
                </div>
                <div v-if="corporateRequest.profile_name">
                  <p class="text-xs text-muted-foreground mb-0.5">Booked By</p>
                  <p>{{ corporateRequest.profile_name }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground mb-0.5">Status</p>
                  <Badge :variant="statusVariant(corporateRequest.status)" class="capitalize text-xs">
                    {{ corporateRequest.status }}
                  </Badge>
                </div>
                <div v-if="corporateRequest.reason_for_booking">
                  <p class="text-xs text-muted-foreground mb-0.5">Reason</p>
                  <p>{{ corporateRequest.reason_for_booking }}</p>
                </div>
                <div v-if="corporateRequest.notes">
                  <p class="text-xs text-muted-foreground mb-0.5">Notes</p>
                  <p>{{ corporateRequest.notes }}</p>
                </div>
              </div>
            </div>

            <!-- Authoriser -->
            <div v-if="corporateRequest.authoriser_name" class="rounded-xl border bg-card p-6 flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-1">
                <User class="size-4 text-primary" />
                <h3 class="font-semibold">Authoriser</h3>
              </div>
              <hr class="border-border" />
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p class="text-xs text-muted-foreground mb-0.5">Name</p>
                  <p class="font-medium">{{ corporateRequest.authoriser_name }}</p>
                </div>
                <div v-if="corporateRequest.authoriser_title">
                  <p class="text-xs text-muted-foreground mb-0.5">Title</p>
                  <p>{{ corporateRequest.authoriser_title }}</p>
                </div>
                <div v-if="corporateRequest.authoriser_department">
                  <p class="text-xs text-muted-foreground mb-0.5">Department</p>
                  <p>{{ corporateRequest.authoriser_department }}</p>
                </div>
                <div v-if="corporateRequest.authoriser_email">
                  <p class="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p>{{ corporateRequest.authoriser_email }}</p>
                </div>
                <div v-if="corporateRequest.authoriser_phone">
                  <p class="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p>{{ corporateRequest.authoriser_phone }}</p>
                </div>
                <div v-if="corporateRequest.authoriser_gl_code">
                  <p class="text-xs text-muted-foreground mb-0.5">GL Code</p>
                  <p class="font-mono text-xs">{{ corporateRequest.authoriser_gl_code }}</p>
                </div>
              </div>
            </div>

            <!-- Payload details (guests list from the original submission) -->
            <div v-if="corporateRequest.payload" class="rounded-xl border bg-card overflow-hidden">
              <div class="flex items-center gap-2 p-5 pb-4 border-b">
                <Users class="size-4 text-primary" />
                <h3 class="font-semibold">Submission Details</h3>
              </div>
              <!-- Accommodation guests + room assignment -->
              <template v-if="isAccommodation && corporateGuests.length">
                <div v-if="task.status === 'pending' || task.status === 'in_progress'" class="px-5 py-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border-b flex items-center gap-1.5">
                  <BedDouble class="size-3.5" />
                  Assign a room to every guest before approving.
                </div>
                <div class="divide-y">
                  <div class="grid grid-cols-12 gap-2 px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                    <div class="col-span-3">Guest</div>
                    <div class="col-span-2">ID / Passport</div>
                    <div class="col-span-2">Check-in</div>
                    <div class="col-span-2">Check-out</div>
                    <div class="col-span-3">Assign Room</div>
                  </div>
                  <div
                    v-for="(g, i) in corporateGuests"
                    :key="i"
                    class="grid grid-cols-12 gap-2 px-5 py-3 text-sm items-center"
                  >
                    <div class="col-span-3 font-medium">{{ g.first_name }} {{ g.last_name }}</div>
                    <div class="col-span-2 text-muted-foreground text-xs font-mono">{{ g.identification_card || '—' }}</div>
                    <div class="col-span-2 text-muted-foreground text-xs">{{ g.check_in || '—' }}</div>
                    <div class="col-span-2 text-muted-foreground text-xs">{{ g.check_out || '—' }}</div>
                    <div class="col-span-3">
                      <!-- Pending: room picker -->
                      <select
                        v-if="task.status === 'pending' || task.status === 'in_progress'"
                        v-model="guestRoomSelection[i]"
                        class="w-full rounded-md border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                        :class="{ 'border-amber-400': !guestRoomSelection[i] }"
                      >
                        <option value="" disabled>
                          {{ roomsLoading ? 'Loading…' : (guestAvailableRooms[i]?.length ? 'Select room' : 'No rooms available') }}
                        </option>
                        <option
                          v-for="room in guestAvailableRooms[i]"
                          :key="room.id"
                          :value="room.id"
                          :disabled="roomTakenByOther(i, room.id)"
                        >
                          {{ room.name }} ({{ room.type }}) — ZMW {{ room.price_per_night?.toLocaleString() }}{{ roomTakenByOther(i, room.id) ? ' · taken' : '' }}
                        </option>
                      </select>
                      <!-- Completed: show preference -->
                      <span v-else class="text-muted-foreground capitalize text-xs">{{ g.room_type || '—' }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <!-- Event (conference, gala, wedding, … — event_type tells the kind) -->
              <template v-else-if="corporateRequest.booking_type === 'event'">
                <div class="px-5 py-4 text-sm grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div v-if="(corporateRequest.payload as any).event_type">
                    <p class="text-xs text-muted-foreground mb-0.5">Event Type</p>
                    <p class="capitalize">{{ (corporateRequest.payload as any).event_type.replace('_', ' ') }}</p>
                  </div>
                  <div v-if="(corporateRequest.payload as any).start_date">
                    <p class="text-xs text-muted-foreground mb-0.5">Start</p>
                    <p>{{ (corporateRequest.payload as any).start_date }} {{ (corporateRequest.payload as any).start_time }}</p>
                  </div>
                  <div v-if="(corporateRequest.payload as any).end_date || (corporateRequest.payload as any).end_time">
                    <p class="text-xs text-muted-foreground mb-0.5">End</p>
                    <p>{{ (corporateRequest.payload as any).end_date || (corporateRequest.payload as any).start_date }} {{ (corporateRequest.payload as any).end_time }}</p>
                  </div>
                  <div v-if="(corporateRequest.payload as any).headcount">
                    <p class="text-xs text-muted-foreground mb-0.5">Headcount</p>
                    <p>{{ (corporateRequest.payload as any).headcount }}</p>
                  </div>
                  <div v-if="(corporateRequest.payload as any).catering_required">
                    <p class="text-xs text-muted-foreground mb-0.5">Catering</p>
                    <p>Required</p>
                  </div>
                </div>

                <!-- Named guest roster, if the booker provided one -->
                <div v-if="eventGuests.length" class="border-t">
                  <div class="px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40">
                    Guest List ({{ eventGuests.length }})
                  </div>
                  <div class="divide-y">
                    <div
                      v-for="(g, i) in eventGuests"
                      :key="i"
                      class="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <span class="font-medium">{{ g.first_name }} {{ g.last_name }}</span>
                      <span class="text-xs text-muted-foreground font-mono">{{ g.identification_card || g.email || '' }}</span>
                    </div>
                  </div>
                </div>
                <div v-else class="px-5 py-3 text-xs text-muted-foreground border-t">
                  No individual guests named — headcount only.
                </div>
              </template>
              <!-- Meals — every selection is a menu item (per-guest or buffet),
                   priced from menu_items via meals_summary -->
              <template v-else-if="corporateRequest.booking_type === 'meals'">
                <div class="px-5 py-4 text-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div v-if="mealsSummary?.from">
                    <p class="text-xs text-muted-foreground mb-0.5">From</p>
                    <p>{{ mealsSummary.from }}</p>
                  </div>
                  <div v-if="mealsSummary?.to">
                    <p class="text-xs text-muted-foreground mb-0.5">To</p>
                    <p>{{ mealsSummary.to }}</p>
                  </div>
                  <div v-if="mealsSummary?.headcount">
                    <p class="text-xs text-muted-foreground mb-0.5">Headcount</p>
                    <p>{{ mealsSummary.headcount }}</p>
                  </div>
                  <div v-if="mealsSummary?.dietary_notes" class="col-span-2 sm:col-span-4">
                    <p class="text-xs text-muted-foreground mb-0.5">Dietary Notes</p>
                    <p>{{ mealsSummary.dietary_notes }}</p>
                  </div>
                </div>

                <!-- Buffet / shared items -->
                <div v-if="mealsSummary?.buffet_items?.length" class="border-t">
                  <div class="px-5 py-2 text-xs text-muted-foreground font-medium uppercase tracking-wide bg-muted/40 flex items-center gap-1.5">
                    <UtensilsCrossed class="size-3.5" /> Buffet / Shared
                  </div>
                  <div class="divide-y">
                    <div
                      v-for="(it, i) in mealsSummary.buffet_items"
                      :key="i"
                      class="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <span>
                        <span class="font-medium">{{ it.name }}</span>
                        <span class="text-muted-foreground"> × {{ it.quantity }}</span>
                        <span v-if="it.notes" class="text-xs text-muted-foreground italic"> — {{ it.notes }}</span>
                      </span>
                      <span class="text-muted-foreground tabular-nums">ZMW {{ it.subtotal.toLocaleString() }}</span>
                    </div>
                  </div>
                </div>

                <!-- Per-guest itemised selections -->
                <div v-for="(g, gi) in mealsSummary?.guests ?? []" :key="gi" class="border-t">
                  <div class="px-5 py-2 text-xs font-medium uppercase tracking-wide bg-muted/40 flex items-center justify-between">
                    <span class="text-muted-foreground">
                      {{ g.name }}
                      <span v-if="g.identification_card" class="font-mono normal-case"> · {{ g.identification_card }}</span>
                    </span>
                    <span class="text-muted-foreground tabular-nums normal-case">ZMW {{ g.subtotal.toLocaleString() }}</span>
                  </div>
                  <div class="divide-y">
                    <div
                      v-for="(it, i) in g.items"
                      :key="i"
                      class="flex items-center justify-between px-5 py-2.5 text-sm"
                    >
                      <span>
                        <span class="font-medium">{{ it.name }}</span>
                        <span class="text-muted-foreground"> × {{ it.quantity }}</span>
                        <span v-if="it.notes" class="text-xs text-muted-foreground italic"> — {{ it.notes }}</span>
                      </span>
                      <span class="text-muted-foreground tabular-nums">ZMW {{ it.subtotal.toLocaleString() }}</span>
                    </div>
                  </div>
                </div>

                <!-- Empty state -->
                <div
                  v-if="!mealsSummary?.buffet_items?.length && !mealsSummary?.guests?.length"
                  class="px-5 py-3 text-xs text-muted-foreground border-t"
                >
                  No menu items on this request.
                </div>

                <!-- Estimated total -->
                <div
                  v-if="mealsSummary && mealsSummary.estimated_total > 0"
                  class="flex items-center justify-between px-5 py-3 border-t bg-muted/30 text-sm font-semibold"
                >
                  <span>Estimated Total</span>
                  <span class="tabular-nums">ZMW {{ mealsSummary.estimated_total.toLocaleString() }}</span>
                </div>
              </template>
            </div>
          </template>
        </div>

        <!-- Right: documents + actions -->
        <div class="flex flex-col gap-4">

          <!-- Documents card -->
          <div class="rounded-xl border bg-card p-5 flex flex-col gap-3">
            <h3 class="font-semibold text-sm">Documents</h3>
            <hr class="border-border" />
            <div v-if="documents.length === 0" class="py-6 flex flex-col items-center gap-2 text-muted-foreground">
              <FileText class="size-8 opacity-30" />
              <p class="text-xs">No documents attached.</p>
            </div>
            <div v-else class="flex flex-col gap-2">
              <button
                v-for="(url, i) in documents"
                :key="i"
                class="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left w-full"
                @click="openDoc(url)"
              >
                <div class="size-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText v-if="isPdf(url)" class="size-4 text-primary" />
                  <ImageIcon v-else class="size-4 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium truncate">{{ isPdf(url) ? 'PDF Document' : 'Image' }} {{ i + 1 }}</p>
                  <p class="text-[10px] text-muted-foreground">Click to preview</p>
                </div>
                <ExternalLink class="size-3.5 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>

          <!-- Action buttons -->
          <div v-if="task.status === 'pending' || task.status === 'in_progress'" class="flex flex-col gap-2">
            <Button class="w-full" :disabled="!allGuestsAssigned" @click="openAction('approve')">
              <CheckCircle2 class="size-4 mr-2" />
              Approve
            </Button>
            <p v-if="isAccommodation && !allGuestsAssigned" class="text-xs text-amber-600 text-center -mt-1">
              Assign a room to every guest first
            </p>
            <Button
              variant="outline"
              class="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
              @click="openAction('reject')"
            >
              <XCircle class="size-4 mr-2" />
              Reject
            </Button>
          </div>

          <div v-else class="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground text-center">
            This task has been <strong class="text-foreground capitalize">{{ task.status }}</strong>.
          </div>
        </div>

      </div>
    </template>

    <!-- Task not found -->
    <div v-else-if="!loading && !store.tasksLoading" class="py-24 flex flex-col items-center gap-3 text-muted-foreground">
      <Loader2 class="size-8 opacity-30" />
      <p>Task not found.</p>
    </div>
  </div>

  <!-- Document preview sheet -->
  <Sheet v-model:open="docSheetOpen">
    <SheetContent side="right" class="w-full sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden">
      <SheetHeader class="px-6 pt-5 pb-4 border-b pr-14">
        <SheetTitle>Document Preview</SheetTitle>
      </SheetHeader>
      <div class="flex-1 min-h-0 overflow-hidden bg-muted/30">
        <iframe v-if="isPdf(selectedDoc)" :src="selectedDoc" class="w-full h-full border-0" />
        <div v-else class="w-full h-full flex items-center justify-center p-4 overflow-auto">
          <img :src="selectedDoc" class="max-w-full max-h-full object-contain rounded-lg" alt="Document" />
        </div>
      </div>
    </SheetContent>
  </Sheet>

  <TaskActionDialog
    v-model:open="actionDialog"
    :task="task ?? null"
    :action="dialogAction"
    @confirm="handleConfirm"
  />
</template>
