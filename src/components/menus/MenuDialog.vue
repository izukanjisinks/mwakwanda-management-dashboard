<script setup lang="ts">
import { ref, watch } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { useMenusStore } from '@/stores/menus'
import type { Menu } from '@/types/menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const props = defineProps<{
  open: boolean
  menu: Menu | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const store = useMenusStore()

const form = ref({ name: '', description: '', is_active: true })
const saving = ref(false)

watch(
  () => props.open,
  (val) => {
    if (!val) return
    form.value = props.menu
      ? { name: props.menu.name, description: props.menu.description ?? '', is_active: props.menu.is_active }
      : { name: '', description: '', is_active: true }
  },
)

async function handleSave() {
  saving.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      is_active: form.value.is_active,
    }
    if (props.menu) {
      await store.updateMenu(props.menu.id, payload)
      toast.success('Menu updated.')
    } else {
      await store.createMenu(payload)
      toast.success('Menu created.')
    }
    emit('saved')
    emit('update:open', false)
  } catch (err: any) {
    toast.error(err?.error?.message ?? 'Failed to save menu.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ menu ? 'Edit Menu' : 'Create Menu' }}</DialogTitle>
      </DialogHeader>

      <form class="flex flex-col gap-4" @submit.prevent="handleSave">
        <div class="grid gap-2">
          <Label for="menu-name">Name <span class="text-destructive">*</span></Label>
          <Input id="menu-name" v-model="form.name" placeholder="e.g. Breakfast Menu" required />
        </div>

        <div class="grid gap-2">
          <Label for="menu-desc">Description</Label>
          <Textarea
            id="menu-desc"
            v-model="form.description"
            placeholder="Optional description…"
            :rows="3"
          />
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            :class="[
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              form.is_active ? 'bg-primary' : 'bg-input',
            ]"
            @click="form.is_active = !form.is_active"
          >
            <span
              :class="[
                'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform',
                form.is_active ? 'translate-x-4' : 'translate-x-0',
              ]"
            />
          </button>
          <Label class="cursor-pointer" @click="form.is_active = !form.is_active">
            {{ form.is_active ? 'Active' : 'Inactive' }}
          </Label>
        </div>

        <DialogFooter class="gap-2 pt-2">
          <Button type="button" variant="outline" :disabled="saving" @click="emit('update:open', false)">
            Cancel
          </Button>
          <Button type="submit" :disabled="saving || !form.name.trim()">
            <Loader2 v-if="saving" class="size-4 mr-2 animate-spin" />
            {{ menu ? 'Save Changes' : 'Create Menu' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
