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
  TaskDetailsResponse,
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
  delete: (id: string) =>
    apiClient.delete<void>(`/admin/workflows/${id}`),

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

  // Tasks (staff inbox). `status` accepts the group keywords "active" | "completed".
  getMyTasks: (status?: string, page = 1, pageSize = 12) =>
    apiClient.get<WorkflowTasksResponse>('/workflow/my-tasks', {
      params: { status, page, page_size: pageSize },
    }),
  getMyPendingTasks: () => apiClient.get<WorkflowTasksResponse>('/workflow/my-tasks/pending'),
  getAllTasks: (status?: string, branchId?: string, page = 1, pageSize = 12) =>
    apiClient.get<WorkflowTasksResponse>('/workflow/all-tasks', {
      params: { status, branch_id: branchId, page, page_size: pageSize },
    }),
  getTaskDetails: (taskId: string) =>
    apiClient.get<TaskDetailsResponse>(`/workflow/tasks/${taskId}`),

  // Process action — uses instance_id not task_id
  processAction: (instanceId: string, payload: ProcessTaskPayload) =>
    apiClient.post<void>(`/workflow/instances/${instanceId}/action`, payload),
}
