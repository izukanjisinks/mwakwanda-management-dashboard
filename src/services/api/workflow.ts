import { apiClient } from './client'
import type {
  GetWorkflowsResponse,
  GetWorkflowTypesResponse,
  BackendWorkflow,
  WorkflowStructure,
  CreateWorkflowPayload,
  UpdateWorkflowPayload,
  BackendWorkflowStep,
  CreateStepPayload,
  UpdateStepPayload,
  BackendWorkflowTransition,
  CreateTransitionPayload,
  UpdateTransitionPayload,
  GetTasksResponse,
  ProcessTaskActionPayload,
  ProcessTaskActionResponse,
} from '@/types/workflow'

export const workflowApi = {
  // Workflow Management
  getAllWorkflows(): Promise<GetWorkflowsResponse> {
    return apiClient.get<GetWorkflowsResponse>('/admin/workflows')
  },

  getWorkflowTypes(): Promise<GetWorkflowTypesResponse> {
    return apiClient.get<GetWorkflowTypesResponse>('/admin/workflow-types')
  },

  getWorkflowById(id: string): Promise<BackendWorkflow> {
    return apiClient.get<BackendWorkflow>(`/admin/workflows/${id}`)
  },

  createWorkflow(payload: CreateWorkflowPayload): Promise<BackendWorkflow> {
    return apiClient.post<BackendWorkflow>('/admin/workflows', payload)
  },

  updateWorkflow(id: string, payload: UpdateWorkflowPayload): Promise<BackendWorkflow> {
    return apiClient.put<BackendWorkflow>(`/admin/workflows/${id}`, payload)
  },

  deactivateWorkflow(id: string): Promise<void> {
    return apiClient.delete<void>(`/admin/workflows/${id}/deactivate`)
  },

  deleteWorkflow(id: string): Promise<void> {
    return apiClient.delete<void>(`/admin/workflows/${id}`)
  },

  getWorkflowStructure(id: string): Promise<WorkflowStructure> {
    return apiClient.get<WorkflowStructure>(`/admin/workflows/${id}/structure`)
  },

  // Step Management
  getWorkflowSteps(workflowId: string): Promise<BackendWorkflowStep[]> {
    return apiClient.get<BackendWorkflowStep[]>(`/admin/workflows/${workflowId}/steps`)
  },

  getStepById(stepId: string): Promise<BackendWorkflowStep> {
    return apiClient.get<BackendWorkflowStep>(`/admin/workflow-steps/${stepId}`)
  },

  createStep(payload: CreateStepPayload): Promise<BackendWorkflowStep> {
    return apiClient.post<BackendWorkflowStep>('/admin/workflow-steps', payload)
  },

  updateStep(stepId: string, payload: UpdateStepPayload): Promise<BackendWorkflowStep> {
    return apiClient.put<BackendWorkflowStep>(`/admin/workflow-steps/${stepId}`, payload)
  },

  deleteStep(stepId: string): Promise<void> {
    return apiClient.delete<void>(`/admin/workflow-steps/${stepId}`)
  },

  // Transition Management
  getWorkflowTransitions(workflowId: string): Promise<BackendWorkflowTransition[]> {
    return apiClient.get<BackendWorkflowTransition[]>(`/admin/workflows/${workflowId}/transitions`)
  },

  getValidTransitionsFromStep(stepId: string): Promise<BackendWorkflowTransition[]> {
    return apiClient.get<BackendWorkflowTransition[]>(`/admin/workflow-steps/${stepId}/transitions`)
  },

  createTransition(payload: CreateTransitionPayload): Promise<BackendWorkflowTransition> {
    return apiClient.post<BackendWorkflowTransition>('/admin/workflow-transitions', payload)
  },

  updateTransition(transitionId: string, payload: UpdateTransitionPayload): Promise<BackendWorkflowTransition> {
    return apiClient.put<BackendWorkflowTransition>(`/admin/workflow-transitions/${transitionId}`, payload)
  },

  deleteTransition(transitionId: string): Promise<void> {
    return apiClient.delete<void>(`/admin/workflow-transitions/${transitionId}`)
  },

  // Task Management
  getMyTasks(status?: 'pending' | 'in_progress' | 'completed' | 'skipped'): Promise<GetTasksResponse> {
    const params = status ? { status } : {}
    return apiClient.get<GetTasksResponse>('/workflow/my-tasks', { params })
  },

  getMyPendingTasks(): Promise<GetTasksResponse> {
    return apiClient.get<GetTasksResponse>('/workflow/my-tasks/pending')
  },

  // Task Actions
  processTaskAction(instanceId: string, payload: ProcessTaskActionPayload): Promise<ProcessTaskActionResponse> {
    return apiClient.post<ProcessTaskActionResponse>(`/workflow/instances/${instanceId}/action`, payload)
  },
}
