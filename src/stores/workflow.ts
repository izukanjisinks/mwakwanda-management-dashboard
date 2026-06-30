import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MarkerType } from '@vue-flow/core'
import type { Node, Edge } from '@vue-flow/core'
import { workflowApi } from '@/services/api/workflow'
import { useBranchFilterStore } from '@/stores/branchFilter'
import type {
  Workflow,
  WorkflowType,
  WorkflowStep,
  WorkflowTransition,
  WorkflowTask,
  CreateStepPayload,
  UpdateStepPayload,
  CreateTransitionPayload,
  UpdateTransitionPayload,
  CreateWorkflowPayload,
  ProcessTaskPayload,
} from '@/types/workflow'

// ── Helpers: Steps → Vue Flow nodes ─────────────────────────────────────────

const STEP_X_OFFSET = 220
const NODE_Y = 100

function stepsToNodes(steps: WorkflowStep[] | null | undefined): Node[] {
  const sorted = [...(steps ?? [])].sort((a, b) => a.step_order - b.step_order)
  return sorted.map((step, i) => ({
    id: step.id,
    type: 'state',
    position: { x: i * STEP_X_OFFSET + 60, y: NODE_Y },
    data: { step },
  }))
}

function transitionsToEdges(transitions: WorkflowTransition[] | null | undefined): Edge[] {
  return (transitions ?? []).map((tr) => ({
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
  const workflows = ref<Workflow[]>([])
  const workflowTypes = ref<WorkflowType[]>([])
  const workflow = ref<Workflow | null>(null)
  const tasks = ref<WorkflowTask[]>([])
  const allTasks = ref<WorkflowTask[]>([])
  const loading = ref(false)
  const tasksLoading = ref(false)
  const allTasksLoading = ref(false)

  const nodes = ref<Node[]>([])
  const edges = ref<Edge[]>([])

  const pendingTasks = computed(() => (tasks.value ?? []).filter(t => t.status === 'pending' || t.status === 'in_progress'))
  const completedTasks = computed(() => (tasks.value ?? []).filter(t => t.status === 'completed' || t.status === 'rejected'))

  const allPendingTasks = computed(() => (allTasks.value ?? []).filter(t => t.status === 'pending' || t.status === 'in_progress'))
  const allCompletedTasks = computed(() => (allTasks.value ?? []).filter(t => t.status === 'completed' || t.status === 'rejected'))

  function syncFlow() {
    if (!workflow.value) return
    nodes.value = stepsToNodes(workflow.value.steps ?? [])
    edges.value = transitionsToEdges(workflow.value.transitions ?? [])
  }

  async function fetchWorkflows() {
    loading.value = true
    try {
      const res = await workflowApi.list()
      workflows.value = res.workflows ?? []
    } finally {
      loading.value = false
    }
  }

  async function deleteWorkflow(id: string) {
    const res = await workflowApi.delete(id)
    console.log('[store:deleteWorkflow] res', res)
    workflows.value = workflows.value.filter(wf => wf.id !== id)
    return res
  }

  async function fetchTypes() {
    const res = await workflowApi.listTypes()
    workflowTypes.value = res.workflow_types ?? []
  }

  async function createWorkflow(payload: CreateWorkflowPayload): Promise<Workflow> {
    const res = await workflowApi.create(payload) as any
    const wf = res.workflow ?? res
    workflows.value.push(wf)
    return wf
  }

  async function fetchWorkflow(id: string) {
    loading.value = true
    try {
      const res = await workflowApi.getStructure(id) as any
      // Backend returns { workflow: {...}, steps: [...], transitions: [...] }
      const wf = res.workflow ?? res
      workflow.value = {
        ...wf,
        steps: res.steps ?? wf.steps ?? [],
        transitions: res.transitions ?? wf.transitions ?? [],
      }
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
    const res = await workflowApi.createStep(payload) as any
    const step = res.step ?? res
    if (workflow.value) {
      workflow.value.steps = [...(workflow.value.steps ?? []), step]
    }
    syncFlow()
    return step
  }

  async function updateStep(id: string, payload: UpdateStepPayload) {
    const res = await workflowApi.updateStep(id, payload) as any
    const step = res.step ?? res
    const idx = workflow.value?.steps.findIndex(s => s.id === id) ?? -1
    if (idx !== -1) workflow.value!.steps[idx] = step
    syncFlow()
    return step
  }

  async function deleteStep(id: string) {
    await workflowApi.deleteStep(id)
    if (workflow.value) {
      workflow.value.steps = (workflow.value.steps ?? []).filter(s => s.id !== id)
      workflow.value.transitions = (workflow.value.transitions ?? []).filter(
        t => t.from_step_id !== id && t.to_step_id !== id,
      )
    }
    syncFlow()
  }

  async function addTransition(payload: CreateTransitionPayload) {
    const res = await workflowApi.createTransition(payload) as any
    const tr = res.transition ?? res
    if (workflow.value) {
      workflow.value.transitions = [...(workflow.value.transitions ?? []), tr]
    }
    syncFlow()
    return tr
  }

  async function updateTransition(id: string, payload: UpdateTransitionPayload) {
    const res = await workflowApi.updateTransition(id, payload) as any
    const tr = res.transition ?? res
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

  // fetchAllTasks loads every task in the org, scoped to the currently selected
  // branch (All Branches when none is selected). Used by the "All Tasks" tab.
  async function fetchAllTasks() {
    const branchFilter = useBranchFilterStore()
    allTasksLoading.value = true
    try {
      const res = await workflowApi.getAllTasks(branchFilter.apiBranchId)
      allTasks.value = res?.tasks ?? []
    } finally {
      allTasksLoading.value = false
    }
  }

  async function processTask(instanceId: string, payload: ProcessTaskPayload) {
    await workflowApi.processAction(instanceId, payload)
    // Refresh both lists so whichever tab is active reflects the change.
    await Promise.all([fetchTasks(), fetchAllTasks()])
  }

  return {
    workflows,
    workflowTypes,
    workflow,
    tasks,
    allTasks,
    loading,
    tasksLoading,
    allTasksLoading,
    nodes,
    edges,
    pendingTasks,
    completedTasks,
    allPendingTasks,
    allCompletedTasks,
    fetchWorkflows,
    deleteWorkflow,
    fetchTypes,
    createWorkflow,
    fetchWorkflow,
    updateWorkflowInfo,
    addStep,
    updateStep,
    deleteStep,
    addTransition,
    updateTransition,
    deleteTransition,
    fetchTasks,
    fetchAllTasks,
    processTask,
    syncFlow,
  }
})
