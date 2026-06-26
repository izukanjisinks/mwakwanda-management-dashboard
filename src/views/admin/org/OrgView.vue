<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import {
  Plus, Pencil, Trash2, Search, MapPin, Phone, Mail,
  Loader2, ChevronLeft, ChevronRight, ArrowRightLeft, Network, Users,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useBranchesStore } from '@/stores/branches'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { useRolesStore } from '@/stores/roles'
import { useBranchFilterStore } from '@/stores/branchFilter'
import { branchesApi } from '@/services/api/branches'
import type { Branch } from '@/types/branch'
import type { SystemUser } from '@/types/user'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import BranchDialog from '@/components/branches/BranchDialog.vue'
import UserDialog from '@/components/users/UserDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const branchesStore = useBranchesStore()
const usersStore = useUsersStore()
const authStore = useAuthStore()
const rolesStore = useRolesStore()
const branchFilterStore = useBranchFilterStore()

const canManageBranches = computed(() => authStore.userRole === 'admin')

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'branches' | 'users'
const activeTab = ref<Tab>('branches')

// ── Branches state ────────────────────────────────────────────────────────────
const branchDialogOpen = ref(false)
const selectedBranch = ref<Branch | null>(null)
const deleteBranchDialogOpen = ref(false)
const branchToDelete = ref<Branch | null>(null)
const deletingBranch = ref(false)
const branchSearch = ref('')
const loadingEdit = ref(false)

const filteredBranches = computed(() => {
  const q = branchSearch.value.toLowerCase().trim()
  if (!q) return branchesStore.branches
  return branchesStore.branches.filter(b =>
    b.name.toLowerCase().includes(q) ||
    b.city.toLowerCase().includes(q) ||
    b.country.toLowerCase().includes(q),
  )
})

function openCreateBranch() {
  selectedBranch.value = null
  branchDialogOpen.value = true
}

async function openEditBranch(branch: Branch) {
  loadingEdit.value = true
  try {
    selectedBranch.value = await branchesApi.get(branch.id)
  } catch {
    selectedBranch.value = branch
  } finally {
    loadingEdit.value = false
  }
  branchDialogOpen.value = true
}

function confirmDeleteBranch(branch: Branch) {
  branchToDelete.value = branch
  deleteBranchDialogOpen.value = true
}

async function handleDeleteBranch() {
  if (!branchToDelete.value) return
  deletingBranch.value = true
  const name = branchToDelete.value.name
  try {
    await branchesStore.deleteBranch(branchToDelete.value.id)
    toast.success(`${name} has been removed.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to delete branch.'))
  } finally {
    deletingBranch.value = false
    deleteBranchDialogOpen.value = false
    branchToDelete.value = null
  }
}

// ── Users state ───────────────────────────────────────────────────────────────
const userDialogOpen = ref(false)
const selectedUser = ref<SystemUser | null>(null)
const deleteUserDialogOpen = ref(false)
const userToDelete = ref<SystemUser | null>(null)
const deletingUser = ref(false)
const userSearch = ref('')
const userPage = ref(1)
const userPageSize = 10

function loadUsers() {
  usersStore.fetchUsers(userPage.value, userPageSize)
}

watch(userPage, loadUsers)
watch(() => branchFilterStore.selectedBranchId, () => { userPage.value = 1; loadUsers() })

const totalUserPages = computed(() => Math.max(1, Math.ceil(usersStore.total / userPageSize)))

const filteredUsers = computed(() => {
  const q = userSearch.value.toLowerCase().trim()
  if (!q) return usersStore.users
  return usersStore.users.filter(u =>
    u.full_name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    u.role.toLowerCase().includes(q),
  )
})

function formatDate(d?: string) {
  if (!d) return 'Never'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openCreateUser() {
  selectedUser.value = null
  userDialogOpen.value = true
}

function openEditUser(user: SystemUser) {
  selectedUser.value = user
  userDialogOpen.value = true
}

function confirmDeleteUser(user: SystemUser) {
  userToDelete.value = user
  deleteUserDialogOpen.value = true
}

async function handleDeleteUser() {
  if (!userToDelete.value) return
  deletingUser.value = true
  const name = userToDelete.value.full_name
  try {
    await usersStore.deleteUser(userToDelete.value.id)
    toast.success(`${name} removed from the system.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to delete user.'))
  } finally {
    deletingUser.value = false
    deleteUserDialogOpen.value = false
    userToDelete.value = null
  }
}

const currentUserEmail = computed(() => authStore.user?.email)

// ── Branch assignment ─────────────────────────────────────────────────────────
const UNASSIGNED = '__unassigned__'
const assignDialogOpen = ref(false)
const userToAssign = ref<SystemUser | null>(null)
const assignBranchId = ref(UNASSIGNED)
const assigning = ref(false)

function openAssignBranch(user: SystemUser) {
  if (user.role === 'admin') return
  userToAssign.value = user
  assignBranchId.value = user.branch_id ?? UNASSIGNED
  assignDialogOpen.value = true
}

async function handleAssignBranch() {
  if (!userToAssign.value) return
  assigning.value = true
  const branchId = assignBranchId.value === UNASSIGNED ? null : assignBranchId.value
  const branchName = branchId ? (activeBranches.value.find(b => b.id === branchId)?.name ?? '') : ''
  try {
    await usersStore.assignBranch(userToAssign.value.id, branchId, branchName)
    toast.success(`${userToAssign.value.full_name} updated successfully.`)
    assignDialogOpen.value = false
    loadUsers()
  } catch (err) {
    toast.error(getApiError(err, 'Failed to assign branch.'))
  } finally {
    assigning.value = false
  }
}

const activeBranches = computed(() =>
  branchesStore.branches.filter(b => b.is_active),
)


function getBranchName(branchId?: string) {
  if (!branchId) return null
  return branchesStore.branches.find(b => b.id === branchId)?.name ?? null
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  branchesStore.fetchBranches()
  loadUsers()
  rolesStore.fetchRoles()
})
</script>

