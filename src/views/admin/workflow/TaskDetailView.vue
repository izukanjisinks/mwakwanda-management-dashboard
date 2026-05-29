<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { bookingApi } from '@/services/api/bookings'
import { getApiError } from '@/utils/errors'
import { toast } from 'vue-sonner'
import type { Booking, CorporateBookingDetail } from '@/types/booking'
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
  BedDouble, Users, Loader2,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useWorkflowStore()

const taskId = computed(() => route.params.id as string)
const task = computed<WorkflowTask | undefined>(() =>
  [...store.pendingTasks, ...store.completedTasks].find(t => t.id === taskId.value),
)

const loading = ref(false)
const individualBooking = ref<Booking | null>(null)
const corporateDetail = ref<CorporateBookingDetail | null>(null)

const isCorporate = computed(() => task.value?.task_details?.task_type === 'corporate_booking')
const documents = computed<string[]>(() => {
  if (isCorporate.value) return corporateDetail.value?.documents ?? []
  return individualBooking.value?.documents ?? []
})

// Document sheet
const docSheetOpen = ref(false)
const selectedDoc = ref<string>('')

function isPdf(url: string) {
  return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('%2F') && url.toLowerCase().includes('pdf')
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
  const payload = { action, comments: comments || undefined }
  try {
    await store.processTask(task.value.instance_id, payload)
    toast.success(action === 'approve' ? 'Booking approved.' : 'Booking rejected.')
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
    case 'pending': return 'secondary'
    case 'confirmed': return 'default'
    case 'checked_in': return 'default'
    case 'checked_out': return 'outline'
    case 'cancelled': return 'destructive'
    case 'rejected': return 'destructive'
    default: return 'secondary'
  }
}

