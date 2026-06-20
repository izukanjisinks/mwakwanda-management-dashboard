<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomsStore } from '@/stores/rooms'
import { useAuthStore } from '@/stores/auth'
import { bookingApi } from '@/services/api/bookings'
import type { Room } from '@/types/room'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'

const router = useRouter()
const roomsStore = useRoomsStore()
const authStore = useAuthStore()

// Step: 1 = pick room, 2 = enter dates & details, 3 = confirm
const step = ref(1)
const selectedRoom = ref<Room | null>(null)
const saving = ref(false)
const error = ref('')
const done = ref(false)

const form = ref({
  check_in: '',
  check_out: '',
  guests: 1,
  special_requests: '',
})

const today = new Date().toISOString().split('T')[0]

const availableRooms = computed(() => roomsStore.rooms.filter(r => r.is_available))

const nights = computed(() => {
  if (!form.value.check_in || !form.value.check_out) return 0
  const diff = new Date(form.value.check_out).getTime() - new Date(form.value.check_in).getTime()
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)))
})

const estimatedTotal = computed(() => {
  if (!selectedRoom.value || nights.value === 0) return 0
  return selectedRoom.value.price_per_night * nights.value
})

function selectRoom(room: Room) {
  selectedRoom.value = room
  step.value = 2
}

function goBack() {
  if (step.value > 1) step.value--
  error.value = ''
}

function goToConfirm() {
  error.value = ''
  if (!form.value.check_in) { error.value = 'Check-in date is required.'; return }
  if (!form.value.check_out) { error.value = 'Check-out date is required.'; return }
  if (nights.value === 0) { error.value = 'Check-out must be after check-in.'; return }
  if (form.value.guests < 1) { error.value = 'At least 1 guest required.'; return }
  if (selectedRoom.value && form.value.guests > selectedRoom.value.capacity) {
    error.value = `This room holds a maximum of ${selectedRoom.value.capacity} guests.`
    return
  }
  step.value = 3
}

