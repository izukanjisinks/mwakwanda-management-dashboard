import { apiClient } from './client'
import type { LeaveRequestsResponse, LeaveType, CreateLeaveRequestPayload, LeaveRequest } from '@/types/leave'

export const leaveApi = {
  getMyLeaveRequests(page?: number, pageSize?: number): Promise<LeaveRequestsResponse> {
    const params = page && pageSize ? `?page=${page}&page_size=${pageSize}` : ''
    return apiClient.get<LeaveRequestsResponse>(`/hr/leave-requests/me${params}`)
  },

  getAllLeaveRequests(params?: {
    status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
  }): Promise<LeaveRequestsResponse> {
    return apiClient.get<LeaveRequestsResponse>('/hr/leave-requests', { params })
  },

  getLeaveTypes(): Promise<LeaveType[]> {
    return apiClient.get<LeaveType[]>('/hr/leave-types')
  },

  createLeaveRequest(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
    return apiClient.post<LeaveRequest>('/hr/leave-requests', payload)
  },
}
