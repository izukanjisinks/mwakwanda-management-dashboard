import { ref } from 'vue'
import { defineStore } from 'pinia'
import { rolesApi } from '@/services/api/users'
import type { Role } from '@/services/api/users'

export { type Role }

export const useRolesStore = defineStore('roles', () => {
  const roles = ref<Role[]>([])
  const loading = ref(false)
  const _fetched = ref(false)

  async function fetchRoles() {
    if (_fetched.value) return
    loading.value = true
    try {
      roles.value = await rolesApi.list()
      _fetched.value = true
    } catch {
      /* keep empty */
    } finally {
      loading.value = false
    }
  }

  function getRoleLabel(name: string): string {
    const role = roles.value.find(r => r.name === name)
    if (role?.display_name) return role.display_name
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  function getRoleBadgeVariant(name: string): 'default' | 'secondary' | 'outline' {
    if (name === 'admin') return 'default'
    if (name === 'manager') return 'secondary'
    return 'outline'
  }

  return { roles, loading, fetchRoles, getRoleLabel, getRoleBadgeVariant }
})
