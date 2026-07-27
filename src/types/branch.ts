export interface Branch {
  id: string
  org_id: string
  branch_code: string
  name: string
  is_main?: boolean
  street_address: string
  city: string
  country: string
  location?: string | null
  phone?: string | null
  email?: string | null
  parking?: boolean | null
  restaurant?: boolean | null
  check_in_time?: string | null
  check_out_time?: string | null
  // Receipt printer — one physical printer per branch (e.g. Epson TM-T88VI over
  // Ethernet). printer_ip null/empty means no printer is configured yet.
  printer_ip?: string | null
  printer_port: number
  printer_name?: string | null
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
  location?: string | null
  phone?: string
  email?: string
  parking?: boolean
  restaurant?: boolean
  check_in_time?: string | null
  check_out_time?: string | null
  printer_ip?: string | null
  printer_port?: number
  printer_name?: string | null
  is_active?: boolean
}

export interface PaginatedBranches {
  data: Branch[]
  page: number
  page_size: number
  total: number
}
