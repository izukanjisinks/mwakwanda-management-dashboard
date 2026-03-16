<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { payrollApi } from '@/services/api/payroll'
import type { Payslip } from '@/types/payroll'
import { PDFViewer, PDFDownloadLink } from '@ceereals/vue-pdf'
import PayslipDocument from '@/components/payroll/PayslipDocument.vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Download, DollarSign, Loader2 } from 'lucide-vue-next'
import { formatCurrency } from '@/lib/utils'

const payslips = ref<Payslip[]>([])
const selectedPayslip = ref<Payslip | null>(null)
const loading = ref(true)
const pdfLoading = ref(false)
const error = ref<string | null>(null)

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatPeriod(payslip: Payslip) {
  return `${monthNames[payslip.month - 1]} ${payslip.year}`
}


function selectPayslip(payslip: Payslip) {
  if (payslip.id === selectedPayslip.value?.id) return
  pdfLoading.value = true
  selectedPayslip.value = payslip
  nextTick(() => {
    setTimeout(() => {
      pdfLoading.value = false
    }, 800)
  })
}

async function fetchPayslips() {
  loading.value = true
  error.value = null
  try {
    const response = await payrollApi.getMyPayslips()
    payslips.value = response.data ?? []
    if (payslips.value.length > 0) {
      selectedPayslip.value = payslips.value[0]
    }
  } catch (err: any) {
    error.value = err?.error?.message || 'Failed to load payslips'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPayslips()
})
</script>

<template>
  <div class="flex flex-col gap-6 p-6 h-full">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-semibold">Payslips</h1>
      <p class="text-muted-foreground">View and download your payslips</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
      {{ error }}
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex gap-6 flex-1">
      <div class="w-80 shrink-0 space-y-3">
        <Skeleton v-for="i in 4" :key="i" class="h-20 w-full" />
      </div>
      <Skeleton class="flex-1 h-150" />
    </div>

    <!-- Content -->
    <div v-else class="flex gap-20 flex-1 min-h-0 justify-center">
      <!-- Left Panel: Payslip List -->
      <div class="w-80 shrink-0">
        <Card class="shadow-none h-full">
          <CardHeader class="pb-3">
            <CardTitle class="text-base">Pay History</CardTitle>
          </CardHeader>
          <CardContent class="p-0">
            <div v-if="payslips.length === 0" class="p-6 text-center">
              <div class="size-12 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
                <FileText class="size-6 text-muted-foreground" />
              </div>
              <p class="text-sm text-muted-foreground">No payslips found</p>
            </div>

            <div v-else class="divide-y">
              <div
                v-for="payslip in payslips"
                :key="payslip.id"
                class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-accent/50"
                :class="selectedPayslip?.id === payslip.id ? 'bg-accent' : ''"
                @click="selectPayslip(payslip)"
              >
                <div class="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <DollarSign class="size-4 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">{{ formatPeriod(payslip) }}</p>
                  <p class="text-xs text-muted-foreground">{{ payslip.position_name }}</p>
                </div>
                <p class="text-sm font-semibold tabular-nums">
                  {{ formatCurrency(payslip.net_salary) }}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Right Panel: PDF Preview -->
      <div class="flex flex-col min-h-0 w-full max-w-148.75">
        <div v-if="!selectedPayslip" class="flex-1 flex items-center justify-center border rounded-lg bg-muted/30">
          <div class="text-center">
            <FileText class="size-12 text-muted-foreground mx-auto mb-3" />
            <p class="text-sm text-muted-foreground">Select a payslip to preview</p>
          </div>
        </div>

        <template v-else>
          <!-- PDF Viewer -->
          <div class="flex-1 border rounded-lg overflow-hidden min-h-150 relative bg-white">
            <Transition name="fade">
              <div v-if="pdfLoading" class="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <div class="flex flex-col items-center gap-2">
                  <Loader2 class="size-8 animate-spin text-primary" />
                  <p class="text-sm text-muted-foreground">Loading payslip...</p>
                </div>
              </div>
            </Transition>
            <PDFViewer :key="selectedPayslip.id" :show-toolbar="false" class="w-full h-full" :query-params="{ toolbar: 0, scrollbar: 0, navpanes: 0 }">
              <PayslipDocument :payslip="selectedPayslip" />
            </PDFViewer>
          </div>

          <!-- Download Button -->
          <PDFDownloadLink :file-name="`Payslip-${formatPeriod(selectedPayslip).replace(/\\s/g, '-')}.pdf`">
            <template #default>
              <PayslipDocument :payslip="selectedPayslip" />
            </template>
            <template #label>
              <Button variant="outline" class="w-full mt-3">
                <Download class="size-4 mr-2" />
                Download PDF
              </Button>
            </template>
          </PDFDownloadLink>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(iframe) {
  background: white;
  width: calc(100% + 26px) !important;
  height: calc(100% + 16px) !important;
  margin: -5px -20px -8px -7px;
}
</style>
