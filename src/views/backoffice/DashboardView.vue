<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBackofficeStore } from '@/stores/backoffice'
import { Building2, ShieldCheck, TrendingUp, ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const router = useRouter()
const store = useBackofficeStore()

onMounted(async () => {
  await Promise.all([
    store.fetchOrganisations({ page: 1, page_size: 5 }),
    store.fetchAdmins({ page: 1, page_size: 5 }),
  ])
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- KPI stat cards -->
    <div class="grid gap-4 sm:grid-cols-3">
      <Card class="py-4">
        <CardContent class="px-4">
          <div class="flex items-start justify-between">
            <div class="flex flex-col gap-1">
              <span class="text-sm text-muted-foreground">Total Organisations</span>
              <span class="text-2xl font-semibold tracking-tight">{{ store.orgTotal }}</span>
              <div class="flex items-center gap-1 text-xs">
                <TrendingUp class="size-3 text-accent" />
                <span class="text-accent">{{ store.organisations.filter(o => o.is_active).length }} active</span>
              </div>
            </div>
            <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 class="size-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="py-4">
        <CardContent class="px-4">
          <div class="flex items-start justify-between">
            <div class="flex flex-col gap-1">
              <span class="text-sm text-muted-foreground">Platform Admins</span>
              <span class="text-2xl font-semibold tracking-tight">{{ store.adminTotal }}</span>
              <div class="flex items-center gap-1 text-xs text-muted-foreground">
                {{ store.admins.filter(a => a.is_locked).length }} locked
              </div>
            </div>
            <div class="flex size-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <ShieldCheck class="size-5" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="py-4">
        <CardContent class="px-4">
          <div class="flex items-start justify-between">
            <div class="flex flex-col gap-1">
              <span class="text-sm text-muted-foreground">Inactive Orgs</span>
              <span class="text-2xl font-semibold tracking-tight">
                {{ store.organisations.filter(o => !o.is_active).length }}
              </span>
              <span class="text-xs text-muted-foreground">of {{ store.orgTotal }} total</span>
            </div>
            <div class="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Building2 class="size-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Content grid -->
    <div class="grid gap-6 lg:grid-cols-3">
      <!-- Recent organisations -->
      <div class="lg:col-span-2 rounded-xl border bg-card overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b">
          <h2 class="font-semibold text-sm">Recent Organisations</h2>
          <Button
            variant="ghost"
            size="sm"
            class="text-xs gap-1 text-muted-foreground"
            @click="router.push({ name: 'backoffice-organizations' })"
          >
            View all <ArrowRight class="size-3" />
          </Button>
        </div>
        <div v-if="store.loading" class="space-y-2 p-4">
          <div v-for="i in 4" :key="i" class="h-10 rounded bg-muted animate-pulse" />
        </div>
        <div v-else-if="store.organisations.length === 0" class="py-16 text-center text-muted-foreground text-sm">
          No organisations yet.
        </div>
        <ul v-else class="divide-y">
          <li
            v-for="org in store.organisations.slice(0, 5)"
            :key="org.id"
            class="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div class="flex items-center gap-3 overflow-hidden">
              <div class="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold text-xs shrink-0 overflow-hidden">
                <img v-if="org.logo_url" :src="org.logo_url" :alt="org.name" class="size-full object-cover" />
                <span v-else>{{ org.name[0] }}</span>
              </div>
              <div class="overflow-hidden">
                <p class="font-medium text-sm truncate">{{ org.name }}</p>
                <p class="text-xs text-muted-foreground truncate">{{ org.email }}</p>
              </div>
            </div>
            <Badge :variant="org.is_active ? 'default' : 'secondary'" class="shrink-0 ml-2">
              {{ org.is_active ? 'Active' : 'Inactive' }}
            </Badge>
          </li>
        </ul>
      </div>

      <!-- Quick actions -->
      <div class="rounded-xl border bg-card overflow-hidden">
        <div class="px-4 py-3 border-b">
          <h2 class="font-semibold text-sm">Quick Actions</h2>
        </div>
        <div class="p-4 flex flex-col gap-2">
          <Button
            class="w-full justify-between"
            @click="router.push({ name: 'backoffice-provisioning' })"
          >
            Provision New Org
            <ArrowRight class="size-4" />
          </Button>
          <Button
            variant="outline"
            class="w-full justify-between"
            @click="router.push({ name: 'backoffice-organizations' })"
          >
            Manage Organisations
            <ArrowRight class="size-4" />
          </Button>
          <Button
            variant="outline"
            class="w-full justify-between"
            @click="router.push({ name: 'backoffice-admins' })"
          >
            Manage Admins
            <ArrowRight class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
