<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

withDefaults(defineProps<{
  label: string
  value: string | number
  detail?: string
  icon: Component
  severity: 'critical' | 'warning'
  to: RouteLocationRaw
}>(), {
  detail: undefined,
})
</script>

<template>
  <RouterLink :to="to" class="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
    <Card class="relative overflow-hidden py-4 transition-transform group-hover:-translate-y-0.5">
      <div
        class="absolute inset-y-0 left-0 w-1"
        :class="severity === 'critical' ? 'bg-destructive' : 'bg-chart-3'"
      />
      <CardContent class="px-4">
        <div class="flex items-center justify-between">
          <div
            :class="cn(
              'flex size-8 items-center justify-center rounded-lg',
              severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-chart-3/10 text-chart-3',
            )"
          >
            <component :is="icon" class="size-4" />
          </div>
          <ArrowRight class="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div class="mt-2.5 flex flex-col gap-1">
          <span class="text-2xl font-semibold tracking-tight">
            {{ typeof value === 'number' ? value.toLocaleString() : value }}
          </span>
          <span class="text-sm font-medium">{{ label }}</span>
          <span v-if="detail" class="text-xs text-muted-foreground">{{ detail }}</span>
        </div>
      </CardContent>
    </Card>
  </RouterLink>
</template>
