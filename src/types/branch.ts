export interface Branch {
  id: string
  org_id: string
  branch_code: string
  name: string
  street_address: string
  city: string
  country: string
  location?: string
  phone?: string | null
  email?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BranchPayload {
  branch_code: string
  name: string
  street_address: string
  city: string
  country: string
  location?: string
  phone?: string
  email?: string
  is_active?: boolean
}

export interface PaginatedBranches {
  data: Branch[]
  page: number
  page_size: number
  total: number
}
