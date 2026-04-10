<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { usePagination } from '@/composables/usePagination'
import { toast } from 'vue-sonner'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import type { SystemUser, SystemUserRole } from '@/types/user'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import UserDialog from '@/components/users/UserDialog.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const store = useUsersStore()
const authStore = useAuthStore()

const dialogOpen = ref(false)
const selectedUser = ref<SystemUser | null>(null)
const deleteDialogOpen = ref(false)
const userToDelete = ref<SystemUser | null>(null)
const search = ref('')
const deleting = ref(false)

onMounted(() => store.fetchUsers())

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.users
  return store.users.filter(u =>
    u.full_name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    u.role.toLowerCase().includes(q),
  )
})

const { page, totalPages, paginated, prev, next, goTo, pageNumbers } = usePagination(filtered)

const roleConfig: Record<SystemUserRole, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  admin:        { label: 'Admin',        variant: 'default' },
  manager:      { label: 'Manager',      variant: 'secondary' },
  receptionist: { label: 'Receptionist', variant: 'outline' },
  cleaner:      { label: 'Cleaner',      variant: 'outline' },
}

function formatDate(d?: string) {
  if (!d) return 'Never'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openCreate() {
  selectedUser.value = null
  dialogOpen.value = true
}

function openEdit(user: SystemUser) {
  selectedUser.value = user
  dialogOpen.value = true
}

function confirmDelete(user: SystemUser) {
  userToDelete.value = user
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!userToDelete.value) return
  deleting.value = true
  const name = userToDelete.value.full_name
  try {
    await store.deleteUser(userToDelete.value.id)
    toast.success(`${name} removed from the system.`)
  } catch {
    toast.error('Failed to delete user.')
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    userToDelete.value = null
  }
}

// Prevent deleting own account
const currentUserEmail = computed(() => authStore.user?.email)
</script>

<template>
  <DashboardHeader title="System Users" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative max-w-xs w-full">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input v-model="search" placeholder="Search users..." class="pl-9" />
      </div>
      <Button @click="openCreate">
        <Plus class="size-4 mr-2" />
        Add User
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead class="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 4" :key="i">
              <TableCell colspan="6">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="filtered.length === 0">
            <TableRow>
              <TableCell colspan="6" class="py-16 text-center text-muted-foreground">
                {{ store.users.length === 0 ? 'No users yet.' : 'No users match your search.' }}
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow v-for="user in paginated" :key="user.id">
              <TableCell>
                <div class="font-medium">{{ user.full_name }}</div>
                <div v-if="user.email === currentUserEmail" class="text-xs text-muted-foreground">You</div>
              </TableCell>
              <TableCell class="text-muted-foreground">{{ user.email }}</TableCell>
              <TableCell>
                <Badge :variant="roleConfig[user.role]?.variant ?? 'secondary'">
                  {{ roleConfig[user.role]?.label ?? user.role }}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge :variant="user.status === 'active' ? 'default' : 'secondary'">
                  {{ user.status === 'active' ? 'Active' : 'Inactive' }}
                </Badge>
              </TableCell>
              <TableCell class="text-muted-foreground text-sm">{{ formatDate(user.last_login) }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" class="size-8" @click="openEdit(user)">
                    <Pencil class="size-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    class="size-8 text-destructive hover:text-destructive"
                    :disabled="user.email === currentUserEmail"
                    @click="confirmDelete(user)"
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
      <div v-if="totalPages > 1" class="flex items-center justify-between px-10 py-3 border-t text-sm">
        <p class="text-muted-foreground">Page {{ page }} of {{ totalPages }}</p>
        <div class="flex items-center gap-1">
          <button class="size-8 flex items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed" :disabled="page === 1" @click="prev"><ChevronLeft class="size-4" /></button>
          <template v-for="p in pageNumbers" :key="p">
            <span v-if="p === '...'" class="px-1 text-muted-foreground">…</span>
            <button v-else :class="['size-8 flex items-center justify-center rounded-md border text-sm', p === page ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted']" @click="goTo(p as number)">{{ p }}</button>
          </template>
          <button class="size-8 flex items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed" :disabled="page === totalPages" @click="next"><ChevronRight class="size-4" /></button>
        </div>
      </div>
    </div>
  </div>

  <UserDialog
    v-model:open="dialogOpen"
    :user="selectedUser"
    @saved="dialogOpen = false"
  />

  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete User</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete <strong>{{ userToDelete?.full_name }}</strong>?
          They will lose access to the system immediately.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="handleDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
