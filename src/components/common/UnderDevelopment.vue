<script setup lang="ts">
import { Construction, Calendar, Lightbulb } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useRouter } from 'vue-router'

const props = defineProps<{
  featureName: string
  description?: string
}>()

const router = useRouter()
</script>

<template>
  <div class="flex items-center justify-center min-h-screen p-6">
    <div class="max-w-2xl w-full">
      <!-- Main Card -->
      <div class="rounded-lg border bg-card text-card-foreground shadow-sm p-8 space-y-6">
        <!-- Icon and Title -->
        <div class="flex flex-col items-center text-center space-y-4">
          <div class="relative">
            <Construction class="w-24 h-24 text-amber-500" />
            <div class="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 class="text-3xl font-bold tracking-tight">{{ featureName }}</h1>
            <p class="text-lg text-muted-foreground mt-2">Under Development</p>
          </div>
        </div>

        <!-- Description -->
        <div class="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 p-4">
          <p class="text-sm text-amber-900 dark:text-amber-100">
            {{ description || `We're working hard to bring you the ${featureName} feature. This module is currently under development and will be available soon.` }}
          </p>
        </div>

        <!-- Information Sections -->
        <div class="grid md:grid-cols-2 gap-4 pt-4">
          <!-- What to Expect -->
          <div class="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div class="flex items-center gap-2">
              <Lightbulb class="w-5 h-5 text-primary" />
              <h3 class="font-semibold text-sm">What to Expect</h3>
            </div>
            <ul class="text-sm text-muted-foreground space-y-1.5 ml-7 list-disc">
              <li>Comprehensive functionality</li>
              <li>Intuitive user interface</li>
              <li>Real-time updates</li>
              <li>Full integration with existing modules</li>
            </ul>
          </div>

          <!-- Timeline -->
          <div class="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div class="flex items-center gap-2">
              <Calendar class="w-5 h-5 text-primary" />
              <h3 class="font-semibold text-sm">Development Status</h3>
            </div>
            <div class="text-sm text-muted-foreground space-y-1.5 ml-7">
              <p>✓ Planning completed</p>
              <p>✓ Design finalized</p>
              <p class="text-amber-600 dark:text-amber-400 font-medium">⚡ Development in progress</p>
              <p>○ Testing & QA pending</p>
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div class="pt-4">
          <Button @click="$router.push({ name: 'dashboard' })" class="w-full">
            Return to Dashboard
          </Button>
        </div>
      </div>

      <!-- Footer Note -->
      <p class="text-center text-sm text-muted-foreground mt-6">
        Have questions or suggestions? Contact your system administrator.
      </p>
    </div>
  </div>
</template>
