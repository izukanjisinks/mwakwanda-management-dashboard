<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { DashboardOutstandingInvoice } from '@/types/dashboard'

defineProps<{
  invoices: DashboardOutstandingInvoice[]
}>()

const statusMeta: Record<DashboardOutstandingInvoice['status'], { label: string; classes: string }> = {
  issued:  { label: 'Issued',  classes: 'bg-chart-3/10 text-chart-3' },
  overdue: { label: 'Overdue', classes: 'bg-destructive/10 text-destructive' },
}

function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <Card class="flex flex-col">
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-medium">Outstanding Invoices</CardTitle>
      <CardAction>
        <RouterLink
          :to="{ name: 'admin-invoices' }"
          class="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View all
          <ArrowRight class="size-3.5" />
        </RouterLink>
      </CardAction>
    </CardHeader>

    <CardContent class="px-0">
      <Table>
        <TableHeader>
          <TableRow class="hover:bg-transparent">
            <TableHead class="pl-6">Invoice</TableHead>
            <TableHead>Client</TableHead>
            <TableHead class="text-right">Amount (ZMW)</TableHead>
            <TableHead>Due</TableHead>
            <TableHead class="pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="invoice in invoices" :key="invoice.id">
            <TableCell class="pl-6 font-mono text-sm text-muted-foreground">{{ invoice.invoice_number }}</TableCell>
            <TableCell class="font-medium">{{ invoice.client }}</TableCell>
            <TableCell class="text-right tabular-nums font-medium">{{ invoice.amount.toLocaleString() }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">{{ fmtDate(invoice.due_date) }}</TableCell>
            <TableCell class="pr-6">
              <span
                :class="cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                  statusMeta[invoice.status].classes,
                )"
              >
                <span class="size-1.5 rounded-full bg-current" />
                {{ statusMeta[invoice.status].label }}
              </span>
            </TableCell>
          </TableRow>
          <TableRow v-if="invoices.length === 0">
            <TableCell colspan="5" class="h-24 text-center text-muted-foreground">
              No outstanding invoices.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
