<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { PDFViewer, PDFDownloadLink } from '@ceereals/vue-pdf'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-vue-next'
import InvoiceDocument from './InvoiceDocument.vue'
import type { Invoice } from '@/types/invoice'

const props = defineProps<{
  open: boolean
  invoice: Invoice | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const pdfReady = ref(false)

// Give the PDF viewer a moment to render after the sheet opens
watch(() => props.open, async (open) => {
  if (open) {
    pdfReady.value = false
    await nextTick()
    setTimeout(() => { pdfReady.value = true }, 300)
  }
})

function fileName() {
  if (!props.invoice) return 'invoice.pdf'
  return `Invoice-${props.invoice.invoice_number}.pdf`
}
</script>

<template>
  <Sheet :open="open" @update:open="(v) => emit('update:open', v)">
    <SheetContent side="right" class="w-full sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden">

      <SheetHeader class="px-6 pt-5 pb-4 border-b flex-row items-center justify-between pr-14">
        <div>
          <SheetTitle>Invoice PDF</SheetTitle>
          <SheetDescription v-if="invoice">{{ invoice.invoice_number }} · {{ invoice.client_name }}</SheetDescription>
        </div>

        <!-- Download button -->
        <PDFDownloadLink v-if="invoice && pdfReady" :file-name="fileName()">
          <template #default>
            <InvoiceDocument :invoice="invoice" />
          </template>
          <template #label>
            <Button size="sm">
              <Download class="size-4 mr-2" />
              Download PDF
            </Button>
          </template>
        </PDFDownloadLink>
      </SheetHeader>

      <!-- PDF preview -->
      <div class="flex-1 min-h-0 overflow-hidden bg-muted/30 flex items-center justify-center">
        <div v-if="!pdfReady || !invoice" class="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 class="size-8 animate-spin" />
          <p class="text-sm">Generating preview…</p>
        </div>

        <PDFViewer
          v-else
          :key="invoice.id"
          :show-toolbar="false"
          class="w-full h-full"
        >
          <InvoiceDocument :invoice="invoice" />
        </PDFViewer>
      </div>

    </SheetContent>
  </Sheet>
</template>
