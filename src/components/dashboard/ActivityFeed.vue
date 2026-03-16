<script setup lang="ts">
import { MoreHorizontal } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ActivityType = 'check-in' | 'check-out' | 'cleaning' | 'maintenance' | 'setup'

interface Activity {
  id: string
  title: string
  description: string
  time: string
  type: ActivityType
}

const activities: Activity[] = [
  { id: '1', title: 'Conference Room Setup', description: 'Events Team set up Conference Room B for 10 AM meeting, including AV equipment and refreshments.', time: '10:00 AM', type: 'setup' },
  { id: '2', title: 'Guest Check-Out', description: 'Sarah Johnson completed check-out process and updated room availability for Room 305.', time: '9:45 AM', type: 'check-out' },
  { id: '3', title: 'Room Cleaning Completed', description: 'Maria Gonzalez cleaned and prepared Room 204 for new guests.', time: '9:30 AM', type: 'cleaning' },
  { id: '4', title: 'Maintenance Request Logged', description: 'Broken toilet in Room 109, maintenance request assigned to technician.', time: '9:15 AM', type: 'maintenance' },
  { id: '5', title: 'Guest Check-In', description: 'New guest Mr. Roberts checked into Suite 401 for a 3-night stay.', time: '9:00 AM', type: 'check-in' },
]

const typeColors: Record<ActivityType, string> = {
  'check-in': 'bg-accent',
  'check-out': 'bg-chart-3',
  'cleaning': 'bg-primary',
  'maintenance': 'bg-destructive',
  'setup': 'bg-chart-5',
}
</script>

<template>
  <Card class="flex flex-col flex-1">
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Recent Activities</CardTitle>
      <CardAction>
        <Button variant="ghost" size="icon" class="size-8">
          <MoreHorizontal class="size-4" />
        </Button>
      </CardAction>
    </CardHeader>
    <CardContent class="flex-1">
      <div class="relative space-y-8">
        <!-- Timeline line -->
        <div class="absolute left-[7px] top-2 h-[calc(100%-16px)] w-0.5 bg-border" />

        <div
          v-for="activity in activities"
          :key="activity.id"
          class="relative flex gap-3 pl-6"
        >
          <!-- Timeline dot -->
          <div
            :class="cn('absolute left-0 top-1 size-4 rounded-full border-2 border-background', typeColors[activity.type])"
          />
          <div class="flex flex-col gap-1">
            <span class="text-xs text-muted-foreground">{{ activity.time }}</span>
            <span class="text-sm font-medium">{{ activity.title }}</span>
            <p class="text-xs text-muted-foreground leading-relaxed">{{ activity.description }}</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
