<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, MapPin, Phone, Mail, Pencil } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { branchesApi } from '@/services/api/branches'
import type { Branch } from '@/types/branch'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import BranchDialog from '@/components/branches/BranchDialog.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const route = useRoute()
const router = useRouter()

const branchId = computed(() => route.params.id as string)
const branch = ref<Branch | null>(null)
const loading = ref(false)
const editDialogOpen = ref(false)

async function loadBranch() {
  loading.value = true
  try {
    branch.value = await branchesApi.get(branchId.value)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to load branch.'))
    router.push({ name: 'branches' })
  } finally {
    loading.value = false
  }
}

onMounted(loadBranch)

function onBranchSaved(updated: Branch) {
  branch.value = updated
  editDialogOpen.value = false
}
</script>

<template>
  <div>
    <DashboardHeader title="Branch Details" />

    <div class="flex flex-col gap-6 p-6">
      <!-- Back + actions -->
      <div class="flex items-center justify-between">
        <Button variant="ghost" class="-ml-2" @click="router.push({ name: 'branches' })">
          <ArrowLeft class="size-4 mr-2" />
          All Branches
        </Button>
        <Button v-if="branch" variant="outline" @click="editDialogOpen = true">
          <Pencil class="size-4 mr-2" />
          Edit Branch
        </Button>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="rounded-xl border bg-card p-6 space-y-4">
        <div class="h-6 w-1/3 rounded bg-muted animate-pulse" />
        <div class="h-4 w-1/2 rounded bg-muted animate-pulse" />
        <div class="h-4 w-2/3 rounded bg-muted animate-pulse" />
      </div>

      <!-- Branch info -->
      <template v-else-if="branch">
        <div class="rounded-xl border bg-card p-6 flex flex-col gap-6">
          <!-- Name + status -->
          <div class="flex items-start gap-3">
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <h2 class="text-xl font-semibold">{{ branch.name }}</h2>
                <span class="text-sm font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">{{ branch.branch_code }}</span>
              </div>
              <Badge :variant="branch.is_active ? 'default' : 'secondary'" class="w-fit">
                {{ branch.is_active ? 'Active' : 'Inactive' }}
              </Badge>
            </div>
          </div>

          <!-- Detail rows -->
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</span>
              <div class="flex items-center gap-2 text-sm">
                <MapPin class="size-4 text-muted-foreground shrink-0" />
                <span>{{ branch.address }}</span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</span>
              <span class="text-sm">{{ branch.city }}</span>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</span>
              <span class="text-sm">{{ branch.country }}</span>
            </div>

            <div v-if="branch.phone" class="flex flex-col gap-1">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</span>
              <div class="flex items-center gap-2 text-sm">
                <Phone class="size-4 text-muted-foreground shrink-0" />
                <span>{{ branch.phone }}</span>
              </div>
            </div>

            <div v-if="branch.email" class="flex flex-col gap-1">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</span>
              <div class="flex items-center gap-2 text-sm">
                <Mail class="size-4 text-muted-foreground shrink-0" />
                <span>{{ branch.email }}</span>
              </div>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</span>
              <span class="text-sm">{{ new Date(branch.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>

    <BranchDialog
      :open="editDialogOpen"
      :branch="branch"
      @update:open="(v) => editDialogOpen = v"
      @saved="onBranchSaved"
    />
  </div>
</template>
