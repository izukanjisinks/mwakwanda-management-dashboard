export interface LeaveType {
  id: string
  name: string
  code: string
  description: string
  default_days_per_year: number
  is_paid: boolean
  is_carry_forward_allowed: boolean
  max_carry_forward_days: number
  requires_approval: boolean
  requires_document: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type_id: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  reviewed_by?: string
  reviewed_at?: string
  review_comment: string
  attachment_url: string
  created_at: string
  updated_at: string
  leave_type: LeaveType
}

export interface LeaveRequestsResponse {
  data: LeaveRequest[]
  pagination: {
    current_page: number
    page_size: number
    total_items: number
    total_pages: number
  }
}

export interface CreateLeaveRequestPayload {
  leave_type_id: string
  start_date: string
  end_date: string
  reason: string
}
