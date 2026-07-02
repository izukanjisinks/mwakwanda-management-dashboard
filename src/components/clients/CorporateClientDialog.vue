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
import { useCorporateClientsStore } from '@/stores/clients'
import type { CorporateClient } from '@/types/client'

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
  email: '',
  phone: '',
  tpin: '',
  industry: '',
})

watch(() => props.open, (open) => {
  if (!open) return
  error.value = ''
  if (props.client) {
    form.value = {
      company_name: props.client.company_name,
      email: props.client.email ?? '',
      phone: props.client.phone ?? '',
      tpin: props.client.tpin ?? '',
      industry: props.client.industry ?? '',
    }
  } else {
    form.value = {
      company_name: '',
      email: '',
      phone: '',
      tpin: '',
      industry: '',
    }
  }
})

async function handleSave() {
  error.value = ''
  if (!form.value.company_name.trim()) { error.value = 'Company name is required.'; return }

  saving.value = true
  try {
    const payload = { ...form.value }
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

        <!-- Email & Phone -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="email">Email</Label>
            <Input id="email" v-model="form.email" type="email" placeholder="e.g. contact@company.com" />
          </div>
          <div class="grid gap-2">
            <Label for="phone">Phone</Label>
            <Input id="phone" v-model="form.phone" placeholder="e.g. +260966000000" />
          </div>
        </div>

        <!-- TPIN & Industry -->
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label for="tpin">TPIN</Label>
            <Input id="tpin" v-model="form.tpin" placeholder="e.g. 1001234567" />
          </div>
          <div class="grid gap-2">
            <Label for="industry">Industry</Label>
            <Input id="industry" v-model="form.industry" placeholder="e.g. Agriculture & Agribusiness" />
          </div>
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
