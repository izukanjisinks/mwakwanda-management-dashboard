import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBackofficeStore } from '@/stores/backoffice'
import type { UserRole } from '@/types/auth'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { toast } from 'vue-sonner'

NProgress.configure({ showSpinner: false, speed: 300, minimum: 0.1 })

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresBackofficeAuth?: boolean
    guestOnly?: boolean
    backofficeGuestOnly?: boolean
    roles?: UserRole[]
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false, guestOnly: true },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('@/views/auth/ChangePasswordView.vue'),
      meta: { requiresAuth: true },
    },
    // Full-screen kiosk takeover for resident-facing meal collection — kept
    // outside AuthenticatedLayout deliberately so it renders with no sidebar
    // or header chrome for a resident to fiddle with.
    {
      path: '/meal-sessions/:sessionId/kiosk',
      name: 'meal-session-kiosk',
      component: () => import('@/views/admin/meals/MealCollectKioskView.vue'),
      meta: { requiresAuth: true, roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
    },

    // Authenticated — all share the sidebar layout
    {
      path: '/',
      component: () => import('@/layouts/AuthenticatedLayout.vue'),
      meta: { requiresAuth: true },
      redirect: '/dashboard',
      children: [
        // Shared
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('@/views/profile/ProfileView.vue'),
        },

        // Cleaner dashboard
        {
          path: 'cleaner',
          name: 'cleaner-dashboard',
          component: () => import('@/views/cleaner/CleanerDashboardView.vue'),
          meta: { roles: ['cleaner'] },
        },

        // --- Admin / Staff routes ---
        {
          path: 'rooms',
          name: 'rooms',
          component: () => import('@/views/admin/rooms/RoomsView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist', 'cleaner'] },
        },
        {
          path: 'venues',
          name: 'venues',
          component: () => import('@/views/admin/venues/VenuesView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'front-desk',
          name: 'front-desk',
          component: () => import('@/views/admin/frontdesk/FrontDeskView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'bookings',
          name: 'admin-bookings',
          component: () => import('@/views/admin/bookings/BookingsView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'bookings/new',
          name: 'admin-booking-new',
          component: () => import('@/views/admin/bookings/NewWalkInBookingView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'menus',
          name: 'menus',
          component: () => import('@/views/admin/menus/MenusView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/admin/orders/OrdersView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'kitchen',
          name: 'kitchen',
          component: () => import('@/views/admin/orders/KitchenView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'meal-sessions',
          name: 'meal-sessions',
          component: () => import('@/views/admin/meals/MealSessionsView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'meal-sessions/:sessionId/collect',
          name: 'meal-session-collect',
          component: () => import('@/views/admin/meals/MealCollectView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'cards',
          name: 'card-management',
          component: () => import('@/views/admin/meals/CardManagementView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'invoices',
          name: 'admin-invoices',
          component: () => import('@/views/admin/invoices/InvoicesView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'clients/individual',
          name: 'clients-individual',
          component: () => import('@/views/admin/clients/IndividualClientsView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'clients/corporate',
          name: 'clients-corporate',
          component: () => import('@/views/admin/clients/CorporateClientsView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/admin/reports/ReportsView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager'] },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/admin/users/UsersView.vue'),
          meta: { roles: ['admin', 'branch_admin'] },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/admin/settings/SettingsView.vue'),
          meta: { roles: ['admin', 'branch_admin'] },
        },
        {
          path: 'lodge-profile',
          name: 'lodge-profile',
          component: () => import('@/views/admin/settings/LodgeProfileView.vue'),
          meta: { roles: ['admin', 'branch_admin'] },
        },
        {
          path: 'audit-logs',
          name: 'audit-logs',
          component: () => import('@/views/admin/settings/AuditLogsView.vue'),
          meta: { roles: ['admin', 'branch_admin'] },
        },
        {
          path: 'password-policy',
          name: 'password-policy',
          component: () => import('@/views/admin/settings/PasswordPolicyView.vue'),
          meta: { roles: ['admin', 'branch_admin'] },
        },
        {
          path: 'workflow',
          name: 'workflow',
          component: () => import('@/views/admin/workflow/WorkflowsListView.vue'),
          meta: { roles: ['admin', 'branch_admin'] },
        },
        {
          path: 'workflow/tasks',
          name: 'workflow-tasks',
          component: () => import('@/views/admin/workflow/TasksView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'workflow/tasks/:id',
          name: 'workflow-task-detail',
          component: () => import('@/views/admin/workflow/TaskDetailView.vue'),
          meta: { roles: ['admin', 'branch_admin', 'manager', 'receptionist'] },
        },
        {
          path: 'workflow/:id',
          name: 'workflow-editor',
          component: () => import('@/views/admin/workflow/WorkflowView.vue'),
          meta: { roles: ['admin', 'branch_admin'] },
        },

        // --- Branch & Users management ---
        {
          path: 'org',
          name: 'org',
          component: () => import('@/views/admin/org/OrgView.vue'),
          meta: { roles: ['admin', 'branch_admin'] },
        },
        {
          path: 'branches/:id',
          name: 'branch-detail',
          component: () => import('@/views/admin/branches/BranchDetailView.vue'),
          meta: { roles: ['admin', 'branch_admin'] },
        },

        // --- Client routes ---
        {
          path: 'book',
          name: 'book',
          component: () => import('@/views/client/bookings/NewBookingView.vue'),
          meta: { roles: ['client_individual', 'client_corporate'] },
        },
        {
          path: 'my-bookings',
          name: 'my-bookings',
          component: () => import('@/views/client/bookings/MyBookingsView.vue'),
          meta: { roles: ['client_individual', 'client_corporate'] },
        },
        {
          path: 'my-invoices',
          name: 'my-invoices',
          component: () => import('@/views/client/invoices/MyInvoicesView.vue'),
          meta: { roles: ['client_individual', 'client_corporate'] },
        },
      ],
    },

    // ── Backoffice (Platform Admin) ──────────────────────────────────────────
    {
      path: '/backoffice/login',
      name: 'backoffice-login',
      component: () => import('@/views/backoffice/LoginView.vue'),
      meta: { backofficeGuestOnly: true },
    },
    {
      path: '/backoffice/change-password',
      name: 'backoffice-change-password',
      component: () => import('@/views/backoffice/ChangePasswordView.vue'),
      meta: { requiresBackofficeAuth: true },
    },
    {
      path: '/backoffice',
      component: () => import('@/layouts/BackofficeLayout.vue'),
      meta: { requiresBackofficeAuth: true },
      redirect: '/backoffice/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'backoffice-dashboard',
          component: () => import('@/views/backoffice/DashboardView.vue'),
        },
        {
          path: 'organizations',
          name: 'backoffice-organizations',
          component: () => import('@/views/backoffice/OrganizationsView.vue'),
        },
        {
          path: 'provisioning',
          name: 'backoffice-provisioning',
          component: () => import('@/views/backoffice/ProvisionView.vue'),
        },
        {
          path: 'admins',
          name: 'backoffice-admins',
          component: () => import('@/views/backoffice/PlatformAdminsView.vue'),
        },
      ],
    },

    // Catch-all
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

const BACKOFFICE_TOKEN_KEY = 'lodge_backoffice_token'

router.afterEach(() => NProgress.done())
router.onError(() => NProgress.done())

// Navigation guard
router.beforeEach(async (to) => {
  NProgress.start()
  const authStore = useAuthStore()

  // ── Backoffice routes ─────────────────────────────────────────────────────
  if (to.meta.requiresBackofficeAuth || to.meta.backofficeGuestOnly) {
    const backofficeToken = localStorage.getItem(BACKOFFICE_TOKEN_KEY)
    const isBackofficeAuthenticated = !!backofficeToken

    if (to.meta.backofficeGuestOnly && isBackofficeAuthenticated) {
      return { name: 'backoffice-dashboard' }
    }

    if (to.meta.requiresBackofficeAuth && !isBackofficeAuthenticated) {
      return { name: 'backoffice-login', query: { redirect: to.fullPath } }
    }

    // Hydrate backoffice user on page reload
    const backofficeStore = useBackofficeStore()
    if (backofficeToken && !backofficeStore.user) {
      await backofficeStore.fetchMe()
    }

    // Force password change for backoffice users
    if (
      backofficeStore.user?.change_password &&
      to.name !== 'backoffice-change-password'
    ) {
      return { name: 'backoffice-change-password' }
    }

    return
  }

  // ── Staff routes ──────────────────────────────────────────────────────────
  if (authStore.token && !authStore.user) {
    await authStore.fetchCurrentUser()
  }

  const requiresAuth = to.meta.requiresAuth !== false
  const guestOnly = to.meta.guestOnly === true
  const roles = to.meta.roles

  if (requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' }
  }

  // Force password change before accessing anything else
  if (
    authStore.isAuthenticated &&
    authStore.user?.change_password &&
    to.name !== 'change-password'
  ) {
    return { name: 'change-password' }
  }

  if (roles && authStore.userRole && !roles.includes(authStore.userRole)) {
    toast.error('You do not have permission to access that page.')
    const role = authStore.userRole
    if (role === 'cleaner') return { name: 'cleaner-dashboard' }
    if (role === 'client_individual' || role === 'client_corporate') return { name: 'book' }
    return { name: 'dashboard' }
  }
})

export default router
