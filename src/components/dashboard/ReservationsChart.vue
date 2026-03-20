<script setup lang="ts">
import { computed } from 'vue'
import { VisXYContainer, VisGroupedBar, VisAxis } from '@unovis/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DataPoint = { day: string; booked: number; cancelled: number }

const props = defineProps<{
  data: DataPoint[]
}>()

const data = computed(() => props.data ?? [])

const x = (_: DataPoint, i: number) => i
const ys = [(d: DataPoint) => d.booked, (d: DataPoint) => d.cancelled]
const colors = ['var(--color-primary)', 'var(--color-muted-foreground)']
const xTickFormat = (i: number) => data.value[i]?.day ?? ''
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <div>
        <CardTitle class="text-base font-medium">Reservations</CardTitle>
        <div class="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <div class="flex items-center gap-1.5">
            <div class="size-2 rounded-sm bg-primary" />
            <span>Booked</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="size-2 rounded-sm bg-muted-foreground" />
            <span>Cancelled</span>
          </div>
        </div>
      </div>
    </CardHeader>

    <CardContent>
      <VisXYContainer :data="data" :height="200">
          <VisGroupedBar
            :x="x"
            :y="ys"
            :color="colors"
            :rounded-corners="4"
            :bar-padding="0.15"
            :group-padding="0.05"
          />
          <VisAxis
            type="x"
            :x="x"
            :tick-format="xTickFormat"
            :tick-line="false"
            :domain-line="false"
            :grid-line="false"
          />
          <VisAxis
            type="y"
            :num-ticks="4"
            :tick-line="false"
            :domain-line="false"
          />
        </VisXYContainer>
    </CardContent>
  </Card>
</template>
