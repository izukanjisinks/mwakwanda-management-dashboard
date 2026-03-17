import { ref, computed, watch } from 'vue'
import type { Ref, ComputedRef } from 'vue'

export function usePagination<T>(source: ComputedRef<T[]> | Ref<T[]>, pageSize = 20) {
  const page = ref(1)

  // Reset to page 1 whenever the source list changes (e.g. after a search)
  watch(source, () => { page.value = 1 })

  const total = computed(() => source.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

  const paginated = computed(() => {
    const start = (page.value - 1) * pageSize
    return source.value.slice(start, start + pageSize)
  })

  function prev() { if (page.value > 1) page.value-- }
  function next() { if (page.value < totalPages.value) page.value++ }
  function goTo(n: number) {
    if (n >= 1 && n <= totalPages.value) page.value = n
  }

  // Visible page numbers (max 5 around current)
  const pageNumbers = computed(() => {
    const total = totalPages.value
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const cur = page.value
    const pages: (number | '...')[] = [1]
    if (cur > 3) pages.push('...')
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
    if (cur < total - 2) pages.push('...')
    pages.push(total)
    return pages
  })

  return { page, total, totalPages, paginated, prev, next, goTo, pageNumbers }
}
