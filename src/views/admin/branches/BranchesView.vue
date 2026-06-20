<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Pencil, Trash2, MapPin, Phone, Mail, ArrowRight, Search, Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useBranchesStore } from '@/stores/branches'
import { branchesApi } from '@/services/api/branches'
import type { Branch } from '@/types/branch'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import BranchDialog from '@/components/branches/BranchDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const router = useRouter()
const store = useBranchesStore()

const dialogOpen = ref(false)
const selectedBranch = ref<Branch | null>(null)
const deleteDialogOpen = ref(false)
const branchToDelete = ref<Branch | null>(null)
const deleting = ref(false)
const search = ref('')

onMounted(() => store.fetchBranches())

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.branches
  return store.branches.filter(b =>
    b.name.toLowerCase().includes(q) ||
    b.city.toLowerCase().includes(q) ||
    b.country.toLowerCase().includes(q),
  )
})

function openCreate() {
  selectedBranch.value = null
  dialogOpen.value = true
}

const loadingEdit = ref(false)

async function openEdit(branch: Branch) {
  loadingEdit.value = true
  try {
    selectedBranch.value = await branchesApi.get(branch.id)
  } catch {
    selectedBranch.value = branch
  } finally {
    loadingEdit.value = false
  }
  dialogOpen.value = true
}

function confirmDelete(branch: Branch) {
  branchToDelete.value = branch
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!branchToDelete.value) return
  deleting.value = true
  const name = branchToDelete.value.name
  try {
    await store.deleteBranch(branchToDelete.value.id)
    toast.success(`${name} has been removed.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to delete branch.'))
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    branchToDelete.value = null
  }
}
</script>

<template>
  <div>
  <DashboardHeader title="Branches" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative max-w-xs w-full">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input v-model="search" placeholder="Search branches..." class="pl-9" />
      </div>
      <Button @click="openCreate">
        <Plus class="size-4 mr-2" />
        New Branch
      </Button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="store.loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="i in 3" :key="i" class="rounded-xl border bg-card p-5 space-y-3">
        <div class="h-5 w-2/3 rounded bg-muted animate-pulse" />
        <div class="h-4 w-1/2 rounded bg-muted animate-pulse" />
        <div class="h-4 w-3/4 rounded bg-muted animate-pulse" />
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filtered.length === 0"
      class="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center text-muted-foreground gap-3"
    >
      <MapPin class="size-10 opacity-30" />
      <p class="font-medium">{{ store.branches.length === 0 ? 'No branches yet.' : 'No branches match your search.' }}</p>
      <p v-if="store.branches.length === 0" class="text-sm">Create your first branch to get started.</p>
      <Button v-if="store.branches.length === 0" variant="outline" class="mt-2" @click="openCreate">
        <Plus class="size-4 mr-2" />
        Create Branch
      </Button>
    </div>

    <!-- Branch cards -->
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="branch in filtered"
        :key="branch.id"
        class="group relative rounded-xl border bg-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-base leading-tight">{{ branch.name }}</h3>
              <span class="text-xs font-mono font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{{ branch.branch_code }}</span>
            </div>
            <Badge :variant="branch.is_active ? 'default' : 'secondary'" class="w-fit">
              {{ branch.is_active ? 'Active' : 'Inactive' }}
            </Badge>
          </div>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" class="size-8" :disabled="loadingEdit" @click="openEdit(branch)">
              <Loader2 v-if="loadingEdit" class="size-3.5 animate-spin" />
              <Pencil v-else class="size-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              class="size-8 text-destructive hover:text-destructive"
              @click="confirmDelete(branch)"
            >
              <Trash2 class="size-3.5" />
            </Button>
          </div>
        </div>

        <!-- Location info -->
        <div class="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <div class="flex items-start gap-2">
            <MapPin class="size-4 mt-0.5 shrink-0" />
            <span>{{ branch.street_address }}, {{ branch.city }}, {{ branch.country }}</span>
          </div>
          <div v-if="branch.phone" class="flex items-center gap-2">
            <Phone class="size-4 shrink-0" />
            <span>{{ branch.phone }}</span>
          </div>
          <div v-if="branch.email" class="flex items-center gap-2">
            <Mail class="size-4 shrink-0" />
            <span>{{ branch.email }}</span>
          </div>
        </div>

        <!-- View detail -->
        <Button
          variant="outline"
          class="mt-auto w-full"
          @click="router.push({ name: 'branch-detail', params: { id: branch.id } })"
        >
          View Details
          <ArrowRight class="size-4 ml-2" />
        </Button>
      </div>
    </div>
  </div>

  <BranchDialog
    :open="dialogOpen"
    :branch="selectedBranch"
    @update:open="(v) => dialogOpen = v"
    @saved="dialogOpen = false"
  />

  <Dialog :open="deleteDialogOpen" @update:open="(v) => deleteDialogOpen = v">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Branch</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete <strong>{{ branchToDelete?.name }}</strong>?
          This will remove the branch from the system. Employees currently assigned to this branch will become unassigned.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="handleDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
  </div>
</template>
