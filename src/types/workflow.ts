export type StepType = 'initial' | 'middle' | 'final'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'

// ── Workflow definition ──────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string
  workflow_id: string
  step_name: string
  step_order: number
  step_type: StepType
  allowed_roles: string[]
  requires_all_approvers: boolean
  min_approvals: number
  created_at: string
}

export interface WorkflowTransition {
  id: string
  workflow_id: string
  from_step_id: string
  to_step_id: string
  action_name: string
  condition_type: 'always' | 'equals' | 'not_equals'
  condition_value: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  is_active: boolean
  steps: WorkflowStep[]
  transitions: WorkflowTransition[]
  created_at: string
}

// ── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateStepPayload {
  workflow_id: string
  step_name: string
  step_order: number
  step_type: StepType
  allowed_roles: string[]
  requires_all_approvers: boolean
  min_approvals: number
}

export interface UpdateStepPayload {
  step_name?: string
  step_order?: number
  step_type?: StepType
  allowed_roles?: string[]
  requires_all_approvers?: boolean
  min_approvals?: number
}

export interface CreateTransitionPayload {
  workflow_id: string
  from_step_id: string
  to_step_id: string
  action_name: string
  condition_type: 'always' | 'equals' | 'not_equals'
  condition_value: string
}

export interface UpdateTransitionPayload {
  action_name?: string
  condition_type?: 'always' | 'equals' | 'not_equals'
  condition_value?: string
}

// ── Workflow tasks (staff inbox) ──────────────────────────────────────────────

export interface TaskSenderDetails {
  sender_id: string
  sender_name: string
  position: string
  department: string
}

export interface TaskDetails {
  task_id: string
  task_type: string
  task_description: string
  sender_details: TaskSenderDetails
}

export interface WorkflowTask {
  id: string
  instance_id: string
  step_id: string
  step_name: string
  assigned_to: string
  assigned_by: string
  status: TaskStatus
  due_date?: string
  completed_at?: string
  task_details?: TaskDetails
  created_at: string
  updated_at: string
}

export interface WorkflowTasksResponse {
  count: number
  tasks: WorkflowTask[]
}

export interface ProcessTaskPayload {
  action: string
  comments?: string
}
