import { apiClient } from './client'
import type {
  Workflow,
  WorkflowType,
  WorkflowStep,
  WorkflowTransition,
  WorkflowTasksResponse,
  CreateStepPayload,
  UpdateStepPayload,
  CreateTransitionPayload,
  UpdateTransitionPayload,
  CreateWorkflowPayload,
  ProcessTaskPayload,
  WorkflowTask,
} from '@/types/workflow'

export const workflowApi = {
  // Workflow definition
  listTypes: () => apiClient.get<{ count: number; workflow_types: WorkflowType[] }>('/admin/workflow-types'),
  list: () => apiClient.get<{ count: number; workflows: Workflow[] }>('/admin/workflows'),
  create: (payload: CreateWorkflowPayload) => apiClient.post<Workflow>('/admin/workflows', payload),
  get: (id: string) => apiClient.get<Workflow>(`/admin/workflows/${id}`),
  getStructure: (id: string) => apiClient.get<Workflow>(`/admin/workflows/${id}/structure`),
  update: (id: string, payload: { name?: string; description?: string }) =>
    apiClient.put<Workflow>(`/admin/workflows/${id}`, payload),

  // Steps
  createStep: (payload: CreateStepPayload) =>
    apiClient.post<WorkflowStep>('/admin/workflow-steps', payload),
  updateStep: (id: string, payload: UpdateStepPayload) =>
    apiClient.put<WorkflowStep>(`/admin/workflow-steps/${id}`, payload),
  deleteStep: (id: string) =>
    apiClient.delete<void>(`/admin/workflow-steps/${id}`),

  // Transitions
  createTransition: (payload: CreateTransitionPayload) =>
    apiClient.post<WorkflowTransition>('/admin/workflow-transitions', payload),
  updateTransition: (id: string, payload: UpdateTransitionPayload) =>
    apiClient.put<WorkflowTransition>(`/admin/workflow-transitions/${id}`, payload),
  deleteTransition: (id: string) =>
    apiClient.delete<void>(`/admin/workflow-transitions/${id}`),

  // Tasks (staff inbox)
  getMyTasks: () => apiClient.get<WorkflowTasksResponse>('/workflow/my-tasks'),
  getMyPendingTasks: () => apiClient.get<WorkflowTasksResponse>('/workflow/my-tasks/pending'),
  getTaskDetails: (taskId: string) => apiClient.get<WorkflowTask>(`/workflow/tasks/${taskId}`),

  // Process action — uses instance_id not task_id
  processAction: (instanceId: string, payload: ProcessTaskPayload) =>
    apiClient.post<void>(`/workflow/instances/${instanceId}/action`, payload),
}
