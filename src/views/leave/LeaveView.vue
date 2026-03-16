<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { leaveApi } from '@/services/api/leave'
import type { LeaveRequest, LeaveType, CreateLeaveRequestPayload } from '@/types/leave'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, Loader2, Plus } from 'lucide-vue-next'

const leaveRequests = ref<LeaveRequest[]>([])
const leaveTypes = ref<LeaveType[]>([])
const loading = ref(true)
const loadingTypes = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const currentPage = ref(1)
const pageSize = ref(20)
const totalPages = ref(0)
const totalItems = ref(0)
const dialogOpen = ref(false)

// Form state
const formData = ref<CreateLeaveRequestPayload>({
  leave_type_id: '',
  start_date: '',
  end_date: '',
  reason: '',
})
const formError = ref<string | null>(null)

const statusVariant = (status: string) => {
  switch (status) {
    case 'approved':
      return 'default'
    case 'rejected':
      return 'destructive'
    case 'cancelled':
      return 'secondary'
    case 'pending':
      return 'outline'
    default:
      return 'secondary'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatDateForInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function fetchLeaveRequests() {
  loading.value = true
  error.value = null
  try {
    const response = await leaveApi.getMyLeaveRequests(currentPage.value, pageSize.value)
    console.log('Leave requests response:', response)

    leaveRequests.value = response.data || []

    if (response.pagination) {
      totalPages.value = response.pagination.total_pages
      totalItems.value = response.pagination.total_items
    } else {
      // Fallback if pagination is missing
      totalItems.value = leaveRequests.value.length
      totalPages.value = 1
    }
  } catch (err) {
    console.error('Failed to load leave requests:', err)
    error.value = `Failed to load leave requests: ${(err as any)?.error?.message || (err as Error)?.message || 'Unknown error'}`
  } finally {
    loading.value = false
  }
}

async function fetchLeaveTypes() {
  loadingTypes.value = true
  try {
    leaveTypes.value = await leaveApi.getLeaveTypes()
  } catch (err) {
    console.error('Failed to load leave types:', err)
  } finally {
    loadingTypes.value = false
  }
}

async function handleSubmit() {
  formError.value = null

  // Validation
  if (!formData.value.leave_type_id) {
    formError.value = 'Please select a leave type'
    return
  }
  if (!formData.value.start_date) {
    formError.value = 'Please select a start date'
    return
  }
  if (!formData.value.end_date) {
    formError.value = 'Please select an end date'
    return
  }
  if (!formData.value.reason.trim()) {
    formError.value = 'Please provide a reason'
    return
  }

  // Convert dates to ISO format with time
  const startDate = new Date(formData.value.start_date)
  const endDate = new Date(formData.value.end_date)

  if (endDate < startDate) {
    formError.value = 'End date must be after start date'
    return
  }

  submitting.value = true
  try {
    const payload: CreateLeaveRequestPayload = {
      leave_type_id: formData.value.leave_type_id,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      reason: formData.value.reason.trim(),
    }

    await leaveApi.createLeaveRequest(payload)

    // Reset form and close dialog
    formData.value = {
      leave_type_id: '',
      start_date: '',
      end_date: '',
      reason: '',
    }
    dialogOpen.value = false

    // Refresh the list
    await fetchLeaveRequests()
  } catch (err) {
    console.error('Failed to create leave request:', err)
    formError.value = (err as any)?.error?.message || (err as Error)?.message || 'Failed to create leave request'
  } finally {
    submitting.value = false
  }
}

function openDialog() {
  dialogOpen.value = true
  if (leaveTypes.value.length === 0) {
    fetchLeaveTypes()
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    fetchLeaveRequests()
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    fetchLeaveRequests()
  }
}

onMounted(() => {
  fetchLeaveRequests()
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <CalendarDays class="w-8 h-8 text-primary" />
          Leave Requests
        </h1>
        <p class="text-muted-foreground mt-1">View and manage your leave requests</p>
      </div>

      <!-- New Request Dialog -->
      <Dialog :open="dialogOpen" @update:open="(val) => dialogOpen = val">
        <DialogTrigger as-child>
          <Button @click="openDialog">
            <Plus class="size-4 mr-2" />
            New Request
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Leave Request</DialogTitle>
            <DialogDescription>
              Submit a new leave request. Fill in all required fields.
            </DialogDescription>
          </DialogHeader>

          <div class="grid gap-4 py-4">
            <!-- Leave Type -->
            <div class="grid gap-2">
              <Label for="leave-type">Leave Type</Label>
              <Select v-model="formData.leave_type_id" :disabled="loadingTypes">
                <SelectTrigger id="leave-type">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem
                      v-for="type in leaveTypes"
                      :key="type.id"
                      :value="type.id"
                    >
                      {{ type.name }} ({{ type.code }})
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <!-- Start Date -->
            <div class="grid gap-2">
              <Label for="start-date">Start Date</Label>
              <input
                id="start-date"
                v-model="formData.start_date"
                type="date"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <!-- End Date -->
            <div class="grid gap-2">
              <Label for="end-date">End Date</Label>
              <input
                id="end-date"
                v-model="formData.end_date"
                type="date"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <!-- Reason -->
            <div class="grid gap-2">
              <Label for="reason">Reason</Label>
              <Textarea
                id="reason"
                v-model="formData.reason"
                placeholder="Please provide a reason for your leave request..."
                class="resize-none"
                rows="4"
              />
            </div>

            <!-- Error Message -->
            <div v-if="formError" class="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {{ formError }}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              @click="dialogOpen = false"
              :disabled="submitting"
            >
              Cancel
            </Button>
            <Button
              @click="handleSubmit"
              :disabled="submitting"
            >
              {{ submitting ? 'Submitting...' : 'Submit Request' }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Error State -->
    <div v-if="error" class="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
      {{ error }}
    </div>

    <!-- Request count -->
    <div v-if="!loading" class="text-sm text-muted-foreground">
      {{ totalItems }} request{{ totalItems === 1 ? '' : 's' }} total
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Table -->
    <div v-else class="rounded-lg border px-3 py-2">
      <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Review Comment</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-if="leaveRequests.length === 0">
                <TableCell colspan="7" class="text-center text-muted-foreground">
                  No leave requests found
                </TableCell>
              </TableRow>
              <TableRow v-for="request in leaveRequests" :key="request.id">
                <TableCell class="font-medium">{{ formatDate(request.start_date) }}</TableCell>
                <TableCell>{{ formatDate(request.end_date) }}</TableCell>
                <TableCell>{{ request.total_days }}</TableCell>
                <TableCell class="max-w-xs truncate">{{ request.reason }}</TableCell>
                <TableCell>
                  <Badge :variant="statusVariant(request.status)">
                    {{ request.status }}
                  </Badge>
                </TableCell>
                <TableCell class="max-w-xs truncate">
                  {{ request.review_comment || '-' }}
                </TableCell>
                <TableCell class="text-muted-foreground">
                  {{ formatDate(request.created_at) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
            <p class="text-sm text-muted-foreground">
              Page {{ currentPage }} of {{ totalPages }}
            </p>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                :disabled="currentPage === 1"
                @click="prevPage"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                :disabled="currentPage === totalPages"
                @click="nextPage"
              >
                Next
              </Button>
            </div>
          </div>
    </div>
  </div>
</template>
