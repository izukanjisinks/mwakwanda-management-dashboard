<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { CalendarCell, CalendarCellTrigger, CalendarGrid, CalendarGridBody, CalendarGridHead, CalendarGridRow, CalendarHeadCell, CalendarHeader, CalendarHeading, CalendarNextButton, CalendarPrevButton } from '@/components/ui/calendar'
import { getLocalTimeZone, CalendarDate, today } from '@internationalized/date'
import { CalendarRoot } from 'reka-ui'
import { leaveApi } from '@/services/api/leave'
import type { LeaveRequest } from '@/types/leave'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { CalendarDays, ChevronRight } from 'lucide-vue-next'

const leaveRequests = ref<LeaveRequest[]>([])
const loading = ref(true)
const placeholder = ref(today(getLocalTimeZone()))

// Build a map of date string -> leave info for fast lookups
const leaveDateMap = computed(() => {
  const map = new Map<string, { status: string; position: string }>()

  leaveRequests.value.forEach(leave => {
    const start = new Date(leave.start_date)
    const end = new Date(leave.end_date)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)

    const dates: Date[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d))
    }

    dates.forEach((date, index) => {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      let position = 'middle'
      if (dates.length === 1) position = 'single'
      else if (index === 0) position = 'start'
      else if (index === dates.length - 1) position = 'end'

      map.set(key, { status: leave.status, position })
    })
  })

  return map
})

function getLeaveInfo(year: number, month: number, day: number) {
  // month from reka-ui is 1-based, JS Date months are 0-based
  const key = `${year}-${month - 1}-${day}`
  return leaveDateMap.value.get(key) || null
}

function getCellClass(year: number, month: number, day: number) {
  const info = getLeaveInfo(year, month, day)
  if (!info) return ''

  const isApproved = info.status === 'approved'
  const bg = isApproved ? 'bg-primary/20' : 'bg-amber-500/20'

  const classes = [bg]

  if (info.position === 'start') {
    classes.push('rounded-l-md')
  } else if (info.position === 'end') {
    classes.push('rounded-r-md')
  } else if (info.position === 'single') {
    classes.push('rounded-md')
  }

  return classes.join(' ')
}

function getTriggerClass(year: number, month: number, day: number) {
  const info = getLeaveInfo(year, month, day)
  if (!info) return ''

  const isApproved = info.status === 'approved'

  if (info.position === 'start' || info.position === 'single') {
    return isApproved
      ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
      : 'bg-amber-600 text-white hover:bg-amber-600 hover:text-white'
  }
  if (info.position === 'end') {
    return isApproved
      ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
      : 'bg-amber-600 text-white hover:bg-amber-600 hover:text-white'
  }

  return ''
}

const sheetOpen = ref(false)

// Nearest upcoming approved leave
const nearestApprovedLeave = computed(() => {
  const now = new Date()
  return leaveRequests.value.find(
    l => l.status === 'approved' && new Date(l.start_date) >= now
  ) || null
})

// All upcoming leaves sorted by date
const upcomingLeaves = computed(() => {
  const now = new Date()
  return leaveRequests.value
    .filter(l => new Date(l.start_date) >= now)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
})

