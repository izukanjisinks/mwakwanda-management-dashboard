<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Shield, Loader2, AlertCircle, Check } from 'lucide-vue-next'
import type { Role } from '@/types/role'
import type { SystemUser } from '@/types/user'

const props = defineProps<{
  open: boolean
  user: SystemUser | null
  roles: Role[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': [roleId: string, onError: (error: string) => void]
}>()

const selectedRoleId = ref('')
const saving = ref(false)
const errorMessage = ref('')

watch([() => props.open, () => props.user], ([isOpen, user]) => {
  if (!isOpen) return
  errorMessage.value = ''
  saving.value = false
  selectedRoleId.value = user?.role_id || ''
})

function handleSave() {
  if (!selectedRoleId.value || selectedRoleId.value === props.user?.role_id) return

  saving.value = true
  errorMessage.value = ''

  emit('save', selectedRoleId.value, (error: string) => {
    errorMessage.value = error
    saving.value = false
  })
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-2">
          <Shield class="size-5" />
          Change Role
        </DialogTitle>
        <DialogDescription>
          Change the role for <span class="font-medium text-foreground">{{ user?.email }}</span>. This will update their permissions across the system.
        </DialogDescription>
      </DialogHeader>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle class="size-5 text-destructive shrink-0 mt-0.5" />
        <div class="flex-1">
          <p class="text-sm font-medium text-destructive">Error</p>
          <p class="text-sm text-destructive/90 mt-1">{{ errorMessage }}</p>
        </div>
      </div>

      <div class="grid gap-2 py-2">
        <div
          v-for="role in roles"
          :key="role.role_id"
          class="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors"
          :class="selectedRoleId === role.role_id ? 'border-primary bg-primary/5' : ''"
          @click="selectedRoleId = role.role_id"
        >
          <div
            class="size-4 shrink-0 rounded-full border shadow-xs flex items-center justify-center mt-0.5"
            :class="selectedRoleId === role.role_id ? 'border-primary bg-primary text-primary-foreground' : 'border-input'"
          >
            <Check v-if="selectedRoleId === role.role_id" class="size-3" />
          </div>
          <div class="grid gap-1.5 font-normal flex-1">
            <p class="text-sm leading-none font-medium capitalize">
              {{ role.name.replace(/_/g, ' ') }}
            </p>
            <p class="text-muted-foreground text-sm">
              {{ role.description }}
            </p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)" :disabled="saving">
          Cancel
        </Button>
        <Button
          @click="handleSave"
          :disabled="saving || !selectedRoleId || selectedRoleId === user?.role_id"
        >
          <Loader2 v-if="saving" class="size-4 mr-2 animate-spin" />
          Update Role
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
