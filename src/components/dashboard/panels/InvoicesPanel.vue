<script setup lang="ts">
import BilledVsCollectedChart from '@/components/dashboard/BilledVsCollectedChart.vue'
import InvoicesByStatusChart from '@/components/dashboard/InvoicesByStatusChart.vue'
import OutstandingInvoicesTable from '@/components/dashboard/OutstandingInvoicesTable.vue'
import AttentionTile from '@/components/dashboard/AttentionTile.vue'
import { ReceiptText } from 'lucide-vue-next'
import type { DashboardInvoices } from '@/types/dashboard'

defineProps<{
  data: DashboardInvoices | null
  loading: boolean
}>()
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Needs Attention -->
    <!-- <div>
      <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Needs Attention</h2>
      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <AttentionTile
          label="Invoices Overdue"
          :value="data?.overdue_count ?? 0"
          :detail="data ? `ZMW ${data.overdue_amount.toLocaleString()} outstanding` : undefined"
          :icon="ReceiptText"
          severity="critical"
          :to="{ name: 'admin-invoices' }"
        />
      </div>
    </div> -->

    <!-- Trends -->
    <div>
      <h2 class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trends</h2>
      <div class="grid gap-6 lg:grid-cols-2">
        <BilledVsCollectedChart :data="data?.billed_vs_collected ?? []" />
        <InvoicesByStatusChart :data="data?.by_status ?? { paid: 0, issued: 0, overdue: 0, draft: 0, cancelled: 0 }" />
      </div>
    </div>

    <!-- Outstanding invoices -->
    <OutstandingInvoicesTable :invoices="data?.outstanding_invoices ?? []" />
  </div>
</template>
