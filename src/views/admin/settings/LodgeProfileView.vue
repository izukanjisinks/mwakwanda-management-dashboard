<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  MapPin,
  Clock,
  Car,
  UtensilsCrossed,
  Loader2,
  ArrowLeft,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import { useSettingsStore } from '@/stores/settings'
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LodgeProfilePayload } from '@/types/settings'

const router = useRouter()
const store = useSettingsStore()
const saving = ref(false)

const form = ref<LodgeProfilePayload>({
  address: '',
  city: '',
  country: '',
  latitude: null,
  longitude: null,
  google_maps_url: '',
  check_in_time: '14:00',
  check_out_time: '10:00',
  has_parking: false,
  parking_details: '',
  has_restaurant: false,
  restaurant_name: '',
  restaurant_opens: '07:00',
  restaurant_closes: '22:00',
  restaurant_description: '',
})

const original = ref<LodgeProfilePayload>({ ...form.value })

onMounted(async () => {
  await store.fetchLodgeProfile()
  syncFromStore()
})

function syncFromStore() {
  const p = store.lodgeProfile
  if (!p) return
  form.value = {
    address: p.address ?? '',
    city: p.city ?? '',
    country: p.country ?? '',
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    google_maps_url: p.google_maps_url ?? '',
    check_in_time: p.check_in_time ?? '14:00',
    check_out_time: p.check_out_time ?? '10:00',
    has_parking: p.has_parking ?? false,
    parking_details: p.parking_details ?? '',
    has_restaurant: p.has_restaurant ?? false,
    restaurant_name: p.restaurant_name ?? '',
    restaurant_opens: p.restaurant_opens ?? '07:00',
    restaurant_closes: p.restaurant_closes ?? '22:00',
    restaurant_description: p.restaurant_description ?? '',
  }
  original.value = { ...form.value }
}

watch(() => store.lodgeProfile, syncFromStore)

function discard() {
  form.value = { ...original.value }
}

