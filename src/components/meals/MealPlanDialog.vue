<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useMealsStore } from '@/stores/meals'
import type { MealPlan } from '@/types/meal'

const props = defineProps<{
  open: boolean
  plan?: MealPlan | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [plan: MealPlan]
}>()

const store = useMealsStore()
const saving = ref(false)
const error = ref('')
const itemInput = ref('')

const isEdit = computed(() => !!props.plan)

const form = ref({
  name: '',
  price_per_person_per_night: 0,
  includes: [] as string[],
  description: '',
  is_active: true,
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  itemInput.value = ''
  if (props.plan) {
    form.value = {
      name: props.plan.name,
      price_per_person_per_night: props.plan.price_per_person_per_night,
      includes: [...props.plan.includes],
      description: props.plan.description ?? '',
      is_active: props.plan.is_active,
    }
  } else {
    form.value = { name: '', price_per_person_per_night: 0, includes: [], description: '', is_active: true }
  }
})

function addItem() {
  const val = itemInput.value.trim()
  if (val && !form.value.includes.includes(val)) {
    form.value.includes.push(val)
  }
  itemInput.value = ''
}

function removeItem(item: string) {
  form.value.includes = form.value.includes.filter(i => i !== item)
}

function handleItemKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); addItem() }
}

async function handleSave() {
  error.value = ''
  if (!form.value.name.trim()) { error.value = 'Plan name is required.'; return }
  if (form.value.price_per_person_per_night < 0) { error.value = 'Price cannot be negative.'; return }

  saving.value = true
  try {
    const payload = { ...form.value, description: form.value.description || undefined }
    let saved: MealPlan
    if (isEdit.value && props.plan) {
      saved = await store.updatePlan(props.plan.id, payload)
    } else {
      saved = await store.createPlan(payload)
    }
    toast.success(isEdit.value ? 'Meal plan updated.' : 'Meal plan created.')
    emit('saved', saved)
    emit('update:open', false)
  } catch (err: any) {
    error.value = err?.error?.message ?? 'Failed to save meal plan.'
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
        <DialogTitle>{{ isEdit ? 'Edit Meal Plan' : 'New Meal Plan' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Update this meal plan\'s details and pricing.' : 'Configure a new meal plan tier for bookings.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <!-- Name -->
        <div class="grid gap-2">
          <Label for="name">Plan Name *</Label>
          <Input id="name" v-model="form.name" placeholder="e.g. Full Board" />
        </div>

        <!-- Price -->
        <div class="grid gap-2">
          <Label for="price">Price per Person per Night (ZMW) *</Label>
          <Input id="price" v-model.number="form.price_per_person_per_night" type="number" min="0" placeholder="550" />
          <p class="text-xs text-muted-foreground">Set to 0 for no meals (Room Only).</p>
        </div>

        <!-- What's included -->
        <div class="grid gap-2">
          <Label>Meals Included</Label>
          <div class="flex gap-2">
            <Input
              v-model="itemInput"
              placeholder="e.g. Breakfast"
              @keydown="handleItemKeydown"
            />
            <Button type="button" variant="outline" size="icon" @click="addItem">
              <Plus class="size-4" />
            </Button>
          </div>
          <div v-if="form.includes.length > 0" class="flex flex-wrap gap-2 mt-1">
            <Badge
              v-for="item in form.includes"
              :key="item"
              variant="secondary"
              class="gap-1 pr-1"
            >
              {{ item }}
              <button type="button" class="ml-1 hover:text-destructive transition-colors" @click="removeItem(item)">
                <X class="size-3" />
              </button>
            </Badge>
          </div>
          <p v-else class="text-xs text-muted-foreground">No meals added yet.</p>
        </div>

        <!-- Description -->
        <div class="grid gap-2">
          <Label for="description">Description</Label>
          <textarea
            id="description"
            v-model="form.description"
            rows="2"
            placeholder="Brief description of what this plan includes..."
            class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>

        <!-- Active toggle -->
        <div class="flex items-center justify-between rounded-lg border px-4 py-3">
          <div>
            <p class="text-sm font-medium">Active</p>
            <p class="text-xs text-muted-foreground">Inactive plans won't appear in booking dropdowns.</p>
          </div>
          <button
            type="button"
            :class="[
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              form.is_active ? 'bg-primary' : 'bg-input',
            ]"
            @click="form.is_active = !form.is_active"
          >
            <span
              :class="[
                'pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg transition-transform',
                form.is_active ? 'translate-x-5' : 'translate-x-0',
              ]"
            />
          </button>
        </div>
      </form>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="saving" @click="handleSave">
          <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
          {{ isEdit ? 'Save Changes' : 'Create Plan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
