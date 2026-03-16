<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const overallRating = 4.6
const totalReviews = 2346

const ratings = [
  { label: 'Facilities', value: 4.4 },
  { label: 'Cleanliness', value: 4.7 },
  { label: 'Services', value: 4.6 },
  { label: 'Comfort', value: 4.8 },
  { label: 'Location', value: 4.5 },
]
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Overall Rating</CardTitle>
    </CardHeader>
    <CardContent class="space-y-12">
      <div class="flex items-center gap-3">
        <div class="flex flex-col">
          <div class="flex items-baseline gap-1">
            <span class="text-4xl font-bold">{{ overallRating }}</span>
            <span class="text-lg text-muted-foreground">/5</span>
          </div>
          <div class="flex items-center gap-0.5">
            <Star
              v-for="i in 5"
              :key="i"
              class="size-4"
              :class="i <= Math.floor(overallRating)
                ? 'fill-primary text-primary'
                : 'fill-muted text-muted-foreground'"
            />
          </div>
        </div>
        <div class="flex flex-col">
          <span class="font-medium text-accent">Impressive</span>
          <span class="text-xs text-muted-foreground">
            from {{ totalReviews.toLocaleString() }} reviews
          </span>
        </div>
      </div>

      <div class="space-y-3">
        <div v-for="rating in ratings" :key="rating.label" class="flex items-center gap-3">
          <span class="w-24 text-sm text-muted-foreground">{{ rating.label }}</span>
          <div class="h-2 flex-1 rounded-full bg-muted overflow-hidden">
            <div
              class="h-full rounded-full bg-primary transition-all"
              :style="{ width: `${(rating.value / 5) * 100}%` }"
            />
          </div>
          <span class="w-8 text-right text-sm font-medium">{{ rating.value }}</span>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
