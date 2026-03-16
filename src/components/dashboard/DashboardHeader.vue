<script setup lang="ts">
import { Bell, Search } from 'lucide-vue-next'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth'

defineProps<{ title: string }>()

const authStore = useAuthStore()

function getInitials(name: string | undefined | null) {
  if (!name) return 'LM'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
</script>

<template>
  <header class="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <SidebarTrigger class="-ml-1" />
    <Separator orientation="vertical" class="h-6" />
    <h1 class="font-serif text-xl font-semibold">{{ title }}</h1>

    <div class="ml-auto flex items-center gap-4">
      <!-- Search -->
      <div class="relative hidden md:block">
        <Search class="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search room, guest, booking..."
          class="w-64 pl-8"
        />
      </div>

      <!-- Notifications -->
      <Button variant="ghost" size="icon" class="relative">
        <Bell class="size-5" />
        <span class="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          3
        </span>
      </Button>

      <!-- User avatar -->
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
          {{ getInitials(authStore.user?.full_name || authStore.user?.email) }}
        </div>
        <div class="hidden flex-col md:flex">
          <span class="text-sm font-medium">{{ authStore.user?.full_name || authStore.user?.email }}</span>
          <span class="text-xs text-muted-foreground">{{ authStore.roleLabel }}</span>
        </div>
      </div>
    </div>
  </header>
</template>
