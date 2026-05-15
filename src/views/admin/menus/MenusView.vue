<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Plus, Pencil, Trash2, PackageOpen, Loader2, Check, X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useMenusStore } from '@/stores/menus'
import { useAuthStore } from '@/stores/auth'
import type { MenuItem, MenuCategory } from '@/types/menu'
import { MENU_CATEGORIES } from '@/types/menu'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const store = useMenusStore()
const authStore = useAuthStore()

const canWrite = ['admin', 'manager'].includes(authStore.userRole ?? '')

// ── Load menu + paginated items ────────────────────────────────────────────
const page = ref(1)
const categoryFilter = ref<MenuCategory | 'all'>('all')

function loadMenu(p = page.value) {
  page.value = p
  const cat = categoryFilter.value === 'all' ? undefined : categoryFilter.value
  store.currentCategory = cat
  store.fetchMenu(p, cat)
}

onMounted(() => loadMenu(1))
watch(page, () => loadMenu())
watch(categoryFilter, () => { page.value = 1; loadMenu(1) })

const totalPages = computed(() => Math.max(1, Math.ceil(store.itemsTotal / store.itemsPageSize)))
const items = computed(() => store.menu?.items?.data ?? [])

// ── Menu name inline edit ──────────────────────────────────────────────────
const editingName = ref(false)
const nameForm = ref('')
const savingName = ref(false)

function startEditName() {
  nameForm.value = store.menu?.name ?? ''
  editingName.value = true
}

function cancelEditName() { editingName.value = false }

async function saveMenuName() {
  if (!store.menu || !nameForm.value.trim()) return
  savingName.value = true
  try {
    await store.upsertMenu({ name: nameForm.value.trim(), is_active: store.menu.is_active })
    editingName.value = false
    toast.success('Menu name updated.')
  } catch {
    toast.error('Failed to update menu name.')
  } finally {
    savingName.value = false
  }
}

// ── Add item form ──────────────────────────────────────────────────────────
const itemForm = ref({
  name: '',
  description: '',
  price: '',
  category: '' as MenuCategory | '',
  is_available: true,
})
const savingItem = ref(false)
const itemFormError = ref('')

function resetItemForm() {
  itemForm.value = { name: '', description: '', price: '', category: '', is_available: true }
  itemFormError.value = ''
}

async function handleAddItem() {
  itemFormError.value = ''
  const priceNum = parseFloat(itemForm.value.price)
  if (!itemForm.value.name.trim()) { itemFormError.value = 'Name is required.'; return }
  if (isNaN(priceNum) || priceNum < 0) { itemFormError.value = 'Enter a valid price.'; return }

  savingItem.value = true
  try {
    const payload = {
      name: itemForm.value.name.trim(),
      description: itemForm.value.description.trim() || undefined,
      price: priceNum,
      category: itemForm.value.category || undefined,
      is_available: itemForm.value.is_available,
    }
    console.log('[menu] create item payload', payload)
    await store.createMenuItem(payload)
    resetItemForm()
    toast.success('Item added.')
  } catch (err: any) {
    itemFormError.value = err?.error?.message ?? 'Failed to add item.'
  } finally {
    savingItem.value = false
  }
}

// ── Inline item edit ───────────────────────────────────────────────────────
const editingItem = ref<MenuItem | null>(null)
const editForm = ref({
  name: '',
  description: '',
  price: '',
  category: '' as MenuCategory | '',
  is_available: true,
})
const savingEdit = ref(false)

function startEdit(item: MenuItem) {
  editingItem.value = item
  editForm.value = {
    name: item.name,
    description: item.description ?? '',
    price: String(item.price),
    category: item.category ?? '',
    is_available: item.is_available,
  }
}

function cancelEdit() { editingItem.value = null }

async function handleSaveEdit() {
  if (!editingItem.value) return
  const priceNum = parseFloat(editForm.value.price)
  if (isNaN(priceNum) || priceNum < 0) { toast.error('Enter a valid price.'); return }

  savingEdit.value = true
  try {
    await store.updateMenuItem(editingItem.value.id, {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || undefined,
      price: priceNum,
      category: editForm.value.category || undefined,
      is_available: editForm.value.is_available,
    })
    editingItem.value = null
    toast.success('Item updated.')
  } catch (err: any) {
    toast.error(err?.error?.message ?? 'Failed to update item.')
  } finally {
    savingEdit.value = false
  }
}

// ── Delete item ────────────────────────────────────────────────────────────
const deleteItemOpen = ref(false)
const itemToDelete = ref<MenuItem | null>(null)
const deletingItem = ref(false)