async function save() {
  saving.value = true
  try {
    await store.updateLodgeProfile(form.value)
    toast.success('Lodge profile saved.')
  } catch (err) {
    toast.error(getApiError(err, 'Failed to save lodge profile.'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <DashboardHeader title="Lodge Profile" />

  <div class="flex flex-col gap-8 p-6 flex-1 min-h-0 overflow-y-auto">
    <div>
      <Button variant="ghost" class="-ml-2" @click="router.push({ name: 'settings' })">
        <ArrowLeft class="size-4 mr-2" />
        Back to Settings
      </Button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="store.profileLoading" class="flex items-center justify-center py-16">
      <Loader2 class="size-6 animate-spin text-muted-foreground" />
    </div>

    <template v-else>

      <!-- Section: Location -->
      <section>
        <h2 class="text-base font-semibold flex items-center gap-2 mb-4">
          <div class="size-5 rounded bg-primary/10 flex items-center justify-center">
            <MapPin class="size-3 text-primary" />
          </div>
          Location &amp; Address
        </h2>

        <div class="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2 flex flex-col gap-1.5">
            <Label for="address">Street Address</Label>
            <Input
              id="address"
              v-model="form.address"
              placeholder="123 Main Road"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="city">City / Town</Label>
            <Input
              id="city"
              v-model="form.city"
              placeholder="Cape Town"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="country">Country</Label>
            <Input
              id="country"
              v-model="form.country"
              placeholder="South Africa"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="latitude">Latitude <span class="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="latitude"
              v-model.number="form.latitude"
              type="number"
              step="any"
              placeholder="-33.9249"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="longitude">Longitude <span class="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="longitude"
              v-model.number="form.longitude"
              type="number"
              step="any"
              placeholder="18.4241"
            />
          </div>

          <div class="md:col-span-2 flex flex-col gap-1.5">
            <Label for="maps_url">Google Maps Link <span class="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="maps_url"
              v-model="form.google_maps_url"
              placeholder="https://maps.google.com/..."
            />
            <p class="text-xs text-muted-foreground">Paste the share link from Google Maps so guests can get directions.</p>
          </div>
        </div>
      </section>

      <!-- Section: Operating Hours -->
      <section>
        <h2 class="text-base font-semibold flex items-center gap-2 mb-4">
          <div class="size-5 rounded bg-primary/10 flex items-center justify-center">
            <Clock class="size-3 text-primary" />
          </div>
          Check-in &amp; Check-out Times
        </h2>

        <div class="rounded-xl border bg-card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <Label for="check_in">Check-in Time</Label>
            <Input
              id="check_in"
              v-model="form.check_in_time"
              type="time"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="check_out">Check-out Time</Label>
            <Input
              id="check_out"
              v-model="form.check_out_time"
              type="time"
            />
          </div>
        </div>
      </section>

      <!-- Section: Parking -->
      <section>
        <h2 class="text-base font-semibold flex items-center gap-2 mb-4">
          <div class="size-5 rounded bg-primary/10 flex items-center justify-center">
            <Car class="size-3 text-primary" />
          </div>
          Parking
        </h2>

        <div class="rounded-xl border bg-card p-5 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">Parking Available</p>
              <p class="text-xs text-muted-foreground">Toggle on if the lodge offers parking for guests.</p>
            </div>
            <button
              type="button"
              :class="[
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.has_parking ? 'bg-primary' : 'bg-input',
              ]"
              @click="form.has_parking = !form.has_parking"
            >
              <span
                :class="[
                  'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform',
                  form.has_parking ? 'translate-x-4' : 'translate-x-0',
                ]"
              />
            </button>
          </div>

          <div v-if="form.has_parking" class="flex flex-col gap-1.5 pt-2 border-t">
            <Label for="parking_details">Parking Details</Label>
            <textarea
              id="parking_details"
              v-model="form.parking_details"
              rows="3"
              placeholder="e.g. Free secure parking on-site, 20 bays available. Overflow parking available on street."
              class="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>
      </section>

      <!-- Section: Restaurant -->
      <section>
        <h2 class="text-base font-semibold flex items-center gap-2 mb-4">
          <div class="size-5 rounded bg-primary/10 flex items-center justify-center">
            <UtensilsCrossed class="size-3 text-primary" />
          </div>
          Restaurant
        </h2>

        <div class="rounded-xl border bg-card p-5 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium">Restaurant on Site</p>
              <p class="text-xs text-muted-foreground">Toggle on if the lodge has a restaurant or dining facility.</p>
            </div>
            <button
              type="button"
              :class="[
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.has_restaurant ? 'bg-primary' : 'bg-input',
              ]"
              @click="form.has_restaurant = !form.has_restaurant"
            >
              <span
                :class="[
                  'pointer-events-none inline-block size-4 rounded-full bg-background shadow-lg transition-transform',
                  form.has_restaurant ? 'translate-x-4' : 'translate-x-0',
                ]"
              />
            </button>
          </div>

          <template v-if="form.has_restaurant">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              <div class="md:col-span-2 flex flex-col gap-1.5">
                <Label for="restaurant_name">Restaurant Name</Label>
                <Input
                  id="restaurant_name"
                  v-model="form.restaurant_name"
                  placeholder="The Fireplace Restaurant"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <Label for="restaurant_opens">Opening Time</Label>
                <Input
                  id="restaurant_opens"
                  v-model="form.restaurant_opens"
                  type="time"
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <Label for="restaurant_closes">Closing Time</Label>
                <Input
                  id="restaurant_closes"
                  v-model="form.restaurant_closes"
                  type="time"
                />
              </div>

              <div class="md:col-span-2 flex flex-col gap-1.5">
                <Label for="restaurant_description">Description <span class="text-muted-foreground text-xs">(optional)</span></Label>
                <textarea
                  id="restaurant_description"
                  v-model="form.restaurant_description"
                  rows="3"
                  placeholder="e.g. Enjoy a full breakfast buffet and à la carte dinners with panoramic views."
                  class="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          </template>
        </div>
      </section>

      <!-- Spacer -->
      <div class="flex-1" />

    </template>

    <!-- Footer actions -->
    <div class="flex items-center justify-end gap-3 py-4 border-t">
      <Button variant="ghost" :disabled="saving" @click="discard">
        Discard Changes
      </Button>
      <Button :disabled="saving || store.profileLoading" @click="save">
        <Loader2 v-if="saving" class="size-4 animate-spin mr-2" />
        Save Profile
      </Button>
    </div>

  </div>
</template>
