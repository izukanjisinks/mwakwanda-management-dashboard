import { apiClient } from './client'
import type { Employee, GetEmployeesResponse, CreateEmployeePayload, UpdateEmployeePayload } from '@/types/employee'

export const employeeApi = {
  async getEmployees(queryParams?: {
    page?: number
    page_size?: number
    search?: string
    status?: string
    type?: string
    department_id?: string
    position_id?: string
  }): Promise<GetEmployeesResponse> {
    return apiClient.get('/hr/employees', { params: queryParams })
  },

  async getEmployee(id: string): Promise<Employee> {
    return apiClient.get(`/hr/employees/${id}`)
  },

  async createEmployee(payload: CreateEmployeePayload): Promise<Employee> {
    return apiClient.post('/hr/employees', payload)
  },

  async updateEmployee(id: string, payload: UpdateEmployeePayload): Promise<Employee> {
    return apiClient.put(`/hr/employees/${id}`, payload)
  },

  async deleteEmployee(id: string): Promise<void> {
    return apiClient.delete(`/hr/employees/${id}`)
  },

  async getManagersByDepartment(departmentId: string): Promise<Employee[]> {
    return apiClient.get(`/hr/departments/${departmentId}/managers`)
  },
}
