<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ImagePlus, Upload, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useRoomsStore } from '@/stores/rooms'
import type { Room } from '@/types/room'

const store = useRoomsStore()

const props = defineProps<{
  open: boolean
  room: Room | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

interface PendingFile {
  id: string
  file: File
  url: string
}

// Already-uploaded URLs from the backend
const existingImages = ref<string[]>([])
// New files selected by the user, not yet uploaded
const pending = ref<PendingFile[]>([])

const isDragging = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const ACCEPTED = ['image/jpeg', 'image/png', 'image/heic']
const MAX_SIZE = 10 * 1024 * 1024

// Populate existing images whenever the dialog opens for a room
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    existingImages.value = props.room?.images ? [...props.room.images] : []
    pending.value = []
  }
})

function addFiles(files: FileList | File[]) {
  for (const file of Array.from(files)) {
    if (!ACCEPTED.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
      toast.error(`${file.name}: unsupported format. Use JPG, PNG, or HEIC.`)
      continue
    }
    if (file.size > MAX_SIZE) {
      toast.error(`${file.name} exceeds the 10 MB limit.`)
      continue
    }
    if (pending.value.some(p => p.file.name === file.name && p.file.size === file.size)) {
      continue
    }
    pending.value.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) })
  }
}

function onFileInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(input.files)
  input.value = ''
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
}

function removeExisting(url: string) {
  existingImages.value = existingImages.value.filter(u => u !== url)
}

function removePending(id: string) {
  const idx = pending.value.findIndex(p => p.id === id)
  if (idx !== -1) {
    URL.revokeObjectURL(pending.value[idx]!.url)
    pending.value.splice(idx, 1)
  }
}

function clearPending() {
  pending.value.forEach(p => URL.revokeObjectURL(p.url))
  pending.value = []
}

const totalCount = computed(() => existingImages.value.length + pending.value.length)
const hasChanges = computed(() => {
  const originalUrls = props.room?.images ?? []
  const existingChanged = existingImages.value.length !== originalUrls.length ||
    existingImages.value.some(u => !originalUrls.includes(u))
  return existingChanged || pending.value.length > 0
})

async function handleUpload() {
  if (!hasChanges.value || !props.room) return
  uploading.value = true
  try {
    const files = pending.value.map(p => p.file)
    await store.uploadImages(props.room.id, files, existingImages.value)
    toast.success(`Gallery updated for ${props.room.name}.`)
    clearPending()
    emit('update:open', false)
  } catch {
    toast.error('Upload failed. Please try again.')
  } finally {
    uploading.value = false
  }
}

function handleClose() {
  if (uploading.value) return
  clearPending()
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="handleClose">
    <DialogContent class="max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl">
      <!-- Header -->
      <DialogHeader class="px-8 pt-8 pb-4 text-center border-b border-border/10">
        <DialogTitle class="text-2xl font-bold font-headline">Room Images</DialogTitle>
        <DialogDescription class="text-sm text-muted-foreground mt-1">
          Manage photography for <span class="font-semibold text-foreground">{{ room?.name ?? 'this room' }}</span>
        </DialogDescription>
      </DialogHeader>

      <!-- Body -->
      <div class="p-8 space-y-6 overflow-y-auto max-h-[calc(100vh-280px)]">

        <!-- Drop Zone -->
        <div
          class="relative rounded-2xl border-2 border-dashed transition-colors cursor-pointer"
          :class="isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40 bg-muted/20'"
          @click="fileInput?.click()"
          @dragover.prevent="isDragging = true"
          @dragleave="isDragging = false"
          @drop.prevent="onDrop"
        >
          <div class="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ImagePlus class="size-6" />
            </div>
            <div class="space-y-1">
              <p class="font-headline font-bold text-base text-foreground">
                Drag and drop images here or click to browse
              </p>
              <p class="text-xs text-muted-foreground">
                Supported formats: JPG, PNG, HEIC &mdash; Max 10 MB each
              </p>
            </div>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/heic,.heic"
            multiple
            class="hidden"
            @change="onFileInputChange"
          />
        </div>

        <!-- Gallery -->
        <div v-if="totalCount > 0" class="space-y-3">
          <div class="flex items-end justify-between">
            <h3 class="text-sm font-semibold text-muted-foreground">
              Gallery ({{ totalCount }} {{ totalCount === 1 ? 'image' : 'images' }})
            </h3>
            <button
              v-if="pending.length > 0"
              class="text-xs font-bold text-primary hover:underline transition-all"
              @click="clearPending"
            >
              Clear new
            </button>
          </div>

          <div class="grid grid-cols-4 gap-3">
            <!-- Existing uploaded images -->
            <div
              v-for="url in existingImages"
              :key="url"
              class="relative group aspect-square rounded-lg overflow-hidden bg-muted"
            >
              <img :src="url" alt="Room image" class="w-full h-full object-cover" />
              <button
                class="absolute top-1 right-1 w-6 h-6 bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="removeExisting(url)"
              >
                <X class="size-3" />
              </button>
            </div>

            <!-- New pending files -->
            <div
              v-for="preview in pending"
              :key="preview.id"
              class="relative group aspect-square rounded-lg overflow-hidden bg-muted ring-2 ring-primary/40"
            >
              <img :src="preview.url" :alt="preview.file.name" class="w-full h-full object-cover" />
              <!-- "new" badge -->
              <span class="absolute bottom-1 left-1 text-[10px] font-bold bg-primary text-primary-foreground rounded px-1 py-0.5 leading-none">
                NEW
              </span>
              <button
                class="absolute top-1 right-1 w-6 h-6 bg-destructive/90 text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="removePending(preview.id)"
              >
                <X class="size-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <DialogFooter class="px-8 py-5 bg-muted/30 flex items-center justify-between border-t border-border/10 sm:justify-between">
        <Button variant="ghost" :disabled="uploading" @click="handleClose">
          Cancel
        </Button>
        <Button :disabled="!hasChanges || uploading" class="gap-2" @click="handleUpload">
          <Upload class="size-4" />
          {{ uploading ? 'Uploading…' : 'Save Gallery' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