onMounted(async () => {
  // Ensure tasks are loaded
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
      corporateDetail.value = await bookingApi.getCorporateDetail(refId)
    } else {
      individualBooking.value = await bookingApi.get(refId)
    }
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load booking details.'))
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

        <!-- Left: booking details -->
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
                  <p>{{ isCorporate ? 'Corporate Booking' : 'Individual Booking' }}</p>
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
            </div>
          </div>

          <!-- Individual booking details -->
          <div v-if="!isCorporate && individualBooking" class="rounded-xl border bg-card p-6 flex flex-col gap-4">
            <div class="flex items-center gap-2 mb-1">
              <BedDouble class="size-4 text-primary" />
              <h3 class="font-semibold">Booking Details</h3>
              <Badge variant="outline" class="ml-auto font-mono text-xs">{{ individualBooking.booking_number }}</Badge>
            </div>
            <hr class="border-border" />
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Guest</p>
                <p class="font-medium">{{ individualBooking.client_name }}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Room</p>
                <p class="font-medium">{{ individualBooking.room_name }}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Status</p>
                <Badge :variant="statusVariant(individualBooking.status)" class="capitalize text-xs">
                  {{ individualBooking.status }}
                </Badge>
              </div>
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Check-in</p>
                <div class="flex items-center gap-1.5">
                  <CalendarDays class="size-3.5 text-muted-foreground" />
                  <p>{{ fmt(individualBooking.check_in) }}</p>
                </div>
              </div>
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Check-out</p>
                <div class="flex items-center gap-1.5">
                  <CalendarDays class="size-3.5 text-muted-foreground" />
                  <p>{{ fmt(individualBooking.check_out) }}</p>
                </div>
              </div>
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Guests / Nights</p>
                <div class="flex items-center gap-1.5">
                  <Users class="size-3.5 text-muted-foreground" />
                  <p>{{ individualBooking.guests }} guests · {{ individualBooking.nights }} nights</p>
                </div>
              </div>
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Room Cost</p>
                <p class="font-medium">ZMW {{ individualBooking.room_cost?.toLocaleString() }}</p>
              </div>
              <div>
                <p class="text-xs text-muted-foreground mb-0.5">Total Amount</p>
                <p class="font-semibold text-base">ZMW {{ individualBooking.total_amount?.toLocaleString() }}</p>
              </div>
            </div>
            <div v-if="individualBooking.special_requests" class="pt-3 border-t text-sm">
              <p class="text-xs text-muted-foreground mb-0.5">Special Requests</p>
              <p>{{ individualBooking.special_requests }}</p>
            </div>
          </div>

          <!-- Corporate booking details -->
          <template v-if="isCorporate && corporateDetail">
            <!-- Company info -->
            <div class="rounded-xl border bg-card p-6 flex flex-col gap-4">
              <div class="flex items-center gap-2 mb-1">
                <Building2 class="size-4 text-primary" />
                <h3 class="font-semibold">Company Details</h3>
              </div>
              <hr class="border-border" />
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p class="text-xs text-muted-foreground mb-0.5">Company</p>
                  <p class="font-medium">{{ corporateDetail.company_name }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground mb-0.5">Contact Person</p>
                  <p class="font-medium">{{ corporateDetail.contact_person }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p>{{ corporateDetail.email }}</p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p>{{ corporateDetail.phone }}</p>
                </div>
                <div v-if="corporateDetail.company_reg_number">
                  <p class="text-xs text-muted-foreground mb-0.5">Reg. Number</p>
                  <p>{{ corporateDetail.company_reg_number }}</p>
                </div>
                <div v-if="corporateDetail.industry">
                  <p class="text-xs text-muted-foreground mb-0.5">Industry</p>
                  <p class="capitalize">{{ corporateDetail.industry }}</p>
                </div>
              </div>
            </div>

            <!-- Guest bookings table -->
            <div class="rounded-xl border bg-card overflow-hidden">
              <div class="flex items-center gap-2 p-5 pb-4 border-b">
                <Users class="size-4 text-primary" />
                <h3 class="font-semibold">Guest Bookings</h3>
                <span class="ml-auto text-xs text-muted-foreground">{{ corporateDetail.guests.length }} guest{{ corporateDetail.guests.length !== 1 ? 's' : '' }}</span>
              </div>
              <div class="divide-y">
                <div
                  v-for="guest in corporateDetail.guests"
                  :key="guest.booking_id"
                  class="grid grid-cols-12 gap-2 px-5 py-3 text-sm items-center"
                >
                  <div class="col-span-2 text-xs text-muted-foreground font-mono">{{ guest.booking_number }}</div>
                  <div class="col-span-3 font-medium truncate">{{ guest.client_name }}</div>
                  <div class="col-span-2 text-muted-foreground truncate">{{ guest.room_name }}</div>
                  <div class="col-span-2 text-muted-foreground">{{ fmt(guest.check_in) }}</div>
                  <div class="col-span-2 text-muted-foreground">{{ fmt(guest.check_out) }}</div>
                  <div class="col-span-1 text-right">
                    <Badge :variant="statusVariant(guest.status)" class="capitalize text-xs">{{ guest.status }}</Badge>
                  </div>
                </div>
                <div v-if="corporateDetail.guests.length === 0" class="px-5 py-8 text-center text-sm text-muted-foreground">
                  No guest bookings found.
                </div>
              </div>
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

          <!-- Action buttons (only for active tasks) -->
          <div v-if="task.status === 'pending' || task.status === 'in_progress'" class="flex flex-col gap-2">
            <Button class="w-full" @click="openAction('approve')">
              <CheckCircle2 class="size-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="outline"
              class="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
              @click="openAction('reject')"
            >
              <XCircle class="size-4 mr-2" />
              Reject
            </Button>
          </div>

          <!-- Completed status note -->
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
        <!-- PDF -->
        <iframe
          v-if="isPdf(selectedDoc)"
          :src="selectedDoc"
          class="w-full h-full border-0"
        />
        <!-- Image -->
        <div v-else class="w-full h-full flex items-center justify-center p-4 overflow-auto">
          <img :src="selectedDoc" class="max-w-full max-h-full object-contain rounded-lg" alt="Document" />
        </div>
      </div>
    </SheetContent>
  </Sheet>

  <!-- Action dialog -->
  <TaskActionDialog
    v-model:open="actionDialog"
    :task="task ?? null"
    :action="dialogAction"
    @confirm="handleConfirm"
  />
</template>
