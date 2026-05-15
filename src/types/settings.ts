export interface OrgSettings {
  id: string
  org_id?: string
  auto_close_orders: boolean
  auto_extend_checkout: boolean
  created_at: string
  updated_at: string
}

export interface OrgSettingsPayload {
  auto_close_orders?: boolean
  auto_extend_checkout?: boolean
}
