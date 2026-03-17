<script setup lang="ts">
import { ShieldX } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <div class="flex items-center gap-3 mb-1">
          <div class="flex items-center justify-center size-10 rounded-full bg-destructive/10 shrink-0">
            <ShieldX class="size-5 text-destructive" />
          </div>
          <DialogTitle>Access Denied</DialogTitle>
        </div>
        <DialogDescription class="text-sm leading-relaxed">
          You don't have permission to access this resource. Please contact your system administrator if you believe this is a mistake.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button @click="emit('update:open', false)">OK</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
