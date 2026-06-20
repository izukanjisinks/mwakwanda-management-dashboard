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
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useBranchesStore } from '@/stores/branches'
import type { Branch, BranchPayload } from '@/types/branch'
import MapLocationPicker from '@/components/branches/MapLocationPicker.vue'

const props = defineProps<{
  open: boolean
  branch?: Branch | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [branch: Branch]
}>()

const store = useBranchesStore()
const saving = ref(false)
const error = ref('')

const isEdit = computed(() => !!props.branch)

// Server returns ISO strings like "0000-01-01T11:00:00Z" — extract HH:mm for the time input
function parseTime(val?: string | null): string {
  if (!val) return ''
  if (val.includes('T')) return (val.split('T')[1] ?? '').substring(0, 5)
  return val.substring(0, 5)
}

interface FormState {
  branch_code: string
  name: string
  street_address: string
  city: string
  country: string
  location: string | null
  phone: string
  email: string
  parking: boolean
  restaurant: boolean
  check_in_time: string
  check_out_time: string
  is_active: boolean
}

const emptyForm = (): FormState => ({
  branch_code: '',
  name: '',
  street_address: '',
  city: '',
  country: '',
  location: null,
  phone: '',
  email: '',
  parking: false,
  restaurant: false,
  check_in_time: '14:00',
  check_out_time: '11:00',
  is_active: true,
})

const form = ref<FormState>(emptyForm())

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  if (props.branch) {
    const b = props.branch
    form.value = {
      branch_code:    b.branch_code    ?? '',
      name:           b.name           ?? '',
      street_address: b.street_address ?? '',
      city:           b.city           ?? '',
      country:        b.country        ?? '',
      location:       b.location       ?? null,
      phone:          b.phone          ?? '',
      email:          b.email          ?? '',
      parking:    b.parking    ?? false,
      restaurant: b.restaurant ?? false,
      check_in_time:  parseTime(b.check_in_time)  || '14:00',
      check_out_time: parseTime(b.check_out_time) || '11:00',
      is_active:      b.is_active      ?? true,
    }
  } else {
    form.value = emptyForm()
  }
})

async function handleSave() {
  error.value = ''
  if (!form.value.branch_code.trim()) { error.value = 'Branch code is required.'; return }
  if (!form.value.name.trim())        { error.value = 'Branch name is required.';  return }
  if (!form.value.city.trim())        { error.value = 'City is required.';          return }
  if (!form.value.country.trim())     { error.value = 'Country is required.';       return }

  saving.value = true
  try {
    const payload: BranchPayload = {
      branch_code:    form.value.branch_code.trim().toUpperCase(),
      name:           form.value.name.trim(),
      street_address: form.value.street_address.trim(),
      city:           form.value.city.trim(),
      country:        form.value.country.trim(),
      location:       form.value.location ?? null,
      phone:          form.value.phone?.trim()  || undefined,
      email:          form.value.email?.trim()  || undefined,
      parking:    form.value.parking,
      restaurant: form.value.restaurant,
      check_in_time:  parseTime(form.value.check_in_time)  || null,
      check_out_time: parseTime(form.value.check_out_time) || null,
      is_active:      form.value.is_active,
    }

    let saved: Branch
    if (isEdit.value && props.branch) {
      saved = await store.updateBranch(props.branch.id, payload)
    } else {
      saved = await store.createBranch(payload)
    }
    toast.success(isEdit.value ? 'Branch updated successfully.' : 'Branch created successfully.')
    emit('saved', saved)
    emit('update:open', false)
  } catch (err: any) {
    error.value = err?.error?.message ?? 'Failed to save branch.'
    toast.error(error.value)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit Branch' : 'Create Branch' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Update branch details and pin the exact location on the map.' : 'Add a new branch and pin its location on the map.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <!-- Code + Name -->
        <div class="grid grid-cols-3 gap-4">
          <div class="grid gap-2">
            <Label for="branch_code">Branch Code *</Label>
            <Input
              id="branch_code"
              v-model="form.branch_code"
              placeholder="e.g. LSK"
              class="uppercase"
              maxlength="30"
            />
          </div>
          <div class="col-span-2 grid gap-2">
            <Label for="branch_name">Branch Name *</Label>
            <Input id="branch_name" v-model="form.name" placeholder="e.g. Lusaka Branch" />
          </div>
        </div>

        <!-- Address -->
        <div class="grid gap-2">
          <Label for="branch_address">Street Address</Label>
          <Input id="branch_address" v-model="form.street_address" placeholder="e.g. 123 Cairo Road" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="branch_city">City *</Label>
            <Input id="branch_city" v-model="form.city" placeholder="e.g. Lusaka" />
          </div>
          <div class="grid gap-2">
            <Label for="branch_country">Country *</Label>
            <Input id="branch_country" v-model="form.country" placeholder="e.g. Zambia" />
          </div>
        </div>

        <!-- Contact -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="branch_phone">Phone</Label>
            <Input id="branch_phone" v-model="form.phone" type="tel" placeholder="+260 97 000 0000" />
          </div>
          <div class="grid gap-2">
            <Label for="branch_email">Email</Label>
            <Input id="branch_email" v-model="form.email" type="email" placeholder="branch@example.com" />
          </div>
        </div>

        <!-- Check-in / Check-out times -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="check_in_time">Check-in Time</Label>
            <Input id="check_in_time" v-model="form.check_in_time" type="time" />
          </div>
          <div class="grid gap-2">
            <Label for="check_out_time">Check-out Time</Label>
            <Input id="check_out_time" v-model="form.check_out_time" type="time" />
          </div>
        </div>

        <!-- Facilities -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p class="text-sm font-medium">Parking</p>
              <p class="text-xs text-muted-foreground">On-site parking available</p>
            </div>
            <Switch
              :model-value="form.parking"
              @update:model-value="(v) => form.parking = !!v"
            />
          </div>
          <div class="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p class="text-sm font-medium">Restaurant</p>
              <p class="text-xs text-muted-foreground">On-site dining available</p>
            </div>
            <Switch
              :model-value="form.restaurant"
              @update:model-value="(v) => form.restaurant = !!v"
            />
          </div>
        </div>

        <!-- Map location -->
        <div class="grid gap-2">
          <Label>Branch Location <span class="text-muted-foreground font-normal">(optional)</span></Label>
          <MapLocationPicker v-model="form.location" />
        </div>

        <!-- Active status -->
        <div class="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p class="text-sm font-medium">Active</p>
            <p class="text-xs text-muted-foreground">Branch is operational and visible to staff</p>
          </div>
          <Switch
            :model-value="form.is_active"
            @update:model-value="(v) => form.is_active = !!v"
          />
        </div>
      </form>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="saving" @click="handleSave">
          <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
          {{ isEdit ? 'Save Changes' : 'Create Branch' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
