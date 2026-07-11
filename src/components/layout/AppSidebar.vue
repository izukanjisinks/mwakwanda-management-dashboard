<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  LayoutDashboard,
  Monitor,
  Hotel,
  Theater,
  CalendarDays,
  UtensilsCrossed,
  ReceiptText,
  Users,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  ChevronUp,
  User2,
  BookOpen,
  FileText,
  GitBranch,
  Inbox,
  Network,
  CreditCard,
  ChefHat,
  IdCard,
} from 'lucide-vue-next'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { useBranchesStore } from '@/stores/branches'
import AccessDeniedDialog from '@/components/layout/AccessDeniedDialog.vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const branchFilterStore = useBranchFilterStore()
const branchesStore = useBranchesStore()
const { canAccess } = usePermissions()

const selectedBranchName = computed(() => {
  const id = branchFilterStore.selectedBranchId
  if (!id) return null
  return branchesStore.branches.find(b => b.id === id)?.name ?? null
})

const displayBranchLabel = computed(() => {
  if (authStore.userRole === 'admin') return selectedBranchName.value
  const user = authStore.user
  if (user?.branch_name) return user.branch_name
  if (user?.branch_id) return branchesStore.branches.find(b => b.id === user.branch_id)?.name ?? null
  return null
})

const accessDeniedOpen = ref(false)

function navigate(routeName: string) {
  if (!canAccess(routeName)) {
    accessDeniedOpen.value = true
    return
  }
  router.push({ name: routeName })
}

const adminNav = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, routeName: 'dashboard' },
      { title: 'Front Desk', icon: Monitor, routeName: 'front-desk' },
    ],
  },
  {
    label: 'Management',
    items: [
      { title: 'Rooms', icon: Hotel, routeName: 'rooms' },
      { title: 'Venues', icon: Theater, routeName: 'venues' },
      { title: 'Bookings', icon: CalendarDays, routeName: 'admin-bookings' },
      { title: 'Menus', icon: UtensilsCrossed, routeName: 'menus' },
      { title: 'Orders', icon: BookOpen, routeName: 'orders' },
      { title: 'Kitchen', icon: ChefHat, routeName: 'kitchen' },
      { title: 'Resident Meal Collection', icon: CreditCard, routeName: 'meal-sessions' },
      { title: 'Card Management', icon: IdCard, routeName: 'card-management' },
      { title: 'Invoices', icon: ReceiptText, routeName: 'admin-invoices' },
    ],
  },
  {
    label: 'Clients',
    items: [
      { title: 'Individual Clients', icon: Users, routeName: 'clients-individual' },
      { title: 'Corporate Clients', icon: Building2, routeName: 'clients-corporate' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { title: 'Reports', icon: BarChart3, routeName: 'reports' },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { title: 'Workflow Editor', icon: GitBranch, routeName: 'workflow' },
      { title: 'Task Inbox', icon: Inbox, routeName: 'workflow-tasks' },
    ],
  },
  {
    label: 'System',
    items: [
      { title: 'Branches & Users', icon: Network, routeName: 'org' },
      { title: 'Settings', icon: Settings, routeName: 'settings' },
    ],
  },
]

const clientNav = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, routeName: 'dashboard' },
    ],
  },
  {
    label: 'Bookings',
    items: [
      { title: 'Book a Room', icon: BookOpen, routeName: 'book' },
      { title: 'My Bookings', icon: CalendarDays, routeName: 'my-bookings' },
    ],
  },
  {
    label: 'Billing',
    items: [
      { title: 'My Invoices', icon: FileText, routeName: 'my-invoices' },
    ],
  },
]

const STAFF_ROLES = ['admin', 'branch_admin', 'manager', 'receptionist', 'cleaner']

const cleanerNav = [
  {
    label: 'Overview',
    items: [
      { title: 'My Dashboard', icon: LayoutDashboard, routeName: 'cleaner-dashboard' },
    ],
  },
  {
    label: 'Rooms',
    items: [
      { title: 'Rooms', icon: Hotel, routeName: 'rooms' },
    ],
  },
]

const navGroups = computed(() => {
  const groups =
    authStore.userRole === 'cleaner' ? cleanerNav
    : STAFF_ROLES.includes(authStore.userRole ?? '') ? adminNav
    : clientNav

  return groups
    .map(group => ({ ...group, items: group.items.filter(item => canAccess(item.routeName)) }))
    .filter(group => group.items.length > 0)
})

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <RouterLink :to="{ name: 'dashboard' }" class="flex flex-col items-center gap-2 py-4 px-2 group-data-[collapsible=icon]:hidden">
        <div class="size-16 rounded-xl bg-primary text-primary-foreground overflow-hidden flex items-center justify-center shrink-0">
          <img
            v-if="authStore.user?.org_logo_url"
            :src="authStore.user.org_logo_url"
            :alt="authStore.user.org_name"
            class="size-full object-cover"
          />
          <span v-else class="font-bold text-2xl">LM</span>
        </div>
        <div class="flex flex-col items-center gap-0.5 leading-none text-center">
          <span
            class="font-semibold transition-all"
            :class="displayBranchLabel ? 'text-xs text-muted-foreground' : 'text-sm'"
          >
            {{ authStore.user?.org_name || 'Lodge Management' }}
          </span>
          <span v-if="displayBranchLabel" class="font-semibold text-sm text-primary">
            {{ displayBranchLabel }}
          </span>
          <span class="text-xs text-muted-foreground">{{ authStore.roleLabel }}</span>
        </div>
      </RouterLink>
      <!-- Collapsed state: small icon only -->
      <SidebarMenu class="hidden group-data-[collapsible=icon]:flex">
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <RouterLink :to="{ name: 'dashboard' }">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground overflow-hidden shrink-0">
                <img
                  v-if="authStore.user?.org_logo_url"
                  :src="authStore.user.org_logo_url"
                  :alt="authStore.user.org_name"
                  class="size-full object-cover"
                />
                <span v-else class="font-bold text-sm">LM</span>
              </div>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup v-for="group in navGroups" :key="group.label">
        <SidebarGroupLabel>{{ group.label }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in group.items" :key="item.title">
              <SidebarMenuButton :tooltip="item.title" :is-active="route.name === item.routeName" @click="navigate(item.routeName)">
                <component :is="item.icon" />
                <span>{{ item.title }}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton size="lg">
                <User2 class="size-4" />
                <div class="flex flex-col gap-0.5 leading-none text-left overflow-hidden">
                  <span class="truncate font-medium text-sm">{{ authStore.user?.full_name || authStore.user?.email }}</span>
                  <span class="truncate text-xs text-muted-foreground">{{ authStore.roleLabel }}</span>
                </div>
                <ChevronUp class="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" class="w-(--reka-dropdown-menu-trigger-width)">
              <DropdownMenuItem @click="router.push({ name: 'profile' })" class="cursor-pointer">
                <User2 class="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                @click="handleLogout"
                class="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut class="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>

    <SidebarRail />
  </Sidebar>

  <AccessDeniedDialog v-model:open="accessDeniedOpen" />
</template>
