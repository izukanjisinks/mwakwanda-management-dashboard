<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Search, Loader2 } from 'lucide-vue-next'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

// modelValue is a "lat,lng" string e.g. "-15.416600,28.283300" or null
const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const mapContainer = ref<HTMLDivElement>()
const searchQuery = ref('')
const searchResults = ref<NominatimResult[]>([])
const searching = ref(false)

const latInput = ref('')
const lngInput = ref('')

let map: L.Map | null = null
let marker: L.Marker | null = null

const DEFAULT_CENTER: L.LatLngTuple = [-15.4166, 28.2833]
const DEFAULT_ZOOM = 12

function parseValue(val: string | null): { lat: number; lng: number } | null {
  if (!val) return null
  const [a, b] = val.split(',')
  const lat = parseFloat(a)
  const lng = parseFloat(b)
  if (isNaN(lat) || isNaN(lng)) return null
  return { lat, lng }
}

function formatValue(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`
}

function createPinIcon() {
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path fill="#3b82f6" stroke="#1d4ed8" stroke-width="0.5" d="M12 1C7.03 1 3 5.03 3 10c0 6.63 9 25 9 25s9-18.37 9-25C21 5.03 16.97 1 12 1z"/>
      <circle fill="white" cx="12" cy="10" r="4"/>
    </svg>`,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
  })
}

function placeMarker(lat: number, lng: number) {
  if (!map) return
  if (marker) {
    marker.setLatLng([lat, lng])
  } else {
    marker = L.marker([lat, lng], { draggable: true, icon: createPinIcon() }).addTo(map)
    marker.on('dragend', () => {
      const pos = marker!.getLatLng()
      syncFromCoords(pos.lat, pos.lng, true)
    })
  }
}

function syncFromCoords(lat: number, lng: number, fromDrag = false) {
  latInput.value = lat.toFixed(6)
  lngInput.value = lng.toFixed(6)
  if (!fromDrag) placeMarker(lat, lng)
  emit('update:modelValue', formatValue(lat, lng))
}

function initMap() {
  if (!mapContainer.value) return

  const coords = parseValue(props.modelValue)
  const center: L.LatLngTuple = coords ? [coords.lat, coords.lng] : DEFAULT_CENTER

  map = L.map(mapContainer.value).setView(center, DEFAULT_ZOOM)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map)

  if (coords) {
    placeMarker(coords.lat, coords.lng)
    latInput.value = coords.lat.toFixed(6)
    lngInput.value = coords.lng.toFixed(6)
  }

  map.on('click', (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng
    syncFromCoords(lat, lng)
  })
}

// Called when user commits a value in the lat or lng input (blur / Enter)
function handleInputCommit() {
  const lat = parseFloat(latInput.value)
  const lng = parseFloat(lngInput.value)
  if (isNaN(lat) || isNaN(lng)) return
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return
  placeMarker(lat, lng)
  map?.setView([lat, lng], map.getZoom())
  emit('update:modelValue', formatValue(lat, lng))
}

async function handleSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  searching.value = true
  searchResults.value = []
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
      { headers: { 'Accept-Language': 'en' } },
    )
    searchResults.value = await res.json()
  } catch {
    searchResults.value = []
  } finally {
    searching.value = false
  }
}

function selectResult(result: NominatimResult) {
  const lat = parseFloat(result.lat)
  const lng = parseFloat(result.lon)
  searchResults.value = []
  searchQuery.value = ''
  if (!map) return
  map.setView([lat, lng], 16)
  syncFromCoords(lat, lng)
}

onMounted(async () => {
  await nextTick()
  initMap()
})

onUnmounted(() => {
  map?.remove()
  map = null
  marker = null
})

// Sync map/inputs when the parent resets the form (e.g. dialog re-opens)
watch(
  () => props.modelValue,
  (val) => {
    const coords = parseValue(val)
    if (coords) {
      latInput.value = coords.lat.toFixed(6)
      lngInput.value = coords.lng.toFixed(6)
      if (map) placeMarker(coords.lat, coords.lng)
    } else {
      latInput.value = ''
      lngInput.value = ''
      if (marker) { marker.remove(); marker = null }
    }
  },
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Search -->
    <div class="relative">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            v-model="searchQuery"
            placeholder="Search for a location..."
            class="pl-9"
            @keydown.enter.prevent="handleSearch"
          />
        </div>
        <Button type="button" variant="outline" size="icon" :disabled="searching" @click="handleSearch">
          <Loader2 v-if="searching" class="size-4 animate-spin" />
          <Search v-else class="size-4" />
        </Button>
      </div>

      <!-- Results dropdown -->
      <div
        v-if="searchResults.length > 0"
        class="absolute z-[2000] top-full left-0 right-0 mt-1 rounded-md border bg-popover shadow-md overflow-hidden max-h-48 overflow-y-auto"
      >
        <button
          v-for="result in searchResults"
          :key="result.place_id"
          type="button"
          class="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors border-b last:border-0 truncate"
          @click="selectResult(result)"
        >
          {{ result.display_name }}
        </button>
      </div>
    </div>

    <!-- Map -->
    <div ref="mapContainer" class="w-full rounded-md overflow-hidden border" style="height: 300px;" />

    <!-- Coordinate inputs -->
    <div class="grid grid-cols-2 gap-3">
      <div class="grid gap-1.5">
        <Label class="text-xs text-muted-foreground">Latitude</Label>
        <Input
          v-model="latInput"
          placeholder="e.g. -15.416600"
          @change="handleInputCommit"
          @keydown.enter.prevent="handleInputCommit"
        />
      </div>
      <div class="grid gap-1.5">
        <Label class="text-xs text-muted-foreground">Longitude</Label>
        <Input
          v-model="lngInput"
          placeholder="e.g. 28.283300"
          @change="handleInputCommit"
          @keydown.enter.prevent="handleInputCommit"
        />
      </div>
    </div>

    <p class="text-xs text-muted-foreground">
      Click on the map to pin a location, drag the pin to adjust, or type coordinates directly.
    </p>
  </div>
</template>
