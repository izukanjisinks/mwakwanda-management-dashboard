<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { dashboardApi } from '@/services/api/dashboard'
import type { DashboardData } from '@/types/dashboard'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  CalendarDays,
  CalendarOff,
  CalendarCheck,
  Building2,
  UserCheck,
  Briefcase,
  Calendar as CalendarIcon,
  Shield,
} from 'lucide-vue-next'
import { Skeleton } from '@/components/ui/skeleton'
import LeaveCalendar from '@/components/leave/LeaveCalendar.vue'

const authStore = useAuthStore()
const data = ref<DashboardData | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const leaveStats = computed(() => {
  if (!data.value) return []
  return [
    {
      title: 'Leave Days This Month',
      value: data.value.leave_days_this_month,
      description: 'Days taken this month',
      icon: CalendarDays,
    },
    {
      title: 'Yearly Entitlement',
      value: data.value.yearly_entitlement,
      description: 'Total annual leave days',
      icon: CalendarCheck,
    },
    {
      title: 'Total Leave Requests',
      value: data.value.leave_requests,
      description: 'Total leave requests submitted',
      icon: CalendarOff,
    },
  ]
})

async function fetchDashboard() {
  loading.value = true
  error.value = null
  try {
    data.value = await dashboardApi.getDashboard()
  } catch (err) {
    console.error('Failed to load dashboard:', err)
    error.value = `Failed to load dashboard data: ${(err as any)?.error?.message || (err as Error)?.message || 'Unknown error'}`
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboard()
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-semibold">Dashboard</h1>
      <p class="text-muted-foreground">
        Welcome back, {{ data?.employee_details.employee_name ?? authStore.user?.email }}
      </p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
      {{ error }}
    </div>

    <!-- Leave Stats Cards -->
    <div v-if="loading" class="grid gap-4 sm:grid-cols-3">
      <Card v-for="i in 3" :key="i" class="shadow-none">
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <Skeleton class="h-4 w-32" />
          <Skeleton class="size-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton class="h-8 w-16 mb-2" />
          <Skeleton class="h-3 w-24" />
        </CardContent>
      </Card>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-3">
      <Card v-for="stat in leaveStats" :key="stat.title" class="shadow-none">
        <CardHeader class="flex flex-row items-center justify-between pb-2">
          <CardTitle class="text-sm font-medium">{{ stat.title }}</CardTitle>
          <component :is="stat.icon" class="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p class="text-2xl font-bold">{{ stat.value }}</p>
          <CardDescription>{{ stat.description }}</CardDescription>
        </CardContent>
      </Card>
    </div>

    <!-- Bottom Section: Calendar + Employee Stats -->
    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Leave Calendar Card -->
      <Card class="shadow-none">
        <CardHeader>
          <CardTitle>Leave Calendar</CardTitle>
          <CardDescription>
            View your approved and pending leave requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveCalendar />
        </CardContent>
      </Card>

      <!-- Employee Stats Card -->
      <Card class="shadow-none">
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
          <CardDescription v-if="data">{{ data.employee_details.position }}</CardDescription>
        </CardHeader>
        <CardContent v-if="loading">
          <div class="space-y-3">
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-4 w-2/3" />
          </div>
        </CardContent>
        <CardContent v-else-if="data" class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
              <Building2 class="size-4 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-muted-foreground">Department</p>
              <p class="font-medium">{{ data.employee_details.department }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
              <UserCheck class="size-4 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-muted-foreground">Supervisor</p>
              <p class="font-medium">{{ data.employee_details.supervisor }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
              <Briefcase class="size-4 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-muted-foreground">Position Code</p>
              <p class="font-medium">{{ data.employee_details.position_code }}</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
              <CalendarIcon class="size-4 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-muted-foreground">Employment Period</p>
              <p class="font-medium">{{ data.employee_details.employment_period }} months</p>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <div class="size-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
              <Shield class="size-4 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm text-muted-foreground">Employment Type</p>
              <p class="font-medium capitalize">{{ data.employee_details.role.replace('_', ' ') }}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
