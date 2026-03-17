import { apiClient } from './client'
import type {
  Workflow,
  WorkflowStep,
  WorkflowTransition,
  CreateStepPayload,
  UpdateStepPayload,
  CreateTransitionPayload,
  UpdateTransitionPayload,
  WorkflowTask,
  ProcessTaskPayload,
} from '@/types/workflow'

export const workflowApi = {
  // Workflow (single, read + update only — no create/delete)
  get: () => apiClient.get<Workflow>('/workflow'),
  updateInfo: (payload: { name?: string; description?: string }) =>
    apiClient.put<Workflow>('/workflow', payload),

  // Steps
  createStep: (payload: CreateStepPayload) =>
    apiClient.post<WorkflowStep>('/workflow/steps', payload),
  updateStep: (id: string, payload: UpdateStepPayload) =>
    apiClient.put<WorkflowStep>(`/workflow/steps/${id}`, payload),
  deleteStep: (id: string) =>
    apiClient.delete<void>(`/workflow/steps/${id}`),

  // Transitions
  createTransition: (payload: CreateTransitionPayload) =>
    apiClient.post<WorkflowTransition>('/workflow/transitions', payload),
  updateTransition: (id: string, payload: UpdateTransitionPayload) =>
    apiClient.put<WorkflowTransition>(`/workflow/transitions/${id}`, payload),
  deleteTransition: (id: string) =>
    apiClient.delete<void>(`/workflow/transitions/${id}`),

  // Tasks (staff inbox)
  getMyTasks: (status?: string) =>
    apiClient.get<WorkflowTask[]>(status ? `/workflow/tasks?status=${status}` : '/workflow/tasks'),
  processTask: (taskId: string, payload: ProcessTaskPayload) =>
    apiClient.post<WorkflowTask>(`/workflow/tasks/${taskId}/action`, payload),
}