function formatDateRange(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`
}

function daysUntil(dateStr: string) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Starts today'
  if (diff === 1) return 'Starts tomorrow'
  return `Starts in ${diff} days`
}

async function fetchLeaveRequests() {
  loading.value = true
  try {
    const response = await leaveApi.getMyLeaveRequests()
    leaveRequests.value = response.data ?? []

    // Navigate to the month of the next upcoming leave
    const upcomingLeaves = response.data.filter((l: LeaveRequest) => new Date(l.start_date) >= new Date())
    if (upcomingLeaves.length > 0) {
      const startDate = new Date(upcomingLeaves[0].start_date)
      placeholder.value = new CalendarDate(startDate.getFullYear(), startDate.getMonth() + 1, 1)
    }
  } catch (err) {
    console.error('Failed to load leave requests:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchLeaveRequests()
})
</script>

<template>
  <div class="space-y-4">
    <CalendarRoot
      v-slot="{ grid, weekDays }"
      :placeholder="placeholder"
      @update:placeholder="(val) => placeholder = val"
      data-slot="calendar"
      class="p-3 rounded-md border"
      :readonly="true"
    >
      <CalendarHeader class="pt-0">
        <nav class="flex items-center gap-1 absolute top-0 inset-x-0 justify-between">
          <CalendarPrevButton />
          <CalendarNextButton />
        </nav>
        <CalendarHeading />
      </CalendarHeader>

      <div class="flex flex-col gap-y-4 mt-4 sm:flex-row sm:gap-x-4 sm:gap-y-0">
        <CalendarGrid v-for="month in grid" :key="month.value.toString()">
          <CalendarGridHead>
            <CalendarGridRow>
              <CalendarHeadCell v-for="day in weekDays" :key="day">
                {{ day }}
              </CalendarHeadCell>
            </CalendarGridRow>
          </CalendarGridHead>
          <CalendarGridBody>
            <CalendarGridRow v-for="(weekDates, index) in month.rows" :key="`weekDate-${index}`" class="mt-2 w-full">
              <CalendarCell
                v-for="weekDate in weekDates"
                :key="weekDate.toString()"
                :date="weekDate"
                :class="getCellClass(weekDate.year, weekDate.month, weekDate.day)"
              >
                <CalendarCellTrigger
                  :day="weekDate"
                  :month="month.value"
                  :class="getTriggerClass(weekDate.year, weekDate.month, weekDate.day)"
                />
              </CalendarCell>
            </CalendarGridRow>
          </CalendarGridBody>
        </CalendarGrid>
      </div>
    </CalendarRoot>

    <!-- Legend -->
    <div class="flex items-center gap-4 text-sm">
      <div class="flex items-center gap-2">
        <div class="flex items-center">
          <div class="size-6 rounded-sm  bg-primary" />
        </div>
        <span class="text-muted-foreground">Approved</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex items-center">
          <div class="size-6 rounded-sm bg-amber-600" />
        </div>
        <span class="text-muted-foreground">Pending</span>
      </div>
    </div>

    <!-- Nearest Approved Leave Alert -->
    <Sheet :open="sheetOpen" @update:open="(val) => sheetOpen = val">
      <div v-if="nearestApprovedLeave" class="cursor-pointer" @click="sheetOpen = true">
        <Alert class="transition-colors hover:bg-accent/50">
          <CalendarDays class="size-4" />
          <AlertTitle class="flex items-center justify-between">
            <span>{{ nearestApprovedLeave.leave_type.name }}</span>
            <ChevronRight class="size-4 text-muted-foreground" />
          </AlertTitle>
          <AlertDescription class="flex items-center justify-between">
            <span>{{ formatDateRange(nearestApprovedLeave.start_date, nearestApprovedLeave.end_date) }} ({{ nearestApprovedLeave.total_days }} days)</span>
            <span class="text-xs">{{ daysUntil(nearestApprovedLeave.start_date) }}</span>
          </AlertDescription>
        </Alert>
      </div>
      <div v-else-if="upcomingLeaves.length > 0" class="cursor-pointer" @click="sheetOpen = true">
        <Alert class="transition-colors hover:bg-accent/50">
          <CalendarDays class="size-4" />
          <AlertTitle class="flex items-center justify-between">
            <span>{{ upcomingLeaves[0].leave_type.name }} (Pending)</span>
            <ChevronRight class="size-4 text-muted-foreground" />
          </AlertTitle>
          <AlertDescription>
            {{ formatDateRange(upcomingLeaves[0].start_date, upcomingLeaves[0].end_date) }} ({{ upcomingLeaves[0].total_days }} days)
          </AlertDescription>
        </Alert>
      </div>
      <p v-else class="text-sm text-muted-foreground">
        No upcoming leaves
      </p>

      <!-- Sheet with all leave requests -->
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Leave Requests</SheetTitle>
          <SheetDescription>
            All your leave requests
          </SheetDescription>
        </SheetHeader>
        <div class="flex-1 overflow-y-auto px-4">
          <div class="space-y-4">
            <div
              v-for="leave in leaveRequests"
              :key="leave.id"
              class="flex flex-col gap-2 rounded-lg border p-4"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">{{ leave.leave_type.name }}</span>
                <Badge
                  :variant="leave.status === 'approved' ? 'default' : leave.status === 'rejected' ? 'destructive' : 'outline'"
                  class="capitalize"
                >
                  {{ leave.status }}
                </Badge>
              </div>
              <div class="flex items-center justify-between text-sm text-muted-foreground">
                <span>{{ formatDateRange(leave.start_date, leave.end_date) }}</span>
                <span>{{ leave.total_days }} day{{ leave.total_days === 1 ? '' : 's' }}</span>
              </div>
              <p v-if="leave.reason" class="text-sm text-muted-foreground">
                {{ leave.reason }}
              </p>
              <p v-if="leave.review_comment" class="text-sm text-muted-foreground italic">
                Review: {{ leave.review_comment }}
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
