<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { workflowApi } from '@/services/api/workflow'
import type { WorkflowType } from '@/types/workflow'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { GitBranch, Loader2, Plus, Trash2, Eye } from 'lucide-vue-next'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const router = useRouter()
const workflowStore = useWorkflowStore()
const { confirm } = useConfirmDialog()
const dialogOpen = ref(false)
const workflowTypes = ref<WorkflowType[]>([])

// Form state
const formData = ref({
  name: '',
  description: '',
  workflow_type: '',
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function fetchWorkflowTypes() {
  try {
    const response = await workflowApi.getWorkflowTypes()
    workflowTypes.value = response.workflow_types
  } catch (err) {
    console.error('Failed to load workflow types:', err)
  }
}

async function handleCreate() {
  if (!formData.value.name.trim() || !formData.value.workflow_type) return

  try {
    const id = await workflowStore.createWorkflow(
      formData.value.name.trim(),
      formData.value.description.trim(),
      formData.value.workflow_type
    )

    // Reset form
    formData.value = { name: '', description: '', workflow_type: '' }
    dialogOpen.value = false

    // Navigate to the new workflow
    router.push(`/workflows/${id}`)
  } catch (err) {
    console.error('Failed to create workflow:', err)
  }
}

async function handleToggleActive(id: string, isActive: unknown) {
  try {
    await workflowStore.updateWorkflowStatus(id, isActive as boolean)
  } catch (err) {
    console.error('Failed to update workflow status:', err)
  }
}

async function handleDelete(id: string, name: string) {
  const confirmed = await confirm({
    title: `Delete "${name}"?`,
    description: 'This will also delete all steps and transitions. This action cannot be undone.',
    confirmText: 'Delete',
    variant: 'destructive',
  })
  if (confirmed) {
    try {
      await workflowStore.deleteWorkflow(id)
    } catch (err) {
      console.error('Failed to delete workflow:', err)
    }
  }
}

function viewWorkflow(id: string) {
  router.push(`/workflows/${id}`)
}

onMounted(() => {
  workflowStore.fetchWorkflows()
  fetchWorkflowTypes()
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <GitBranch class="w-8 h-8 text-primary" />
          Workflows
        </h1>
        <p class="text-muted-foreground mt-1">Manage HR process workflows</p>
      </div>

      <!-- New Workflow Dialog -->
      <Dialog v-model:open="dialogOpen">
        <DialogTrigger as-child>
          <Button>
            <Plus class="size-4 mr-2" />
            New Workflow
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>
              Create a new workflow for HR processes
            </DialogDescription>
          </DialogHeader>

          <div class="grid gap-4 py-4">
            <!-- Workflow Type -->
            <div class="grid gap-2">
              <Label for="workflow-type">Workflow Type *</Label>
              <Select v-model="formData.workflow_type">
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select workflow type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="type in workflowTypes" :key="type.type" :value="type.type">
                    {{ type.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p class="text-xs text-muted-foreground">
                {{ workflowTypes.find(t => t.type === formData.workflow_type)?.description || 'Select a workflow type to see description' }}
              </p>
            </div>

            <!-- Name -->
            <div class="grid gap-2">
              <Label for="workflow-name">Workflow Name *</Label>
              <input
                id="workflow-name"
                v-model="formData.name"
                type="text"
                placeholder="e.g., Leave Approval Process"
                class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <!-- Description -->
            <div class="grid gap-2">
              <Label for="workflow-description">Description</Label>
              <Textarea
                id="workflow-description"
                v-model="formData.description"
                placeholder="Describe the workflow..."
                class="resize-none"
                rows="3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" @click="dialogOpen = false">
              Cancel
            </Button>
            <Button @click="handleCreate" :disabled="!formData.name.trim() || !formData.workflow_type">
              Create Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <!-- Count & Loading -->
    <div class="flex items-center gap-4">
      <div class="text-sm text-muted-foreground">
        {{ workflowStore.workflows.length }} workflow{{ workflowStore.workflows.length === 1 ? '' : 's' }} total
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="workflowStore.loading" class="flex items-center justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Table -->
    <div v-else class="rounded-lg border px-3 py-2">
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>States</TableHead>
              <TableHead>Transitions</TableHead>
              <!-- <TableHead>Status</TableHead> -->
              <TableHead>Created</TableHead>
              <TableHead class="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="workflowStore.workflows.length === 0">
              <TableCell colspan="7" class="text-center text-muted-foreground">
                No workflows found. Create your first workflow!
              </TableCell>
            </TableRow>
            <TableRow v-for="workflow in workflowStore.workflows" :key="workflow.id">
              <TableCell class="font-medium">{{ workflow.name }}</TableCell>
              <TableCell class="max-w-xs truncate">{{ workflow.description || '-' }}</TableCell>
              <TableCell>{{ workflow.stepCount ?? 0 }}</TableCell>
              <TableCell>{{ workflow.transitionCount ?? 0 }}</TableCell>
              <!-- <TableCell>
                <div class="flex items-center gap-2">
                  <Switch
                    :checked="workflow.isActive"
                    @update:checked="(val) => handleToggleActive(workflow.id, val)"
                  />
                  <Badge :variant="workflow.isActive ? 'default' : 'secondary'">
                    {{ workflow.isActive ? 'Active' : 'Inactive' }}
                  </Badge>
                </div>
              </TableCell> -->
              <TableCell class="text-muted-foreground">{{ formatDate(workflow.createdAt) }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="viewWorkflow(workflow.id)"
                  >
                    <Eye class="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="handleDelete(workflow.id, workflow.name)"
                  >
                    <Trash2 class="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
    </div>
  </div>
</template>
