<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useBackofficeStore } from '@/stores/backoffice'
import type { BackofficeUser } from '@/types/backoffice'
import {
  Plus, Search, Lock, LockOpen, RotateCcw, Trash2, Loader2,
  ChevronLeft, ChevronRight, ShieldCheck,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const store = useBackofficeStore()

const search = ref('')
const page = ref(1)
const PAGE_SIZE = 20

const addDialog = ref(false)
const addForm = ref({ full_name: '', email: '' })
const addLoading = ref(false)
const addError = ref('')

const resetConfirm = ref<BackofficeUser | null>(null)
const deleteConfirm = ref<BackofficeUser | null>(null)
const actionLoading = ref(false)

async function load() {
  await store.fetchAdmins({ page: page.value, page_size: PAGE_SIZE, search: search.value || undefined })
}

onMounted(load)

let searchTimer: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 400)
})

async function handleAddAdmin() {
  addLoading.value = true
  addError.value = ''
  try {
    await store.createAdmin({ full_name: addForm.value.full_name, email: addForm.value.email })
    addDialog.value = false
    addForm.value = { full_name: '', email: '' }
  } catch (err: any) {
    addError.value = err?.error?.message ?? 'Failed to create admin.'
  } finally {
    addLoading.value = false
  }
}

async function toggleLock(admin: BackofficeUser) {
  try {
    await store.toggleAdminLock(admin.id, !admin.is_locked)
  } catch { /* store handles error state */ }
}

async function handleReset() {
  if (!resetConfirm.value) return
  actionLoading.value = true
  try {
    await store.resetAdminPassword(resetConfirm.value.id)
  } finally {
    actionLoading.value = false
    resetConfirm.value = null
  }
}

async function handleDelete() {
  if (!deleteConfirm.value) return
  actionLoading.value = true
  try {
    await store.deleteAdmin(deleteConfirm.value.id)
  } finally {
    actionLoading.value = false
    deleteConfirm.value = null
  }
}

function formatDate(d?: string) {
  if (!d) return 'Never'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

const totalPages = () => Math.ceil(store.adminTotal / PAGE_SIZE)
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative max-w-xs w-full">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input v-model="search" placeholder="Search admins..." class="pl-9" />
      </div>
      <Button @click="addDialog = true">
        <Plus class="size-4 mr-2" />
        Add Admin
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Administrator</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Login</TableHead>
            <TableHead class="w-28 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 4" :key="i">
              <TableCell colspan="5">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="store.admins.length === 0">
            <TableRow>
              <TableCell colspan="5" class="py-16 text-center text-muted-foreground">
                <div class="flex flex-col items-center gap-2">
                  <ShieldCheck class="size-8 text-muted-foreground/50" />
                  <span>{{ search ? 'No admins match your search.' : 'No platform admins yet.' }}</span>
                </div>
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow v-for="admin in store.admins" :key="admin.id">
              <TableCell>
                <div class="flex items-center gap-3">
                  <div class="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                    {{ initials(admin.full_name) }}
                  </div>
                  <span class="font-medium">{{ admin.full_name }}</span>
                </div>
              </TableCell>
              <TableCell class="text-muted-foreground">{{ admin.email }}</TableCell>
              <TableCell>
                <Badge :variant="admin.is_locked ? 'secondary' : 'default'">
                  {{ admin.is_locked ? 'Locked' : 'Active' }}
                </Badge>
              </TableCell>
              <TableCell class="text-muted-foreground text-sm">{{ formatDate(admin.last_login) }}</TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-8"
                    :title="admin.is_locked ? 'Unlock account' : 'Lock account'"
                    @click="toggleLock(admin)"
                  >
                    <LockOpen v-if="admin.is_locked" class="size-4 text-accent" />
                    <Lock v-else class="size-4 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-8 text-muted-foreground"
                    title="Reset password"
                    @click="resetConfirm = admin"
                  >
                    <RotateCcw class="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-8 text-destructive hover:text-destructive"
                    title="Delete admin"
                    @click="deleteConfirm = admin"
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
      <div v-if="totalPages() > 1" class="flex items-center justify-between px-4 py-3 border-t text-sm">
        <p class="text-muted-foreground">
          Page {{ page }} of {{ totalPages() }} · {{ store.adminTotal }} total
        </p>
        <div class="flex items-center gap-1">
          <button
            class="size-8 flex items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page === 1"
            @click="page--; load()"
          >
            <ChevronLeft class="size-4" />
          </button>
          <button
            class="size-8 flex items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="page >= totalPages()"
            @click="page++; load()"
          >
            <ChevronRight class="size-4" />
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Add Admin Dialog -->
  <Dialog :open="addDialog" @update:open="addDialog = $event">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Add Platform Administrator</DialogTitle>
        <DialogDescription>
          A temporary password will be sent to the provided email address.
        </DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-4 py-2">
        <div v-if="addError" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p class="text-sm text-destructive">{{ addError }}</p>
        </div>
        <div class="grid gap-2">
          <Label for="a_name">Full Name</Label>
          <Input id="a_name" v-model="addForm.full_name" placeholder="Jane Doe" />
        </div>
        <div class="grid gap-2">
          <Label for="a_email">Email Address</Label>
          <Input id="a_email" v-model="addForm.email" type="email" placeholder="jane@lodgecentral.io" />
        </div>
      </div>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="addLoading" @click="addDialog = false">Cancel</Button>
        <Button
          :disabled="!addForm.full_name || !addForm.email || addLoading"
          @click="handleAddAdmin"
        >
          <Loader2 v-if="addLoading" class="size-4 animate-spin mr-2" />
          Create Admin
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Reset Password Confirm -->
  <Dialog :open="!!resetConfirm" @update:open="!$event && (resetConfirm = null)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogDescription>
          Send a password reset to <strong>{{ resetConfirm?.full_name }}</strong>?
          They will receive a new temporary password by email.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="actionLoading" @click="resetConfirm = null">Cancel</Button>
        <Button :disabled="actionLoading" @click="handleReset">
          <Loader2 v-if="actionLoading" class="size-4 animate-spin mr-2" />
          Reset Password
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Delete Confirm -->
  <Dialog :open="!!deleteConfirm" @update:open="!$event && (deleteConfirm = null)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Administrator</DialogTitle>
        <DialogDescription>
          Permanently delete <strong>{{ deleteConfirm?.full_name }}</strong>?
          This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="actionLoading" @click="deleteConfirm = null">Cancel</Button>
        <Button variant="destructive" :disabled="actionLoading" @click="handleDelete">
          <Loader2 v-if="actionLoading" class="size-4 animate-spin mr-2" />
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
