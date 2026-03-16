import { apiClient } from './client'
import type {
  IndividualClient,
  IndividualClientPayload,
  CorporateClient,
  CorporateClientPayload,
} from '@/types/client'

export const individualClientApi = {
  list: () => apiClient.get<IndividualClient[]>('/clients/individual'),
  get: (id: number) => apiClient.get<IndividualClient>(`/clients/individual/${id}`),
  create: (payload: IndividualClientPayload) => apiClient.post<IndividualClient>('/clients/individual', payload),
  update: (id: number, payload: Partial<IndividualClientPayload>) => apiClient.put<IndividualClient>(`/clients/individual/${id}`, payload),
  delete: (id: number) => apiClient.delete<void>(`/clients/individual/${id}`),
}

export const corporateClientApi = {
  list: () => apiClient.get<CorporateClient[]>('/clients/corporate'),
  get: (id: number) => apiClient.get<CorporateClient>(`/clients/corporate/${id}`),
  create: (payload: CorporateClientPayload) => apiClient.post<CorporateClient>('/clients/corporate', payload),
  update: (id: number, payload: Partial<CorporateClientPayload>) => apiClient.put<CorporateClient>(`/clients/corporate/${id}`, payload),
  delete: (id: number) => apiClient.delete<void>(`/clients/corporate/${id}`),
}
