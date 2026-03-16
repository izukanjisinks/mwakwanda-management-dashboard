<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Save } from 'lucide-vue-next'
import WorkflowEditor from '@/components/workflow/WorkflowEditor.vue'
import NodePalette from '@/components/workflow/NodePalette.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const route = useRoute()
const router = useRouter()
const workflowStore = useWorkflowStore()
const { confirm } = useConfirmDialog()

const workflowId = computed(() => route.params.id as string)

const workflow = computed(() => workflowStore.currentWorkflow)

function handleSave() {
  workflowStore.saveCurrentWorkflow()
  router.push('/workflows')
}

async function handleBack() {
  const confirmed = await confirm({
    title: 'Discard unsaved changes?',
    description: 'Any unsaved changes to this workflow will be lost. Are you sure you want to go back?',
    confirmText: 'Discard',
    variant: 'destructive',
  })
  if (confirmed) {
    await workflowStore.setCurrentWorkflow(null)
    router.push('/workflows')
  }
}

onMounted(async () => {
  await workflowStore.setCurrentWorkflow(workflowId.value)
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6 h-screen">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <Button variant="ghost" size="sm" @click="handleBack">
          <ArrowLeft class="size-4" />
        </Button>
        <div>
          <h1 class="text-2xl font-semibold">{{ workflow?.name || 'Workflow' }}</h1>
          <p class="text-muted-foreground">{{ workflow?.description || 'Edit workflow' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <!-- <div v-if="workflow" class="flex items-center gap-2">
          <span class="text-sm text-muted-foreground">Active:</span>
          <Switch
            :checked="workflow.isActive"
            @update:checked="handleToggleActive"
          />
        </div> -->
        <Button @click="handleSave">
          <Save class="size-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>

    <!-- Workflow Editor -->
    <div class="flex gap-6 flex-1 min-h-0">
      <!-- Palette Sidebar -->
      <div class="flex-shrink-0">
        <NodePalette />
      </div>

      <!-- Canvas -->
      <Card class="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle>Workflow Canvas</CardTitle>
          <CardDescription>
            Drag states from the palette and connect them to build your workflow
          </CardDescription>
        </CardHeader>
        <CardContent class="h-[calc(100%-5rem)] p-0">
          <WorkflowEditor />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
