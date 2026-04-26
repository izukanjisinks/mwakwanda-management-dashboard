<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBackofficeStore } from '@/stores/backoffice'
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  LogOut,
  ChevronUp,
} from 'lucide-vue-next'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const route = useRoute()
const router = useRouter()
const store = useBackofficeStore()

const navItems = [
  { label: 'Dashboard',       icon: LayoutDashboard, routeName: 'backoffice-dashboard' },
  { label: 'Organizations',   icon: Building2,        routeName: 'backoffice-organizations' },
  { label: 'Platform Admins', icon: ShieldCheck,      routeName: 'backoffice-admins' },
]

const pageTitles: Record<string, string> = {
  'backoffice-provisioning': 'Create Organisation',
}

const pageTitle = computed(() =>
  pageTitles[route.name as string] ?? navItems.find(n => n.routeName === route.name)?.label ?? 'Backoffice'
)

function navigate(routeName: string) {
  router.push({ name: routeName })
}

function handleLogout() {
  store.logout()
  router.push({ name: 'backoffice-login' })
}

function getInitials(name: string | undefined | null) {
  if (!name) return 'LC'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="fixed left-0 top-0 h-full w-64 flex flex-col border-r bg-sidebar z-50">
      <!-- Brand -->
      <div class="flex h-16 items-center gap-3 px-4 border-b shrink-0">
        <div class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shrink-0">
          LC
        </div>
        <div class="flex flex-col leading-none">
          <span class="font-semibold text-sm">LodgeCentral</span>
          <span class="text-xs text-muted-foreground">Backoffice</span>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        <button
          v-for="item in navItems"
          :key="item.routeName"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="route.name === item.routeName
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
          @click="navigate(item.routeName)"
        >
          <component :is="item.icon" class="size-4 shrink-0" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <!-- Footer user menu -->
      <div class="border-t p-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors">
              <div class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                {{ getInitials(store.user?.full_name || store.user?.email) }}
              </div>
              <div class="flex-1 text-left overflow-hidden">
                <p class="font-medium truncate text-sm">{{ store.user?.full_name ?? store.user?.email ?? 'Admin' }}</p>
                <p class="text-xs text-muted-foreground truncate">Platform Administrator</p>
              </div>
              <ChevronUp class="size-4 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" class="w-56">
            <DropdownMenuItem
              class="text-destructive focus:text-destructive cursor-pointer"
              @click="handleLogout"
            >
              <LogOut class="size-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>

    <!-- Main -->
    <div class="ml-64 flex-1 flex flex-col min-h-screen">
      <!-- Top bar -->
      <header class="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Separator orientation="vertical" class="h-6" />
        <h1 class="font-serif text-xl font-semibold">{{ pageTitle }}</h1>
        <div class="ml-auto flex items-center gap-3">
          <div class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {{ getInitials(store.user?.full_name || store.user?.email) }}
          </div>
          <div class="hidden flex-col md:flex">
            <span class="text-sm font-medium">{{ store.user?.full_name ?? store.user?.email ?? 'Admin' }}</span>
            <span class="text-xs text-muted-foreground">Platform Administrator</span>
          </div>
        </div>
      </header>

      <main class="flex-1">
        <RouterView />
      </main>
    </div>
  </div>
</template>
