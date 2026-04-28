<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Plus, Pencil, Trash2, PackageOpen, Loader2, ChevronLeft } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useMenusStore } from '@/stores/menus'
import { useAuthStore } from '@/stores/auth'
import type { Menu, MenuItem, MenuCategory } from '@/types/menu'
import { MENU_CATEGORIES } from '@/types/menu'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import MenuDialog from '@/components/menus/MenuDialog.vue'
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
import { menusApi } from '@/services/api/menus'

const store = useMenusStore()
const authStore = useAuthStore()

const canWrite = ['admin', 'manager'].includes(authStore.userRole ?? '')

// ── View state ─────────────────────────────────────────────────────────────
// null = menu list, Menu = menu detail with item builder
const activeMenu = ref<Menu | null>(null)

// ── Menu management ────────────────────────────────────────────────────────
const menuDialogOpen = ref(false)
const selectedMenu = ref<Menu | null>(null)
const deleteMenuOpen = ref(false)
const menuToDelete = ref<Menu | null>(null)
const deletingMenu = ref(false)

// ── Item form (add new item inline) ───────────────────────────────────────
const itemForm = ref({
  name: '',
  description: '',
  price: '',
  category: '' as MenuCategory | '',
  is_available: true,
})
const savingItem = ref(false)
const itemFormError = ref('')

// ── Item management ────────────────────────────────────────────────────────
const editingItem = ref<MenuItem | null>(null)
const editForm = ref({
  name: '',
  description: '',
  price: '',
  category: '' as MenuCategory | '',
  is_available: true,
})
const savingEdit = ref(false)
const deleteItemOpen = ref(false)
const itemToDelete = ref<MenuItem | null>(null)
const deletingItem = ref(false)

// ── Category filter for item table ─────────────────────────────────────────
const categoryFilter = ref<MenuCategory | 'all'>('all')

const filteredItems = computed(() => {
  const items = activeMenu.value?.items ?? []
  if (categoryFilter.value === 'all') return items
  return items.filter(i => i.category === categoryFilter.value)
})

const usedCategories = computed(() => {
  const cats = new Set((activeMenu.value?.items ?? []).map(i => i.category).filter(Boolean))
  return MENU_CATEGORIES.filter(c => cats.has(c.value))
})

function categoryLabel(cat?: MenuCategory) {
  return MENU_CATEGORIES.find(c => c.value === cat)?.label ?? '—'
}

onMounted(() => store.fetchMenus())

// ── Menu actions ───────────────────────────────────────────────────────────
function openCreateMenu() {
  selectedMenu.value = null
  menuDialogOpen.value = true
}

function openEditMenu(menu: Menu) {
  selectedMenu.value = menu
  menuDialogOpen.value = true
}

function confirmDeleteMenu(menu: Menu) {
  menuToDelete.value = menu
  deleteMenuOpen.value = true
}

async function handleDeleteMenu() {
  if (!menuToDelete.value) return
  deletingMenu.value = true
  const name = menuToDelete.value.name
  try {
    await store.deleteMenu(menuToDelete.value.id)
    if (activeMenu.value?.id === menuToDelete.value.id) activeMenu.value = null
    toast.success(`"${name}" deleted.`)
  } catch (err: any) {
    toast.error(err?.error?.message ?? 'Failed to delete menu.')
  } finally {
    deletingMenu.value = false
    deleteMenuOpen.value = false
    menuToDelete.value = null
  }
}

async function toggleMenuActive(menu: Menu) {
  try {
    const updated = await store.updateMenu(menu.id, { is_active: !menu.is_active })
    if (activeMenu.value?.id === menu.id) activeMenu.value = updated
  } catch (err: any) {
    toast.error(err?.error?.message ?? 'Failed to update menu.')
  }
}

// ── Open menu detail ───────────────────────────────────────────────────────
async function openMenu(menu: Menu) {
  activeMenu.value = menu
  categoryFilter.value = 'all'
  resetItemForm()
  // Fetch full menu with items
  try {
    const full = await menusApi.get(menu.id)
    activeMenu.value = full
    const idx = store.menus.findIndex(m => m.id === menu.id)
    if (idx !== -1) store.menus[idx] = full
  } catch {
    // Keep basic data
  }
}

function goBack() {
  activeMenu.value = null
  editingItem.value = null
}

// ── Add item ───────────────────────────────────────────────────────────────
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
    await store.createMenuItem(activeMenu.value!.id, {
      name: itemForm.value.name.trim(),
      description: itemForm.value.description.trim() || undefined,
      price: priceNum,
      category: itemForm.value.category || undefined,
      is_available: itemForm.value.is_available,
    })
    activeMenu.value = store.menus.find(m => m.id === activeMenu.value!.id) ?? activeMenu.value
    resetItemForm()
    toast.success('Item added.')
  } catch (err: any) {
    itemFormError.value = err?.error?.message ?? 'Failed to add item.'
  } finally {
    savingItem.value = false
  }
}

