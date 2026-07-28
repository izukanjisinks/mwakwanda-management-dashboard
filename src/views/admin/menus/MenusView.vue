<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Plus, Pencil, Trash2, PackageOpen, Loader2, Check, X, ChevronLeft, ChevronRight, ImagePlus, UtensilsCrossed, Layers } from 'lucide-vue-next'
import { Switch } from '@/components/ui/switch'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useMenusStore } from '@/stores/menus'
import { useAuthStore } from '@/stores/auth'
import { uploadMenuItemImage, deleteMenuItemImage } from '@/services/storage'
import type { MenuItem, MenuCategory, ProductionArea } from '@/types/menu'
import { MENU_CATEGORIES, PRODUCTION_AREAS } from '@/types/menu'
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

const canWrite = ['admin', 'branch_admin', 'manager'].includes(authStore.userRole ?? '')

// Buffet packages are prepared in bulk, not made-to-order — bar/grill don't apply.
const BUFFET_PRODUCTION_AREAS = PRODUCTION_AREAS.filter(a => a.value === 'kitchen' || a.value === 'bakery')

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
  } catch (err) {
    toast.error(getApiError(err, 'Failed to update menu name.'))
  } finally {
    savingName.value = false
  }
}

// ── Add item image picker ──────────────────────────────────────────────────
const addImageFile = ref<File | null>(null)
const addImagePreview = ref('')
const addImageDragging = ref(false)
const addImageInput = ref<HTMLInputElement | null>(null)

const IMAGE_ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const IMAGE_MAX = 10 * 1024 * 1024

function onAddImageFiles(files: FileList | File[]) {
  const file = Array.from(files)[0]
  if (!file) return
  if (!IMAGE_ACCEPTED.includes(file.type)) {
    toast.error('Unsupported format. Use JPG, PNG, or WebP.')
    return
  }
  if (file.size > IMAGE_MAX) {
    toast.error('Image exceeds the 10 MB limit.')
    return
  }
  if (addImagePreview.value) URL.revokeObjectURL(addImagePreview.value)
  addImageFile.value = file
  addImagePreview.value = URL.createObjectURL(file)
}

function clearAddImage() {
  if (addImagePreview.value) URL.revokeObjectURL(addImagePreview.value)
  addImageFile.value = null
  addImagePreview.value = ''
  if (addImageInput.value) addImageInput.value.value = ''
}

function onAddImageInputChange(e: Event) {
  const t = e.target as HTMLInputElement
  if (t.files) onAddImageFiles(t.files)
}

function onEditImageInputChange(e: Event) {
  const t = e.target as HTMLInputElement
  if (t.files) onEditImageFiles(t.files)
}

// ── Add item form ──────────────────────────────────────────────────────────
const itemForm = ref({
  name: '',
  description: '',
  price: '',
  category: '' as MenuCategory | '',
  production_area: '' as ProductionArea | '',
  is_available: true,
})
const savingItem = ref(false)
const itemFormError = ref('')

function resetItemForm() {
  itemForm.value = { name: '', description: '', price: '', category: '', production_area: '', is_available: true }
  itemFormError.value = ''
  clearAddImage()
}

async function handleAddItem() {
  if (isDefaultMenu.value) { createMenuOpen.value = true; return }

  itemFormError.value = ''
  const priceNum = parseFloat(itemForm.value.price)
  if (!itemForm.value.name.trim()) { itemFormError.value = 'Name is required.'; return }
  if (!itemForm.value.category) { itemFormError.value = 'Category is required.'; return }
  if (!itemForm.value.production_area) { itemFormError.value = 'Production area is required.'; return }
  if (isNaN(priceNum) || priceNum < 0) { itemFormError.value = 'Enter a valid price.'; return }

  savingItem.value = true
  try {
    const item = await store.createMenuItem({
      name: itemForm.value.name.trim(),
      description: itemForm.value.description.trim() || undefined,
      price: priceNum,
      category: itemForm.value.category || undefined,
      production_area: itemForm.value.production_area || undefined,
      is_available: itemForm.value.is_available,
    })

    // Upload image after item is created (we now have the item ID)
    if (addImageFile.value) {
      try {
        const url = await uploadMenuItemImage(item.id, addImageFile.value)
        await store.updateMenuItem(item.id, { image_url: url })
      } catch {
        toast.error('Item created but image upload failed.')
      }
    }

    resetItemForm()
    toast.success('Item added.')
  } catch (err) {
    itemFormError.value = getApiError(err, 'Failed to add item.')
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
  production_area: '' as ProductionArea | '',
  is_available: true,
})
const editImageFile = ref<File | null>(null)
const editImagePreview = ref('')
const editImageInput = ref<HTMLInputElement | null>(null)
const savingEdit = ref(false)

