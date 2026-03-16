<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Hotel, CalendarDays, ReceiptText, LayoutDashboard } from 'lucide-vue-next'

const authStore = useAuthStore()
</script>

<template>
  <div class="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
    <div>
      <h1 class="text-2xl font-semibold flex items-center gap-2">
        <LayoutDashboard class="size-6" />
        Dashboard
      </h1>
      <p class="text-muted-foreground">
        Welcome back, {{ authStore.user?.full_name || authStore.user?.email }}
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader class="pb-2">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Hotel class="size-5 text-primary" />
            </div>
            <CardTitle class="text-base">Rooms</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>Room management coming in Phase 2.</CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays class="size-5 text-primary" />
            </div>
            <CardTitle class="text-base">Bookings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>Booking flow coming in Phase 4.</CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ReceiptText class="size-5 text-primary" />
            </div>
            <CardTitle class="text-base">Invoices</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>Invoice module coming in Phase 6.</CardDescription>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