function confirmDeleteItem(item: MenuItem) {
  itemToDelete.value = item
  deleteItemOpen.value = true
}

async function handleDeleteItem() {
  if (!itemToDelete.value) return
  deletingItem.value = true
  try {
    await store.deleteMenuItem(itemToDelete.value.id)
    toast.success('Item removed.')
  } catch (err: any) {
    toast.error(err?.error?.message ?? 'Failed to remove item.')
  } finally {
    deletingItem.value = false
    deleteItemOpen.value = false
    itemToDelete.value = null
  }
}


function categoryLabel(cat?: MenuCategory) {
  return MENU_CATEGORIES.find(c => c.value === cat)?.label ?? '—'
}
</script>

<template>
  <DashboardHeader :title="store.menu?.name ?? 'Menu'">
    <template v-if="canWrite && store.menu" #actions>
      <template v-if="editingName">
        <Input v-model="nameForm" class="h-8 w-48 text-sm" @keyup.enter="saveMenuName" @keyup.escape="cancelEditName" />
        <Button size="icon" variant="ghost" class="size-8" :disabled="savingName" @click="saveMenuName">
          <Check class="size-4" />
        </Button>
        <Button size="icon" variant="ghost" class="size-8" @click="cancelEditName">
          <X class="size-4" />
        </Button>
      </template>
      <Button v-else variant="outline" size="sm" @click="startEditName">
        <Pencil class="size-4 mr-1.5" />
        Rename Menu
      </Button>
    </template>
  </DashboardHeader>

  <div class="flex flex-col gap-6 p-6">

    <!-- Loading skeleton -->
    <template v-if="store.menuLoading && !store.menu">
      <div class="rounded-xl border bg-card p-6 space-y-4">
        <div class="h-5 w-32 rounded bg-muted animate-pulse" />
        <div class="grid grid-cols-4 gap-4">
          <div v-for="i in 4" :key="i" class="h-9 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div class="h-64 rounded-xl bg-muted animate-pulse" />
    </template>

    <template v-else-if="store.menu">
      <!-- ── Add Item Form ──────────────────────────────────────────────────── -->
      <div v-if="canWrite" class="rounded-xl border bg-card p-6">
        <div class="mb-5">
          <h3 class="font-semibold text-base">Add Menu Item</h3>
          <p class="text-sm text-muted-foreground mt-0.5">Fill in the details below and click Add Item.</p>
        </div>

        <div v-if="itemFormError" class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ itemFormError }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="grid gap-2">
            <Label>Item Name <span class="text-destructive">*</span></Label>
            <Input v-model="itemForm.name" placeholder="e.g. Grilled Chicken" />
          </div>

          <div class="grid gap-2">
            <Label>Category</Label>
            <Select v-model="itemForm.category">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="cat in MENU_CATEGORIES" :key="cat.value" :value="cat.value">
                  {{ cat.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="grid gap-2">
            <Label>Price (ZMW) <span class="text-destructive">*</span></Label>
            <Input v-model="itemForm.price" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>

          <div class="grid gap-2">
            <Label>Availability</Label>
            <div class="flex items-center gap-2 h-9">
              <button
                type="button"
                :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', itemForm.is_available ? 'bg-primary' : 'bg-input']"
                @click="itemForm.is_available = !itemForm.is_available"
              >
                <span :class="['pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform', itemForm.is_available ? 'translate-x-4' : 'translate-x-0']" />
              </button>
              <span class="text-sm text-muted-foreground">{{ itemForm.is_available ? 'Available' : 'Unavailable' }}</span>
            </div>
          </div>

          <div class="grid gap-2 sm:col-span-2 lg:col-span-3">
            <Label>Description <span class="text-muted-foreground text-xs">(optional)</span></Label>
            <Input v-model="itemForm.description" placeholder="Brief description of the item…" />
          </div>

          <div class="flex items-end">
            <Button class="w-full" :disabled="savingItem || !itemForm.name.trim() || !itemForm.price" @click="handleAddItem">
              <Loader2 v-if="savingItem" class="size-4 mr-2 animate-spin" />
              <Plus v-else class="size-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </div>

      <!-- ── Items Table ─────────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-4">
        <!-- Category filter -->
        <div class="flex items-center gap-3">
          <Select v-model="categoryFilter">
            <SelectTrigger class="w-48">
              <SelectValue placeholder="All Items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem v-for="cat in MENU_CATEGORIES" :key="cat.value" :value="cat.value">
                {{ cat.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Empty -->
        <div v-if="items.length === 0 && !store.menuLoading" class="rounded-xl border bg-card flex flex-col items-center justify-center py-20 text-center gap-3">
          <PackageOpen class="size-9 text-muted-foreground/30" />
          <div>
            <p class="text-sm font-medium text-muted-foreground">No items yet</p>
            <p v-if="canWrite" class="text-xs text-muted-foreground mt-0.5">Use the form above to add items to this menu.</p>
          </div>
        </div>

        <!-- Table -->
        <div v-else class="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow class="bg-muted/30">
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead v-if="canWrite" class="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <!-- Loading rows -->
              <template v-if="store.menuLoading">
                <TableRow v-for="i in store.itemsPageSize" :key="i">
                  <TableCell colspan="5">
                    <div class="h-4 rounded bg-muted animate-pulse" />
                  </TableCell>
                </TableRow>
              </template>

              <template v-else>
                <template v-for="item in items" :key="item.id">
                  <!-- Display row -->
                  <TableRow v-if="editingItem?.id !== item.id" :class="['transition-colors', !item.is_available && 'opacity-50']">
                    <TableCell>
                      <p class="font-medium text-sm">{{ item.name }}</p>
                      <p v-if="item.description" class="text-xs text-muted-foreground mt-0.5">{{ item.description }}</p>
                    </TableCell>
                    <TableCell>
                      <span v-if="item.category" class="inline-block px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs font-medium uppercase tracking-tight">
                        {{ categoryLabel(item.category) }}
                      </span>
                      <span v-else class="text-muted-foreground text-sm">—</span>
                    </TableCell>
                    <TableCell class="font-medium text-sm">ZMW {{ item.price.toLocaleString() }}</TableCell>
                    <TableCell>
                      <Badge :variant="item.is_available ? 'default' : 'secondary'" class="text-xs">
                        {{ item.is_available ? 'Available' : 'Sold Out' }}
                      </Badge>
                    </TableCell>
                    <TableCell v-if="canWrite" class="text-right">
                      <Button variant="ghost" size="icon" class="size-8" @click="startEdit(item)">
                        <Pencil class="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click="confirmDeleteItem(item)">
                        <Trash2 class="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  <!-- Inline edit row -->
                  <TableRow v-else class="bg-muted/20">
                    <TableCell>
                      <div class="flex flex-col gap-1.5">
                        <Input v-model="editForm.name" placeholder="Item name" class="h-8 text-sm" />
                        <Input v-model="editForm.description" placeholder="Description (optional)" class="h-8 text-sm" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select v-model="editForm.category">
                        <SelectTrigger class="h-8 text-sm w-44">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem v-for="cat in MENU_CATEGORIES" :key="cat.value" :value="cat.value">
                            {{ cat.label }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input v-model="editForm.price" type="number" min="0" step="0.01" class="h-8 text-sm w-28" />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', editForm.is_available ? 'bg-primary' : 'bg-input']"
                        @click="editForm.is_available = !editForm.is_available"
                      >
                        <span :class="['pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform', editForm.is_available ? 'translate-x-4' : 'translate-x-0']" />
                      </button>
                    </TableCell>
                    <TableCell class="text-right">
                      <div class="flex items-center justify-end gap-1">
                        <Button size="sm" :disabled="savingEdit" @click="handleSaveEdit">
                          <Loader2 v-if="savingEdit" class="size-3.5 animate-spin" />
                          <span v-else>Save</span>
                        </Button>
                        <Button size="sm" variant="ghost" @click="cancelEdit">Cancel</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </template>
              </template>
            </TableBody>
          </Table>

          <!-- Pagination -->
          <div class="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
            <span>{{ store.itemsTotal }} item{{ store.itemsTotal !== 1 ? 's' : '' }}</span>
            <div class="flex items-center gap-2">
              <Button variant="outline" size="icon" class="size-8" :disabled="page <= 1 || store.menuLoading" @click="page--">
                <ChevronLeft class="size-4" />
              </Button>
              <span>{{ page }} / {{ totalPages }}</span>
              <Button variant="outline" size="icon" class="size-8" :disabled="page >= totalPages || store.menuLoading" @click="page++">
                <ChevronRight class="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- No menu -->
    <div v-else class="flex flex-col items-center justify-center py-24 text-center gap-3">
      <PackageOpen class="size-10 text-muted-foreground/40" />
      <p class="text-muted-foreground">No menu found.</p>
    </div>

  </div>

  <!-- Delete Item Confirm -->
  <Dialog v-model:open="deleteItemOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Remove Item</DialogTitle>
        <DialogDescription>
          Are you sure you want to remove <strong>{{ itemToDelete?.name }}</strong> from this menu?
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deletingItem" @click="deleteItemOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deletingItem" @click="handleDeleteItem">Remove</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
