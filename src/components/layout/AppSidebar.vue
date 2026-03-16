<script setup lang="ts">
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CalendarDays,
  ClockAlert,
  CalendarOff,
  DollarSign,
  FileText,
  UserSearch,
  TrendingUp,
  GitBranch,
  CheckSquare,
  ShieldCheck,
  LogOut,
  ChevronUp,
  User2,
  RotateCcw,
  Mail,
  UserCog2Icon,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import hrLogo from '@/assets/logo/hr-logo-sm.jpg'
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
const authStore = useAuthStore()

const navGroups = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, routeName: 'dashboard' },
    ],
  },
  {
    label: 'People',
    items: [
      { title: 'Employees', icon: Users, routeName: 'employees' },
      { title: 'Departments', icon: Building2, routeName: 'departments' },
      { title: 'Positions', icon: Briefcase, routeName: 'positions' },
    ],
  },
  {
    label: 'Leave Requests & Approvals',
    items: [
      { title: 'Leave Requests', icon: CalendarDays, routeName: 'leave' },
      { title: 'Leave Approvals', icon: CheckSquare, routeName: 'approvals' },
      // { title: 'Attendance', icon: ClockAlert, routeName: 'attendance' },
      // { title: 'Holidays', icon: CalendarOff, routeName: 'holidays' },
    ],
  },
  {
    label: 'Payroll',
    items: [
       { title: 'Payroll Runs', icon: DollarSign, routeName: 'payroll' },
      { title: 'Payslips', icon: FileText, routeName: 'payslips' },
    ],
  },
  // {
  //   label: 'Recruitment',
  //   items: [
  //     { title: 'Recruitment', icon: UserSearch, routeName: 'recruitment' },
  //   ],
  // },
  // {
  //   label: 'Performance',
  //   items: [
  //     { title: 'Performance', icon: TrendingUp, routeName: 'performance' },
  //   ],
  // },
  // {
  //   label: 'Password Management',
  //   items: [
      
  //     { title: 'Password Reset Requests', icon: RotateCcw, routeName: 'password-reset-requests' },
  //     { title: 'Password Policy', icon: ShieldCheck, routeName: 'password-policy' },
  //   ],
  // },
  {
    label: 'System Configuration',
    items: [
      { title: 'Workflows', icon: GitBranch, routeName: 'workflows' },
      { title: 'Password Policy', icon: ShieldCheck, routeName: 'password-policy' },
      { title: 'System Users', icon: UserCog2Icon, routeName: 'system-users' },
      // { title: 'Smtp', icon: Mail, routeName: 'workflows' },
    ],
  },
  
]

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <RouterLink :to="{ name: 'dashboard' }">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                HR
              </div>
              <div class="flex flex-col gap-0.5 leading-none">
                <span class="font-semibold">HR System</span>
                <span class="text-xs text-muted-foreground capitalize">{{ authStore.roleLabel }}</span>
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
              <SidebarMenuButton as-child :tooltip="item.title">
                <RouterLink :to="{ name: item.routeName }">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </RouterLink>
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
                  <span class="truncate font-medium text-sm">{{ authStore.user?.email }}</span>
                  <span class="truncate text-xs text-muted-foreground capitalize">{{ authStore.roleLabel }}</span>
                </div>
                <ChevronUp class="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" class="w-(--reka-dropdown-menu-trigger-width)">
              <DropdownMenuItem @click="router.push({ name: 'profile' })" class="cursor-pointer">
                <User2 class="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem @click="handleLogout" class="text-destructive focus:text-destructive cursor-pointer">
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
</template>
