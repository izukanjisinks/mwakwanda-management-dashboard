import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/types/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
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

        // --- Admin routes ---
        {
          path: 'rooms',
          name: 'rooms',
          component: () => import('@/views/admin/rooms/RoomsView.vue'),
          meta: { roles: ['admin'] },
        },
        {
          path: 'bookings',
          name: 'admin-bookings',
          component: () => import('@/views/admin/bookings/BookingsView.vue'),
          meta: { roles: ['admin'] },
        },
        {
          path: 'meals',
          name: 'meals',
          component: () => import('@/views/admin/meals/MealsView.vue'),
          meta: { roles: ['admin'] },
        },
        {
          path: 'invoices',
          name: 'admin-invoices',
          component: () => import('@/views/admin/invoices/InvoicesView.vue'),
          meta: { roles: ['admin'] },
        },
        {
          path: 'clients/individual',
          name: 'clients-individual',
          component: () => import('@/views/admin/clients/IndividualClientsView.vue'),
          meta: { roles: ['admin'] },
        },
        {
          path: 'clients/corporate',
          name: 'clients-corporate',
          component: () => import('@/views/admin/clients/CorporateClientsView.vue'),
          meta: { roles: ['admin'] },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/admin/reports/ReportsView.vue'),
          meta: { roles: ['admin'] },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/admin/users/UsersView.vue'),
          meta: { roles: ['admin'] },
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

    // Catch-all
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

// Navigation guard
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

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

  // Role-based access control
  if (roles && authStore.userRole && !roles.includes(authStore.userRole)) {
    return { name: 'dashboard' }
  }
})

export default router
