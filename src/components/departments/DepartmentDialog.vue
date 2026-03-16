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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Building2, AlertCircle } from 'lucide-vue-next'
import type { Department, CreateDepartmentPayload, UpdateDepartmentPayload } from '@/services/api/department'

const props = defineProps<{
  open: boolean
  department: Department | null
  departments: Department[]
  managers: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [payload: CreateDepartmentPayload | UpdateDepartmentPayload, onError: (error: string) => void]
}>()

const saving = ref(false)
const errorMessage = ref('')

const formData = ref({
  name: '',
  code: '',
  description: '',
  parent_department_id: '',
  manager_id: '',
  is_active: true,
})

const isEditMode = computed(() => props.department !== null)
const dialogTitle = computed(() => isEditMode.value ? 'Edit Department' : 'Add New Department')

// Available parent departments (exclude current department to prevent self-reference)
const availableParentDepartments = computed(() => {
  if (!isEditMode.value) return props.departments
  return props.departments.filter(d => d.id !== props.department?.id)
})

// Watch for dialog open/close and department changes
watch([() => props.open, () => props.department], ([isOpen, department]) => {
  if (!isOpen) return

  errorMessage.value = ''

  if (department) {
    formData.value = {
      name: department.name,
      code: department.code,
      description: department.description || '',
      parent_department_id: department.parent_department_id || '',
      manager_id: department.manager_id || '',
      is_active: department.is_active,
    }
  } else {
    resetForm()
  }
})

function resetForm() {
  formData.value = {
    name: '',
    code: '',
    description: '',
    parent_department_id: '',
    manager_id: '',
    is_active: true,
  }
}

async function handleSave() {
  saving.value = true
  errorMessage.value = ''

  try {
    const payload: any = { ...formData.value }

    // Clean up empty optional fields
    if (!payload.description) delete payload.description
    if (!payload.parent_department_id) {
      payload.parent_department_id = null
    }
    if (!payload.manager_id) {
      payload.manager_id = null
    }

    console.log('Department Dialog Payload:', JSON.stringify(payload, null, 2))

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
    <DialogContent :key="department?.id || 'new'" class="sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Building2 class="w-5 h-5" />
          {{ dialogTitle }}
        </DialogTitle>
        <DialogDescription>
          {{ isEditMode ? 'Update department information below.' : 'Fill in the department details to create a new department.' }}
        </DialogDescription>
      </DialogHeader>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle class="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div class="flex-1">
          <p class="text-sm font-medium text-destructive">Error</p>
          <p class="text-sm text-destructive/90 mt-1">{{ errorMessage }}</p>
        </div>
      </div>

      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="name">Department Name *</Label>
            <Input id="name" v-model="formData.name" required placeholder="e.g., Engineering" />
          </div>
          <div class="grid gap-2">
            <Label for="code">Department Code *</Label>
            <Input id="code" v-model="formData.code" required placeholder="e.g., ENG" />
          </div>
        </div>

        <div class="grid gap-2">
          <Label for="description">Description</Label>
          <Textarea
            id="description"
            v-model="formData.description"
            placeholder="Brief description of the department"
            rows="3"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="parent_department_id">Parent Department</Label>
            <Select v-model="formData.parent_department_id">
              <SelectTrigger>
                <SelectValue placeholder="No Parent Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="dept in availableParentDepartments" :key="dept.id" :value="dept.id">
                  {{ dept.name }} ({{ dept.code }})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label for="manager_id">Manager</Label>
            <Select v-model="formData.manager_id">
              <SelectTrigger>
                <SelectValue placeholder="No Manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="mgr in managers" :key="mgr.id" :value="mgr.id">
                  {{ mgr.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleClose" :disabled="saving">
          Cancel
        </Button>
        <Button @click="handleSave" :disabled="saving">
          <Loader2 v-if="saving" class="w-4 h-4 mr-2 animate-spin" />
          {{ isEditMode ? 'Update Department' : 'Create Department' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
