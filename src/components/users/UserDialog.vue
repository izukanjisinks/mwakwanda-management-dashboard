<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, RefreshCw, Eye, EyeOff, Copy, Check } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useUsersStore } from '@/stores/users'
import { useBranchesStore } from '@/stores/branches'
import { useRolesStore } from '@/stores/roles'
import { useAuthStore } from '@/stores/auth'
import type { SystemUser, SystemUserRole, SystemUserStatus } from '@/types/user'

const props = defineProps<{
  open: boolean
  user?: SystemUser | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [user: SystemUser]
}>()

const store = useUsersStore()
const branchesStore = useBranchesStore()
const rolesStore = useRolesStore()
const authStore = useAuthStore()
const saving = ref(false)
const error = ref('')
const showPassword = ref(false)
const copied = ref(false)

const activeBranches = computed(() => branchesStore.branches.filter(b => b.is_active))

const visibleRoles = computed(() =>
  authStore.userRole === 'branch_admin'
    ? rolesStore.roles.filter(r => r.name !== 'admin')
    : rolesStore.roles
)

function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const special = '!@#$%&*'
  const all = upper + lower + digits + special
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ]
  const rest = Array.from({ length: 8 }, () => all[Math.floor(Math.random() * all.length)])
  form.value.password = [...required, ...rest]
    .sort(() => Math.random() - 0.5)
    .join('')
  showPassword.value = true
}

async function copyPassword() {
  if (!form.value.password) return
  await navigator.clipboard.writeText(form.value.password)
  copied.value = true
  toast.success('Password copied to clipboard.')
  setTimeout(() => { copied.value = false }, 2000)
}

const isEdit = computed(() => !!props.user)

const form = ref({
  full_name: '',
  email: '',
  role: 'receptionist' as SystemUserRole,
  status: 'active' as SystemUserStatus,
  password: '',
  branch_id: '',
})

watch(() => props.open, async (open) => {
  if (!open) return
  error.value = ''
  if (!branchesStore.branches.length) branchesStore.fetchBranches()
  rolesStore.fetchRoles()
  if (props.user) {
    form.value = {
      full_name: props.user.full_name,
      email: props.user.email,
      role: props.user.role,
      status: props.user.status,
      password: '',
      branch_id: props.user.branch_id ?? '',
    }
  } else {
    form.value = { full_name: '', email: '', role: '' as SystemUserRole, status: 'active', password: '', branch_id: '' }
  }
})

async function handleSave() {
  error.value = ''
  if (!form.value.full_name.trim()) { error.value = 'Full name is required.'; return }
  if (!form.value.email.trim()) { error.value = 'Email is required.'; return }
  if (!isEdit.value && !form.value.password.trim()) { error.value = 'Password is required for new users.'; return }

  saving.value = true
  try {
    const payload = {
      full_name: form.value.full_name.trim(),
      email: form.value.email.trim(),
      role: form.value.role,
      status: form.value.status,
      ...(form.value.branch_id ? { branch_id: form.value.branch_id } : {}),
      ...(form.value.password ? { password: form.value.password } : {}),
    }
    let saved: SystemUser
    if (isEdit.value && props.user) {
      saved = await store.updateUser(props.user.id, payload)
    } else {
      saved = await store.createUser(payload)
    }
    toast.success(isEdit.value ? 'User updated successfully.' : 'User created successfully.')
    emit('saved', saved)
    emit('update:open', false)
  } catch (err: any) {
    error.value = err?.error?.message ?? 'Failed to save user.'
    toast.error(error.value)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit User' : 'Add System User' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Update user details and permissions.' : 'Create a new staff account with system access.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <div class="grid gap-2">
          <Label for="full_name">Full Name *</Label>
          <Input id="full_name" v-model="form.full_name" placeholder="e.g. Grace Mwila" />
        </div>

        <div class="grid gap-2">
          <Label for="email">Email *</Label>
          <Input id="email" v-model="form.email" type="email" placeholder="grace@lodge.dev" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label>Role *</Label>
            <Select v-model="form.role" :disabled="rolesStore.loading">
              <SelectTrigger>
                <Loader2 v-if="rolesStore.loading" class="size-3.5 animate-spin mr-1 text-muted-foreground" />
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="r in visibleRoles"
                  :key="r.id"
                  :value="r.name"
                >
                  {{ r.display_name ?? r.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>Status</Label>
            <Select v-model="form.status">
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid gap-2">
          <Label>Branch</Label>
          <Select v-model="form.branch_id">
            <SelectTrigger>
              <SelectValue placeholder="Select branch..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="b in activeBranches"
                :key="b.id"
                :value="b.id"
              >
                {{ b.name }}
                <span class="ml-1 text-xs font-mono text-muted-foreground">{{ b.branch_code }}</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="grid gap-2">
          <Label for="password">{{ isEdit ? 'New Password' : 'Password *' }}</Label>
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                class="pr-9 font-mono"
              />
              <button
                type="button"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                @click="showPassword = !showPassword"
              >
                <EyeOff v-if="showPassword" class="size-4" />
                <Eye v-else class="size-4" />
              </button>
            </div>
            <Button type="button" variant="outline" size="icon" title="Copy password" :disabled="!form.password" @click="copyPassword">
              <Check v-if="copied" class="size-4 text-accent" />
              <Copy v-else class="size-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" title="Generate password" @click="generatePassword">
              <RefreshCw class="size-4" />
            </Button>
          </div>
          <p v-if="isEdit" class="text-xs text-red-500">This will reset the user's password. User will be notified via email.</p>
        </div>
      </form>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="saving" @click="handleSave">
          <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
          {{ isEdit ? 'Save Changes' : 'Create User' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
