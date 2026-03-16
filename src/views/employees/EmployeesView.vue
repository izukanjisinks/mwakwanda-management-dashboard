<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { employeeApi } from '@/services/api/employee'
import { departmentApi } from '@/services/api/department'
import { positionApi } from '@/services/api/position'
import type { Employee } from '@/types/employee'
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
import EmployeeDialog from '@/components/employees/EmployeeDialog.vue'
import ResultDialog from '@/components/common/ResultDialog.vue'
import Pagination from '@/components/common/Pagination.vue'
import { Users, Plus, Search, Loader2, Pencil, Trash2 } from 'lucide-vue-next'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { confirm } = useConfirmDialog()
const employees = ref<Employee[]>([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// Dialog states
const dialogOpen = ref(false)
const selectedEmployee = ref<Employee | null>(null)

// Result dialog
const resultDialog = ref({
  open: false,
  type: 'success' as 'success' | 'error',
  title: '',
  message: '',
})

// Dropdown data
const departments = ref<Array<{ id: string; name: string }>>([])
const positions = ref<Array<{ id: string; title: string }>>([])
const managers = ref<Array<{ id: string; name: string }>>([])

// Computed
const filteredEmployees = computed(() => {
  if (!searchQuery.value) return employees.value

  const query = searchQuery.value.toLowerCase()
  return employees.value.filter(
    (emp) =>
      emp.first_name.toLowerCase().includes(query) ||
      emp.last_name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.employee_number.toLowerCase().includes(query)
  )
})

async function loadEmployees() {
  loading.value = true
  try {
    const response = await employeeApi.getEmployees({ page: page.value, page_size: pageSize.value })
    employees.value = response.data ?? []
    total.value = response.total

    // Build managers list from employees
    managers.value = employees.value.map((emp) => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
    }))
  } catch (err: any) {
    console.error('Failed to load employees:', err)
    // Don't show error dialog for 403 Forbidden - API client already handles it
    if (err?.error?.code === 'FORBIDDEN') {
      return
    }
    resultDialog.value = {
      open: true,
      type: 'error',
      title: 'Failed to Load Employees',
      message: 'Unable to load employees. Please try again.',
    }
  } finally {
    loading.value = false
  }
}

async function loadDepartments() {
  try {
    const response = await departmentApi.getDepartments({ is_active: true, page_size: 100 })
    departments.value = response.data.map((dept) => ({
      id: dept.id,
      name: dept.name,
    }))
  } catch (err) {
    console.error('Failed to load departments:', err)
  }
}

async function loadPositions() {
  try {
    const response = await positionApi.getPositions({ is_active: true, page_size: 100 })
    positions.value = response.data.map((pos) => ({
      id: pos.id,
      title: pos.title,
    }))
  } catch (err) {
    console.error('Failed to load positions:', err)
  }
}

async function loadInitialData() {
  await Promise.all([
    loadEmployees(),
    loadDepartments(),
    loadPositions(),
  ])
}

function handleAddEmployee() {
  selectedEmployee.value = null
  dialogOpen.value = true
}

function handleEditEmployee(employee: Employee) {
  selectedEmployee.value = employee
  dialogOpen.value = true
}

async function handleSaveEmployee(payload: any, onError?: (error: string) => void) {
  try {
    if (selectedEmployee.value) {
      await employeeApi.updateEmployee(selectedEmployee.value.id, payload)
      resultDialog.value = {
        open: true,
        type: 'success',
        title: 'Employee Updated',
        message: 'Employee information has been updated successfully.',
      }
    } else {
      await employeeApi.createEmployee(payload)
      resultDialog.value = {
        open: true,
        type: 'success',
        title: 'Employee Created',
        message: 'New employee has been created successfully.',
      }
    }

    dialogOpen.value = false
    await loadEmployees()
  } catch (err: any) {
    console.error('Failed to save employee:', err)

    // The error can be in multiple locations depending on how the API client returns it
    const errorMsg =
      err?.error?.message ||                    // Direct error object
      err?.response?.data?.error?.message ||    // Nested in response.data
      err?.response?.data?.message ||           // Direct in response.data
      err?.message ||                           // Standard error message
      'Unable to save employee. Please try again.'

    // Pass error back to dialog if callback provided
    if (onError) {
      onError(errorMsg)
    } else {
      resultDialog.value = {
        open: true,
        type: 'error',
        title: 'Failed to Save Employee',
        message: errorMsg,
      }
    }
  }
}