// ── Edit item inline ───────────────────────────────────────────────────────
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

function cancelEdit() {
  editingItem.value = null
}

async function handleSaveEdit() {
  if (!editingItem.value || !activeMenu.value) return
  const priceNum = parseFloat(editForm.value.price)
  if (isNaN(priceNum) || priceNum < 0) { toast.error('Enter a valid price.'); return }

  savingEdit.value = true
  try {
    await store.updateMenuItem(activeMenu.value.id, editingItem.value.id, {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || undefined,
      price: priceNum,
      category: editForm.value.category || undefined,
      is_available: editForm.value.is_available,
    })
    activeMenu.value = store.menus.find(m => m.id === activeMenu.value!.id) ?? activeMenu.value
    editingItem.value = null
    toast.success('Item updated.')
  } catch (err: any) {
    toast.error(err?.error?.message ?? 'Failed to update item.')
  } finally {
    savingEdit.value = false
  }
}

function confirmDeleteItem(item: MenuItem) {
  itemToDelete.value = item
  deleteItemOpen.value = true
}

async function handleDeleteItem() {
  if (!itemToDelete.value || !activeMenu.value) return
  deletingItem.value = true
  try {
    await store.deleteMenuItem(activeMenu.value.id, itemToDelete.value.id)
    activeMenu.value = store.menus.find(m => m.id === activeMenu.value!.id) ?? activeMenu.value
    toast.success('Item removed.')
  } catch (err: any) {
    toast.error(err?.error?.message ?? 'Failed to remove item.')
  } finally {
    deletingItem.value = false
    deleteItemOpen.value = false
    itemToDelete.value = null
  }
}
</script>

