<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { userApi } from '@/services/api/user'
import type { SystemUser } from '@/types/user'
import type { Role } from '@/types/role'
import { roleApi } from '@/services/api/role'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ShieldCheck,
  UserPlus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  Lock,
  Unlock,
  KeyRound,
  Loader2,
  AlertCircle,
} from 'lucide-vue-next'
import ChangeRoleDialog from '@/components/users/ChangeRoleDialog.vue'
import { useResultDialog } from '@/composables/useResultDialog'
import { useConfirmDialog } from '@/composables/useConfirmDialog'

const { showSuccess, showError } = useResultDialog()
const { confirm } = useConfirmDialog()

const users = ref<SystemUser[]>([])
const roles = ref<Role[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')

const selectedUser = ref<SystemUser | null>(null)
const changeRoleOpen = ref(false)

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value

  const query = searchQuery.value.toLowerCase()
  return users.value.filter(user =>
    user.email.toLowerCase().includes(query) ||
    user.role.name.toLowerCase().includes(query)
  )
})

async function fetchUsers() {
  loading.value = true
  error.value = null
  try {
    const response = await userApi.getUsers()
    users.value = response.data
  } catch (err: any) {
    console.error('fetchUsers error:', err)
    error.value = err?.error?.message || 'Failed to load users'
  } finally {
    loading.value = false
  }
}

async function fetchRoles() {
  try {
    roles.value = await roleApi.getRoles()
  } catch (err) {
    console.error('Failed to load roles:', err)
  }
}

