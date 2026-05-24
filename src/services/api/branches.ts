import { apiClient } from './client'
import type { Branch, BranchPayload, PaginatedBranches } from '@/types/branch'

export const branchesApi = {
  list: () =>
    apiClient.get<PaginatedBranches | Branch[]>('/branches'),

  get: (id: string) =>
    apiClient.get<Branch>(`/branches/${id}`),

  create: (payload: BranchPayload) =>
    apiClient.post<Branch>('/branches', payload),

  update: (id: string, payload: Partial<BranchPayload>) =>
    apiClient.put<Branch>(`/branches/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete<void>(`/branches/${id}`),
}
