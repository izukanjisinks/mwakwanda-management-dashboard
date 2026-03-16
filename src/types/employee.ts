export interface Employee {
  id: string
  user_id: string
  employee_number: string
  first_name: string
  last_name: string
  email: string
  personal_email: string
  phone: string
  date_of_birth: string
  gender: string
  national_id: string
  marital_status: string
  address: string
  city: string
  state: string
  country: string
  department_id: string
  department_name?: string
  position_id: string
  position_name?: string
  manager_id: string | null
  manager_name?: string
  hire_date: string
  employment_type: string
  employment_status: string
  termination_reason: string
  profile_photo_url: string
  created_at: string
  updated_at: string
}

export interface CreateEmployeePayload {
  employee_number: string
  first_name: string
  last_name: string
  email: string
  personal_email?: string
  phone: string
  date_of_birth: string
  gender: string
  national_id: string
  marital_status?: string
  address?: string
  city: string
  state?: string
  country: string
  department_id: string
  position_id: string
  manager_id?: string | null
  hire_date: string
  employment_type: string
  employment_status: string
  password: string
}

export interface UpdateEmployeePayload extends Partial<CreateEmployeePayload> {
  termination_reason?: string
  profile_photo_url?: string
}

export interface GetEmployeesResponse {
  data: Employee[]
  page: number
  page_size: number
  total: number
}
