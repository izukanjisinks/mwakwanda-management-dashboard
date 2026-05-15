<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useIndividualClientsStore } from '@/stores/clients'
import type { IndividualClient } from '@/types/client'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import IndividualClientDialog from '@/components/clients/IndividualClientDialog.vue'
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

const store = useIndividualClientsStore()

const dialogOpen = ref(false)
const selectedClient = ref<IndividualClient | null>(null)
const deleteDialogOpen = ref(false)
const clientToDelete = ref<IndividualClient | null>(null)
const search = ref('')
const deleting = ref(false)

const page = ref(1)
const pageSize = 10

function loadClients() {
  store.fetchClients(page.value, pageSize)
}

onMounted(loadClients)
watch(page, loadClients)

const totalPages = computed(() => Math.max(1, Math.ceil(store.total / pageSize)))

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return store.clients
  return store.clients.filter(c =>
    c.full_name.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q) ||
    c.phone.includes(q) ||
    (c.nationality ?? '').toLowerCase().includes(q),
  )
})

function openCreate() {
  selectedClient.value = null
  dialogOpen.value = true
}

function openEdit(client: IndividualClient) {
  selectedClient.value = client
  dialogOpen.value = true
}

function confirmDelete(client: IndividualClient) {
  clientToDelete.value = client
  deleteDialogOpen.value = true
}

async function handleDelete() {
  if (!clientToDelete.value) return
  deleting.value = true
  const name = clientToDelete.value.full_name
  try {
    await store.deleteClient(clientToDelete.value.id)
    toast.success(`${name} deleted.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to delete client.'))
  } finally {
    deleting.value = false
    deleteDialogOpen.value = false
    clientToDelete.value = null
  }
}
</script>

<template>
  <DashboardHeader title="Individual Clients" />

  <div class="flex flex-col gap-6 p-6">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4">
      <div class="relative max-w-xs w-full">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input v-model="search" placeholder="Search clients..." class="pl-9" />
      </div>
      <Button @click="openCreate">
        <Plus class="size-4 mr-2" />
        Add Client
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow class="bg-muted/30">
            <TableHead>Full Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>ID / Passport</TableHead>
            <TableHead>Nationality</TableHead>
            <!-- <TableHead>Status</TableHead> -->
            <TableHead class="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="store.loading">
            <TableRow v-for="i in 5" :key="i">
              <TableCell colspan="7">
                <div class="h-4 rounded bg-muted animate-pulse" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="filtered.length === 0">
            <TableRow>
              <TableCell colspan="7" class="py-16 text-center text-muted-foreground">
                {{ store.clients.length === 0 ? 'No clients yet. Add one to get started.' : 'No clients match your search.' }}
              </TableCell>
            </TableRow>
          </template>

          <template v-else>
            <TableRow v-for="client in filtered" :key="client.id">
              <TableCell class="font-medium">{{ client.full_name }}</TableCell>
              <TableCell class="text-muted-foreground">{{ client.email }}</TableCell>
              <TableCell>{{ client.phone }}</TableCell>
              <TableCell class="text-muted-foreground">{{ client.id_passport_number }}</TableCell>
              <TableCell>{{ client.nationality }}</TableCell>
              <!-- <TableCell>
                <Badge :variant="client.status === 'active' ? 'default' : 'secondary'">
                  {{ client.status === 'active' ? 'Active' : 'Inactive' }}
                </Badge>
              </TableCell> -->
              <TableCell class="text-right">
                <div class="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" class="size-8" @click="openEdit(client)">
                    <Pencil class="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDelete(client)">
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
        <span>{{ store.total }} client{{ store.total !== 1 ? 's' : '' }}</span>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" class="size-8" :disabled="page <= 1" @click="page--">
            <ChevronLeft class="size-4" />
          </Button>
          <span>{{ page }} / {{ totalPages }}</span>
          <Button variant="outline" size="icon" class="size-8" :disabled="page >= totalPages" @click="page++">
            <ChevronRight class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>

  <IndividualClientDialog
    v-model:open="dialogOpen"
    :client="selectedClient"
    @saved="dialogOpen = false"
  />

  <Dialog v-model:open="deleteDialogOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Client</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete <strong>{{ clientToDelete?.full_name }}</strong>?
          This action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deleting" @click="deleteDialogOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="handleDelete">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