<template>
  <!-- ── Menu list view ─────────────────────────────────────────────────────── -->
  <template v-if="!activeMenu">
    <DashboardHeader title="Menus" />

    <div class="flex flex-col gap-6 p-6">
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Create and manage food menus. Click a menu to add and manage its items.
        </p>
        <Button v-if="canWrite" @click="openCreateMenu">
          <Plus class="size-4 mr-2" />
          New Menu
        </Button>
      </div>

      <!-- Loading -->
      <div v-if="store.menusLoading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="i in 3" :key="i" class="h-36 rounded-xl bg-muted animate-pulse" />
      </div>

      <!-- Empty -->
      <div v-else-if="store.menus.length === 0" class="flex flex-col items-center justify-center py-24 text-center gap-3">
        <PackageOpen class="size-10 text-muted-foreground/40" />
        <p class="text-muted-foreground">No menus yet. Create one to get started.</p>
      </div>

      <!-- Menu cards -->
      <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="menu in store.menus"
          :key="menu.id"
          :class="[
            'rounded-xl border bg-card p-5 flex flex-col gap-3 transition-all cursor-pointer hover:border-primary/40 hover:shadow-sm',
            !menu.is_active && 'opacity-60',
          ]"
          @click="openMenu(menu)"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h3 class="font-semibold truncate">{{ menu.name }}</h3>
              <p v-if="menu.description" class="text-xs text-muted-foreground mt-0.5 line-clamp-2">{{ menu.description }}</p>
            </div>
            <Badge :variant="menu.is_active ? 'default' : 'secondary'" class="shrink-0">
              {{ menu.is_active ? 'Active' : 'Inactive' }}
            </Badge>
          </div>

          <p class="text-xs text-muted-foreground">
            {{ menu.items?.length ?? 0 }} item{{ (menu.items?.length ?? 0) !== 1 ? 's' : '' }}
          </p>

          <div class="mt-auto flex items-center justify-between pt-3 border-t" @click.stop>
            <button
              v-if="canWrite"
              type="button"
              :class="[
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                menu.is_active ? 'bg-primary' : 'bg-input',
              ]"
              @click="toggleMenuActive(menu)"
            >
              <span
                :class="[
                  'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform',
                  menu.is_active ? 'translate-x-4' : 'translate-x-0',
                ]"
              />
            </button>
            <div class="flex items-center gap-1 ml-auto">
              <Button v-if="canWrite" variant="ghost" size="icon" class="size-8" @click.stop="openEditMenu(menu)">
                <Pencil class="size-4" />
              </Button>
              <Button v-if="canWrite" variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" @click.stop="confirmDeleteMenu(menu)">
                <Trash2 class="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>

  <!-- ── Menu detail / item builder ─────────────────────────────────────────── -->
  <template v-else>
    <DashboardHeader :title="activeMenu.name">
      <template #actions>
        <Button variant="outline" size="sm" @click="goBack">
          <ChevronLeft class="size-4 mr-1" />
          All Menus
        </Button>
        <Button v-if="canWrite" variant="outline" size="sm" @click="openEditMenu(activeMenu)">
          <Pencil class="size-4 mr-1.5" />
          Edit Menu
        </Button>
      </template>
    </DashboardHeader>

    <div class="flex flex-col gap-6 p-6">

      <!-- ── Add Item Form ──────────────────────────────────────────────────── -->
      <div v-if="canWrite" class="rounded-xl border bg-card p-6">
        <div class="mb-5">
          <h3 class="font-semibold text-base">Add Item to Menu</h3>
          <p class="text-sm text-muted-foreground mt-0.5">Fill in the details below and click Add Item.</p>
        </div>

        <div v-if="itemFormError" class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ itemFormError }}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Name -->
          <div class="grid gap-2 lg:col-span-1">
            <Label>Item Name <span class="text-destructive">*</span></Label>
            <Input v-model="itemForm.name" placeholder="e.g. Grilled Chicken" />
          </div>

          <!-- Category -->
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

          <!-- Price -->
          <div class="grid gap-2">
            <Label>Price (ZMW) <span class="text-destructive">*</span></Label>
            <Input
              v-model="itemForm.price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>

          <!-- Availability + Add button -->
          <div class="grid gap-2">
            <Label>Availability</Label>
            <div class="flex items-center gap-2 h-9">
              <button
                type="button"
                :class="[
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  itemForm.is_available ? 'bg-primary' : 'bg-input',
                ]"
                @click="itemForm.is_available = !itemForm.is_available"
              >
                <span
                  :class="[
                    'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform',
                    itemForm.is_available ? 'translate-x-4' : 'translate-x-0',
                  ]"
                />
              </button>
              <span class="text-sm text-muted-foreground">{{ itemForm.is_available ? 'Available' : 'Unavailable' }}</span>
            </div>
          </div>

          <!-- Description spans full width -->
          <div class="grid gap-2 sm:col-span-2 lg:col-span-3">
            <Label>Description <span class="text-muted-foreground text-xs">(optional)</span></Label>
            <Input v-model="itemForm.description" placeholder="Brief description of the item…" />
          </div>

          <!-- Add button -->
          <div class="flex items-end">
            <Button
              class="w-full"
              :disabled="savingItem || !itemForm.name.trim() || !itemForm.price"
              @click="handleAddItem"
            >
              <Loader2 v-if="savingItem" class="size-4 mr-2 animate-spin" />
              <Plus v-else class="size-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </div>

      <!-- ── Items Table ─────────────────────────────────────────────────────── -->
      <div class="flex flex-col gap-4">
        <!-- Category filter chips -->
        <div v-if="(activeMenu.items?.length ?? 0) > 0" class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            :class="[
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
              categoryFilter === 'all'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-primary/40',
            ]"
            @click="categoryFilter = 'all'"
          >
            All Items
          </button>
          <button
            v-for="cat in usedCategories"
            :key="cat.value"
            type="button"
            :class="[
              'px-4 py-1.5 rounded-full text-sm font-medium transition-all border',
              categoryFilter === cat.value
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-muted-foreground border-border hover:border-primary/40',
            ]"
            @click="categoryFilter = cat.value"
          >
            {{ cat.label }}
          </button>
        </div>

        <!-- Empty state -->
        <div v-if="filteredItems.length === 0" class="rounded-xl border bg-card flex flex-col items-center justify-center py-20 text-center gap-3">
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
                <TableHead class="font-semibold">Item Name</TableHead>
                <TableHead class="font-semibold">Category</TableHead>
                <TableHead class="font-semibold">Price</TableHead>
                <TableHead class="font-semibold">Status</TableHead>
                <TableHead v-if="canWrite" class="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <template v-for="item in filteredItems" :key="item.id">
                <!-- Display row -->
                <TableRow v-if="editingItem?.id !== item.id" :class="['transition-colors', !item.is_available && 'opacity-50']">
                  <TableCell>
                    <div>
                      <p class="font-medium text-sm">{{ item.name }}</p>
                      <p v-if="item.description" class="text-xs text-muted-foreground mt-0.5">{{ item.description }}</p>
                    </div>
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
                      :class="[
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                        editForm.is_available ? 'bg-primary' : 'bg-input',
                      ]"
                      @click="editForm.is_available = !editForm.is_available"
                    >
                      <span
                        :class="[
                          'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform',
                          editForm.is_available ? 'translate-x-4' : 'translate-x-0',
                        ]"
                      />
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
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  </template>

  <!-- Menu Dialog (create/edit menu) -->
  <MenuDialog
    v-model:open="menuDialogOpen"
    :menu="selectedMenu"
    @saved="menuDialogOpen = false"
  />

  <!-- Delete Menu Confirm -->
  <Dialog v-model:open="deleteMenuOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>Delete Menu</DialogTitle>
        <DialogDescription>
          Are you sure you want to delete <strong>{{ menuToDelete?.name }}</strong>?
          All items in this menu will also be removed.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="deletingMenu" @click="deleteMenuOpen = false">Cancel</Button>
        <Button variant="destructive" :disabled="deletingMenu" @click="handleDeleteMenu">Delete</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

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
