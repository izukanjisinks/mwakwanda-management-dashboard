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
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useIndividualClientsStore } from '@/stores/clients'
import type { IndividualClient } from '@/types/client'

const props = defineProps<{
  open: boolean
  client?: IndividualClient | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [client: IndividualClient]
}>()

const store = useIndividualClientsStore()
const saving = ref(false)
const error = ref('')

const isEdit = computed(() => !!props.client)

const form = ref({
  full_name: '',
  email: '',
  phone: '',
  id_passport_number: '',
  notes: '',
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  if (props.client) {
    form.value = {
      full_name: props.client.full_name,
      email: props.client.email,
      phone: props.client.phone,
      id_passport_number: props.client.id_passport_number,
      notes: props.client.notes ?? '',
    }
  } else {
    form.value = {
      full_name: '',
      email: '',
      phone: '',
      id_passport_number: '',
      notes: '',
    }
  }
})

async function handleSave() {
  error.value = ''
  if (!form.value.full_name.trim()) { error.value = 'Full name is required.'; return }
  if (!form.value.email.trim()) { error.value = 'Email is required.'; return }
  if (!form.value.phone.trim()) { error.value = 'Phone number is required.'; return }
  if (!form.value.id_passport_number.trim()) { error.value = 'ID/Passport number is required.'; return }

  saving.value = true
  try {
    const payload = { ...form.value, notes: form.value.notes.trim() || undefined }
    let saved: IndividualClient
    if (isEdit.value && props.client) {
      saved = await store.updateClient(props.client.id, payload)
    } else {
      saved = await store.createClient(payload)
    }
    toast.success(isEdit.value ? 'Client updated successfully.' : 'Client added successfully.')
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
        <DialogTitle>{{ isEdit ? 'Edit Client' : 'Add Individual Client' }}</DialogTitle>
        <DialogDescription>
          {{ isEdit ? 'Update the client details below.' : 'Register a new individual client account.' }}
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-5 py-2" @submit.prevent="handleSave">
        <!-- Error -->
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <!-- Full Name -->
        <div class="grid gap-2">
          <Label for="full_name">Full Name *</Label>
          <Input id="full_name" v-model="form.full_name" placeholder="e.g. John Mwale" />
        </div>

        <!-- Email & Phone -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="email">Email *</Label>
            <Input id="email" v-model="form.email" type="email" placeholder="john@email.com" />
          </div>
          <div class="grid gap-2">
            <Label for="phone">Phone *</Label>
            <Input id="phone" v-model="form.phone" placeholder="+260 97 123 4567" />
          </div>
        </div>

        <!-- ID/Passport -->
        <div class="grid gap-2">
          <Label for="id_number">ID / Passport No. *</Label>
          <Input id="id_number" v-model="form.id_passport_number" placeholder="NRC-123456/78/1" />
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
