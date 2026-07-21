import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/auth'

// Map each route name to which roles are allowed to access it.
// Must stay in sync with meta.roles in router/index.ts.
const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Staff shared
  dashboard:            ['admin', 'branch_admin', 'manager', 'receptionist', 'cleaner'],
  'cleaner-dashboard':  ['cleaner'],
  rooms:                ['admin', 'branch_admin', 'manager', 'receptionist', 'cleaner'],
  'room-status':        ['admin', 'branch_admin', 'manager', 'receptionist'],

  // Management
  'admin-bookings':     ['admin', 'branch_admin', 'manager', 'receptionist'],
  menus:                ['admin', 'branch_admin', 'manager', 'receptionist'],
  orders:               ['admin', 'branch_admin', 'manager', 'receptionist'],
  kitchen:              ['admin', 'branch_admin', 'manager', 'receptionist'],
  bar:                  ['admin', 'branch_admin', 'manager', 'receptionist'],
  'meal-sessions':          ['admin', 'branch_admin', 'manager', 'receptionist'],
  'meal-session-collect':   ['admin', 'branch_admin', 'manager', 'receptionist'],
  'meal-session-kiosk':     ['admin', 'branch_admin', 'manager', 'receptionist'],
  'card-management':        ['admin', 'branch_admin', 'manager', 'receptionist'],
  'admin-invoices':     ['admin', 'branch_admin', 'manager', 'receptionist'],
  'clients-individual': ['admin', 'branch_admin', 'manager', 'receptionist'],
  'clients-corporate':  ['admin', 'branch_admin', 'manager', 'receptionist'],

  // Admin + branch_admin + manager
  reports:              ['admin', 'branch_admin', 'manager'],

  // Admin + branch_admin
  users:                ['admin', 'branch_admin'],
  settings:             ['admin', 'branch_admin'],
  'lodge-profile':      ['admin', 'branch_admin'],
  'audit-logs':         ['admin', 'branch_admin'],
  workflow:             ['admin', 'branch_admin'],
  'workflow-editor':    ['admin', 'branch_admin'],
  org:                  ['admin', 'branch_admin'],
  'branch-detail':      ['admin', 'branch_admin'],

  // Admin + branch_admin + manager + receptionist
  'workflow-tasks':     ['admin', 'branch_admin', 'manager', 'receptionist'],

  // Client only
  book:                 ['client_individual', 'client_corporate'],
  'my-bookings':        ['client_individual', 'client_corporate'],
  'my-invoices':        ['client_individual', 'client_corporate'],
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
