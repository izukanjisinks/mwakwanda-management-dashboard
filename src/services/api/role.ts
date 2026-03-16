import { apiClient } from './client'
import type { Role } from '@/types/role'

export const roleApi = {
  async getRoles(): Promise<Role[]> {
    return apiClient.get('/roles')
  },
}
