import { apiClient } from './client'
import type {
  IndividualClient,
  IndividualClientPayload,
  CorporateClient,
  CorporateClientPayload,
  PaginatedIndividualClients,
  PaginatedCorporateClients,
} from '@/types/client'

export interface ClientListParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  status?: string
  search?: string
}

export const individualClientApi = {
  list: (params?: ClientListParams) =>
    apiClient.get<PaginatedIndividualClients>('/clients/individual', { params }),

  get: (id: string) =>
    apiClient.get<IndividualClient>(`/clients/individual/${id}`),

  create: (payload: IndividualClientPayload) =>
    apiClient.post<IndividualClient>('/clients/individual', payload),

  update: (id: string, payload: Partial<IndividualClientPayload>) =>
    apiClient.put<IndividualClient>(`/clients/individual/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<void>(`/clients/individual/${id}`),
}

export const corporateClientApi = {
  list: (params?: ClientListParams) =>
    apiClient.get<PaginatedCorporateClients>('/clients/corporate', { params }),

  get: (id: string) =>
    apiClient.get<CorporateClient>(`/clients/corporate/${id}`),

  create: (payload: CorporateClientPayload) =>
    apiClient.post<CorporateClient>('/clients/corporate', payload),

  update: (id: string, payload: Partial<CorporateClientPayload>) =>
    apiClient.put<CorporateClient>(`/clients/corporate/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<void>(`/clients/corporate/${id}`),
}