function onEditImageFiles(files: FileList | File[]) {
  const file = Array.from(files)[0]
  if (!file) return
  if (!IMAGE_ACCEPTED.includes(file.type)) { toast.error('Unsupported format. Use JPG, PNG, or WebP.'); return }
  if (file.size > IMAGE_MAX) { toast.error('Image exceeds the 10 MB limit.'); return }
  if (editImagePreview.value && !editingItem.value?.image_url) URL.revokeObjectURL(editImagePreview.value)
  editImageFile.value = file
  editImagePreview.value = URL.createObjectURL(file)
}

function clearEditImage() {
  if (editImagePreview.value && !editingItem.value?.image_url) URL.revokeObjectURL(editImagePreview.value)
  editImageFile.value = null
  editImagePreview.value = editingItem.value?.image_url ?? ''
  if (editImageInput.value) editImageInput.value.value = ''
}

function startEdit(item: MenuItem) {
  // Buffet packages carry structured data that doesn't fit the compact inline
  // row — edit them in a dedicated dialog instead.
  if (item.category === 'buffet') {
    startEditBuffet(item)
    return
  }
  editingItem.value = item
  editForm.value = {
    name: item.name,
    description: item.description ?? '',
    price: String(item.price),
    category: item.category ?? '',
    production_area: item.production_area ?? '',
    is_available: item.is_available,
  }
  editImageFile.value = null
  editImagePreview.value = item.image_url ?? ''
}

function cancelEdit() {
  if (editImagePreview.value && !editingItem.value?.image_url) URL.revokeObjectURL(editImagePreview.value)
  editingItem.value = null
  editImageFile.value = null
  editImagePreview.value = ''
}

async function handleSaveEdit() {
  if (!editingItem.value) return
  const priceNum = parseFloat(editForm.value.price)
  if (isNaN(priceNum) || priceNum < 0) { toast.error('Enter a valid price.'); return }

  if (!editForm.value.production_area) { toast.error('Production area is required.'); return }

  savingEdit.value = true
  try {
    let image_url = editingItem.value.image_url

    if (editImageFile.value) {
      // Delete old image if there was one
      if (editingItem.value.image_url) {
        try { await deleteMenuItemImage(editingItem.value.image_url) } catch { /* ignore */ }
      }
      image_url = await uploadMenuItemImage(editingItem.value.id, editImageFile.value)
    }

    await store.updateMenuItem(editingItem.value.id, {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim() || undefined,
      price: priceNum,
      category: editForm.value.category || undefined,
      production_area: editForm.value.production_area || undefined,
      image_url,
      is_available: editForm.value.is_available,
    })
    cancelEdit()
    toast.success('Item updated.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to update item.'))
  } finally {
    savingEdit.value = false
  }
}

// ── Create menu dialog ─────────────────────────────────────────────────────
const createMenuOpen = ref(false)
const createMenuName = ref('')
const creatingMenu = ref(false)

const isDefaultMenu = computed(() =>
  !store.menu?.org_id || store.menu.org_id === '00000000-0000-0000-0000-000000000000'
)

async function handleCreateMenu() {
  if (!createMenuName.value.trim()) return
  creatingMenu.value = true
  try {
    await store.upsertMenu({ name: createMenuName.value.trim(), is_active: true })
    createMenuOpen.value = false
    createMenuName.value = ''
    loadMenu(1)
    toast.success('Menu created.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to create menu.'))
  } finally {
    creatingMenu.value = false
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
    if (itemToDelete.value.image_url) {
      try { await deleteMenuItemImage(itemToDelete.value.image_url) } catch { /* ignore */ }
    }
    await store.deleteMenuItem(itemToDelete.value.id)
    toast.success('Item removed.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to remove item.'))
  } finally {
    deletingItem.value = false
    deleteItemOpen.value = false
    itemToDelete.value = null
  }
}

function categoryLabel(cat?: MenuCategory) {
  return MENU_CATEGORIES.find(c => c.value === cat)?.label ?? '—'
}

// ── Buffet package helpers ─────────────────────────────────────────────────
const BUFFET_TYPES = [
  { value: 'breakfast', label: 'Breakfast'      },
  { value: 'brunch',    label: 'Brunch'         },
  { value: 'lunch',     label: 'Lunch'          },
  { value: 'dinner',    label: 'Dinner'         },
  { value: 'supper',    label: 'Supper'         },
  { value: 'special',   label: "Chef's Special" },
]

