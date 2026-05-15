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
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useCorporateClientsStore } from '@/stores/clients'
import type { CorporateClient, ClientStatus } from '@/types/client'

const props = defineProps<{
  open: boolean
  client?: CorporateClient | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [client: CorporateClient]
}>()

const store = useCorporateClientsStore()
const saving = ref(false)
const error = ref('')

const isEdit = computed(() => !!props.client)

const form = ref({
  company_name: '',
  contact_person: '',
  email: '',
  phone: '',
  company_reg_number: '',
  industry: '',
  status: 'active' as ClientStatus,
  notes: '',
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  if (props.client) {
    form.value = {
      company_name: props.client.company_name,
      contact_person: props.client.contact_person,
      email: props.client.email,
      phone: props.client.phone,
      company_reg_number: props.client.company_reg_number,
      industry: props.client.industry ?? '',
      status: props.client.status,
      notes: props.client.notes ?? '',
    }
  } else {
    form.value = {
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      company_reg_number: '',
      industry: '',
      status: 'active',
      notes: '',
    }
  }
})

async function handleSave() {
  error.value = ''
  if (!form.value.company_name.trim()) { error.value = 'Company name is required.'; return }
  if (!form.value.contact_person.trim()) { error.value = 'Contact person is required.'; return }
  if (!form.value.email.trim()) { error.value = 'Email is required.'; return }
  if (!form.value.phone.trim()) { error.value = 'Phone number is required.'; return }
  if (!form.value.company_reg_number.trim()) { error.value = 'Company registration number is required.'; return }

  saving.value = true
  try {
    const payload = { ...form.value, notes: form.value.notes || undefined }
    let saved: CorporateClient
    if (isEdit.value && props.client) {
      saved = await store.updateClient(props.client.id, payload)
    } else {
      saved = await store.createClient(payload)
    }
    toast.success(isEdit.value ? 'Corporate client updated successfully.' : 'Corporate client added successfully.')
    emit('saved', saved)
    emit('update:open', false)
  } catch (err) {
    error.value = getApiError(err, 'Failed to save client.')
    toast.error(error.value)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{{ isEdit ? 'Edit Corporate Client' : 'Add Corporate Client' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Update the company details below.' : 'Register a new corporate client account.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <!-- Error -->
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <!-- Company Name -->
        <div class="grid gap-2">
          <Label for="company_name">Company Name *</Label>
          <Input id="company_name" v-model="form.company_name" placeholder="e.g. Zambia National Bank" />
        </div>

        <!-- Contact Person & Industry -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="contact_person">Contact Person *</Label>
            <Input id="contact_person" v-model="form.contact_person" placeholder="e.g. Charles Mwanza" />
          </div>
          <div class="grid gap-2">
            <Label for="industry">Industry</Label>
            <Input id="industry" v-model="form.industry" placeholder="e.g. Banking & Finance" />
          </div>
        </div>

        <!-- Email & Phone -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="email">Email *</Label>
            <Input id="email" v-model="form.email" type="email" placeholder="contact@company.com" />
          </div>
          <div class="grid gap-2">
            <Label for="phone">Phone *</Label>
            <Input id="phone" v-model="form.phone" placeholder="+260 21 123 4567" />
          </div>
        </div>

        <!-- Reg Number & Status -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="reg_number">Company Reg. No. *</Label>
            <Input id="reg_number" v-model="form.company_reg_number" placeholder="e.g. ZNB-001-2010" />
          </div>
          <!-- <div class="grid gap-2">
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
          </div> -->
        </div>

        <!-- Notes -->
        <div class="grid gap-2">
          <Label for="notes">Notes</Label>
          <textarea
            id="notes"
            v-model="form.notes"
            rows="2"
            placeholder="Any additional notes..."
            class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>
      </form>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">
          Cancel
        </Button>
        <Button :disabled="saving" @click="handleSave">
          <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
          {{ isEdit ? 'Save Changes' : 'Add Client' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
