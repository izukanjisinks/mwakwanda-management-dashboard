export type ClientStatus = 'active' | 'inactive'

export interface IndividualClient {
  id: string
  full_name: string
  email: string
  phone: string
  id_passport_number: string
  nationality?: string
  status: ClientStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface IndividualClientPayload {
  full_name: string
  email: string
  phone: string
  id_passport_number: string
  nationality?: string
  status: ClientStatus
  notes?: string
}

export interface CorporateClient {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  company_reg_number: string
  industry?: string
  status: ClientStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface CorporateClientPayload {
  company_name: string
  contact_person: string
  email: string
  phone: string
  company_reg_number: string
  industry?: string
  status: ClientStatus
  notes?: string
}

export interface PaginatedIndividualClients {
  data: IndividualClient[]
  page: number
  page_size: number
  total: number
}

export interface PaginatedCorporateClients {
  data: CorporateClient[]
  page: number
  page_size: number
  total: number
}
