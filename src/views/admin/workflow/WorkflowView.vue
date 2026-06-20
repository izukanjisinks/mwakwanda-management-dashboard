<script setup lang="ts">
import { ref, computed, onMounted, watch, provide, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { Plus, GitBranch, Save, Pencil, ArrowLeft } from 'lucide-vue-next'
import { useWorkflowStore } from '@/stores/workflow'
import type { WorkflowStep, WorkflowTransition } from '@/types/workflow'
import type { Connection, NodeTypesObject, EdgeTypesObject } from '@vue-flow/core'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import StateNode from '@/components/workflow/StateNode.vue'
import TransitionEdge from '@/components/workflow/TransitionEdge.vue'
import StepEditDialog from '@/components/workflow/StepEditDialog.vue'
import TransitionEditDialog from '@/components/workflow/TransitionEditDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'


const store = useWorkflowStore()
const route = useRoute()
const router = useRouter()

// vue-flow's NodeComponent/EdgeComponent constructor types don't line up with
// vue-tsc's SFC inference; markRaw keeps the definitions non-reactive and the cast
// satisfies the prop types. Runtime behaviour is unaffected.
const nodeTypes = { state: markRaw(StateNode) } as NodeTypesObject
const edgeTypes = { default: markRaw(TransitionEdge) } as EdgeTypesObject

const defaultEdgeOptions = {
  type: 'default',
  markerEnd: MarkerType.ArrowClosed,
}

const { onConnect } = useVueFlow()

// ── Info panel ───────────────────────────────────────────────────────────────
const editingInfo = ref(false)
const infoName = ref('')
const infoDescription = ref('')
const savingInfo = ref(false)

// ── Step dialog ──────────────────────────────────────────────────────────────
const stepDialogOpen = ref(false)
const editingStep = ref<WorkflowStep | null>(null)

// ── Transition dialog ────────────────────────────────────────────────────────
const transitionDialogOpen = ref(false)
const editingTransition = ref<WorkflowTransition | null>(null)
const pendingFromId = ref('')
const pendingToId = ref('')

// ── Delete state ─────────────────────────────────────────────────────────────
const CONFIRM_KEYWORD = 'delete'
const deletingStep = ref<WorkflowStep | null>(null)
const deleteStepInput = ref('')
const deleteStepMatches = computed(() => deleteStepInput.value === CONFIRM_KEYWORD)
const deletingTransition = ref<WorkflowTransition | null>(null)

// Provide edit handler for TransitionEdge (inject pattern from HR system)
provide('openTransitionEdit', (_id: string, transition: WorkflowTransition) => {
  editingTransition.value = transition
  pendingFromId.value = ''
  pendingToId.value = ''
  transitionDialogOpen.value = true
})

provide('deleteTransition', (transition: WorkflowTransition) => {
  deletingTransition.value = transition
})

provide('editStep', (step: WorkflowStep) => {
  editingStep.value = step
  stepDialogOpen.value = true
})

provide('deleteStep', (step: WorkflowStep) => {
  deletingStep.value = step
  deleteStepInput.value = ''
})

onMounted(async () => {
  const id = route.params.id as string
  if (!id) { router.push({ name: 'workflow' }); return }
  await store.fetchWorkflow(id)
  if (store.workflow) {
    infoName.value = store.workflow.name
    infoDescription.value = store.workflow.description
  }
})

watch(() => store.workflow, (wf) => {
  if (wf && !editingInfo.value) {
    infoName.value = wf.name
    infoDescription.value = wf.description
  }
}, { deep: true })

// ── Vue Flow connection handler ──────────────────────────────────────────────
onConnect((connection: Connection) => {
  if (!connection.source || !connection.target) return
  pendingFromId.value = connection.source
  pendingToId.value = connection.target
  editingTransition.value = null
  transitionDialogOpen.value = true
})

// ── Save handlers ─────────────────────────────────────────────────────────────
async function handleSaveInfo() {
  savingInfo.value = true
  try {
    await store.updateWorkflowInfo({ name: infoName.value, description: infoDescription.value })
    toast.success('Workflow info saved.')
    editingInfo.value = false
  } catch (err) {
    toast.error(getApiError(err, 'Failed to save workflow info.'))
  } finally {
    savingInfo.value = false
  }
}

async function handleStepSave(payload: any) {
  try {
    if (editingStep.value) {
      await store.updateStep(editingStep.value.id, payload)
      toast.success('Step updated.')
    } else {
      const fullPayload = { ...payload, workflow_id: store.workflow!.id }
      await store.addStep(fullPayload)
      toast.success('Step added.')
    }
  } catch (err) {
    console.log('[handleStepSave] error:', err)
    toast.error(getApiError(err, 'Failed to save step.'))
  } finally {
    editingStep.value = null
  }
}

async function handleTransitionSave(payload: any) {
  try {
    if (editingTransition.value) {
      await store.updateTransition(editingTransition.value.id, {
        action_name: payload.action_name,
        allowed_roles: payload.allowed_roles,
      })
      toast.success('Transition updated.')
    } else {
      await store.addTransition({ ...payload, workflow_id: store.workflow!.id })
      toast.success('Transition added.')
    }
  } catch (err) {
    toast.error(getApiError(err, 'Failed to save transition.'))
  } finally {
    editingTransition.value = null
    pendingFromId.value = ''
    pendingToId.value = ''
  }
}

async function confirmDeleteStep() {
  if (!deletingStep.value || !deleteStepMatches.value) return
  const name = deletingStep.value.step_name
  console.log('[deleteStep] attempting', deletingStep.value.id, name)
  try {
    await store.deleteStep(deletingStep.value.id)
    console.log('[deleteStep] success')
    toast.success(`Step "${name}" deleted.`)
    deletingStep.value = null
  } catch (err) {
    console.error('[deleteStep] error', err)
    toast.error(getApiError(err, 'Failed to delete step.'))
  }
}

async function confirmDeleteTransition() {
  if (!deletingTransition.value) return
  try {
    await store.deleteTransition(deletingTransition.value.id)
    toast.success('Transition deleted.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to delete transition.'))
  } finally {
    deletingTransition.value = null
  }
}

