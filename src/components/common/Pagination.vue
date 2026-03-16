<script setup lang="ts">
import { computed } from 'vue'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  currentPage: number
  pageSize: number
  total: number
}>()

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const totalPages = computed(() => Math.ceil(props.total / props.pageSize))
const canGoPrevious = computed(() => props.currentPage > 1)
const canGoNext = computed(() => props.currentPage < totalPages.value)

const startItem = computed(() => {
  if (props.total === 0) return 0
  return (props.currentPage - 1) * props.pageSize + 1
})

const endItem = computed(() => {
  const end = props.currentPage * props.pageSize
  return end > props.total ? props.total : end
})

function goToPrevious() {
  if (canGoPrevious.value) {
    emit('update:page', props.currentPage - 1)
  }
}

function goToNext() {
  if (canGoNext.value) {
    emit('update:page', props.currentPage + 1)
  }
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:page', page)
  }
}

// Generate page numbers to show
const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5

  if (totalPages.value <= maxVisible) {
    // Show all pages if total is small
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i)
    }
  } else {
    // Show current, surrounding pages, and ellipsis
    const start = Math.max(1, props.currentPage - 1)
    const end = Math.min(totalPages.value, props.currentPage + 1)

    if (start > 1) pages.push(1)
    if (start > 2) pages.push(-1) // -1 represents ellipsis

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (end < totalPages.value - 1) pages.push(-1)
    if (end < totalPages.value) pages.push(totalPages.value)
  }

  return pages
})
</script>

<template>
  <div class="flex items-center justify-between px-2 py-4">
    <div class="text-sm text-muted-foreground">
      Showing {{ startItem }} to {{ endItem }} of {{ total }} results
    </div>

    <div class="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        @click="goToPrevious"
        :disabled="!canGoPrevious"
      >
        <ChevronLeft class="w-4 h-4" />
      </Button>

      <div class="flex items-center gap-1">
        <Button
          v-for="page in visiblePages"
          :key="page"
          :variant="page === currentPage ? 'default' : 'outline'"
          size="sm"
          @click="page > 0 ? goToPage(page) : null"
          :disabled="page === -1"
          class="min-w-[36px]"
        >
          {{ page === -1 ? '...' : page }}
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        @click="goToNext"
        :disabled="!canGoNext"
      >
        <ChevronRight class="w-4 h-4" />
      </Button>
    </div>
  </div>
</template>