const DISH_COURSES = [
  { value: 'starters',  label: 'Starters' },
  { value: 'mains',     label: 'Mains'    },
  { value: 'sides',     label: 'Sides'    },
  { value: 'desserts',  label: 'Desserts' },
  { value: 'drinks',    label: 'Drinks'   },
]

interface BuffetDish { id: string; course: string; name: string }

function parseBuffetData(item: MenuItem) {
  if (item.category !== 'buffet') return null
  return item.buffet_data ?? null
}

// ── Item type toggle ────────────────────────────────────────────────────────
const itemType = ref<'single' | 'buffet'>('single')

function switchItemType(type: 'single' | 'buffet') {
  itemType.value = type
  resetItemForm()
  resetBuffetForm()
}

// ── Buffet form ─────────────────────────────────────────────────────────────
const buffetForm = ref({
  name: '',
  buffet_type: '',
  price: '',
  min_covers: '',
  production_area: '' as ProductionArea | '',
  is_available: true,
  note: '',
  dishes: [] as BuffetDish[],
})
const buffetFormError = ref('')
const savingBuffet = ref(false)

function resetBuffetForm() {
  buffetForm.value = { name: '', buffet_type: '', price: '', min_covers: '', production_area: '', is_available: true, note: '', dishes: [] }
  buffetFormError.value = ''
  clearAddImage()
}

function addDish() {
  buffetForm.value.dishes.push({ id: crypto.randomUUID(), course: 'mains', name: '' })
}

function removeDish(id: string) {
  buffetForm.value.dishes = buffetForm.value.dishes.filter(d => d.id !== id)
}

async function handleAddBuffet() {
  if (isDefaultMenu.value) { createMenuOpen.value = true; return }

  buffetFormError.value = ''
  const priceNum = parseFloat(buffetForm.value.price)
  const minCoversNum = parseInt(buffetForm.value.min_covers)
  if (!buffetForm.value.name.trim())   { buffetFormError.value = 'Buffet name is required.'; return }
  if (!buffetForm.value.buffet_type)   { buffetFormError.value = 'Select a buffet type.'; return }
  if (!buffetForm.value.production_area) { buffetFormError.value = 'Production area is required.'; return }
  if (isNaN(priceNum) || priceNum < 0) { buffetFormError.value = 'Enter a valid price per person.'; return }
  if (isNaN(minCoversNum) || minCoversNum < 1) { buffetFormError.value = 'Enter a valid minimum covers.'; return }
  if (!buffetForm.value.dishes.length) { buffetFormError.value = 'Add at least one dish.'; return }
  if (buffetForm.value.dishes.some(d => !d.name.trim())) { buffetFormError.value = 'All dish names must be filled in.'; return }

  savingBuffet.value = true
  try {
    const item = await store.createMenuItem({
      name:         buffetForm.value.name.trim(),
      description:  buffetForm.value.note.trim() || undefined,
      price:        priceNum,
      category:     'buffet',
      production_area: buffetForm.value.production_area || undefined,
      is_available: buffetForm.value.is_available,
      buffet_data: {
        buffet_type: buffetForm.value.buffet_type,
        min_covers:  minCoversNum,
        dishes:      buffetForm.value.dishes.map(d => ({ course: d.course, name: d.name.trim() })),
      },
    })

    if (addImageFile.value) {
      try {
        const url = await uploadMenuItemImage(item.id, addImageFile.value)
        await store.updateMenuItem(item.id, { image_url: url })
      } catch {
        toast.error('Buffet added but image upload failed.')
      }
    }

    resetBuffetForm()
    toast.success('Buffet package added to menu.')
  } catch (err) {
    buffetFormError.value = getApiError(err, 'Failed to add buffet.')
  } finally {
    savingBuffet.value = false
  }
}

// ── Buffet edit dialog ───────────────────────────────────────────────────────
const editBuffetOpen = ref(false)
const editingBuffet = ref<MenuItem | null>(null)
const editBuffetError = ref('')
const savingEditBuffet = ref(false)
const editBuffetForm = ref({
  name: '',
  buffet_type: '',
  price: '',
  min_covers: '',
  production_area: '' as ProductionArea | '',
  is_available: true,
  note: '',
  dishes: [] as BuffetDish[],
})

function startEditBuffet(item: MenuItem) {
  editingBuffet.value = item
  editBuffetError.value = ''
  const data = item.buffet_data
  editBuffetForm.value = {
    name: item.name,
    buffet_type: data?.buffet_type ?? '',
    price: String(item.price),
    min_covers: data?.min_covers != null ? String(data.min_covers) : '',
    production_area: item.production_area ?? '',
    is_available: item.is_available,
    note: item.description ?? '',
    dishes: (data?.dishes ?? []).map(d => ({ id: crypto.randomUUID(), course: d.course, name: d.name })),
  }
  editBuffetOpen.value = true
}

