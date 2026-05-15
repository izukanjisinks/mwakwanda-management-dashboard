<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import CreateWorkflowDialog from '@/components/workflow/CreateWorkflowDialog.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, GitBranch, ChevronRight } from 'lucide-vue-next'
import type { Workflow } from '@/types/workflow'

const store = useWorkflowStore()
const router = useRouter()
const createOpen = ref(false)

onMounted(() => store.fetchWorkflows())

function handleCreated(wf: Workflow) {
  router.push({ name: 'workflow-editor', params: { id: wf.id } })
}

function openEditor(id: string) {
  router.push({ name: 'workflow-editor', params: { id } })
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<template>
  <DashboardHeader title="Workflows" />

  <div class="p-6 flex flex-col gap-6">
    <!-- Top bar -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Approval workflows configured for your organisation.
      </p>
      <Button @click="createOpen = true">
        <Plus class="size-4 mr-2" />
        Create Workflow
      </Button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex items-center justify-center py-24">
      <div class="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- Empty -->
    <div
      v-else-if="store.workflows.length === 0"
      class="flex flex-col items-center justify-center py-24 gap-3 text-center border rounded-xl bg-card"
    >
      <GitBranch class="size-10 text-muted-foreground/40" />
      <p class="font-medium">No workflows yet</p>
      <p class="text-sm text-muted-foreground">Create your first approval workflow to get started.</p>
      <Button class="mt-2" @click="createOpen = true">
        <Plus class="size-4 mr-2" />
        Create Workflow
      </Button>
    </div>

    <!-- Table -->
    <div v-else class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="wf in store.workflows"
            :key="wf.id"
            class="cursor-pointer"
            @click="openEditor(wf.id)"
          >
            <TableCell>
              <div>
                <p class="font-medium">{{ wf.name }}</p>
                <p v-if="wf.description" class="text-xs text-muted-foreground mt-0.5">{{ wf.description }}</p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" class="text-xs font-mono">{{ wf.workflow_type }}</Badge>
            </TableCell>
            <TableCell>
              <Badge :variant="wf.is_active ? 'default' : 'secondary'">
                {{ wf.is_active ? 'Active' : 'Inactive' }}
              </Badge>
            </TableCell>
            <TableCell class="text-muted-foreground text-sm">{{ fmt(wf.created_at) }}</TableCell>
            <TableCell class="text-right">
              <ChevronRight class="size-4 text-muted-foreground ml-auto" />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>

  <CreateWorkflowDialog
    :open="createOpen"
    @update:open="createOpen = $event"
    @created="handleCreated"
  />
</template>
