<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { payrollApi } from '@/services/api/payroll'
import type { PayrollPeriod } from '@/types/payroll'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import ResultDialog from '@/components/common/ResultDialog.vue'
import Pagination from '@/components/common/Pagination.vue'
import { Wallet, Search, Loader2, Play, Plus, CalendarDays } from 'lucide-vue-next'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { confirm } = useConfirmDialog()
const periods = ref<PayrollPeriod[]>([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// Create dialog
const createDialogOpen = ref(false)
const creating = ref(false)

// Result dialog
const resultDialog = ref({
  open: false,
  type: 'success' as 'success' | 'error',
  title: '',
  message: '',
})

// Current month dates
const now = new Date()
const currentMonthLabel = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
const currentYear = now.getFullYear()
const currentMonth = now.getMonth()
const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

// Computed
const filteredPeriods = computed(() => {
  if (!searchQuery.value) return periods.value

  const query = searchQuery.value.toLowerCase()
  return periods.value.filter(
    (p) =>
      p.status.toLowerCase().includes(query) ||
      p.processed_by_name?.toLowerCase().includes(query) ||
      formatPeriod(p.start_date, p.end_date).toLowerCase().includes(query)
  )
})

const currentMonthExists = computed(() => {
  return periods.value.some((p) => {
    const pStart = new Date(p.start_date)
    return pStart.getFullYear() === currentYear && pStart.getMonth() === currentMonth
  })
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatPeriod(startDate: string, endDate: string) {
  const start = new Date(startDate)
  return start.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'OPEN':
      return 'outline'
    case 'PROCESSING':
      return 'secondary'
    case 'COMPLETED':
      return 'default'
    default:
      return 'secondary'
  }
}

async function loadPeriods() {
  loading.value = true
  try {
    const response = await payrollApi.getPayrollPeriods({ page: page.value, page_size: pageSize.value })
    periods.value = response.data ?? []
    total.value = response.total
  } catch (err: any) {
    console.error('Failed to load payroll periods:', err)
    if (err?.error?.code === 'FORBIDDEN' || err?.status === 403) {
      return
    }
    resultDialog.value = {
      open: true,
      type: 'error',
      title: 'Failed to Load Payroll Periods',
      message: 'Unable to load payroll periods. Please try again.',
    }
  } finally {
    loading.value = false
  }
}

async function handleCreatePayroll() {
  creating.value = true
  try {
    await payrollApi.createPayrollPeriod({ start_date: startDate, end_date: endDate })
    createDialogOpen.value = false
    resultDialog.value = {
      open: true,
      type: 'success',
      title: 'Payroll Created',
      message: `Payroll period for ${currentMonthLabel} has been created successfully.`,
    }
    await loadPeriods()
  } catch (err: any) {
    console.error('Failed to create payroll:', err)
    resultDialog.value = {
      open: true,
      type: 'error',
      title: 'Failed to Create Payroll',
      message: err?.error?.message || 'Unable to create payroll period. Please try again.',
    }
  } finally {
    creating.value = false
  }
}

async function handleRunPayroll(period: PayrollPeriod) {
  const confirmed = await confirm({
    title: 'Run Payroll?',
    description: `Are you sure you want to run payroll for ${formatPeriod(period.start_date, period.end_date)}?`,
    confirmText: 'Run Payroll',
  })
  if (!confirmed) {
    return
  }

  try {
    await payrollApi.runPayroll(period.id)
    resultDialog.value = {
      open: true,
      type: 'success',
      title: 'Payroll Processing',
      message: `Payroll for ${formatPeriod(period.start_date, period.end_date)} has been submitted for processing.`,
    }
    await loadPeriods()
  } catch (err: any) {
    console.error('Failed to run payroll:', err)
    resultDialog.value = {
      open: true,
      type: 'error',
      title: 'Failed to Run Payroll',
      message: err?.error?.message || 'Unable to run payroll. Please try again.',
    }
  }
}

// Watch for page changes
watch(page, () => {
  loadPeriods()
})

onMounted(() => {
  loadPeriods()
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Wallet class="w-8 h-8 text-primary" />
          Payroll
        </h1>
        <p class="text-muted-foreground mt-1">
          Manage payroll periods and processing
        </p>
      </div>
      <Button @click="createDialogOpen = true" size="lg" :disabled="currentMonthExists">
        <Plus class="w-4 h-4 mr-2" />
        Create Payroll
      </Button>
    </div>

    <!-- Search and Filters -->
    <div class="flex items-center gap-4">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search by period, status, or processed by..."
          class="pl-10"
        />
      </div>
      <div class="text-sm text-muted-foreground">
        {{ total }} period{{ total !== 1 ? 's' : '' }} total
      </div>
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
            <TableHead>Period</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Processed By</TableHead>
            <TableHead>Created</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="filteredPeriods.length === 0">
            <TableCell colspan="7" class="text-center py-8 text-muted-foreground">
              {{ searchQuery ? 'No payroll periods found matching your search.' : 'No payroll periods yet.' }}
            </TableCell>
          </TableRow>
          <TableRow v-for="period in filteredPeriods" :key="period.id">
            <TableCell class="font-medium">
              {{ formatPeriod(period.start_date, period.end_date) }}
            </TableCell>
            <TableCell>{{ formatDate(period.start_date) }}</TableCell>
            <TableCell>{{ formatDate(period.end_date) }}</TableCell>
            <TableCell>
              <Badge :variant="getStatusVariant(period.status)">
                {{ period.status }}
              </Badge>
            </TableCell>
            <TableCell>
              <span v-if="period.processed_by_name">{{ period.processed_by_name }}</span>
              <span v-else class="text-muted-foreground">-</span>
            </TableCell>
            <TableCell class="text-muted-foreground text-sm">
              {{ formatDate(period.created_at) }}
            </TableCell>
            <TableCell class="text-right">
              <Button
                v-if="period.status === 'OPEN'"
                variant="ghost"
                size="sm"
                @click="handleRunPayroll(period)"
              >
                <Play class="w-4 h-4 mr-1" />
                Run
              </Button>
              <span v-else class="text-sm text-muted-foreground">-</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <Pagination
        :current-page="page"
        :page-size="pageSize"
        :total="total"
        @update:page="(newPage) => (page = newPage)"
      />
    </div>

    <!-- Create Payroll Dialog -->
    <Dialog :open="createDialogOpen" @update:open="(val) => (createDialogOpen = val)">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Wallet class="w-5 h-5" />
            Create Payroll Period
          </DialogTitle>
          <DialogDescription>
            Create a new payroll period for the current month.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <CalendarDays class="size-4" />
          <AlertTitle>{{ currentMonthLabel }}</AlertTitle>
          <AlertDescription>
            <ul class="mt-2 list-inside list-disc space-y-1">
              <li>Start Date: <span class="font-medium">{{ formatDate(startDate) }}</span></li>
              <li>End Date: <span class="font-medium">{{ formatDate(endDate) }}</span></li>
            </ul>
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="outline" @click="createDialogOpen = false" :disabled="creating">
            Cancel
          </Button>
          <Button @click="handleCreatePayroll" :disabled="creating">
            <Loader2 v-if="creating" class="w-4 h-4 mr-2 animate-spin" />
            Create Payroll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Result Dialog -->
    <ResultDialog
      :open="resultDialog.open"
      :type="resultDialog.type"
      :title="resultDialog.title"
      :message="resultDialog.message"
      @update:open="(val) => (resultDialog.open = val)"
    />
  </div>
</template>
