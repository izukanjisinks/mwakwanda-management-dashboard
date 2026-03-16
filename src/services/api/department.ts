import { apiClient } from './client'

export interface Department {
  id: string
  name: string
  code: string
  description: string
  parent_department_id: string | null
  parent_department_name?: string
  manager_id: string | null
  manager_name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface GetDepartmentsResponse {
  data: Department[]
  page: number
  page_size: number
  total: number
}

export interface CreateDepartmentPayload {
  name: string
  code: string
  description?: string
  parent_department_id?: string | null
  manager_id?: string | null
}

export interface UpdateDepartmentPayload {
  name?: string
  code?: string
  description?: string
  parent_department_id?: string | null
  manager_id?: string | null
}

export interface DepartmentTreeNode extends Department {
  children?: DepartmentTreeNode[]
}

export const departmentApi = {
  async getDepartments(params?: {
    page?: number
    page_size?: number
    search?: string
    is_active?: boolean
  }): Promise<GetDepartmentsResponse> {
    return apiClient.get('/hr/departments', { params })
  },

  async getDepartmentTree(): Promise<DepartmentTreeNode[]> {
    return apiClient.get('/hr/departments/tree')
  },

  async getDepartment(id: string): Promise<Department> {
    return apiClient.get(`/hr/departments/${id}`)
  },

  async createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
    return apiClient.post('/hr/departments', payload)
  },

  async updateDepartment(id: string, payload: UpdateDepartmentPayload): Promise<Department> {
    return apiClient.put(`/hr/departments/${id}`, payload)
  },

  async deleteDepartment(id: string): Promise<void> {
    return apiClient.delete(`/hr/departments/${id}`)
  },
}