function addEditDish() {
  editBuffetForm.value.dishes.push({ id: crypto.randomUUID(), course: 'mains', name: '' })
}

function removeEditDish(id: string) {
  editBuffetForm.value.dishes = editBuffetForm.value.dishes.filter(d => d.id !== id)
}

async function handleSaveEditBuffet() {
  if (!editingBuffet.value) return
  editBuffetError.value = ''
  const priceNum = parseFloat(editBuffetForm.value.price)
  if (!editBuffetForm.value.name.trim())   { editBuffetError.value = 'Buffet name is required.'; return }
  if (!editBuffetForm.value.buffet_type)   { editBuffetError.value = 'Select a buffet type.'; return }
  if (isNaN(priceNum) || priceNum < 0)     { editBuffetError.value = 'Enter a valid price per person.'; return }
  if (!editBuffetForm.value.dishes.length) { editBuffetError.value = 'Add at least one dish.'; return }
  if (editBuffetForm.value.dishes.some(d => !d.name.trim())) { editBuffetError.value = 'All dish names must be filled in.'; return }

  savingEditBuffet.value = true
  try {
    await store.updateMenuItem(editingBuffet.value.id, {
      name:         editBuffetForm.value.name.trim(),
      description:  editBuffetForm.value.note.trim() || undefined,
      price:        priceNum,
      category:     'buffet',
      production_area: editBuffetForm.value.production_area || undefined,
      is_available: editBuffetForm.value.is_available,
      buffet_data: {
        buffet_type: editBuffetForm.value.buffet_type,
        min_covers:  editBuffetForm.value.min_covers ? parseInt(editBuffetForm.value.min_covers) : undefined,
        dishes:      editBuffetForm.value.dishes.map(d => ({ course: d.course, name: d.name.trim() })),
      },
    })
    editBuffetOpen.value = false
    editingBuffet.value = null
    toast.success('Buffet package updated.')
  } catch (err) {
    editBuffetError.value = getApiError(err, 'Failed to update buffet.')
  } finally {
    savingEditBuffet.value = false
  }
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

    <!-- ── Add Item Form ──────────────────────────────────────────────────── -->
      <div v-if="canWrite" class="rounded-xl border bg-card overflow-hidden">
        <div class="px-6 py-4 border-b flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 class="font-semibold text-base">Add Menu Item</h3>
            <p class="text-sm text-muted-foreground mt-0.5">
              {{ itemType === 'single' ? 'Populate your menu with a new culinary item.' : 'Create a buffet package with multiple dishes.' }}
            </p>
          </div>
          <div class="flex items-center gap-1 bg-muted rounded-lg p-1 shrink-0">
            <button
              class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              :class="itemType === 'single' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="switchItemType('single')"
            >Single Item</button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              :class="itemType === 'buffet' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
              @click="switchItemType('buffet')"
            >
              <Layers class="size-3.5" />
              Buffet Package
            </button>
          </div>
        </div>

        <div class="p-6">

          <!-- ── Single Item Form ──────────────────────────────────────────── -->
          <template v-if="itemType === 'single'">
            <div v-if="itemFormError" class="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {{ itemFormError }}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <!-- Left: image upload -->
              <div class="lg:col-span-4 flex flex-col gap-2">
                <Label class="text-xs text-muted-foreground uppercase tracking-wider">Item Photo <span class="normal-case font-normal">(optional)</span></Label>

                <div v-if="addImagePreview" class="relative group rounded-xl overflow-hidden border aspect-3/2 bg-muted">
                  <img :src="addImagePreview" alt="Preview" class="w-full h-full object-cover" />
                  <button
                    type="button"
                    class="absolute top-2 right-2 size-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="clearAddImage"
                  >
                    <X class="size-3" />
                  </button>
                </div>

                <div
                  v-else
                  class="relative rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 aspect-3/2"
                  :class="addImageDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40 bg-muted/20'"
                  @click="addImageInput?.click()"
                  @dragover.prevent="addImageDragging = true"
                  @dragleave="addImageDragging = false"
                  @drop.prevent="e => { addImageDragging = false; if (e.dataTransfer?.files) onAddImageFiles(e.dataTransfer.files) }"
                >
                  <div class="size-12 rounded-xl bg-background flex items-center justify-center shadow-sm">
                    <ImagePlus class="size-5 text-primary" />
                  </div>
                  <div class="text-center px-4">
                    <p class="text-sm font-medium">Upload a clear photo</p>
                    <p class="text-xs text-muted-foreground mt-1">Drag & drop or click to browse<br/>JPG, PNG, WebP · max 10 MB</p>
                  </div>
                </div>

                <input
                  ref="addImageInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="onAddImageInputChange"
                />
                <p class="text-xs text-muted-foreground text-center">Recommended aspect ratio: 3:2</p>
              </div>

              <!-- Right: form fields -->
              <div class="lg:col-span-8 flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div class="grid gap-2">
                    <Label>Item Name <span class="text-destructive">*</span></Label>
                    <Input v-model="itemForm.name" placeholder="e.g. Grilled Lemon Herb Chicken" />
                  </div>
                  <div class="grid gap-2">
                    <Label>Category <span class="text-destructive">*</span></Label>
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
                    <Label>Production Area <span class="text-destructive">*</span></Label>
                    <Select v-model="itemForm.production_area">
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="area in PRODUCTION_AREAS" :key="area.value" :value="area.value">
                          {{ area.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="grid gap-2">
                    <Label>Price (ZMW) <span class="text-destructive">*</span></Label>
                    <Input v-model="itemForm.price" type="number" min="0" step="0.01" placeholder="0.00" />
                  </div>
                  <div class="grid gap-2">
                    <Label>Availability</Label>
                    <div class="flex items-center gap-3 h-9 px-3 rounded-md border bg-muted/20">
                      <Switch v-model="itemForm.is_available" />
                      <span class="text-sm text-muted-foreground">{{ itemForm.is_available ? 'Available' : 'Unavailable' }}</span>
                    </div>
                  </div>
                </div>

                <div class="grid gap-2">
                  <Label>Description <span class="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <textarea
                    v-model="itemForm.description"
                    rows="4"
                    placeholder="Detail the unique flavors, ingredients, and preparation method…"
                    class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>

                <div class="flex items-center justify-end gap-3 pt-2">
                  <Button variant="outline" :disabled="savingItem" @click="resetItemForm">
                    Discard
                  </Button>
                  <Button :disabled="savingItem || !itemForm.name.trim() || !itemForm.price || !itemForm.category || !itemForm.production_area" @click="handleAddItem">
                    <Loader2 v-if="savingItem" class="size-4 mr-2 animate-spin" />
                    <Plus v-else class="size-4 mr-2" />
                    Add Item to Menu
                  </Button>
                </div>
              </div>
            </div>
          </template>

          <!-- ── Buffet Package Form ────────────────────────────────────────── -->
          <template v-else>
            <div v-if="buffetFormError" class="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {{ buffetFormError }}
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <!-- Left: image upload (shared ref) -->
              <div class="lg:col-span-4 flex flex-col gap-2">
                <Label class="text-xs text-muted-foreground uppercase tracking-wider">Buffet Photo <span class="normal-case font-normal">(optional)</span></Label>

                <div v-if="addImagePreview" class="relative group rounded-xl overflow-hidden border aspect-3/2 bg-muted">
                  <img :src="addImagePreview" alt="Preview" class="w-full h-full object-cover" />
                  <button
                    type="button"
                    class="absolute top-2 right-2 size-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="clearAddImage"
                  >
                    <X class="size-3" />
                  </button>
                </div>

                <div
                  v-else
                  class="relative rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center gap-3 aspect-3/2"
                  :class="addImageDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40 bg-muted/20'"
                  @click="addImageInput?.click()"
                  @dragover.prevent="addImageDragging = true"
                  @dragleave="addImageDragging = false"
                  @drop.prevent="e => { addImageDragging = false; if (e.dataTransfer?.files) onAddImageFiles(e.dataTransfer.files) }"
                >
                  <div class="size-12 rounded-xl bg-background flex items-center justify-center shadow-sm">
                    <ImagePlus class="size-5 text-primary" />
                  </div>
                  <div class="text-center px-4">
                    <p class="text-sm font-medium">Upload a buffet photo</p>
                    <p class="text-xs text-muted-foreground mt-1">Drag & drop or click to browse<br/>JPG, PNG, WebP · max 10 MB</p>
                  </div>
                </div>

                <input
                  ref="addImageInput"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  class="hidden"
                  @change="onAddImageInputChange"
                />
                <p class="text-xs text-muted-foreground text-center">Recommended aspect ratio: 3:2</p>
              </div>

              <!-- Right: buffet core fields -->
              <div class="lg:col-span-8 flex flex-col gap-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div class="grid gap-2">
                    <Label>Buffet Name <span class="text-destructive">*</span></Label>
                    <Input v-model="buffetForm.name" placeholder="e.g. Executive Breakfast Buffet" />
                  </div>
                  <div class="grid gap-2">
                    <Label>Buffet Type <span class="text-destructive">*</span></Label>
                    <Select v-model="buffetForm.buffet_type">
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="bt in BUFFET_TYPES" :key="bt.value" :value="bt.value">
                          {{ bt.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="grid gap-2">
                    <Label>Production Area <span class="text-destructive">*</span></Label>
                    <Select v-model="buffetForm.production_area">
                      <SelectTrigger class="w-full">
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="area in BUFFET_PRODUCTION_AREAS" :key="area.value" :value="area.value">
                          {{ area.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div class="grid gap-2">
                    <Label>Price / Person (ZMW) <span class="text-destructive">*</span></Label>
                    <Input v-model="buffetForm.price" type="number" min="0" step="0.01" placeholder="0.00" />
                  </div>
                  <div class="grid gap-2">
                    <Label>Min. Covers <span class="text-destructive">*</span></Label>
                    <Input v-model="buffetForm.min_covers" type="number" min="1" placeholder="e.g. 10" />
                  </div>
                  <div class="grid gap-2">
                    <Label>Availability</Label>
                    <div class="flex items-center gap-3 h-9 px-3 rounded-md border bg-muted/20">
                      <Switch v-model="buffetForm.is_available" />
                      <span class="text-sm text-muted-foreground">{{ buffetForm.is_available ? 'Available' : 'Unavailable' }}</span>
                    </div>
                  </div>
                </div>

                <div class="grid gap-2">
                  <Label>Description <span class="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <textarea
                    v-model="buffetForm.note"
                    rows="2"
                    placeholder="e.g. A sumptuous spread ideal for morning meetings and group celebrations…"
                    class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
              </div>
            </div>

            <!-- Dishes section -->
            <div class="mt-6 border-t pt-6">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <p class="font-medium text-sm">Dishes Included</p>
                  <p class="text-xs text-muted-foreground mt-0.5">Add every dish that forms part of this buffet.</p>
                </div>
                <Button variant="outline" size="sm" @click="addDish">
                  <Plus class="size-3.5 mr-1.5" />
                  Add Dish
                </Button>
              </div>

              <div v-if="buffetForm.dishes.length === 0" class="rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center py-10 text-muted-foreground/60 gap-3">
                <UtensilsCrossed class="size-8" />
                <p class="text-sm">No dishes added yet</p>
                <Button variant="outline" size="sm" @click="addDish">
                  <Plus class="size-3.5 mr-1.5" />
                  Add First Dish
                </Button>
              </div>

              <div v-else class="flex flex-col gap-2">
                <div v-for="dish in buffetForm.dishes" :key="dish.id" class="flex items-center gap-3">
                  <Select v-model="dish.course">
                    <SelectTrigger class="h-9 w-36 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="c in DISH_COURSES" :key="c.value" :value="c.value">
                        {{ c.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input v-model="dish.name" placeholder="Dish name e.g. Scrambled Eggs with Chives" class="h-9 flex-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                    @click="removeDish(dish.id)"
                  >
                    <X class="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-6 mt-4 border-t">
              <Button variant="outline" :disabled="savingBuffet" @click="resetBuffetForm">Discard</Button>
              <Button
                :disabled="savingBuffet || !buffetForm.name.trim() || !buffetForm.price || !buffetForm.buffet_type || !buffetForm.production_area || !buffetForm.min_covers || !buffetForm.dishes.length"
                @click="handleAddBuffet"
              >
                <Loader2 v-if="savingBuffet" class="size-4 mr-2 animate-spin" />
                <Plus v-else class="size-4 mr-2" />
                Add Buffet to Menu
              </Button>
            </div>
          </template>

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
                <TableHead class="w-12"></TableHead>
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
                  <TableCell colspan="6">
                    <div class="h-4 rounded bg-muted animate-pulse" />
                  </TableCell>
                </TableRow>
              </template>

              <template v-else>
                <template v-for="item in items" :key="item.id">
                  <!-- Display row -->
                  <TableRow v-if="editingItem?.id !== item.id" :class="['transition-colors', !item.is_available && 'opacity-50']">
                    <!-- Thumbnail -->
                    <TableCell class="pr-0">
                      <div class="size-9 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                        <img v-if="item.image_url" :src="item.image_url" :alt="item.name" class="size-full object-cover" />
                        <PackageOpen v-else class="size-4 text-muted-foreground/40" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <p class="font-medium text-sm">{{ item.name }}</p>
                      <template v-if="item.category === 'buffet'">
                        <p class="text-xs text-muted-foreground mt-0.5">
                          {{ item.buffet_data?.dishes?.length ?? 0 }} dish{{ (item.buffet_data?.dishes?.length ?? 0) === 1 ? '' : 'es' }}
                          · {{ BUFFET_TYPES.find(t => t.value === item.buffet_data?.buffet_type)?.label ?? 'Buffet' }}
                          <span v-if="item.buffet_data?.min_covers"> · min {{ item.buffet_data.min_covers }} covers</span>
                        </p>
                      </template>
                      <p v-else-if="item.description" class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{{ item.description }}</p>
                    </TableCell>
                    <TableCell>
                      <span
                        v-if="item.category === 'buffet'"
                        class="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 rounded text-xs font-medium"
                      >
                        <Layers class="size-3" />
                        Buffet
                      </span>
                      <span v-else-if="item.category" class="inline-block px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs font-medium uppercase tracking-tight">
                        {{ categoryLabel(item.category) }}
                      </span>
                      <span v-else class="text-muted-foreground text-sm">—</span>
                    </TableCell>
                    <TableCell class="font-medium text-sm">
                      ZMW {{ item.price.toLocaleString() }}
                      <span v-if="item.category === 'buffet'" class="text-xs text-muted-foreground font-normal">/person</span>
                    </TableCell>
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
                  <TableRow v-else class="bg-muted/20 align-top">
                    <!-- Image picker in edit row -->
                    <TableCell class="pr-0 pt-3">
                      <div class="relative group size-9 rounded-md overflow-hidden border bg-muted cursor-pointer">
                        <img v-if="editImagePreview" :src="editImagePreview" alt="Item image" class="size-full object-cover" @click="editImageInput?.click()" />
                        <div v-else class="size-full flex items-center justify-center" @click="editImageInput?.click()">
                          <ImagePlus class="size-4 text-muted-foreground/50" />
                        </div>
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5">
                          <button type="button" class="p-0.5 rounded hover:bg-white/20" @click.stop="editImageInput?.click()">
                            <ImagePlus class="size-3 text-white" />
                          </button>
                          <button v-if="editImagePreview" type="button" class="p-0.5 rounded hover:bg-white/20" @click.stop="clearEditImage">
                            <X class="size-3 text-white" />
                          </button>
                        </div>
                      </div>
                      <input
                        ref="editImageInput"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        class="hidden"
                        @change="onEditImageInputChange"
                      />
                    </TableCell>
                    <TableCell class="pt-3">
                      <div class="flex flex-col gap-1.5">
                        <Input v-model="editForm.name" placeholder="Item name" class="h-8 text-sm" />
                        <Input v-model="editForm.description" placeholder="Description (optional)" class="h-8 text-sm" />
                      </div>
                    </TableCell>
                    <TableCell class="pt-3">
                      <div class="flex flex-col gap-1.5">
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
                        <Select v-model="editForm.production_area">
                          <SelectTrigger class="h-8 text-sm w-44">
                            <SelectValue placeholder="Production area" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem v-for="area in PRODUCTION_AREAS" :key="area.value" :value="area.value">
                              {{ area.label }}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell class="pt-3">
                      <Input v-model="editForm.price" type="number" min="0" step="0.01" class="h-8 text-sm w-28" />
                    </TableCell>
                    <TableCell class="pt-3">
                      <button
                        type="button"
                        :class="['relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors', editForm.is_available ? 'bg-primary' : 'bg-input']"
                        @click="editForm.is_available = !editForm.is_available"
                      >
                        <span :class="['pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform', editForm.is_available ? 'translate-x-4' : 'translate-x-0']" />
                      </button>
                    </TableCell>
                    <TableCell class="text-right pt-3">
                      <div class="flex items-center justify-end gap-1">
                        <Button size="sm" :disabled="savingEdit || !editForm.production_area" @click="handleSaveEdit">
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

  </div>

  <!-- Create Menu Dialog -->
  <Dialog v-model:open="createMenuOpen">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <div class="flex items-center gap-3 mb-1">
          <div class="size-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UtensilsCrossed class="size-5 text-primary" />
          </div>
          <div>
            <DialogTitle>Create a Menu</DialogTitle>
            <DialogDescription class="mt-0.5">No menu exists yet. Give it a name to get started.</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <div class="grid gap-2 py-2">
        <Label>Menu Name <span class="text-destructive">*</span></Label>
        <Input
          v-model="createMenuName"
          placeholder="e.g. Main Menu"
          @keyup.enter="handleCreateMenu"
        />
      </div>
      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="creatingMenu" @click="createMenuOpen = false">
          Cancel
        </Button>
        <Button :disabled="creatingMenu || !createMenuName.trim()" @click="handleCreateMenu">
          <Loader2 v-if="creatingMenu" class="size-4 mr-2 animate-spin" />
          Create Menu
        </Button>
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

  <!-- Edit Buffet Package Dialog -->
  <Dialog v-model:open="editBuffetOpen">
    <DialogContent class="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 flex items-center justify-center shrink-0">
            <Layers class="size-5" />
          </div>
          <div>
            <DialogTitle>Edit Buffet Package</DialogTitle>
            <DialogDescription class="mt-0.5">Update the package details and its included dishes.</DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div v-if="editBuffetError" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
        {{ editBuffetError }}
      </div>

      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="grid gap-2">
            <Label>Buffet Name <span class="text-destructive">*</span></Label>
            <Input v-model="editBuffetForm.name" placeholder="e.g. Executive Breakfast Buffet" />
          </div>
          <div class="grid gap-2">
            <Label>Buffet Type <span class="text-destructive">*</span></Label>
            <Select v-model="editBuffetForm.buffet_type">
              <SelectTrigger class="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="bt in BUFFET_TYPES" :key="bt.value" :value="bt.value">{{ bt.label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>Production Area</Label>
            <Select v-model="editBuffetForm.production_area">
              <SelectTrigger class="w-full"><SelectValue placeholder="Select area" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="area in BUFFET_PRODUCTION_AREAS" :key="area.value" :value="area.value">{{ area.label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="grid gap-2">
            <Label>Price / Person (ZMW) <span class="text-destructive">*</span></Label>
            <Input v-model="editBuffetForm.price" type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div class="grid gap-2">
            <Label>Min. Covers <span class="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <Input v-model="editBuffetForm.min_covers" type="number" min="1" placeholder="e.g. 10" />
          </div>
          <div class="grid gap-2">
            <Label>Availability</Label>
            <div class="flex items-center gap-3 h-9 px-3 rounded-md border bg-muted/20">
              <Switch v-model="editBuffetForm.is_available" />
              <span class="text-sm text-muted-foreground">{{ editBuffetForm.is_available ? 'Available' : 'Unavailable' }}</span>
            </div>
          </div>
        </div>

        <div class="grid gap-2">
          <Label>Description <span class="text-muted-foreground text-xs font-normal">(optional)</span></Label>
          <textarea
            v-model="editBuffetForm.note"
            rows="2"
            placeholder="e.g. A sumptuous spread ideal for morning meetings…"
            class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>

        <!-- Dishes -->
        <div class="border-t pt-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="font-medium text-sm">Dishes Included</p>
              <p class="text-xs text-muted-foreground mt-0.5">Add every dish that forms part of this buffet.</p>
            </div>
            <Button variant="outline" size="sm" @click="addEditDish">
              <Plus class="size-3.5 mr-1.5" />
              Add Dish
            </Button>
          </div>

          <div v-if="editBuffetForm.dishes.length === 0" class="rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center py-8 text-muted-foreground/60 gap-2">
            <UtensilsCrossed class="size-7" />
            <p class="text-sm">No dishes added yet</p>
          </div>

          <div v-else class="flex flex-col gap-2">
            <div v-for="dish in editBuffetForm.dishes" :key="dish.id" class="flex items-center gap-3">
              <Select v-model="dish.course">
                <SelectTrigger class="h-9 w-36 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="c in DISH_COURSES" :key="c.value" :value="c.value">{{ c.label }}</SelectItem>
                </SelectContent>
              </Select>
              <Input v-model="dish.name" placeholder="Dish name e.g. Scrambled Eggs with Chives" class="h-9 flex-1" />
              <Button
                variant="ghost"
                size="icon"
                class="size-9 shrink-0 text-muted-foreground hover:text-destructive"
                @click="removeEditDish(dish.id)"
              >
                <X class="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="savingEditBuffet" @click="editBuffetOpen = false">Cancel</Button>
        <Button
          :disabled="savingEditBuffet || !editBuffetForm.name.trim() || !editBuffetForm.price || !editBuffetForm.buffet_type || !editBuffetForm.dishes.length"
          @click="handleSaveEditBuffet"
        >
          <Loader2 v-if="savingEditBuffet" class="size-4 mr-2 animate-spin" />
          <Check v-else class="size-4 mr-2" />
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
