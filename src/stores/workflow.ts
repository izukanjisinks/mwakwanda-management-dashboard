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

// ── Dev mock data ────────────────────────────────────────────────────────────

const MOCK_WORKFLOW: Workflow = {
  id: 'wf-1',
  name: 'Booking Approval Workflow',
  description: 'Standard booking approval process for all guest reservations.',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  steps: [
    {
      id: 'step-1',
      workflow_id: 'wf-1',
      step_name: 'Submission',
      step_order: 1,
      step_type: 'initial',
      allowed_roles: ['receptionist', 'admin'],
      requires_all_approvers: false,
      min_approvals: 1,
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'step-2',
      workflow_id: 'wf-1',
      step_name: 'Approval',
      step_order: 2,
      step_type: 'final',
      allowed_roles: ['manager', 'admin'],
      requires_all_approvers: false,
      min_approvals: 1,
      created_at: '2025-01-01T00:00:00Z',
    },
  ],
  transitions: [
    {
      id: 'tr-1',
      workflow_id: 'wf-1',
      from_step_id: 'step-1',
      to_step_id: 'step-2',
      action_name: 'Submit for Approval',
      condition_type: 'always',
      condition_value: '',
    },
  ],
}

const MOCK_TASKS: WorkflowTask[] = [
  {
    id: 'task-1',
    instance_id: 'inst-1',
    booking_id: 1,
    step_id: 'step-2',
    step_name: 'Room Review',
    assigned_to: 'user-2',
    assigned_by: 'system',
    status: 'pending',
    due_date: '2026-03-20',
    comments: '',
    created_at: '2026-03-17T08:00:00Z',
    updated_at: '2026-03-17T08:00:00Z',
    booking_details: {
      booking_id: 1,
      room_name: 'Savanna Suite',
      client_name: 'John Banda',
      client_type: 'individual',
      check_in: '2026-03-25',
      check_out: '2026-03-28',
      guests: 2,
      meal_plan_name: 'Full Board',
      total_amount: 5150,
      special_requests: 'Late check-in requested',
    },
  },
  {
    id: 'task-2',
    instance_id: 'inst-2',
    booking_id: 2,
    step_id: 'step-2',
    step_name: 'Room Review',
    assigned_to: 'user-2',
    assigned_by: 'system',
    status: 'pending',
    due_date: '2026-03-21',
    comments: '',
    created_at: '2026-03-17T09:30:00Z',
    updated_at: '2026-03-17T09:30:00Z',
    booking_details: {
      booking_id: 2,
      room_name: 'Baobab Room',
      client_name: 'Acme Corp Ltd',
      client_type: 'corporate',
      check_in: '2026-04-01',
      check_out: '2026-04-05',
      guests: 4,
      meal_plan_name: 'Bed & Breakfast',
      total_amount: 8600,
    },
  },
  {
    id: 'task-3',
    instance_id: 'inst-3',
    booking_id: 3,
    step_id: 'step-3',
    step_name: 'Confirmed',
    assigned_to: 'user-1',
    assigned_by: 'user-2',
    status: 'in_progress',
    due_date: '2026-03-22',
    created_at: '2026-03-16T14:00:00Z',
    updated_at: '2026-03-17T10:00:00Z',
    booking_details: {
      booking_id: 3,
      room_name: 'Elephant Loft',
      client_name: 'Mary Phiri',
      client_type: 'individual',
      check_in: '2026-03-30',
      check_out: '2026-04-02',
      guests: 1,
      meal_plan_name: null,
      total_amount: 3600,
    },
  },
]

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

  // Vue Flow reactive state
  const nodes = ref<Node[]>([])
  const edges = ref<Edge[]>([])

  const pendingTasks = computed(() => tasks.value.filter(t => t.status === 'pending' || t.status === 'in_progress'))
  const completedTasks = computed(() => tasks.value.filter(t => t.status === 'completed' || t.status === 'rejected'))

  function syncFlow() {
    if (!workflow.value) return
    nodes.value = stepsToNodes(workflow.value.steps)
    edges.value = transitionsToEdges(workflow.value.transitions)
  }

  async function fetchWorkflow() {
    loading.value = true
    try {
      if (import.meta.env.DEV) {
        await new Promise(r => setTimeout(r, 400))
        workflow.value = JSON.parse(JSON.stringify(MOCK_WORKFLOW))
      } else {
        workflow.value = await workflowApi.get()
      }
      syncFlow()
    } finally {
      loading.value = false
    }
  }

  async function updateWorkflowInfo(payload: { name?: string; description?: string }) {
    if (import.meta.env.DEV) {
      if (workflow.value) {
        workflow.value = { ...workflow.value, ...payload }
      }
      return workflow.value!
    }
    const updated = await workflowApi.updateInfo(payload)
    workflow.value = updated
    return updated
  }

  async function addStep(payload: CreateStepPayload) {
    let step: WorkflowStep
    if (import.meta.env.DEV) {
      step = {
        ...payload,
        id: `step-${Date.now()}`,
        created_at: new Date().toISOString(),
      }
    } else {
      step = await workflowApi.createStep(payload)
    }
    workflow.value?.steps.push(step)
    syncFlow()
    return step
  }

  async function updateStep(id: string, payload: UpdateStepPayload) {
    let step: WorkflowStep
    if (import.meta.env.DEV) {
      const idx = workflow.value?.steps.findIndex(s => s.id === id) ?? -1
      if (idx === -1) throw new Error('Step not found')
      step = { ...workflow.value!.steps[idx], ...payload }
      workflow.value!.steps[idx] = step
    } else {
      step = await workflowApi.updateStep(id, payload)
      const idx = workflow.value?.steps.findIndex(s => s.id === id) ?? -1
      if (idx !== -1) workflow.value!.steps[idx] = step
    }
    syncFlow()
    return step
  }

  async function deleteStep(id: string) {
    if (import.meta.env.DEV) {
      if (workflow.value) {
        workflow.value.steps = workflow.value.steps.filter(s => s.id !== id)
        workflow.value.transitions = workflow.value.transitions.filter(
          t => t.from_step_id !== id && t.to_step_id !== id
        )
      }
    } else {
      await workflowApi.deleteStep(id)
      if (workflow.value) {
        workflow.value.steps = workflow.value.steps.filter(s => s.id !== id)
        workflow.value.transitions = workflow.value.transitions.filter(
          t => t.from_step_id !== id && t.to_step_id !== id
        )
      }
    }
    syncFlow()
  }

  async function addTransition(payload: CreateTransitionPayload) {
    let tr: WorkflowTransition
    if (import.meta.env.DEV) {
      tr = { ...payload, id: `tr-${Date.now()}` }
    } else {
      tr = await workflowApi.createTransition(payload)
    }
    workflow.value?.transitions.push(tr)
    syncFlow()
    return tr
  }

  async function updateTransition(id: string, payload: UpdateTransitionPayload) {
    let tr: WorkflowTransition
    if (import.meta.env.DEV) {
      const idx = workflow.value?.transitions.findIndex(t => t.id === id) ?? -1
      if (idx === -1) throw new Error('Transition not found')
      tr = { ...workflow.value!.transitions[idx], ...payload }
      workflow.value!.transitions[idx] = tr
    } else {
      tr = await workflowApi.updateTransition(id, payload)
      const idx = workflow.value?.transitions.findIndex(t => t.id === id) ?? -1
      if (idx !== -1) workflow.value!.transitions[idx] = tr
    }
    syncFlow()
    return tr
  }

  async function deleteTransition(id: string) {
    if (import.meta.env.DEV) {
      if (workflow.value) {
        workflow.value.transitions = workflow.value.transitions.filter(t => t.id !== id)
      }
    } else {
      await workflowApi.deleteTransition(id)
      if (workflow.value) {
        workflow.value.transitions = workflow.value.transitions.filter(t => t.id !== id)
      }
    }
    syncFlow()
  }

  async function fetchTasks(status?: string) {
    tasksLoading.value = true
    try {
      if (import.meta.env.DEV) {
        await new Promise(r => setTimeout(r, 300))
        tasks.value = status
          ? MOCK_TASKS.filter(t => t.status === status)
          : [...MOCK_TASKS]
      } else {
        tasks.value = await workflowApi.getMyTasks(status)
      }
    } finally {
      tasksLoading.value = false
    }
  }

  async function processTask(taskId: string, payload: ProcessTaskPayload) {
    let task: WorkflowTask
    if (import.meta.env.DEV) {
      const idx = tasks.value.findIndex(t => t.id === taskId)
      if (idx === -1) throw new Error('Task not found')
      const newStatus = payload.action === 'reject' ? 'rejected' : 'completed'
      task = { ...tasks.value[idx], status: newStatus, comments: payload.comments, updated_at: new Date().toISOString() }
      tasks.value[idx] = task
    } else {
      task = await workflowApi.processTask(taskId, payload)
      const idx = tasks.value.findIndex(t => t.id === taskId)
      if (idx !== -1) tasks.value[idx] = task
    }
    return task
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
