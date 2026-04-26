import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBackofficeStore } from '@/stores/backoffice'
import type { UserRole } from '@/types/auth'

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
        },

        // --- Admin / Staff routes ---
        {
          path: 'rooms',
          name: 'rooms',
          component: () => import('@/views/admin/rooms/RoomsView.vue'),
        },
        {
          path: 'bookings',
          name: 'admin-bookings',
          component: () => import('@/views/admin/bookings/BookingsView.vue'),
        },
        {
          path: 'meals',
          name: 'meals',
          component: () => import('@/views/admin/meals/MealsView.vue'),
        },
        {
          path: 'invoices',
          name: 'admin-invoices',
          component: () => import('@/views/admin/invoices/InvoicesView.vue'),
        },
        {
          path: 'clients/individual',
          name: 'clients-individual',
          component: () => import('@/views/admin/clients/IndividualClientsView.vue'),
        },
        {
          path: 'clients/corporate',
          name: 'clients-corporate',
          component: () => import('@/views/admin/clients/CorporateClientsView.vue'),
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/admin/reports/ReportsView.vue'),
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/admin/users/UsersView.vue'),
        },
        {
          path: 'workflow',
          name: 'workflow',
          component: () => import('@/views/admin/workflow/WorkflowsListView.vue'),
        },
        {
          path: 'workflow/:id',
          name: 'workflow-editor',
          component: () => import('@/views/admin/workflow/WorkflowView.vue'),
        },
        {
          path: 'workflow/tasks',
          name: 'workflow-tasks',
          component: () => import('@/views/admin/workflow/TasksView.vue'),
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

// Navigation guard
router.beforeEach(async (to) => {
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
    return { name: 'dashboard' }
  }
})

export default router
