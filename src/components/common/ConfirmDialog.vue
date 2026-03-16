<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2 } from 'lucide-vue-next'

interface Props {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
  icon?: any
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'default',
  loading: false,
})

const resolvedIcon = computed(() => props.icon ?? AlertTriangle)

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
  'cancel': []
}>()

const buttonVariant = computed(() => props.variant)

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  emit('cancel')
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <div class="flex items-start gap-3">
          <div
            class="size-10 rounded-full flex items-center justify-center shrink-0"
            :class="variant === 'destructive' ? 'bg-destructive/10' : 'bg-primary/10'"
          >
            <component
              :is="resolvedIcon"
              class="size-5"
              :class="variant === 'destructive' ? 'text-destructive' : 'text-primary'"
            />
          </div>
          <div class="flex-1">
            <DialogTitle>{{ title }}</DialogTitle>
            <DialogDescription class="mt-1.5">
              {{ description }}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <DialogFooter class="mt-4">
        <Button variant="outline" @click="handleCancel" :disabled="loading">
          {{ cancelText }}
        </Button>
        <Button :variant="buttonVariant" @click="handleConfirm" :disabled="loading">
          <Loader2 v-if="loading" class="size-4 mr-2 animate-spin" />
          {{ confirmText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
