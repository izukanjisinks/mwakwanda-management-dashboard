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
import { ShieldX, Home } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const props = defineProps<{
  open: boolean
  resourceName?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const router = useRouter()

function handleGoHome() {
  emit('update:open', false)
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <Dialog :open="open">
    <DialogContent
      class="sm:max-w-[500px]"
      :show-close-button="false"
      @interact-outside="(e) => e.preventDefault()"
      @escape-key-down="(e) => e.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle class="flex items-center gap-3">
          <ShieldX class="w-12 h-12 text-red-500" />
          <span>Access Denied</span>
        </DialogTitle>
        <DialogDescription class="pt-2">
          You don't have permission to access this resource.
        </DialogDescription>
      </DialogHeader>

      <div class="grid gap-4 py-4">
        <!-- Error Details -->
        <div class="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-4">
          <div class="flex gap-3">
            <ShieldX class="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
            <div class="text-sm">
              <p class="font-medium text-red-900 dark:text-red-100">
                403 Forbidden
              </p>
              <p class="text-red-800 dark:text-red-200 mt-1">
                {{ resourceName || 'This page or resource' }} is restricted based on your current role and permissions.
              </p>
            </div>
          </div>
        </div>

        <!-- Information Box -->
        <div class="rounded-lg border bg-muted/50 p-4 space-y-2">
          <h4 class="text-sm font-semibold text-foreground">What can you do?</h4>
          <ul class="text-sm text-muted-foreground space-y-1.5 ml-4 list-disc">
            <li>Contact your system administrator to request access</li>
            <li>Verify that you're logged in with the correct account</li>
            <li>Check if your role has the necessary permissions</li>
            <li>Return to the dashboard and navigate to an accessible page</li>
          </ul>
        </div>
      </div>

      <DialogFooter>
        <Button @click="handleGoHome" class="w-full">
          <Home class="w-4 h-4 mr-2" />
          Go to Dashboard
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
