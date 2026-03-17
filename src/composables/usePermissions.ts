import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/auth'

// Map each route name to which roles are allowed to access it
const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  dashboard:          ['admin', 'manager', 'receptionist', 'cleaner'],
  rooms:              ['admin', 'manager', 'receptionist', 'cleaner'],
  'admin-bookings':   ['admin', 'manager', 'receptionist'],
  meals:              ['admin', 'manager', 'receptionist'],
  'admin-invoices':   ['admin', 'manager', 'receptionist'],
  'clients-individual': ['admin', 'manager', 'receptionist'],
  'clients-corporate':  ['admin', 'manager', 'receptionist'],
  reports:            ['admin', 'manager'],
  workflow:           ['admin'],
  'workflow-tasks':   ['admin', 'manager', 'receptionist'],
  users:              ['admin'],
}

export function usePermissions() {
  const authStore = useAuthStore()

  const role = computed(() => authStore.userRole as UserRole | null)

  function canAccess(routeName: string): boolean {
    if (!role.value) return false
    // Client routes — always allowed for client roles
    if (role.value === 'client_individual' || role.value === 'client_corporate') return true
    const allowed = ROUTE_PERMISSIONS[routeName]
    if (!allowed) return true // unknown route — allow by default
    return allowed.includes(role.value)
  }

  return { canAccess }
}
