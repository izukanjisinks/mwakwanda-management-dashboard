import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MarkerType } from '@vue-flow/core'
import type { Node, Edge } from '@vue-flow/core'
import { workflowApi } from '@/services/api/workflow'
import type {
  Workflow,
  WorkflowStep,
  WorkflowTransition,
  WorkflowTask,
  CreateStepPayload,
  UpdateStepPayload,
  CreateTransitionPayload,
  UpdateTransitionPayload,
  ProcessTaskPayload,
} from '@/types/workflow'

// ── Helpers: Steps → Vue Flow nodes ─────────────────────────────────────────

const STEP_X_OFFSET = 220
const NODE_Y = 100

function stepsToNodes(steps: WorkflowStep[]): Node[] {
  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order)
  return sorted.map((step, i) => ({
    id: step.id,
    type: 'state',
    position: { x: i * STEP_X_OFFSET + 60, y: NODE_Y },
    data: { step },
  }))
}

function transitionsToEdges(transitions: WorkflowTransition[]): Edge[] {
  return transitions.map((tr) => ({
    id: tr.id,
    source: tr.from_step_id,
    target: tr.to_step_id,
    type: 'default',
    markerEnd: MarkerType.ArrowClosed,
    data: { transition: tr },
  }))
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useWorkflowStore = defineStore('workflow', () => {
  const workflow = ref<Workflow | null>(null)
  const tasks = ref<WorkflowTask[]>([])
  const loading = ref(false)
  const tasksLoading = ref(false)

  const nodes = ref<Node[]>([])
  const edges = ref<Edge[]>([])

  const pendingTasks = computed(() => (tasks.value ?? []).filter(t => t.status === 'pending' || t.status === 'in_progress'))
  const completedTasks = computed(() => (tasks.value ?? []).filter(t => t.status === 'completed' || t.status === 'rejected'))

  function syncFlow() {
    if (!workflow.value) return
    nodes.value = stepsToNodes(workflow.value.steps)
    edges.value = transitionsToEdges(workflow.value.transitions)
  }

  async function fetchWorkflow() {
    loading.value = true
    try {
      const res = await workflowApi.list()
      console.log('[workflow] list response:', res)
      const first = res.workflows[0]
      if (!first) {
        console.warn('[workflow] no workflows returned from /admin/workflows')
        return
      }
      const structure = await workflowApi.getStructure(first.id)
      console.log('[workflow] structure response:', structure)
      workflow.value = structure
      syncFlow()
    } finally {
      loading.value = false
    }
  }

  async function updateWorkflowInfo(payload: { name?: string; description?: string }) {
    if (!workflow.value) return
    const updated = await workflowApi.update(workflow.value.id, payload)
    workflow.value = updated
    return updated
  }

  async function addStep(payload: CreateStepPayload) {
    const step = await workflowApi.createStep(payload)
    workflow.value?.steps.push(step)
    syncFlow()
    return step
  }

  async function updateStep(id: string, payload: UpdateStepPayload) {
    const step = await workflowApi.updateStep(id, payload)
    const idx = workflow.value?.steps.findIndex(s => s.id === id) ?? -1
    if (idx !== -1) workflow.value!.steps[idx] = step
    syncFlow()
    return step
  }

  async function deleteStep(id: string) {
    await workflowApi.deleteStep(id)
    if (workflow.value) {
      workflow.value.steps = workflow.value.steps.filter(s => s.id !== id)
      workflow.value.transitions = workflow.value.transitions.filter(
        t => t.from_step_id !== id && t.to_step_id !== id,
      )
    }
    syncFlow()
  }

  async function addTransition(payload: CreateTransitionPayload) {
    const tr = await workflowApi.createTransition(payload)
    workflow.value?.transitions.push(tr)
    syncFlow()
    return tr
  }

  async function updateTransition(id: string, payload: UpdateTransitionPayload) {
    const tr = await workflowApi.updateTransition(id, payload)
    const idx = workflow.value?.transitions.findIndex(t => t.id === id) ?? -1
    if (idx !== -1) workflow.value!.transitions[idx] = tr
    syncFlow()
    return tr
  }

  async function deleteTransition(id: string) {
    await workflowApi.deleteTransition(id)
    if (workflow.value) {
      workflow.value.transitions = workflow.value.transitions.filter(t => t.id !== id)
    }
    syncFlow()
  }

  async function fetchTasks() {
    tasksLoading.value = true
    try {
      const res = await workflowApi.getMyTasks()
      tasks.value = res?.tasks ?? []
    } finally {
      tasksLoading.value = false
    }
  }

  async function processTask(instanceId: string, payload: ProcessTaskPayload) {
    await workflowApi.processAction(instanceId, payload)
    // Refresh tasks so the status reflects the change
    await fetchTasks()
  }

  return {
    workflow,
    tasks,
    loading,
    tasksLoading,
    nodes,
    edges,
    pendingTasks,
    completedTasks,
    fetchWorkflow,
    updateWorkflowInfo,
    addStep,
    updateStep,
    deleteStep,
    addTransition,
    updateTransition,
    deleteTransition,
    fetchTasks,
    processTask,
    syncFlow,
  }
})
