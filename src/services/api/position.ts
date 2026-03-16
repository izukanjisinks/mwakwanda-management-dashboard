import { apiClient } from './client'

export interface Position {
  id: string
  title: string
  code: string
  description: string
  department_id: string
  department_name?: string
  role_id: string
  grade_level: string
  base_salary: number
  housing_allowance: number
  transport_allowance: number
  medical_allowance: number
  income_tax: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GetPositionsResponse {
  data: Position[]
  page: number
  page_size: number
  total: number
}

export interface CreatePositionPayload {
  title: string
  code: string
  department_id: string
  role_id: string
  grade_level: string
  base_salary: number
  description?: string
}

export interface UpdatePositionPayload {
  title?: string
  code?: string
  department_id?: string
  role_id?: string
  grade_level?: string
  base_salary?: number
  description?: string
}

export const positionApi = {
  async getPositions(params?: {
    page?: number
    page_size?: number
    department_id?: string
    grade_level?: string
    is_active?: boolean
  }): Promise<GetPositionsResponse> {
    return apiClient.get('/hr/positions', { params })
  },

  async getPosition(id: string): Promise<Position> {
    return apiClient.get(`/hr/positions/${id}`)
  },

  async createPosition(payload: CreatePositionPayload): Promise<Position> {
    return apiClient.post('/hr/positions', payload)
  },

  async updatePosition(id: string, payload: UpdatePositionPayload): Promise<Position> {
    return apiClient.put(`/hr/positions/${id}`, payload)
  },

  async deletePosition(id: string): Promise<void> {
    return apiClient.delete(`/hr/positions/${id}`)
  },
}
