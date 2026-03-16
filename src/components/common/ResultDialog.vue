<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  type: 'success' | 'error'
  title: string
  message: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

function handleClose() {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-3">
          <CheckCircle v-if="type === 'success'" class="w-12 h-12 text-green-500" />
          <XCircle v-else class="w-12 h-12 text-red-500" />
          <span>{{ title }}</span>
        </DialogTitle>
        <DialogDescription class="pt-2">
          {{ message }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- Success Box -->
        <div
          v-if="type === 'success'"
          class="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-4"
        >
          <div class="flex gap-3">
            <CheckCircle class="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
            <div class="text-sm">
              <p class="font-medium text-green-900 dark:text-green-100">
                Operation Successful
              </p>
              <p class="text-green-800 dark:text-green-200 mt-1">
                Your changes have been saved successfully and are now in effect.
              </p>
            </div>
          </div>
        </div>

        <!-- Error Box -->
        <div
          v-else
          class="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4"
        >
          <div class="flex gap-3">
            <XCircle class="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <div class="text-sm">
              <p class="font-medium text-red-900 dark:text-red-100">
                Operation Failed
              </p>
              <p class="text-red-800 dark:text-red-200 mt-1">
                {{ message }}
              </p>
            </div>
          </div>
        </div>

        <!-- Information Box -->
        <div v-if="type === 'error'" class="rounded-lg border bg-muted/50 p-4 space-y-2">
          <h4 class="text-sm font-semibold text-foreground">What can you do?</h4>
          <ul class="text-sm text-muted-foreground space-y-1.5 ml-4 list-disc">
            <li>Check your internet connection and try again</li>
            <li>Verify that you have the necessary permissions</li>
            <li>Contact your system administrator if the problem persists</li>
            <li>Review the error message above for more details</li>
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button @click="handleClose" class="w-full">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
