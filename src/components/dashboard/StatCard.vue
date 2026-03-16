<script setup lang="ts">
import type { Component } from 'vue'
import { computed } from 'vue'
import { TrendingUp, TrendingDown } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<{
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: Component
  iconColor?: string
}>(), {
  changeLabel: 'from last week',
  iconColor: 'bg-primary/10 text-primary',
})

const isPositive = computed(() => props.change !== undefined && props.change > 0)
const isNegative = computed(() => props.change !== undefined && props.change < 0)
</script>

<template>
  <Card class="py-4">
    <CardContent class="px-4">
      <div class="flex items-start justify-between">
        <div class="flex flex-col gap-1">
          <span class="text-sm text-muted-foreground">{{ title }}</span>
          <span class="text-2xl font-semibold tracking-tight">
            {{ typeof value === 'number' ? value.toLocaleString() : value }}
          </span>
          <div v-if="change !== undefined" class="flex items-center gap-1 text-xs">
            <template v-if="isPositive">
              <TrendingUp class="size-3 text-accent" />
              <span class="text-accent">+{{ change }}%</span>
            </template>
            <template v-else-if="isNegative">
              <TrendingDown class="size-3 text-destructive" />
              <span class="text-destructive">{{ change }}%</span>
            </template>
            <template v-else>
              <span class="text-muted-foreground">0%</span>
            </template>
            <span class="text-muted-foreground">{{ changeLabel }}</span>
          </div>
        </div>
        <div :class="cn('flex size-10 items-center justify-center rounded-lg', iconColor)">
          <component :is="icon" class="size-5" />
        </div>
      </div>
    </CardContent>
  </Card>
</template>
