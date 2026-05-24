<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Network } from 'lucide-vue-next'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth'
import { useBranchesStore } from '@/stores/branches'
import { useBranchFilterStore } from '@/stores/branchFilter'

defineProps<{ title: string }>()

const authStore = useAuthStore()
const branchesStore = useBranchesStore()
const branchFilterStore = useBranchFilterStore()

const showBranchSelector = computed(() => authStore.userRole === 'admin')

onMounted(() => {
  if (showBranchSelector.value && !branchesStore.branches.length) {
    branchesStore.fetchBranches()
  }
})

const selectorValue = computed(() => branchFilterStore.selectedBranchId ?? 'all')

function handleBranchChange(val: string) {
  branchFilterStore.setSelectedBranch(val === 'all' ? null : val)
}

const selectedBranchName = computed(() => {
  if (!branchFilterStore.selectedBranchId) return null
  return branchesStore.branches.find(b => b.id === branchFilterStore.selectedBranchId)?.name ?? null
})

function getInitials(name: string | undefined | null) {
  if (!name) return 'LM'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
</script>

<template>
  <header class="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <SidebarTrigger class="-ml-1" />
    <Separator orientation="vertical" class="h-6" />
    <h1 class="text-xl font-semibold">{{ title }}</h1>

    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>

    <div class="ml-auto flex items-center gap-4">
      <!-- Branch selector — admin only -->
      <div v-if="showBranchSelector" class="flex items-center gap-2">
        <Select :model-value="selectorValue" @update:model-value="handleBranchChange">
          <SelectTrigger class="h-8 w-44 gap-1.5 text-sm">
            <Network class="size-3.5 shrink-0 text-muted-foreground" />
            <SelectValue>
              <span v-if="selectedBranchName" class="text-foreground font-medium truncate">{{ selectedBranchName }}</span>
              <span v-else class="text-muted-foreground">All Branches</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span class="flex items-center gap-2">
                <Network class="size-3.5 text-muted-foreground" />
                All Branches
              </span>
            </SelectItem>
            <SelectItem v-for="b in branchesStore.branches" :key="b.id" :value="b.id">
              <span class="flex items-center gap-2">
                <span
                  class="size-2 rounded-full shrink-0"
                  :class="b.is_active ? 'bg-green-500' : 'bg-muted-foreground/40'"
                />
                {{ b.name }}
                <span class="text-xs font-mono text-muted-foreground">{{ b.branch_code }}</span>
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Active filter badge -->
        <span
          v-if="branchFilterStore.selectedBranchId"
          class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          Filtered
        </span>
      </div>

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
