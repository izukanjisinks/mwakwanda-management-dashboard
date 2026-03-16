<script setup lang="ts">
import {
  LayoutDashboard,
  LogOut,
  ChevronUp,
  User2,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
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
                LM
              </div>
              <div class="flex flex-col gap-0.5 leading-none">
                <span class="font-semibold">Lodge Management</span>
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