async function handleDeleteEmployee(employee: Employee) {
  const confirmed = await confirm({
    title: `Delete "${employee.first_name} ${employee.last_name}"?`,
    description: 'This employee will be permanently deleted. This action cannot be undone.',
    confirmText: 'Delete',
    variant: 'destructive',
  })
  if (!confirmed) {
    return
  }

  try {
    await employeeApi.deleteEmployee(employee.id)
    resultDialog.value = {
      open: true,
      type: 'success',
      title: 'Employee Deleted',
      message: 'Employee has been deleted successfully.',
    }
    await loadEmployees()
  } catch (err: any) {
    console.error('Failed to delete employee:', err)
    resultDialog.value = {
      open: true,
      type: 'error',
      title: 'Failed to Delete Employee',
      message: err?.response?.data?.message || 'Unable to delete employee. Please try again.',
    }
  }
}

function getEmploymentStatusBadge(status: string) {
  const variants: Record<string, { variant: any; label: string }> = {
    active: { variant: 'default', label: 'Active' },
    on_leave: { variant: 'secondary', label: 'On Leave' },
    terminated: { variant: 'destructive', label: 'Terminated' },
  }
  return variants[status] || { variant: 'secondary', label: status }
}

function getEmploymentTypeBadge(type: string) {
  const labels: Record<string, string> = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    intern: 'Intern',
  }
  return labels[type] || type
}

// Watch for dialog close to clean up
watch(dialogOpen, (isOpen) => {
  if (!isOpen) {
    // Clean up selected employee after dialog closes
    setTimeout(() => {
      selectedEmployee.value = null
    }, 300) // Wait for dialog animation
  }
})

// Watch for page changes
watch(page, () => {
  loadEmployees()
})

onMounted(() => {
  loadInitialData()
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Users class="w-8 h-8 text-primary" />
          Employees
        </h1>
        <p class="text-muted-foreground mt-1">
          Manage employee information and records
        </p>
      </div>
      <Button @click="handleAddEmployee" size="lg">
        <Plus class="w-4 h-4 mr-2" />
        Add Employee
      </Button>
    </div>

    <!-- Search and Filters -->
    <div class="flex items-center gap-4">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search employees by name, email, or employee number..."
          class="pl-10"
        />
      </div>
      <div class="text-sm text-muted-foreground">
        {{ total }} employee{{ total !== 1 ? 's' : '' }} total
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
            <TableHead>Employee #</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Employment Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="filteredEmployees.length === 0">
            <TableCell colspan="9" class="text-center py-8 text-muted-foreground">
              {{ searchQuery ? 'No employees found matching your search.' : 'No employees yet. Add your first employee to get started.' }}
            </TableCell>
          </TableRow>
          <TableRow v-for="employee in filteredEmployees" :key="employee.id">
            <TableCell class="font-medium">{{ employee.employee_number }}</TableCell>
            <TableCell>
              <div class="font-medium">{{ employee.first_name }} {{ employee.last_name }}</div>
              <div class="text-xs text-muted-foreground">{{ employee.city }}, {{ employee.country }}</div>
            </TableCell>
            <TableCell>{{ employee.email }}</TableCell>
            <TableCell>{{ employee.phone }}</TableCell>
            <TableCell>
              <Badge variant="outline">{{ employee.department_name || employee.department_id }}</Badge>
            </TableCell>
            <TableCell>{{ employee.position_name || employee.position_id }}</TableCell>
            <TableCell>
              <Badge variant="secondary">
                {{ getEmploymentTypeBadge(employee.employment_type) }}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge :variant="getEmploymentStatusBadge(employee.employment_status).variant">
                {{ getEmploymentStatusBadge(employee.employment_status).label }}
              </Badge>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleEditEmployee(employee)"
                >
                  <Pencil class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleDeleteEmployee(employee)"
                >
                  <Trash2 class="w-4 h-4 text-destructive" />
                </Button>
              </div>
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

    <!-- Employee Dialog -->
    <EmployeeDialog
      :open="dialogOpen"
      :employee="selectedEmployee"
      :departments="departments"
      :positions="positions"
      :managers="managers"
      @update:open="(val) => (dialogOpen = val)"
      @save="(payload, onError) => handleSaveEmployee(payload, onError)"
    />

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
