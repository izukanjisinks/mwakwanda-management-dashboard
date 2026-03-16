<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, User, AlertCircle, RefreshCw } from 'lucide-vue-next'
import { employeeApi } from '@/services/api/employee'
import { passwordApi } from '@/services/api/password'
import type { Employee, CreateEmployeePayload, UpdateEmployeePayload } from '@/types/employee'

const props = defineProps<{
  open: boolean
  employee: Employee | null
  departments: Array<{ id: string; name: string }>
  positions: Array<{ id: string; title: string }>
  managers: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [payload: CreateEmployeePayload | UpdateEmployeePayload, onError: (error: string) => void]
}>()

const saving = ref(false)
const errorMessage = ref('')
const loadingManagers = ref(false)
const generatingPassword = ref(false)
const departmentManagers = ref<Array<{ id: string; name: string }>>([])

const formData = ref({
  employee_number: '',
  first_name: '',
  last_name: '',
  email: '',
  personal_email: '',
  phone: '',
  date_of_birth: '',
  gender: 'male',
  national_id: '',
  marital_status: '',
  address: '',
  city: '',
  state: '',
  country: '',
  department_id: '',
  position_id: '',
  manager_id: '',
  hire_date: '',
  employment_type: 'full_time',
  employment_status: 'active',
  password: '',
})

const isEditMode = computed(() => props.employee !== null)
const dialogTitle = computed(() => isEditMode.value ? 'Edit Employee' : 'Add New Employee')

// Available managers (from department or fallback to all managers)
const availableManagers = computed(() => {
  return departmentManagers.value.length > 0 ? departmentManagers.value : props.managers
})

// Load managers for selected department
async function loadManagersForDepartment(departmentId: string) {
  if (!departmentId) {
    departmentManagers.value = []
    return
  }

  loadingManagers.value = true
  try {
    const response = await employeeApi.getManagersByDepartment(departmentId)
    console.log('Managers response:', response)

    // Handle if response is null or not an array
    if (!response || !Array.isArray(response)) {
      console.warn('No managers found or invalid response format:', response)
      departmentManagers.value = []
      return
    }

    departmentManagers.value = response.map((mgr) => ({
      id: mgr.id,
      name: `${mgr.first_name} ${mgr.last_name}`,
    }))
  } catch (err) {
    console.error('Failed to load managers for department:', err)
    // Fall back to showing all managers
    departmentManagers.value = []
  } finally {
    loadingManagers.value = false
  }
}

// Watch for department changes to load managers
watch(() => formData.value.department_id, (newDepartmentId) => {
  if (newDepartmentId) {
    loadManagersForDepartment(newDepartmentId)
  } else {
    departmentManagers.value = []
  }
})

// Watch for dialog open/close and employee changes
watch([() => props.open, () => props.employee], ([isOpen, employee]) => {
  if (!isOpen) return // Don't update form when dialog is closed

  // Clear error message when dialog opens
  errorMessage.value = ''

  if (employee) {
    formData.value = {
      employee_number: employee.employee_number,
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email,
      personal_email: employee.personal_email || '',
      phone: employee.phone,
      date_of_birth: employee.date_of_birth.split('T')[0],
      gender: employee.gender,
      national_id: employee.national_id,
      marital_status: employee.marital_status || '',
      address: employee.address || '',
      city: employee.city,
      state: employee.state || '',
      country: employee.country,
      department_id: employee.department_id,
      position_id: employee.position_id,
      manager_id: employee.manager_id || '',
      hire_date: employee.hire_date.split('T')[0],
      employment_type: employee.employment_type,
      employment_status: employee.employment_status,
      password: '', // Password not shown in edit mode
    }
    // Load managers for the employee's department
    if (employee.department_id) {
      loadManagersForDepartment(employee.department_id)
    }
  } else {
    resetForm()
  }
})

function resetForm() {
  formData.value = {
    employee_number: '',
    first_name: '',
    last_name: '',
    email: '',
    personal_email: '',
    phone: '',
    date_of_birth: '',
    gender: 'male',
    national_id: '',
    marital_status: '',
    address: '',
    city: '',
    state: '',
    country: '',
    department_id: '',
    position_id: '',
    manager_id: '',
    hire_date: '',
    employment_type: 'full_time',
    employment_status: 'active',
    password: '',
  }
}

// Generate password function
async function handleGeneratePassword() {
  generatingPassword.value = true
  try {
    const response = await passwordApi.generatePassword()
    formData.value.password = response.password
  } catch (err) {
    console.error('Failed to generate password:', err)
    errorMessage.value = 'Failed to generate password. Please try again.'
  } finally {
    generatingPassword.value = false
  }
}

async function handleSave() {
  saving.value = true
  errorMessage.value = '' // Clear any previous errors

  try {
    const payload: any = { ...formData.value }

    // Convert dates to ISO format
    if (payload.date_of_birth) {
      payload.date_of_birth = new Date(payload.date_of_birth).toISOString()
    }
    if (payload.hire_date) {
      payload.hire_date = new Date(payload.hire_date).toISOString()
    }

    // Clean up empty optional fields
    if (!payload.personal_email) delete payload.personal_email
    if (!payload.marital_status) delete payload.marital_status
    if (!payload.address) delete payload.address
    if (!payload.state) delete payload.state

    // Set manager_id to null if empty
    if (!payload.manager_id) {
      payload.manager_id = null
    }

    // Remove password field if in edit mode (we don't send password when updating)
    if (isEditMode.value) {
      delete payload.password
    }

    console.log('Employee Dialog Payload:', JSON.stringify(payload, null, 2))

    emit('save', payload, (error: string) => {
      errorMessage.value = error
      saving.value = false
    })
  } catch (err) {
    saving.value = false
  }
}

