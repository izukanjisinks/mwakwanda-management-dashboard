<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { departmentApi, type Department } from '@/services/api/department'
import { employeeApi } from '@/services/api/employee'
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
import DepartmentDialog from '@/components/departments/DepartmentDialog.vue'
import ResultDialog from '@/components/common/ResultDialog.vue'
import Pagination from '@/components/common/Pagination.vue'
import { Building2, Plus, Search, Loader2, Pencil, Trash2 } from 'lucide-vue-next'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { confirm } = useConfirmDialog()
const departments = ref<Department[]>([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// Dialog states
const dialogOpen = ref(false)
const selectedDepartment = ref<Department | null>(null)

// Result dialog
const resultDialog = ref({
  open: false,
  type: 'success' as 'success' | 'error',
  title: '',
  message: '',
})

// Managers list (employees who can be managers)
const managers = ref<Array<{ id: string; name: string }>>([])

// Computed
const filteredDepartments = computed(() => {
  if (!searchQuery.value) return departments.value

  const query = searchQuery.value.toLowerCase()
  return departments.value.filter(
    (dept) =>
      dept.name.toLowerCase().includes(query) ||
      dept.code.toLowerCase().includes(query) ||
      dept.description?.toLowerCase().includes(query)
  )
})

async function loadDepartments() {
  loading.value = true
  try {
    const response = await departmentApi.getDepartments({ page: page.value, page_size: pageSize.value })
    departments.value = response.data ?? []
    total.value = response.total
  } catch (err: any) {
    console.error('Failed to load departments:', err)
    // Don't show error dialog for 403 Forbidden - API client already handles it
    if (err?.error?.code === 'FORBIDDEN' || err?.status === 403) {
      return
    }
    resultDialog.value = {
      open: true,
      type: 'error',
      title: 'Failed to Load Departments',
      message: 'Unable to load departments. Please try again.',
    }
  } finally {
    loading.value = false
  }
}

async function loadEmployees() {
  try {
    const response = await employeeApi.getEmployees({ page: 1, page_size: 100, status: 'active' })
    managers.value = response.data.map((emp) => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
    }))
  } catch (err) {
    console.error('Failed to load employees:', err)
  }
}

async function loadInitialData() {
  await Promise.all([
    loadDepartments(),
    loadEmployees(),
  ])
}

function handleAddDepartment() {
  selectedDepartment.value = null
  dialogOpen.value = true
}

function handleEditDepartment(department: Department) {
  selectedDepartment.value = department
  dialogOpen.value = true
}

async function handleSaveDepartment(payload: any, onError?: (error: string) => void) {
  try {
    if (selectedDepartment.value) {
      await departmentApi.updateDepartment(selectedDepartment.value.id, payload)
      resultDialog.value = {
        open: true,
        type: 'success',
        title: 'Department Updated',
        message: 'Department has been updated successfully.',
      }
    } else {
      await departmentApi.createDepartment(payload)
      resultDialog.value = {
        open: true,
        type: 'success',
        title: 'Department Created',
        message: 'New department has been created successfully.',
      }
    }

    dialogOpen.value = false
    await loadDepartments()
  } catch (err: any) {
    console.error('Failed to save department:', err)

    const errorMsg =
      err?.error?.message ||
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      err?.message ||
      'Unable to save department. Please try again.'

    if (onError) {
      onError(errorMsg)
    } else {
      resultDialog.value = {
        open: true,
        type: 'error',
        title: 'Failed to Save Department',
        message: errorMsg,
      }
    }
  }
}

async function handleDeleteDepartment(department: Department) {
  const confirmed = await confirm({
    title: `Delete "${department.name}"?`,
    description: 'This department will be permanently deleted. This action cannot be undone.',
    confirmText: 'Delete',
    variant: 'destructive',
  })
  if (!confirmed) {
    return
  }

  try {
    await departmentApi.deleteDepartment(department.id)
    resultDialog.value = {
      open: true,
      type: 'success',
      title: 'Department Deleted',
      message: 'Department has been deleted successfully.',
    }
    await loadDepartments()
  } catch (err: any) {
    console.error('Failed to delete department:', err)
    resultDialog.value = {
      open: true,
      type: 'error',
      title: 'Failed to Delete Department',
      message: err?.error?.message || err?.response?.data?.message || 'Unable to delete department. Please try again.',
    }
  }
}

// Watch for page changes
watch(page, () => {
  loadDepartments()
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
          <Building2 class="w-8 h-8 text-primary" />
          Departments
        </h1>
        <p class="text-muted-foreground mt-1">
          Manage organizational departments and hierarchy
        </p>
      </div>
      <Button @click="handleAddDepartment" size="lg">
        <Plus class="w-4 h-4 mr-2" />
        Add Department
      </Button>
    </div>

    <!-- Search and Filters -->
    <div class="flex items-center gap-4">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search departments by name, code, or description..."
          class="pl-10"
        />
      </div>
      <div class="text-sm text-muted-foreground">
        {{ total }} department{{ total !== 1 ? 's' : '' }} total
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
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Parent Department</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="filteredDepartments.length === 0">
            <TableCell colspan="7" class="text-center py-8 text-muted-foreground">
              {{ searchQuery ? 'No departments found matching your search.' : 'No departments yet. Add your first department to get started.' }}
            </TableCell>
          </TableRow>
          <TableRow v-for="department in filteredDepartments" :key="department.id">
            <TableCell class="font-medium">{{ department.code }}</TableCell>
            <TableCell>
              <div class="font-medium">{{ department.name }}</div>
            </TableCell>
            <TableCell>
              <div class="text-sm text-muted-foreground max-w-md truncate">
                {{ department.description || '-' }}
              </div>
            </TableCell>
            <TableCell>
              <span v-if="department.parent_department_name" class="text-sm">
                {{ department.parent_department_name }}
              </span>
              <span v-else class="text-sm text-muted-foreground">-</span>
            </TableCell>
            <TableCell>
              <span v-if="department.manager_name" class="text-sm">
                {{ department.manager_name }}
              </span>
              <span v-else class="text-sm text-muted-foreground">-</span>
            </TableCell>
            <TableCell>
              <Badge :variant="department.is_active ? 'default' : 'secondary'">
                {{ department.is_active ? 'Active' : 'Inactive' }}
              </Badge>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleEditDepartment(department)"
                >
                  <Pencil class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleDeleteDepartment(department)"
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

    <!-- Department Dialog -->
    <DepartmentDialog
      :open="dialogOpen"
      :department="selectedDepartment"
      :departments="departments"
      :managers="managers"
      @update:open="(val) => (dialogOpen = val)"
      @save="(payload, onError) => handleSaveDepartment(payload, onError)"
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
