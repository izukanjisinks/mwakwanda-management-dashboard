<script setup lang="ts">
import { Plus, MoreHorizontal } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TaskPriority = 'high' | 'medium' | 'low'

interface Task {
  id: string
  title: string
  date: string
  priority: TaskPriority
}

const tasks: Task[] = [
  { id: '1', title: 'Set Up Conference Room B for 10 AM Meeting', date: 'June 19, 2028', priority: 'high' },
  { id: '2', title: 'Restock Housekeeping Supplies on 3rd Floor', date: 'June 19, 2028', priority: 'medium' },
  { id: '3', title: 'Inspect and Clean the Pool Area', date: 'June 20, 2028', priority: 'low' },
  { id: '4', title: 'Check-In Assistance During Peak Hours (4 PM - 6 PM)', date: 'June 20, 2028', priority: 'medium' },
]

const priorityColors: Record<TaskPriority, string> = {
  high: 'bg-primary/10 border-l-primary',
  medium: 'bg-chart-3/10 border-l-chart-3',
  low: 'bg-accent/10 border-l-accent',
}
</script>

<template>
  <Card>
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Tasks</CardTitle>
      <CardAction>
        <Button variant="ghost" size="icon" class="size-8">
          <Plus class="size-4" />
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent class="space-y-2">
      <div
        v-for="task in tasks"
        :key="task.id"
        :class="cn('rounded-lg border-l-4 p-3', priorityColors[task.priority])"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">{{ task.date }}</span>
            <span class="text-sm font-medium leading-tight">{{ task.title }}</span>
          </div>
          <Button variant="ghost" size="icon" class="size-6 shrink-0">
            <MoreHorizontal class="size-3" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
