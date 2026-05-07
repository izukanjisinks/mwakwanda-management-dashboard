import { apiClient } from './client'
import type { PaginatedAuditLogs } from '@/types/audit-log'

export interface AuditLogParams extends Record<string, string | number | boolean | undefined> {
  page?: number
  page_size?: number
  action?: string
  entity_type?: string
  entity_id?: string
  from?: string
  to?: string
}

export const auditLogsApi = {
  list: (params?: AuditLogParams) =>
    apiClient.get<PaginatedAuditLogs>('/audit-logs', { params }),
}
