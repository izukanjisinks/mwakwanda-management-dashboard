export type ClientStatus = 'active' | 'inactive'

export interface IndividualClient {
  id: number
  full_name: string
  email: string
  phone: string
  id_passport_number: string
  nationality: string
  status: ClientStatus
  notes?: string
  created_at: string
}

export interface IndividualClientPayload {
  full_name: string
  email: string
  phone: string
  id_passport_number: string
  nationality: string
  status: ClientStatus
  notes?: string
}

export interface CorporateClient {
  id: number
  company_name: string
  contact_person: string
  email: string
  phone: string
  company_reg_number: string
  industry: string
  status: ClientStatus
  notes?: string
  created_at: string
}

export interface CorporateClientPayload {
  company_name: string
  contact_person: string
  email: string
  phone: string
  company_reg_number: string
  industry: string
  status: ClientStatus
  notes?: string
}
