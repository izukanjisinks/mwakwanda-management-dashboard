// Workflow Type
export interface WorkflowType {
  type: string
  name: string
  description: string
}

export interface GetWorkflowTypesResponse {
  count: number
  workflow_types: WorkflowType[]
}

// Backend workflow types
export interface BackendWorkflow {
  id: string
  name: string
  description: string
  workflow_type?: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  step_count: number
  transition_count: number
}

export interface BackendWorkflowStep {
  id: string
  workflow_id: string
  step_name: string
  step_order: number
  initial: boolean
  final: boolean
  allowed_roles: string[]
  requires_all_approvers: boolean
  min_approvals: number
  created_at: string
  updated_at: string
}

export interface BackendWorkflowTransition {
  id: string
  workflow_id: string
  from_step_id: string
  to_step_id: string
  action_name: string
  condition_type: string
  condition_value: string
  created_at: string
  updated_at: string
}

export interface WorkflowStructure {
  workflow: BackendWorkflow
  steps: BackendWorkflowStep[]
  transitions: BackendWorkflowTransition[]
}

export interface GetWorkflowsResponse {
  count: number
  workflows: BackendWorkflow[]
}

// Workflow task types
export interface WorkflowTask {
  id: string
  instance_id: string
  step_id: string
  step_name: string
  assigned_to: string
  assigned_by: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  due_date: string
  task_details?: {
    task_id: string
    task_type: string
    task_description: string
    sender_details: {
      sender_id: string
      sender_name: string
      position: string
      department: string
    }
  }
  created_at: string
  updated_at: string
}

export interface GetTasksResponse {
  count: number
  tasks: WorkflowTask[]
}

// Task action types
export interface ProcessTaskActionPayload {
  action: string
  comments?: string
}

export interface ProcessTaskActionResponse {
  message: string
  instance_id: string
  new_step?: string
}

export interface CreateWorkflowPayload {
  name: string
  description: string
  workflow_type: string
}

export interface UpdateWorkflowPayload {
  name?: string
  description?: string
  is_active?: boolean
}

export interface CreateStepPayload {
  workflow_id: string
  step_name: string
  step_order: number
  initial: boolean
  final: boolean
  allowed_roles: string[]
  requires_all_approvers: boolean
  min_approvals: number
}

export interface UpdateStepPayload {
  step_name?: string
  step_order?: number
  allowed_roles?: string[]
  requires_all_approvers?: boolean
  min_approvals?: number
}

export interface CreateTransitionPayload {
  workflow_id: string
  from_step_id: string
  to_step_id: string
  action_name: string
  condition_type: string
  condition_value: string
}

export interface UpdateTransitionPayload {
  action_name?: string
  condition_type?: string
  condition_value?: string
}
