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

const form = ref<BranchPayload>({
  branch_code: '',
  name: '',
  street_address: '',
  city: '',
  country: '',
  location: '',
  phone: '',
  email: '',
  is_active: true,
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  if (props.branch) {
    form.value = {
      branch_code:    props.branch.branch_code   ?? '',
      name:           props.branch.name          ?? '',
      street_address: props.branch.street_address ?? '',
      city:           props.branch.city          ?? '',
      country:        props.branch.country       ?? '',
      location:       props.branch.location      ?? '',
      phone:          props.branch.phone         ?? '',
      email:          props.branch.email         ?? '',
      is_active:      props.branch.is_active     ?? true,
    }
  } else {
    form.value = { branch_code: '', name: '', street_address: '', city: '', country: '', location: '', phone: '', email: '', is_active: true }
  }
})


async function handleSave() {
  error.value = ''
  if (!form.value.branch_code.trim())    { error.value = 'Branch code is required.';    return }
  if (!form.value.name.trim())           { error.value = 'Branch name is required.';    return }
  if (!form.value.city.trim())           { error.value = 'City is required.';           return }
  if (!form.value.country.trim())        { error.value = 'Country is required.';        return }

  saving.value = true
  try {
    const payload: BranchPayload = {
      branch_code:    form.value.branch_code.trim().toUpperCase(),
      name:           form.value.name.trim(),
      street_address: form.value.street_address.trim(),
      city:           form.value.city.trim(),
      country:        form.value.country.trim(),
      location:       form.value.location?.trim() || undefined,
      phone:          form.value.phone?.trim()    || undefined,
      email:          form.value.email?.trim()    || undefined,
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
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit Branch' : 'Create Branch' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Update branch details and location information.' : 'Add a new branch location for your organisation.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

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

        <div class="grid gap-2">
          <Label for="branch_address">Street Address</Label>
          <Input id="branch_address" v-model="form.street_address" placeholder="e.g. 123 Cairo Road" />
        </div>

        <div class="grid gap-2">
          <Label for="branch_location">Location / Area</Label>
          <Input id="branch_location" v-model="form.location" placeholder="e.g. Showgrounds, Lusaka" />
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

        <div class="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p class="text-sm font-medium">Active</p>
            <p class="text-xs text-muted-foreground">Branch is operational and visible to staff</p>
          </div>
          <Switch v-model="form.is_active" />
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