async function handleSubmit() {
  if (!selectedRoom.value) return
  saving.value = true
  error.value = ''
  try {
    await bookingApi.createIndividual({
      booker_name: authStore.user?.full_name || authStore.user?.email || 'Guest',
      booker_email: authStore.user?.email || undefined,
      room_id: selectedRoom.value.id,
      check_in: form.value.check_in,
      check_out: form.value.check_out,
      special_requests: form.value.special_requests || undefined,
    })
    done.value = true
    toast.success('Booking request submitted successfully.')
  } catch (err) {
    error.value = getApiError(err, 'Failed to submit booking request.')
    toast.error(error.value)
    step.value = 2
  } finally {
    saving.value = false
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Ensure rooms are loaded
if (roomsStore.rooms.length === 0) roomsStore.fetchRooms()
</script>

<template>
  <DashboardHeader title="Book a Room" />

  <div class="flex flex-col gap-6 p-6 max-w-3xl">

    <!-- Success state -->
    <template v-if="done">
      <div class="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 class="size-16 text-accent" />
        <h2 class="text-2xl font-semibold">Booking Request Submitted</h2>
        <p class="text-muted-foreground max-w-sm">
          Your request for <strong>{{ selectedRoom?.name }}</strong> has been submitted.
          Our team will confirm it shortly.
        </p>
        <div class="flex gap-3 mt-4">
          <Button variant="outline" @click="router.push('/my-bookings')">View My Bookings</Button>
          <Button @click="() => { done = false; step = 1; selectedRoom = null; form = { check_in: '', check_out: '', guests: 1, special_requests: '' } }">
            Book Another Room
          </Button>
        </div>
      </div>
    </template>

    <template v-else>
      <!-- Step indicator -->
      <div class="flex items-center gap-2 text-sm">
        <span :class="step >= 1 ? 'text-primary font-medium' : 'text-muted-foreground'">1. Choose Room</span>
        <span class="text-muted-foreground">→</span>
        <span :class="step >= 2 ? 'text-primary font-medium' : 'text-muted-foreground'">2. Dates & Details</span>
        <span class="text-muted-foreground">→</span>
        <span :class="step >= 3 ? 'text-primary font-medium' : 'text-muted-foreground'">3. Confirm</span>
      </div>

      <!-- Step 1: Pick a room -->
      <template v-if="step === 1">
        <div v-if="roomsStore.loading" class="grid gap-4 sm:grid-cols-2">
          <div v-for="i in 4" :key="i" class="h-40 rounded-xl bg-muted animate-pulse" />
        </div>
        <div v-else-if="availableRooms.length === 0" class="py-16 text-center text-muted-foreground">
          No rooms are currently available. Please check back later.
        </div>
        <div v-else class="grid gap-4 sm:grid-cols-2">
          <Card
            v-for="room in availableRooms"
            :key="room.id"
            class="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            @click="selectRoom(room)"
          >
            <CardHeader class="pb-2">
              <div class="flex items-start justify-between">
                <CardTitle class="text-base">{{ room.name }}</CardTitle>
                <Badge variant="outline" class="capitalize shrink-0">{{ room.type }}</Badge>
              </div>
            </CardHeader>
            <CardContent class="flex flex-col gap-3">
              <p v-if="room.description" class="text-xs text-muted-foreground leading-relaxed">{{ room.description }}</p>
              <div class="flex flex-wrap gap-1">
                <Badge v-for="a in room.amenities.slice(0, 4)" :key="a" variant="secondary" class="text-xs">{{ a }}</Badge>
                <Badge v-if="room.amenities.length > 4" variant="outline" class="text-xs">+{{ room.amenities.length - 4 }}</Badge>
              </div>
              <div class="flex items-center justify-between pt-1 border-t">
                <span class="text-xs text-muted-foreground">Up to {{ room.capacity }} guest{{ room.capacity === 1 ? '' : 's' }}</span>
                <span class="font-semibold text-sm">ZMW {{ room.price_per_night.toLocaleString() }}<span class="text-xs font-normal text-muted-foreground">/night</span></span>
              </div>
            </CardContent>
          </Card>
        </div>
      </template>

      <!-- Step 2: Dates & details -->
      <template v-if="step === 2">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">{{ selectedRoom?.name }} — ZMW {{ selectedRoom?.price_per_night.toLocaleString() }}/night</CardTitle>
          </CardHeader>
          <CardContent>
            <form class="flex flex-col gap-5" @submit.prevent="goToConfirm">
              <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {{ error }}
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="grid gap-2">
                  <Label for="check_in">Check-In *</Label>
                  <Input id="check_in" v-model="form.check_in" type="date" :min="today" />
                </div>
                <div class="grid gap-2">
                  <Label for="check_out">Check-Out *</Label>
                  <Input id="check_out" v-model="form.check_out" type="date" :min="form.check_in || today" />
                </div>
              </div>

              <div class="grid gap-2">
                <Label for="guests">Number of Guests *</Label>
                <Input id="guests" v-model.number="form.guests" type="number" min="1" :max="selectedRoom?.capacity" />
                <p class="text-xs text-muted-foreground">Max capacity: {{ selectedRoom?.capacity }} guest{{ selectedRoom?.capacity === 1 ? '' : 's' }}</p>
              </div>

              <div v-if="estimatedTotal > 0" class="rounded-lg bg-muted/50 border px-4 py-3 flex items-center justify-between text-sm">
                <span class="text-muted-foreground">{{ nights }} night{{ nights === 1 ? '' : 's' }} × ZMW {{ selectedRoom?.price_per_night.toLocaleString() }}</span>
                <span class="font-semibold">ZMW {{ estimatedTotal.toLocaleString() }}</span>
              </div>

              <div class="grid gap-2">
                <Label for="special_requests">Special Requests</Label>
                <textarea
                  id="special_requests"
                  v-model="form.special_requests"
                  rows="2"
                  placeholder="Any special requests or notes..."
                  class="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              <div class="flex gap-3 justify-end">
                <Button type="button" variant="outline" @click="goBack">Back</Button>
                <Button type="submit">Review Booking</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </template>

      <!-- Step 3: Confirm -->
      <template v-if="step === 3">
        <Card>
          <CardHeader>
            <CardTitle class="text-base">Review & Confirm</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-col gap-4">
            <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {{ error }}
            </div>

            <div class="grid gap-3 text-sm">
              <div class="flex justify-between py-2 border-b">
                <span class="text-muted-foreground">Room</span>
                <span class="font-medium">{{ selectedRoom?.name }}</span>
              </div>
              <div class="flex justify-between py-2 border-b">
                <span class="text-muted-foreground">Type</span>
                <span class="capitalize">{{ selectedRoom?.type }}</span>
              </div>
              <div class="flex justify-between py-2 border-b">
                <span class="text-muted-foreground">Check-In</span>
                <span>{{ formatDate(form.check_in) }}</span>
              </div>
              <div class="flex justify-between py-2 border-b">
                <span class="text-muted-foreground">Check-Out</span>
                <span>{{ formatDate(form.check_out) }}</span>
              </div>
              <div class="flex justify-between py-2 border-b">
                <span class="text-muted-foreground">Duration</span>
                <span>{{ nights }} night{{ nights === 1 ? '' : 's' }}</span>
              </div>
              <div class="flex justify-between py-2 border-b">
                <span class="text-muted-foreground">Guests</span>
                <span>{{ form.guests }}</span>
              </div>
              <div v-if="form.special_requests" class="flex justify-between py-2 border-b">
                <span class="text-muted-foreground">Special Requests</span>
                <span class="text-right max-w-48">{{ form.special_requests }}</span>
              </div>
              <div class="flex justify-between py-3 font-semibold text-base">
                <span>Estimated Total</span>
                <span>ZMW {{ estimatedTotal.toLocaleString() }}</span>
              </div>
            </div>

            <p class="text-xs text-muted-foreground">
              Your booking will be submitted as a request. Our team will confirm availability and contact you.
            </p>

            <div class="flex gap-3 justify-end">
              <Button variant="outline" :disabled="saving" @click="goBack">Back</Button>
              <Button :disabled="saving" @click="handleSubmit">
                <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
                Confirm Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      </template>
    </template>
  </div>
</template>
