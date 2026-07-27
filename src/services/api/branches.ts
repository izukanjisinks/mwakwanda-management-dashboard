import { apiClient } from './client'
import type { Branch, BranchPayload, PaginatedBranches } from '@/types/branch'

function extractTime(val: string | null | undefined): string | null {
  if (!val) return null
  const m = val.match(/(\d{2}:\d{2})/)
  return m?.[1] ?? null
}

function sanitizeTimes<T extends Partial<Pick<BranchPayload, 'check_in_time' | 'check_out_time'>>>(payload: T): T {
  return {
    ...payload,
    ...(payload.check_in_time  !== undefined && { check_in_time:  extractTime(payload.check_in_time)  }),
    ...(payload.check_out_time !== undefined && { check_out_time: extractTime(payload.check_out_time) }),
  }
}

export const branchesApi = {
  list: () =>
    apiClient.get<PaginatedBranches | Branch[]>('/branches'),

  get: (id: string) =>
    apiClient.get<Branch>(`/branches/${id}`),

  create: (payload: BranchPayload) =>
    apiClient.post<Branch>('/branches', sanitizeTimes(payload)),

  update: (id: string, payload: Partial<BranchPayload>) =>
    apiClient.put<Branch>(`/branches/${id}`, sanitizeTimes(payload)),

  delete: (id: string) =>
    apiClient.delete<void>(`/branches/${id}`),

  testPrint: (id: string) =>
    apiClient.post<{ message: string }>(`/branches/${id}/printer/test`),
}
