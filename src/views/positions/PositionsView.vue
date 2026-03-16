<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { positionApi, type Position } from '@/services/api/position'
import { departmentApi } from '@/services/api/department'
import { roleApi } from '@/services/api/role'
import type { Role } from '@/types/role'
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
import PositionDialog from '@/components/positions/PositionDialog.vue'
import ResultDialog from '@/components/common/ResultDialog.vue'
import Pagination from '@/components/common/Pagination.vue'
import { Briefcase, Plus, Search, Loader2, Pencil, Trash2 } from 'lucide-vue-next'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { formatCurrency } from '@/lib/utils'

const { confirm } = useConfirmDialog()
const positions = ref<Position[]>([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

// Dialog states
const dialogOpen = ref(false)
const selectedPosition = ref<Position | null>(null)

// Result dialog
const resultDialog = ref({
  open: false,
  type: 'success' as 'success' | 'error',
  title: '',
  message: '',
})

// Departments for dropdown
const departments = ref<Array<{ id: string; name: string }>>([])

// Roles for checkboxes
const roles = ref<Role[]>([])

// Computed
const filteredPositions = computed(() => {
  if (!searchQuery.value) return positions.value

  const query = searchQuery.value.toLowerCase()
  return positions.value.filter(
    (pos) =>
      pos.title.toLowerCase().includes(query) ||
      pos.code.toLowerCase().includes(query) ||
      pos.grade_level?.toLowerCase().includes(query) ||
      pos.description?.toLowerCase().includes(query)
  )
})

async function loadPositions() {
  loading.value = true
  try {
    const response = await positionApi.getPositions({ page: page.value, page_size: pageSize.value })
    positions.value = response.data ?? []
    total.value = response.total
  } catch (err: any) {
    console.error('Failed to load positions:', err)
    // Don't show error dialog for 403 Forbidden - API client already handles it
    if (err?.error?.code === 'FORBIDDEN' || err?.status === 403) {
      return
    }
    resultDialog.value = {
      open: true,
      type: 'error',
      title: 'Failed to Load Positions',
      message: 'Unable to load positions. Please try again.',
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

async function loadRoles() {
  try {
    const response = await roleApi.getRoles()
    roles.value = response
  } catch (err) {
    console.error('Failed to load roles:', err)
  }
}

async function loadInitialData() {
  await Promise.all([
    loadPositions(),
    loadDepartments(),
    loadRoles(),
  ])
}

function handleAddPosition() {
  selectedPosition.value = null
  dialogOpen.value = true
}

function handleEditPosition(position: Position) {
  selectedPosition.value = position
  dialogOpen.value = true
}

async function handleSavePosition(payload: any, onError?: (error: string) => void) {
  try {
    if (selectedPosition.value) {
      await positionApi.updatePosition(selectedPosition.value.id, payload)
      resultDialog.value = {
        open: true,
        type: 'success',
        title: 'Position Updated',
        message: 'Position has been updated successfully.',
      }
    } else {
      await positionApi.createPosition(payload)
      resultDialog.value = {
        open: true,
        type: 'success',
        title: 'Position Created',
        message: 'New position has been created successfully.',
      }
    }

    dialogOpen.value = false
    await loadPositions()
  } catch (err: any) {
    console.error('Failed to save position:', err)

    const errorMsg =
      err?.error?.message ||
      err?.response?.data?.error?.message ||
      err?.response?.data?.message ||
      err?.message ||
      'Unable to save position. Please try again.'

    if (onError) {
      onError(errorMsg)
    } else {
      resultDialog.value = {
        open: true,
        type: 'error',
        title: 'Failed to Save Position',
        message: errorMsg,
      }
    }
  }
}

async function handleDeletePosition(position: Position) {
  const confirmed = await confirm({
    title: `Delete "${position.title}"?`,
    description: 'This position will be permanently deleted. This action cannot be undone.',
    confirmText: 'Delete',
    variant: 'destructive',
  })
  if (!confirmed) {
    return
  }

  try {
    await positionApi.deletePosition(position.id)
    resultDialog.value = {
      open: true,
      type: 'success',
      title: 'Position Deleted',
      message: 'Position has been deleted successfully.',
    }
    await loadPositions()
  } catch (err: any) {
    console.error('Failed to delete position:', err)
    resultDialog.value = {
      open: true,
      type: 'error',
      title: 'Failed to Delete Position',
      message: err?.error?.message || err?.response?.data?.message || 'Unable to delete position. Please try again.',
    }
  }
}


// Watch for page changes
watch(page, () => {
  loadPositions()
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
          <Briefcase class="w-8 h-8 text-primary" />
          Positions
        </h1>
        <p class="text-muted-foreground mt-1">
          Manage job positions and salary ranges
        </p>
      </div>
      <Button @click="handleAddPosition" size="lg">
        <Plus class="w-4 h-4 mr-2" />
        Add Position
      </Button>
    </div>

    <!-- Search and Filters -->
    <div class="flex items-center gap-4">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search positions by title, code, or grade level..."
          class="pl-10"
        />
      </div>
      <div class="text-sm text-muted-foreground">
        {{ total }} position{{ total !== 1 ? 's' : '' }} total
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
            <TableHead>Title</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Grade Level</TableHead>
            <TableHead>Base Salary</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="filteredPositions.length === 0">
            <TableCell colspan="7" class="text-center py-8 text-muted-foreground">
              {{ searchQuery ? 'No positions found matching your search.' : 'No positions yet. Add your first position to get started.' }}
            </TableCell>
          </TableRow>
          <TableRow v-for="position in filteredPositions" :key="position.id">
            <TableCell class="font-medium">{{ position.code }}</TableCell>
            <TableCell>
              <div class="font-medium">{{ position.title }}</div>
              <div class="text-xs text-muted-foreground max-w-sm truncate">
                {{ position.description || '' }}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{{ position.department_name || position.department_id }}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{{ position.grade_level }}</Badge>
            </TableCell>
            <TableCell>
              <div class="text-sm">
                {{ formatCurrency(position.base_salary) }}
              </div>
            </TableCell>
            <TableCell>
              <Badge :variant="position.is_active ? 'default' : 'secondary'">
                {{ position.is_active ? 'Active' : 'Inactive' }}
              </Badge>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleEditPosition(position)"
                >
                  <Pencil class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleDeletePosition(position)"
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

    <!-- Position Dialog -->
    <PositionDialog
      :open="dialogOpen"
      :position="selectedPosition"
      :departments="departments"
      :roles="roles"
      @update:open="(val) => (dialogOpen = val)"
      @save="(payload, onError) => handleSavePosition(payload, onError)"
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


