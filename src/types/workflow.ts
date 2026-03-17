export type StepType = 'initial' | 'middle' | 'final'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'rejected'

// ── Workflow definition ──────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string
  workflow_id: string
  step_name: string
  step_order: number
  step_type: StepType
  allowed_roles: string[]      // system user roles e.g. 'admin', 'manager', 'receptionist'
  requires_all_approvers: boolean
  min_approvals: number
  created_at: string
}

export interface WorkflowTransition {
  id: string
  workflow_id: string
  from_step_id: string
  to_step_id: string
  action_name: string          // e.g. 'confirm', 'reject', 'check_in'
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

export interface BookingTaskDetails {
  booking_id: number
  room_name: string
  client_name: string
  client_type: string
  check_in: string
  check_out: string
  guests: number
  meal_plan_name: string | null
  total_amount: number
  special_requests?: string
}

export interface WorkflowTask {
  id: string
  instance_id: string
  booking_id: number
  step_id: string
  step_name: string
  assigned_to: string          // user id
  assigned_by: string
  status: TaskStatus
  due_date: string
  comments?: string
  booking_details: BookingTaskDetails
  created_at: string
  updated_at: string
}

export interface ProcessTaskPayload {
  action: string
  comments?: string
}