<template>
  <div>
    <DashboardHeader title="Branches & System Users" />

    <div class="flex flex-col gap-6 p-6">

      <!-- Tab bar -->
      <div class="border-b flex">
        <button
          class="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="activeTab === 'branches'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'branches'"
        >
          <Network class="size-4" />
          Branches
          <span v-if="branchesStore.total" class="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">{{ branchesStore.total }}</span>
        </button>
        <button
          class="flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors"
          :class="activeTab === 'users'
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'"
          @click="activeTab = 'users'"
        >
          <Users class="size-4" />
          System Users
          <span v-if="usersStore.total" class="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 leading-none">{{ usersStore.total }}</span>
        </button>
      </div>

      <!-- ── Branches tab ───────────────────────────────────────────────────── -->
      <div v-show="activeTab === 'branches'" class="flex flex-col gap-6">
        <!-- Toolbar -->
        <div class="flex items-center justify-between gap-4">
          <div class="relative max-w-xs w-full">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input v-model="branchSearch" placeholder="Search branches..." class="pl-9" />
          </div>
          <Button v-if="canManageBranches" @click="openCreateBranch">
            <Plus class="size-4 mr-2" />
            New Branch
          </Button>
        </div>

        <!-- Loading -->
        <div v-if="branchesStore.loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div v-for="i in 3" :key="i" class="rounded-xl border bg-card p-5 space-y-3">
            <div class="h-5 w-2/3 rounded bg-muted animate-pulse" />
            <div class="h-4 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>

        <!-- Empty -->
        <div
          v-else-if="filteredBranches.length === 0"
          class="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center text-muted-foreground gap-3"
        >
          <MapPin class="size-10 opacity-30" />
          <p class="font-medium">{{ branchesStore.branches.length === 0 ? 'No branches yet.' : 'No branches match your search.' }}</p>
          <Button v-if="canManageBranches && branchesStore.branches.length === 0" variant="outline" class="mt-2" @click="openCreateBranch">
            <Plus class="size-4 mr-2" />Create Branch
          </Button>
        </div>

        <!-- Branch cards -->
        <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="branch in filteredBranches"
            :key="branch.id"
            class="group relative rounded-xl border bg-card p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
          >
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
              <div v-if="canManageBranches" class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" class="size-8" :disabled="loadingEdit" @click="openEditBranch(branch)">
                  <Loader2 v-if="loadingEdit" class="size-3.5 animate-spin" />
                  <Pencil v-else class="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDeleteBranch(branch)">
                  <Trash2 class="size-3.5" />
                </Button>
              </div>
            </div>

            <div class="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <div class="flex items-start gap-2">
                <MapPin class="size-4 mt-0.5 shrink-0" />
                <span>{{ [branch.street_address, branch.city, branch.country].filter(Boolean).join(', ') }}</span>
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

          </div>
        </div>
      </div>

      <!-- ── Users tab ──────────────────────────────────────────────────────── -->
      <div v-show="activeTab === 'users'" class="flex flex-col gap-6">
        <!-- Toolbar -->
        <div class="flex items-center justify-between gap-4">
          <div class="relative max-w-xs w-full">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input v-model="userSearch" placeholder="Search users..." class="pl-9" />
          </div>
          <Button @click="openCreateUser">
            <Plus class="size-4 mr-2" />
            Add User
          </Button>
        </div>

        <!-- Table -->
        <div class="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow class="bg-muted/30">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead class="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-if="usersStore.loading">
                <TableRow v-for="i in 4" :key="i">
                  <TableCell :colspan="7">
                    <div class="h-4 rounded bg-muted animate-pulse" />
                  </TableCell>
                </TableRow>
              </template>

              <template v-else-if="filteredUsers.length === 0">
                <TableRow>
                  <TableCell :colspan="7" class="py-16 text-center text-muted-foreground">
                    {{ usersStore.users.length === 0 ? 'No users yet.' : 'No users match your search.' }}
                  </TableCell>
                </TableRow>
              </template>

              <template v-else>
                <TableRow v-for="user in filteredUsers" :key="user.id">
                  <TableCell>
                    <div class="font-medium">{{ user.full_name }}</div>
                    <div v-if="user.email === currentUserEmail" class="text-xs text-muted-foreground">You</div>
                  </TableCell>
                  <TableCell class="text-muted-foreground">{{ user.email }}</TableCell>
                  <TableCell>
                    <Badge :variant="rolesStore.getRoleBadgeVariant(user.role)">
                      {{ rolesStore.getRoleLabel(user.role) }}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span v-if="user.role === 'admin'" class="text-xs text-muted-foreground italic">
                      Not applicable
                    </span>
                    <button
                      v-else
                      class="flex items-center gap-1.5 text-sm group/branch"
                      @click="openAssignBranch(user)"
                    >
                      <span :class="!user.branch_id ? 'text-muted-foreground' : ''">
                        {{ getBranchName(user.branch_id) ?? 'Unassigned' }}
                      </span>
                      <ArrowRightLeft class="size-3 opacity-0 group-hover/branch:opacity-60 transition-opacity" />
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge :variant="user.status === 'active' ? 'default' : 'secondary'">
                      {{ user.status === 'active' ? 'Active' : 'Inactive' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-muted-foreground text-sm">{{ formatDate(user.last_login) }}</TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-1">
                      <Button
                        variant="ghost" size="icon" class="size-8"
                        :disabled="user.role === 'guest'"
                        @click="openEditUser(user)"
                      >
                        <Pencil class="size-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        class="size-8 text-destructive hover:text-destructive"
                        :disabled="user.role === 'guest' || user.email === currentUserEmail"
                        @click="confirmDeleteUser(user)"
                      >
                        <Trash2 class="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </template>
            </TableBody>
          </Table>

          <!-- Pagination -->
          <div class="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
            <span>{{ usersStore.total }} user{{ usersStore.total !== 1 ? 's' : '' }}</span>
            <div class="flex items-center gap-2">
              <Button variant="outline" size="icon" class="size-8" :disabled="userPage <= 1" @click="userPage--">
                <ChevronLeft class="size-4" />
              </Button>
              <span>{{ userPage }} / {{ totalUserPages }}</span>
              <Button variant="outline" size="icon" class="size-8" :disabled="userPage >= totalUserPages" @click="userPage++">
                <ChevronRight class="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Dialogs ──────────────────────────────────────────────────────────── -->

    <BranchDialog
      :open="branchDialogOpen"
      :branch="selectedBranch"
      @update:open="(v) => branchDialogOpen = v"
      @saved="branchDialogOpen = false"
    />

    <Dialog :open="deleteBranchDialogOpen" @update:open="(v) => deleteBranchDialogOpen = v">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Branch</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{{ branchToDelete?.name }}</strong>?
            Employees assigned to this branch will be automatically be unassigned and will need to be reassigned to a different branch to access the system.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button variant="outline" :disabled="deletingBranch" @click="deleteBranchDialogOpen = false">Cancel</Button>
          <Button variant="destructive" :disabled="deletingBranch" @click="handleDeleteBranch">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <UserDialog
      :open="userDialogOpen"
      :user="selectedUser"
      @update:open="(v) => userDialogOpen = v"
      @saved="userDialogOpen = false"
    />

    <Dialog :open="deleteUserDialogOpen" @update:open="(v) => deleteUserDialogOpen = v">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{{ userToDelete?.full_name }}</strong>?
            They will lose access to the system immediately.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter class="gap-2">
          <Button variant="outline" :disabled="deletingUser" @click="deleteUserDialogOpen = false">Cancel</Button>
          <Button variant="destructive" :disabled="deletingUser" @click="handleDeleteUser">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Assign / Move branch dialog -->
    <Dialog :open="assignDialogOpen" @update:open="(v) => assignDialogOpen = v">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Branch</DialogTitle>
          <DialogDescription>
            Set the branch for {{ userToAssign?.full_name }}. Choose Unassigned to remove their branch.
          </DialogDescription>
        </DialogHeader>

        <div class="py-2">
          <Select v-model="assignBranchId">
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="UNASSIGNED">
                <span class="text-muted-foreground">Unassigned</span>
              </SelectItem>
              <SelectItem
                v-for="b in activeBranches"
                :key="b.id"
                :value="b.id"
              >
                <span class="flex items-center gap-2">
                  <span class="size-2 rounded-full shrink-0" :class="b.is_main ? 'bg-primary' : 'bg-green-500'" />
                  {{ b.name }}
                  <span v-if="!b.is_main" class="text-xs text-muted-foreground font-mono">{{ b.branch_code }}</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter class="gap-2">
          <Button variant="outline" :disabled="assigning" @click="assignDialogOpen = false">Cancel</Button>
          <Button :disabled="assigning" @click="handleAssignBranch">
            <Loader2 v-if="assigning" class="size-4 animate-spin mr-2" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
