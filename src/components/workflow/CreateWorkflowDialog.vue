<script setup lang="ts">
import { ref, watch } from 'vue'
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
import { useWorkflowStore } from '@/stores/workflow'
import type { Workflow } from '@/types/workflow'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': [workflow: Workflow]
}>()

const store = useWorkflowStore()

const form = ref({ name: '', description: '', workflow_type: '' })
const saving = ref(false)
const error = ref('')
const typesLoading = ref(false)

watch(() => props.open, async (open) => {
  if (!open) return
  form.value = { name: '', description: '', workflow_type: '' }
  error.value = ''
  typesLoading.value = true
  try {
    await store.fetchTypes()
  } finally {
    typesLoading.value = false
  }
})

async function handleSave() {
  if (!form.value.name.trim()) { error.value = 'Name is required.'; return }
  if (!form.value.workflow_type) { error.value = 'Please select a workflow type.'; return }
  error.value = ''
  saving.value = true
  try {
    const wf = await store.createWorkflow({
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      workflow_type: form.value.workflow_type,
      is_active: true,
    })
    emit('created', wf)
    emit('update:open', false)
  } catch (err: any) {
    error.value = err?.error?.message ?? err?.message ?? 'Failed to create workflow.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Create Workflow</DialogTitle>
        <DialogDescription>
          Set up a new approval workflow for your organisation.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4 py-2">
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {{ error }}
        </div>

        <div class="grid gap-2">
          <Label>Workflow Type *</Label>
          <Select v-model="form.workflow_type" :disabled="typesLoading">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="typesLoading ? 'Loading types…' : 'Select a type'" />
            </SelectTrigger>
            <SelectContent class="w-[--radix-select-trigger-width]">
              <SelectItem
                v-for="t in store.workflowTypes"
                :key="t.type"
                :value="t.type"
              >
                {{ t.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="form.workflow_type" class="text-xs text-muted-foreground">
            {{ store.workflowTypes.find(t => t.type === form.workflow_type)?.description }}
          </p>
        </div>

        <div class="grid gap-2">
          <Label>Name *</Label>
          <Input v-model="form.name" placeholder="e.g. Booking Approval" />
        </div>

        <div class="grid gap-2">
          <Label>Description</Label>
          <Input v-model="form.description" placeholder="Brief description of this workflow" />
        </div>
      </div>

      <DialogFooter class="gap-2">
        <Button variant="outline" :disabled="saving" @click="emit('update:open', false)">Cancel</Button>
        <Button :disabled="saving || typesLoading" @click="handleSave">
          <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
          Create Workflow
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