function openAddStep() {
  editingStep.value = null
  stepDialogOpen.value = true
}

function openAddTransition() {
  editingTransition.value = null
  pendingFromId.value = ''
  pendingToId.value = ''
  transitionDialogOpen.value = true
}
</script>

<template>
  <DashboardHeader :title="store.workflow?.name ?? 'Workflow Editor'" />

  <div class="flex flex-col gap-4 p-6 h-[calc(100vh-4rem)]">
    <!-- Info bar -->
    <div class="flex items-start justify-between gap-4 shrink-0">
      <div class="flex-1 min-w-0">
        <div v-if="!editingInfo" class="flex items-center gap-2">
          <div>
            <h2 class="text-lg font-semibold leading-tight">{{ store.workflow?.name ?? '...' }}</h2>
            <p class="text-sm text-muted-foreground">{{ store.workflow?.description ?? '' }}</p>
          </div>
          <Button variant="ghost" size="icon" class="size-7 shrink-0" @click="editingInfo = true">
            <Pencil class="size-3.5" />
          </Button>
        </div>
        <div v-else class="flex items-end gap-3 flex-wrap">
          <div class="grid gap-1 flex-1 min-w-40">
            <Label class="text-xs">Name</Label>
            <Input v-model="infoName" placeholder="Workflow name" class="h-8 text-sm" />
          </div>
          <div class="grid gap-1 flex-2 min-w-60">
            <Label class="text-xs">Description</Label>
            <Input v-model="infoDescription" placeholder="Brief description" class="h-8 text-sm" />
          </div>
          <div class="flex gap-2">
            <Button size="sm" variant="outline" @click="editingInfo = false">Cancel</Button>
            <Button size="sm" :disabled="savingInfo" @click="handleSaveInfo">
              <Save class="size-3.5 mr-1.5" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div class="flex gap-2 shrink-0">
        <Button variant="ghost" size="sm" @click="router.push({ name: 'workflow' })">
          <ArrowLeft class="size-4 mr-1.5" />
          All Workflows
        </Button>
        <Button variant="outline" size="sm" @click="openAddTransition">
          <GitBranch class="size-4 mr-1.5" />
          Add Transition
        </Button>
        <Button size="sm" @click="openAddStep">
          <Plus class="size-4 mr-1.5" />
          Add Step
        </Button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex-1 flex items-center justify-center rounded-xl border bg-card">
      <div class="text-center text-muted-foreground">
        <div class="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p class="text-sm">Loading workflow...</p>
      </div>
    </div>

    <!-- Vue Flow canvas -->
    <div v-else class="flex-1 rounded-xl border bg-card overflow-hidden">
      <VueFlow
        v-model:nodes="store.nodes"
        v-model:edges="store.edges"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        :default-edge-options="defaultEdgeOptions"
        fit-view-on-init
        class="workflow-canvas bg-muted/20"
      >
        <Background pattern-color="#aaa" :gap="16" />
        <Controls />
        <MiniMap node-color="#f59e0b" mask-color="rgba(0,0,0,0.08)" />
      </VueFlow>
    </div>
  </div>

  <!-- Step dialog -->
  <StepEditDialog
    v-model:open="stepDialogOpen"
    :step="editingStep"
    :workflow-id="store.workflow?.id ?? ''"
    @save="handleStepSave"
  />

  <!-- Transition dialog -->
  <TransitionEditDialog
    v-model:open="transitionDialogOpen"
    :transition="editingTransition"
    :steps="store.workflow?.steps ?? []"
    :from-step-id="pendingFromId || undefined"
    :to-step-id="pendingToId || undefined"
    @save="handleTransitionSave"
  />

  <!-- Delete step confirmation -->
  <Dialog :open="!!deletingStep" @update:open="(v) => { if (!v) deletingStep = null }">
    <DialogContent class="max-w-md gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="text-lg font-semibold">Delete Step</DialogTitle>
      </DialogHeader>
      <div class="px-6 py-5 flex flex-col gap-4">
        <p class="text-sm text-muted-foreground">
          Deleting this step may lead to loss of ongoing booking instances. Are you sure you want to proceed?
        </p>
        <p class="text-sm text-muted-foreground">
          Type <strong class="text-foreground font-mono">{{ CONFIRM_KEYWORD }}</strong> to confirm.
        </p>
        <Input v-model="deleteStepInput" :placeholder="CONFIRM_KEYWORD" />
      </div>
      <div class="px-6 pb-6 pt-2 grid grid-cols-2 gap-3">
        <Button variant="outline" @click="deletingStep = null">Cancel</Button>
        <Button
          variant="destructive"
          :disabled="!deleteStepMatches"
          @click="confirmDeleteStep"
        >
          Delete
        </Button>
      </div>
    </DialogContent>
  </Dialog>

  <!-- Delete transition confirmation -->
  <Dialog :open="!!deletingTransition" @update:open="(v) => { if (!v) deletingTransition = null }">
    <DialogContent class="max-w-md gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-4 border-b">
        <DialogTitle class="text-lg font-semibold">Delete Transition</DialogTitle>
      </DialogHeader>
      <div class="px-6 py-5 flex flex-col gap-4">
        <p class="text-sm text-muted-foreground">
          Delete the <strong>"{{ deletingTransition?.action_name }}"</strong> transition? This may affect ongoing workflow instances.
        </p>
      </div>
      <div class="px-6 pb-6 pt-2 grid grid-cols-2 gap-3">
        <Button variant="outline" @click="deletingTransition = null">Cancel</Button>
        <Button variant="destructive" @click="confirmDeleteTransition">Delete</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style>
.vue-flow__edge-path {
  stroke-width: 2;
}
.vue-flow__minimap {
  background-color: hsl(var(--background));
}
</style>