function handleClose() {
  emit('update:open', false)
  if (!isEditMode.value) {
    resetForm()
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent :key="employee?.id || 'new'" class="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <User class="w-5 h-5" />
          {{ dialogTitle }}
        </DialogTitle>
        <DialogDescription>
          {{ isEditMode ? 'Update employee information below.' : 'Fill in the employee details to create a new employee record.' }}
        </DialogDescription>
      </DialogHeader>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle class="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
        <div class="flex-1">
          <p class="text-sm font-medium text-destructive">Error</p>
          <p class="text-sm text-destructive/90 mt-1">{{ errorMessage }}</p>
        </div>
      </div>

      <div class="grid gap-6 py-4">
        <!-- Personal Information -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold border-b pb-2">Personal Information</h3>

          <div class="grid gap-2">
            <Label for="employee_number">Employee Number *</Label>
            <Input id="employee_number" v-model="formData.employee_number" required placeholder="e.g., EMP-001" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="first_name">First Name *</Label>
              <Input id="first_name" v-model="formData.first_name" required />
            </div>
            <div class="grid gap-2">
              <Label for="last_name">Last Name *</Label>
              <Input id="last_name" v-model="formData.last_name" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="email">Work Email *</Label>
              <Input id="email" v-model="formData.email" type="email" required />
            </div>
            <div class="grid gap-2">
              <Label for="personal_email">Personal Email</Label>
              <Input id="personal_email" v-model="formData.personal_email" type="email" />
            </div>
          </div>

          <!-- Password Field (Create Mode Only) -->
          <div v-if="!isEditMode" class="grid gap-2">
            <Label for="password">Password *</Label>
            <div class="flex gap-2">
              <Input id="password" v-model="formData.password" type="text" required class="flex-1" placeholder="Generate or enter password" />
              <Button type="button" variant="outline" @click="handleGeneratePassword" :disabled="generatingPassword">
                <RefreshCw v-if="generatingPassword" class="w-4 h-4 animate-spin" />
                <RefreshCw v-else class="w-4 h-4" />
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              Click the button to generate a secure password that meets policy requirements
            </p>
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="grid gap-2">
              <Label for="phone">Phone *</Label>
              <Input id="phone" v-model="formData.phone" required />
            </div>
            <div class="grid gap-2">
              <Label for="date_of_birth">Date of Birth *</Label>
              <Input id="date_of_birth" v-model="formData.date_of_birth" type="date" required />
            </div>
            <div class="grid gap-2">
              <Label for="gender">Gender *</Label>
              <Select v-model="formData.gender">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="national_id">National ID *</Label>
              <Input id="national_id" v-model="formData.national_id" required />
            </div>
            <div class="grid gap-2">
              <Label for="marital_status">Marital Status</Label>
              <Select v-model="formData.marital_status">
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <!-- Address Information -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold border-b pb-2">Address Information</h3>

          <div class="grid gap-2">
            <Label for="address">Address</Label>
            <Input id="address" v-model="formData.address" />
          </div>

          <div class="grid grid-cols-3 gap-4">
            <div class="grid gap-2">
              <Label for="city">City *</Label>
              <Input id="city" v-model="formData.city" required />
            </div>
            <div class="grid gap-2">
              <Label for="state">State</Label>
              <Input id="state" v-model="formData.state" />
            </div>
            <div class="grid gap-2">
              <Label for="country">Country *</Label>
              <Input id="country" v-model="formData.country" required />
            </div>
          </div>
        </div>

        <!-- Employment Information -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold border-b pb-2">Employment Information</h3>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="department_id">Department *</Label>
              <Select v-model="formData.department_id">
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="dept in departments" :key="dept.id" :value="dept.id">
                    {{ dept.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid gap-2">
              <Label for="position_id">Job Title *</Label>
              <Select v-model="formData.position_id">
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="pos in positions" :key="pos.id" :value="pos.id">
                    {{ pos.title }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="manager_id">Manager</Label>
              <Select v-model="formData.manager_id" :disabled="loadingManagers">
                <SelectTrigger>
                  <SelectValue :placeholder="loadingManagers ? 'Loading managers...' : 'No Manager'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="mgr in availableManagers" :key="mgr.id" :value="mgr.id">
                    {{ mgr.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="formData.department_id && departmentManagers.length > 0" class="text-xs text-muted-foreground">
                Showing managers in this department
              </p>
            </div>
            <div class="grid gap-2">
              <Label for="hire_date">Hire Date *</Label>
              <Input id="hire_date" v-model="formData.hire_date" type="date" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="employment_type">Employment Type *</Label>
              <Select v-model="formData.employment_type">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full Time</SelectItem>
                  <SelectItem value="part_time">Part Time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid gap-2">
              <Label for="employment_status">Employment Status *</Label>
              <Select v-model="formData.employment_status">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose" :disabled="saving">
          Cancel
        </Button>
        <Button @click="handleSave" :disabled="saving">
          <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
          {{ isEditMode ? 'Update Employee' : 'Create Employee' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
