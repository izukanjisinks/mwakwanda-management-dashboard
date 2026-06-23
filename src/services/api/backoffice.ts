import { backofficeClient } from './backofficeClient'
import type {
  BackofficeLoginResponse,
  BackofficeUser,
  Organisation,
  ProvisionPayload,
} from '@/types/backoffice'

export interface PaginatedResponse<T> {
  data: T[] | null
  page: number
  page_size: number
  total: number
}

export const backofficeApi = {
  // Auth
  login: (email: string, password: string) =>
    backofficeClient.post<BackofficeLoginResponse>('/auth/login', { email, password }),

  me: () =>
    backofficeClient.get<BackofficeUser>('/auth/me'),

  changePassword: (old_password: string, new_password: string) =>
    backofficeClient.post<void>('/auth/change-password', { old_password, new_password }),

  // Organizations
  listOrganisations: (params?: { page?: number; page_size?: number; search?: string }) =>
    backofficeClient.get<PaginatedResponse<Organisation>>('/organizations', params as any),

  getOrganisation: (id: string) =>
    backofficeClient.get<Organisation>(`/organizations/${id}`),

  updateOrganisation: (id: string, data: Partial<Organisation>) =>
    backofficeClient.patch<Organisation>(`/organizations/${id}`, data),

  toggleOrganisationStatus: (id: string, is_active: boolean) =>
    backofficeClient.patch<Organisation>(`/organizations/${id}/status`, { is_active }),

  deleteOrganisation: (id: string) =>
    backofficeClient.delete<void>(`/organizations/${id}`),

  // Provisioning
  provision: (payload: ProvisionPayload) =>
    backofficeClient.post<{ message: string; organization: Organisation }>('/organizations/provision', payload),

  // Platform admins
  listAdmins: (params?: { page?: number; page_size?: number; search?: string }) =>
    backofficeClient.get<PaginatedResponse<BackofficeUser>>('/users', params as any),

  createAdmin: (data: { full_name: string; email: string }) =>
    backofficeClient.post<BackofficeUser>('/users', data),

  toggleAdminLock: (id: string, is_locked: boolean) =>
    backofficeClient.patch<BackofficeUser>(`/users/${id}/lock`, { is_locked }),

  resetAdminPassword: (id: string) =>
    backofficeClient.post<{ message: string }>(`/users/${id}/reset-password`),

  deleteAdmin: (id: string) =>
    backofficeClient.delete<void>(`/users/${id}`),
}
