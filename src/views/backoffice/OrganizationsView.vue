<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBackofficeStore } from '@/stores/backoffice'
import { Search, Ban, CheckCircle, Loader2, ChevronLeft, ChevronRight, Building2, Pencil } from 'lucide-vue-next'
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
import { toast } from 'vue-sonner'
import type { Organisation } from '@/types/backoffice'

const router = useRouter()
const store = useBackofficeStore()

const search = ref('')
const page = ref(1)
const PAGE_SIZE = 20

// ── Toggle status ─────────────────────────────────────────────────────────────
const confirmDialog = ref<{
  open: boolean
  org: Organisation | null
  action: 'activate' | 'deactivate'
}>({ open: false, org: null, action: 'deactivate' })
const actionLoading = ref(false)

function openToggle(org: Organisation) {
  confirmDialog.value = { open: true, org, action: org.is_active ? 'deactivate' : 'activate' }
}

async function confirmToggle() {
  if (!confirmDialog.value.org) return
  actionLoading.value = true
  try {
    await store.toggleOrgStatus(confirmDialog.value.org.id, !confirmDialog.value.org.is_active)
  } finally {
    actionLoading.value = false
    confirmDialog.value.open = false
  }
}

// ── Edit ──────────────────────────────────────────────────────────────────────
const editDialog = ref(false)
const editTarget = ref<Organisation | null>(null)
const editForm = ref({ name: '', email: '', phone: '' })
const editSaving = ref(false)
const editError = ref('')

function openEdit(org: Organisation) {
  editTarget.value = org
  editForm.value = { name: org.name, email: org.email ?? '', phone: org.phone ?? '' }
  editError.value = ''
  editDialog.value = true
}

async function handleEditSave() {
  if (!editTarget.value) return
  if (!editForm.value.name.trim()) { editError.value = 'Organisation name is required.'; return }
  if (!editForm.value.email.trim()) { editError.value = 'Email is required.'; return }

  editSaving.value = true
  editError.value = ''
  try {
    await store.updateOrg(editTarget.value.id, {
      name:  editForm.value.name.trim(),
      email: editForm.value.email.trim(),
      phone: editForm.value.phone.trim() || undefined,
    })
    toast.success('Organisation updated.')
    editDialog.value = false
  } catch (err: any) {
    editError.value = err?.error?.message ?? 'Failed to update organisation.'
    toast.error(editError.value)
  } finally {
    editSaving.value = false
  }
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function load() {
  await store.fetchOrganisations({ page: page.value, page_size: PAGE_SIZE, search: search.value || undefined })
}

onMounted(load)

let searchTimer: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 400)
})

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const totalPages = () => Math.ceil(store.orgTotal / PAGE_SIZE)
</script>

<template>
  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative max-w-xs w-full">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input v-model="search" placeholder="Search organisations..." class="pl-9" />
      </div>
      <Button @click="router.push({ name: 'backoffice-provisioning' })">
        <Building2 class="size-4 mr-2" />
        Create
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organisation</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead class="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 5" :key="i">
              <TableCell colspan="6">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="store.organisations.length === 0">
            <TableRow>
              <TableCell colspan="6" class="py-16 text-center text-muted-foreground">
                <div class="flex flex-col items-center gap-2">
                  <Building2 class="size-8 text-muted-foreground/50" />
                  <span>{{ search ? 'No organisations match your search.' : 'No organisations yet.' }}</span>
                  <Button v-if="!search" size="sm" @click="router.push({ name: 'backoffice-provisioning' })">
                    Create First Organisation
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow v-for="org in store.organisations" :key="org.id">
              <TableCell>
                <div class="flex items-center gap-3">
                  <div class="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary font-semibold text-xs shrink-0 overflow-hidden">
                    <img v-if="org.logo_url" :src="org.logo_url" :alt="org.name" class="size-full object-cover" />
                    <span v-else>{{ org.name[0] }}</span>
                  </div>
                  <span class="font-medium">{{ org.name }}</span>
                </div>
              </TableCell>
              <TableCell class="text-muted-foreground">{{ org.email }}</TableCell>
              <TableCell class="text-muted-foreground">{{ org.phone ?? '—' }}</TableCell>
              <TableCell>
                <Badge :variant="org.is_active ? 'default' : 'secondary'">
                  {{ org.is_active ? 'Active' : 'Inactive' }}
                </Badge>
              </TableCell>
              <TableCell class="text-muted-foreground text-sm">{{ formatDate(org.created_at) }}</TableCell>
              <TableCell class="text-right">
                <div class="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-8"
                    title="Edit organisation"
                    @click="openEdit(org)"
                  >
                    <Pencil class="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-8"
                    :class="org.is_active ? 'text-destructive hover:text-destructive' : 'text-accent hover:text-accent'"
                    :title="org.is_active ? 'Deactivate' : 'Activate'"
                    @click="openToggle(org)"
                  >
                    <Ban v-if="org.is_active" class="size-4" />
                    <CheckCircle v-else class="size-4" />
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
          Page {{ page }} of {{ totalPages() }} · {{ store.orgTotal }} total
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

  <!-- Edit dialog -->
  <Dialog :open="editDialog" @update:open="editDialog = $event">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Edit Organisation</DialogTitle>
        <DialogDescription>Update the organisation's basic details.</DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-4 py-2" @submit.prevent="handleEditSave">
        <div v-if="editError" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ editError }}
        </div>

        <div class="grid gap-2">
          <Label for="edit-name">Organisation Name *</Label>
          <Input id="edit-name" v-model="editForm.name" placeholder="e.g. Pine Ridge Lodge" />
        </div>

        <div class="grid gap-2">
          <Label for="edit-email">Email *</Label>
          <Input id="edit-email" v-model="editForm.email" type="email" placeholder="info@lodge.com" />
        </div>

        <div class="grid gap-2">
          <Label for="edit-phone">Phone</Label>
          <Input id="edit-phone" v-model="editForm.phone" type="tel" placeholder="+260 97 000 0000" />
        </div>
      </form>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="editSaving" @click="editDialog = false">Cancel</Button>
        <Button :disabled="editSaving" @click="handleEditSave">
          <Loader2 v-if="editSaving" class="size-4 animate-spin mr-2" />
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- Confirm toggle dialog -->
  <Dialog :open="confirmDialog.open" @update:open="confirmDialog.open = $event">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>
          {{ confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate' }} Organisation
        </DialogTitle>
        <DialogDescription>
          Are you sure you want to {{ confirmDialog.action }}
          <strong>{{ confirmDialog.org?.name }}</strong>?
          {{ confirmDialog.action === 'deactivate'
            ? 'Their staff will lose access immediately.'
            : 'Their staff will regain access to the system.' }}
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="actionLoading" @click="confirmDialog.open = false">
          Cancel
        </Button>
        <Button
          :disabled="actionLoading"
          :variant="confirmDialog.action === 'deactivate' ? 'destructive' : 'default'"
          @click="confirmToggle"
        >
          <Loader2 v-if="actionLoading" class="size-4 animate-spin mr-2" />
          {{ confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Activate' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