function getRoleBadgeVariant(roleName: string) {
  switch (roleName) {
    case 'super_admin':
      return 'destructive'
    case 'hr_manager':
      return 'default'
    case 'manager':
      return 'secondary'
    default:
      return 'outline'
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function openLockDialog(user: SystemUser) {
  const isLocking = !user.is_locked
  const confirmed = await confirm({
    title: isLocking ? 'Lock Account' : 'Unlock Account',
    description: isLocking
      ? `Are you sure you want to lock ${user.email}? They will not be able to access the system.`
      : `Are you sure you want to unlock ${user.email}? They will regain access to the system.`,
    variant: isLocking ? 'destructive' : 'default',
    confirmText: isLocking ? 'Lock Account' : 'Unlock Account',
  })
  if (!confirmed) return

  try {
    await userApi.updateUser(user.user_id, { is_locked: isLocking })
    await fetchUsers()
    showSuccess(
      isLocking ? 'Account Locked' : 'Account Unlocked',
      isLocking
        ? `${user.email} has been locked and can no longer access the system.`
        : `${user.email} has been unlocked and can now access the system.`,
    )
  } catch (err: any) {
    showError('Operation Failed', err?.error?.message || 'Failed to update user')
  }
}

async function openDeleteDialog(user: SystemUser) {
  const confirmed = await confirm({
    title: 'Delete User',
    description: `Are you sure you want to delete ${user.email}? This action cannot be undone and will permanently remove all user data.`,
    variant: 'destructive',
    confirmText: 'Delete User',
  })
  if (!confirmed) return

  try {
    await userApi.deleteUser(user.user_id)
    await fetchUsers()
    showSuccess('User Deleted', `${user.email} has been permanently removed from the system.`)
  } catch (err: any) {
    showError('Delete Failed', err?.error?.message || 'Failed to delete user')
  }
}

function openChangeRoleDialog(user: SystemUser) {
  selectedUser.value = user
  changeRoleOpen.value = true
}

async function handleChangeRole(roleId: string, onError: (error: string) => void) {
  if (!selectedUser.value) return
  try {
    await userApi.changeRole(selectedUser.value.user_id, roleId)
    await fetchUsers()
    changeRoleOpen.value = false
    const roleName = roles.value.find(r => r.role_id === roleId)?.name?.replace(/_/g, ' ') || 'new role'
    showSuccess('Role Updated', `${selectedUser.value.email} has been assigned the ${roleName} role.`)
  } catch (err: any) {
    onError(err?.error?.message || 'Failed to change role')
  }
}

async function openResetPasswordDialog(user: SystemUser) {
  const confirmed = await confirm({
    title: 'Reset Password',
    description: `This action will generate a new password for ${user.email} and send it to their email address. The user will be required to change their password on next login.`,
    confirmText: 'Reset Password',
  })
  if (!confirmed) return

  try {
    await userApi.resetPassword(user.user_id)
    await fetchUsers()
    showSuccess('Password Reset', `A new password has been generated and sent to ${user.email}.`)
  } catch (err: any) {
    showError('Reset Failed', err?.error?.message || 'Failed to reset password')
  }
}

onMounted(() => {
  fetchUsers()
  fetchRoles()
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <ShieldCheck class="w-8 h-8 text-primary" />
          System Users
        </h1>
        <p class="text-muted-foreground mt-1">
          Manage user accounts and permissions
        </p>
      </div>
      <Button>
        <UserPlus class="size-4 mr-2" />
        Add User
      </Button>
    </div>

    <!-- Search and Filters -->
    <div class="flex items-center gap-4">
      <div class="relative flex-1 max-w-md">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search by email or role..."
          class="pl-9"
        />
      </div>
      <div class="text-sm text-muted-foreground">
        {{ filteredUsers.length }} {{ filteredUsers.length === 1 ? 'user' : 'users' }} total
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="rounded-lg bg-destructive/10 border border-destructive/20 p-4 flex items-start gap-3">
      <AlertCircle class="size-5 text-destructive shrink-0 mt-0.5" />
      <div>
        <p class="text-sm font-medium text-destructive">Error loading users</p>
        <p class="text-sm text-destructive/90 mt-1">{{ error }}</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-muted-foreground" />
    </div>

    <!-- Users Table -->
    <template v-else>
      <div v-if="filteredUsers.length > 0" class="rounded-lg border px-3 py-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead class="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="user in filteredUsers" :key="user.user_id">
                <TableCell class="font-medium">
                  {{ user.email }}
                </TableCell>
                <TableCell>
                  <Badge :variant="getRoleBadgeVariant(user.role.name)" class="capitalize">
                    {{ user.role.name.replace(/_/g, ' ') }}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-2">
                    <Badge
                      :variant="user.is_active ? 'default' : 'secondary'"
                      class="capitalize"
                    >
                      {{ user.is_active ? 'Active' : 'Inactive' }}
                    </Badge>
                    <Lock v-if="user.is_locked" class="size-3.5 text-muted-foreground" />
                    <AlertCircle
                      v-if="user.change_password"
                      class="size-3.5 text-amber-600"
                      title="Password change required"
                    />
                  </div>
                </TableCell>
                <TableCell class="text-muted-foreground text-sm">
                  {{ formatDate(user.created_at) }}
                </TableCell>
                <TableCell class="text-muted-foreground text-sm">
                  {{ formatDate(user.updated_at) }}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" size="icon">
                        <MoreVertical class="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <!-- <DropdownMenuItem>
                        <Edit class="size-4 mr-2" />
                        Edit User
                      </DropdownMenuItem> -->
                      <DropdownMenuItem @click="openChangeRoleDialog(user)">
                        <Shield class="size-4 mr-2" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="openResetPasswordDialog(user)">
                        <KeyRound class="size-4 mr-2" />
                        Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="openLockDialog(user)">
                        <component :is="user.is_locked ? Unlock : Lock" class="size-4 mr-2" />
                        {{ user.is_locked ? 'Unlock' : 'Lock' }} Account
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem @click="openDeleteDialog(user)" class="text-destructive focus:text-destructive">
                        <Trash2 class="size-4 mr-2" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

      <!-- Empty State -->
      <div v-else class="rounded-lg border border-dashed p-12">
        <div class="flex flex-col items-center justify-center text-center">
          <Search class="w-12 h-12 text-muted-foreground mb-4" />
          <h3 class="text-lg font-semibold">No users found</h3>
          <p class="text-sm text-muted-foreground mt-1">
            Try adjusting your search criteria
          </p>
        </div>
      </div>
    </template>

    <!-- Change Role Dialog -->
    <ChangeRoleDialog
      :open="changeRoleOpen"
      @update:open="(val) => changeRoleOpen = val"
      :user="selectedUser"
      :roles="roles"
      @save="handleChangeRole"
    />

  </div>
</template>
