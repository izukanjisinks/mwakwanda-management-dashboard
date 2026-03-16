import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { workflowApi } from '@/services/api/workflow'
import type {
  BackendWorkflow,
  BackendWorkflowStep,
  BackendWorkflowTransition,
  CreateStepPayload,
  UpdateStepPayload,
  CreateTransitionPayload,
  UpdateTransitionPayload,
} from '@/types/workflow'

export interface WorkflowState {
  id: string
  name: string
  stateType: 'initial' | 'middle' | 'final'
  displayOrder: number
  stepId: string // Backend step ID
  allowedRoles: string[]
  requiresAllApprovers: boolean
  minApprovals: number
}

export interface WorkflowTransition {
  name: string
  transitionId?: string // Backend transition ID
  actionName: string
  conditionType: string
  conditionValue: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  isActive: boolean
  nodes: Node<WorkflowState>[]
  edges: Edge<WorkflowTransition>[]
  createdAt: string
  updatedAt: string
  createdBy: string
  stepCount?: number
  transitionCount?: number
  structureLoaded?: boolean // Track if full structure has been loaded from backend
}

export const useWorkflowStore = defineStore('workflow', () => {
  const workflows = ref<Workflow[]>([])
  const currentWorkflow = ref<Workflow | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeWorkflows = computed(() =>
    workflows.value.filter(w => w.isActive)
  )

  const workflowById = (id: string) =>
    workflows.value.find(w => w.id === id)

  // Helper: Convert backend data to Vue Flow format
  function convertToVueFlow(
    workflow: BackendWorkflow,
    steps: BackendWorkflowStep[] | null | undefined,
    transitions: BackendWorkflowTransition[] | null | undefined
  ): Workflow {
    // Ensure steps and transitions are arrays
    const safeSteps = Array.isArray(steps) ? steps : []
    const safeTransitions = Array.isArray(transitions) ? transitions : []

    // Sort steps by order
    const sortedSteps = [...safeSteps].sort((a, b) => a.step_order - b.step_order)

    // Count final states to calculate vertical spacing
    const finalStates = sortedSteps.filter(s => s.final)
    const finalStateCount = finalStates.length
    let finalStateIndex = 0

    // Create nodes from steps
    const nodes: Node<WorkflowState>[] = sortedSteps.map((step, index) => {
      let stateType: 'initial' | 'middle' | 'final' = 'middle'
      if (step.initial) stateType = 'initial'
      if (step.final) stateType = 'final'

      // Calculate Y position
      let yPosition = 150
      if (step.final && finalStateCount > 1) {
        // Spread final states vertically
        const spacing = 100
        const totalHeight = (finalStateCount - 1) * spacing
        const startY = 150 - totalHeight / 2
        yPosition = startY + finalStateIndex * spacing
        finalStateIndex++
      } else if (step.initial) {
        yPosition = 100
      }

      return {
        id: step.id,
        type: 'state',
        position: {
          x: 100 + index * 200,
          y: yPosition
        },
        data: {
          id: step.id,
          name: step.step_name,
          stateType,
          displayOrder: step.step_order,
          stepId: step.id,
          allowedRoles: step.allowed_roles,
          requiresAllApprovers: step.requires_all_approvers,
          minApprovals: step.min_approvals,
        },
      }
    })

    // Create edges from transitions
    const edges: Edge<WorkflowTransition>[] = safeTransitions.map(transition => ({
      id: transition.id,
      source: transition.from_step_id,
      target: transition.to_step_id,
      type: 'default',
      data: {
        name: transition.action_name,
        transitionId: transition.id,
        actionName: transition.action_name,
        conditionType: transition.condition_type,
        conditionValue: transition.condition_value,
      },
    }))

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      isActive: workflow.is_active,
      nodes,
      edges,
      createdAt: workflow.created_at,
      updatedAt: workflow.updated_at,
      createdBy: workflow.created_by,
    }
  }

  // Fetch all workflows from backend (lightweight - no full structure)
  async function fetchWorkflows() {
    loading.value = true
    error.value = null
    try {
      const response = await workflowApi.getAllWorkflows()

      // Convert to Workflow format with counts but no structure
      workflows.value = response.workflows.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        isActive: w.is_active,
        nodes: [],
        edges: [],
        createdAt: w.created_at,
        updatedAt: w.updated_at,
        createdBy: w.created_by,
        stepCount: w.step_count,
        transitionCount: w.transition_count,
      }))
    } catch (err) {
      console.error('Failed to load workflows:', err)
      error.value = (err as any)?.error?.message || (err as Error)?.message || 'Failed to load workflows'
    } finally {
      loading.value = false
    }
  }

  // Load a specific workflow with full structure
  async function loadWorkflow(id: string) {
    loading.value = true
    error.value = null
    try {
      const structure = await workflowApi.getWorkflowStructure(id)
      const workflow = convertToVueFlow(structure.workflow, structure.steps, structure.transitions)

      // Mark structure as loaded
      workflow.structureLoaded = true

      // Update in workflows list
      const index = workflows.value.findIndex(w => w.id === id)
      if (index !== -1) {
        workflows.value[index] = workflow
      } else {
        workflows.value.push(workflow)
      }

      // Set as current
      currentWorkflow.value = JSON.parse(JSON.stringify(workflow))
    } catch (err) {
      console.error('Failed to load workflow:', err)
      error.value = (err as any)?.error?.message || (err as Error)?.message || 'Failed to load workflow'
    } finally {
      loading.value = false
    }
  }

  // Set current workflow
  async function setCurrentWorkflow(id: string | null) {
    if (!id) {
      currentWorkflow.value = null
      return
    }
    const workflow = workflowById(id)

    // Check if we need to load full structure from backend
    if (workflow && !workflow.structureLoaded) {
      // Workflow exists but structure hasn't been loaded yet - load from backend
      await loadWorkflow(id)
    } else if (workflow) {
      // Workflow has structure loaded - use cached version
      currentWorkflow.value = JSON.parse(JSON.stringify(workflow))
    } else {
      // Workflow not in cache - load from backend
      await loadWorkflow(id)
    }
  }

  // Create new workflow
  async function createWorkflow(name: string, description: string, workflow_type: string) {
    loading.value = true
    error.value = null
    try {
      const newWorkflow = await workflowApi.createWorkflow({ name, description, workflow_type })

      // Convert to Vue Flow format (no steps/transitions yet)
      const workflow = convertToVueFlow(newWorkflow, [], [])

      // Mark as loaded since we know it's empty
      workflow.structureLoaded = true

      workflows.value.push(workflow)

      return newWorkflow.id
    } catch (err) {
      console.error('Failed to create workflow:', err)
      error.value = (err as any)?.error?.message || (err as Error)?.message || 'Failed to create workflow'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update workflow status (active/inactive)
  async function updateWorkflowStatus(id: string, isActive: boolean) {
    loading.value = true
    error.value = null
    try {
      const updatedWorkflow = await workflowApi.updateWorkflow(id, { is_active: isActive })

      // Update in local workflows list with proper reactivity
      workflows.value = workflows.value.map(w =>
        w.id === id
          ? { ...w, isActive: updatedWorkflow.is_active, updatedAt: updatedWorkflow.updated_at }
          : w
      )
    } catch (err) {
      console.error('Failed to update workflow status:', err)
      error.value = (err as any)?.error?.message || (err as Error)?.message || 'Failed to update workflow status'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete workflow (hard delete with cascade)
  async function deleteWorkflow(id: string) {
    loading.value = true
    error.value = null
    try {
      await workflowApi.deleteWorkflow(id)

      // Remove from local workflows list
      const index = workflows.value.findIndex(w => w.id === id)
      if (index !== -1) {
        workflows.value.splice(index, 1)
      }

      // Clear current workflow if it's the one being deleted
      if (currentWorkflow.value?.id === id) {
        currentWorkflow.value = null
      }
    } catch (err) {
      console.error('Failed to delete workflow:', err)
      error.value = (err as any)?.error?.message || (err as Error)?.message || 'Failed to delete workflow'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Node operations
  function addNode(node: Node<WorkflowState>) {
    if (!currentWorkflow.value) return
    currentWorkflow.value.nodes = [...currentWorkflow.value.nodes, node]
  }

  // Create step in backend
  async function createStep(workflowId: string, stepData: WorkflowState) {
    loading.value = true
    error.value = null
    try {
      const payload: CreateStepPayload = {
        workflow_id: workflowId,
        step_name: stepData.name,
        step_order: stepData.displayOrder,
        initial: stepData.stateType === 'initial',
        final: stepData.stateType === 'final',
        allowed_roles: stepData.allowedRoles,
        requires_all_approvers: stepData.requiresAllApprovers,
        min_approvals: stepData.minApprovals,
      }

      const newStep = await workflowApi.createStep(payload)

      // Update the node with the backend step ID
      // We need to find the old node, remove it, and add a new one with the correct ID
      if (currentWorkflow.value) {
        const oldNodeIndex = currentWorkflow.value.nodes.findIndex(node => node.data.id === stepData.id)
        if (oldNodeIndex !== -1) {
          const oldNode = currentWorkflow.value.nodes[oldNodeIndex]

          // Create new node with backend ID
          const updatedNode: Node<WorkflowState> = {
            ...oldNode,
            id: newStep.id,
            data: {
              ...oldNode.data,
              id: newStep.id,
              stepId: newStep.id,
              name: newStep.step_name,
              displayOrder: newStep.step_order,
              allowedRoles: newStep.allowed_roles,
              requiresAllApprovers: newStep.requires_all_approvers,
              minApprovals: newStep.min_approvals,
            }
          }

          // Remove old node and add new one
          const newNodes = [...currentWorkflow.value.nodes]
          newNodes.splice(oldNodeIndex, 1, updatedNode)
          currentWorkflow.value.nodes = newNodes

          // Update any edges that reference the old node ID
          currentWorkflow.value.edges = currentWorkflow.value.edges.map(edge => {
            const newEdge = { ...edge }
            if (edge.source === stepData.id) {
              newEdge.source = newStep.id
            }
            if (edge.target === stepData.id) {
              newEdge.target = newStep.id
            }
            return newEdge
          })
        }
      }

      return newStep
    } catch (err) {
      console.error('Failed to create step:', err)
      error.value = (err as any)?.error?.message || (err as Error)?.message || 'Failed to create step'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update step in backend
  async function updateStep(stepId: string, stepData: Partial<WorkflowState>) {
    loading.value = true
    error.value = null
    try {
      const payload: UpdateStepPayload = {}

      if (stepData.name !== undefined) payload.step_name = stepData.name
      if (stepData.displayOrder !== undefined) payload.step_order = stepData.displayOrder
      if (stepData.allowedRoles !== undefined) payload.allowed_roles = stepData.allowedRoles
      if (stepData.requiresAllApprovers !== undefined) payload.requires_all_approvers = stepData.requiresAllApprovers
      if (stepData.minApprovals !== undefined) payload.min_approvals = stepData.minApprovals

      const updatedStep = await workflowApi.updateStep(stepId, payload)

      return updatedStep
    } catch (err) {
      console.error('Failed to update step:', err)
      error.value = (err as any)?.error?.message || (err as Error)?.message || 'Failed to update step'
      throw err
    } finally {
      loading.value = false
    }
  }

  function updateNodePosition(nodeId: string, position: { x: number; y: number }) {
    if (!currentWorkflow.value) return
    const node = currentWorkflow.value.nodes.find(n => n.id === nodeId)
    if (node) {
      node.position = position
      currentWorkflow.value.nodes = [...currentWorkflow.value.nodes]
    }
  }

  function updateNodeData(nodeId: string, data: Partial<WorkflowState>) {
    if (!currentWorkflow.value) return
    currentWorkflow.value.nodes = currentWorkflow.value.nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...data,
          } as WorkflowState
        }
      }
      return node
    })
  }

  function removeNode(nodeId: string) {
    if (!currentWorkflow.value) return
    currentWorkflow.value.nodes = currentWorkflow.value.nodes.filter(n => n.id !== nodeId)
    currentWorkflow.value.edges = currentWorkflow.value.edges.filter(
      e => e.source !== nodeId && e.target !== nodeId
    )
  }

  // Edge operations
  function addEdge(edge: Edge<WorkflowTransition>) {
    if (!currentWorkflow.value) return
    currentWorkflow.value.edges = [...currentWorkflow.value.edges, edge]
  }

  // Create transition in backend
  async function createTransition(workflowId: string, source: string, target: string, transitionData: WorkflowTransition) {
    loading.value = true
    error.value = null
    try {
      // Validate source and target exist
      if (!source || !target) {
        throw new Error('Source and target step IDs are required')
      }

      const payload: CreateTransitionPayload = {
        workflow_id: workflowId,
        from_step_id: source,
        to_step_id: target,
        action_name: transitionData.actionName,
        condition_type: transitionData.conditionType,
        condition_value: transitionData.conditionValue,
      }

      const newTransition = await workflowApi.createTransition(payload)

      // Update the edge with the backend transition ID
      if (currentWorkflow.value) {
        // Find the temporary edge by source and target
        currentWorkflow.value.edges = currentWorkflow.value.edges.map(edge => {
          if (edge.source === source && edge.target === target && edge.id.startsWith('e')) {
            // Update the edge with backend ID and data
            return {
              ...edge,
              id: newTransition.id,
              data: {
                name: newTransition.action_name,
                transitionId: newTransition.id,
                actionName: newTransition.action_name,
                conditionType: newTransition.condition_type,
                conditionValue: newTransition.condition_value,
              }
            }
          }
          return edge
        })
      }

      return newTransition
    } catch (err) {
      console.error('Failed to create transition:', err)
      error.value = (err as any)?.error?.message || (err as Error)?.message || 'Failed to create transition'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update transition in backend
  async function updateTransition(transitionId: string, transitionData: Partial<WorkflowTransition>) {
    loading.value = true
    error.value = null
    try {
      const payload: UpdateTransitionPayload = {}

      if (transitionData.actionName !== undefined) payload.action_name = transitionData.actionName
      if (transitionData.conditionType !== undefined) payload.condition_type = transitionData.conditionType
      if (transitionData.conditionValue !== undefined) payload.condition_value = transitionData.conditionValue

      const updatedTransition = await workflowApi.updateTransition(transitionId, payload)

      return updatedTransition
    } catch (err) {
      console.error('Failed to update transition:', err)
      error.value = (err as any)?.error?.message || (err as Error)?.message || 'Failed to update transition'
      throw err
    } finally {
      loading.value = false
    }
  }

  function updateEdgeData(edgeId: string, data: Partial<WorkflowTransition>) {
    if (!currentWorkflow.value) return
    currentWorkflow.value.edges = currentWorkflow.value.edges.map(edge => {
      if (edge.id === edgeId) {
        return {
          ...edge,
          data: {
            ...edge.data,
            ...data,
          } as WorkflowTransition
        }
      }
      return edge
    })
  }

  function removeEdge(edgeId: string) {
    if (!currentWorkflow.value) return
    currentWorkflow.value.edges = currentWorkflow.value.edges.filter(e => e.id !== edgeId)
  }

  // Save current workflow back to workflows list
  function saveCurrentWorkflow() {
    if (!currentWorkflow.value) return
    const index = workflows.value.findIndex(w => w.id === currentWorkflow.value!.id)
    if (index !== -1) {
      currentWorkflow.value.updatedAt = new Date().toISOString()
      workflows.value[index] = JSON.parse(JSON.stringify(currentWorkflow.value))
    }
  }

  return {
    // State
    workflows,
    currentWorkflow,
    loading,
    error,

    // Computed
    activeWorkflows,
    workflowById,

    // Actions
    fetchWorkflows,
    loadWorkflow,
    setCurrentWorkflow,
    createWorkflow,
    updateWorkflowStatus,
    deleteWorkflow,
    addNode,
    createStep,
    updateStep,
    updateNodePosition,
    updateNodeData,
    removeNode,
    addEdge,
    createTransition,
    updateTransition,
    updateEdgeData,
    removeEdge,
    saveCurrentWorkflow,
  }
})
