export interface WorkflowType {
  type: string
  name: string
  description: string
}

export interface CreateWorkflowPayload {
  name: string
  description: string
  workflow_type: string
  is_active: boolean
}
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'

// ── Workflow definition ──────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string
  workflow_id: string
  step_name: string
  step_order: number
  initial: boolean
  final: boolean
  created_at: string
}

export interface WorkflowTransition {
  id: string
  workflow_id: string
  from_step_id: string
  to_step_id: string
  action_name: string
  allowed_roles: string[]
}

export interface Workflow {
  id: string
  name: string
  description: string
  workflow_type: string
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
  initial: boolean
  final: boolean
}

export interface UpdateStepPayload {
  step_name?: string
  step_order?: number
  initial?: boolean
  final?: boolean
}

export interface CreateTransitionPayload {
  workflow_id: string
  from_step_id: string
  to_step_id: string
  action_name: string
  allowed_roles: string[]
}

export interface UpdateTransitionPayload {
  action_name?: string
  allowed_roles?: string[]
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
  task_ref: string
  task_type: 'booking' | 'corporate_booking' | string
  task_description: string
  sender_details: TaskSenderDetails
}

export interface WorkflowTask {
  id: string
  instance_id: string
  step_id: string
  step_name: string
  assigned_to: string
  assignee_name?: string
  assigned_by: string
  branch_id?: string
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
  page?: number
  page_size?: number
  total?: number
}

export interface ProcessTaskPayload {
  action: string
  comments?: string
}

// Response of GET /workflow/tasks/:id — the task plus its instance/history context.
// When the instance can't be resolved the backend returns the bare task instead,
// so instance/history are optional.
export interface TaskDetailsResponse {
  task: WorkflowTask
  instance?: unknown
  history?: unknown[]
}
