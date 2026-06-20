<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Invoice, InvoiceStatus } from '@/types/invoice'

const props = defineProps<{
  open: boolean
  invoice: Invoice | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'status-change': [status: InvoiceStatus]
}>()

const statusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft:     { label: 'Draft',     variant: 'outline' },
  issued:    { label: 'Issued',    variant: 'default' },
  paid:      { label: 'Paid',      variant: 'secondary' },
  overdue:   { label: 'Overdue',   variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

const nextActions = computed(() => {
  if (!props.invoice) return []
  const s = props.invoice.status
  const actions: { label: string; status: InvoiceStatus; variant: 'default' | 'outline' | 'destructive' }[] = []
  if (s === 'draft') actions.push({ label: 'Issue Invoice', status: 'issued', variant: 'default' })
  if (s === 'issued' || s === 'overdue') actions.push({ label: 'Mark as Paid', status: 'paid', variant: 'default' })
  if (s === 'issued') actions.push({ label: 'Mark Overdue', status: 'overdue', variant: 'outline' })
  if (s !== 'cancelled' && s !== 'paid') actions.push({ label: 'Cancel', status: 'cancelled', variant: 'destructive' })
  return actions
})
</script>

<template>
  <Dialog :open="open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <div class="flex items-center justify-between gap-3 pr-6">
          <DialogTitle class="font-mono text-lg">{{ invoice?.invoice_number }}</DialogTitle>
          <Badge v-if="invoice" :variant="statusConfig[invoice.status].variant">
            {{ statusConfig[invoice.status].label }}
          </Badge>
        </div>
        <DialogDescription>
          Created {{ formatDate(invoice?.created_at) }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="invoice" class="flex flex-col gap-5 py-2">

        <!-- Client info -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-xs text-muted-foreground mb-1">Billed To</p>
            <p class="font-medium">{{ invoice.client_name }}</p>
            <p class="text-muted-foreground">{{ invoice.client_email }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-muted-foreground mb-1">Dates</p>
            <p v-if="invoice.issued_date">Issued: {{ formatDate(invoice.issued_date) }}</p>
            <p v-if="invoice.due_date" :class="invoice.status === 'overdue' ? 'text-destructive font-medium' : ''">
              Due: {{ formatDate(invoice.due_date) }}
            </p>
            <p v-if="invoice.paid_date" class="text-accent font-medium">Paid: {{ formatDate(invoice.paid_date) }}</p>
          </div>
        </div>

        <Separator />

        <!-- Line items -->
        <div class="flex flex-col gap-2">
          <div class="grid grid-cols-12 text-xs text-muted-foreground font-medium px-1">
            <span class="col-span-6">Description</span>
            <span class="col-span-2 text-right">Qty</span>
            <span class="col-span-2 text-right">Unit Price</span>
            <span class="col-span-2 text-right">Total</span>
          </div>
          <div
            v-for="(item, i) in invoice.line_items"
            :key="i"
            class="grid grid-cols-12 text-sm px-1 py-2 rounded-md hover:bg-muted/50"
          >
            <span class="col-span-6">{{ item.description }}</span>
            <span class="col-span-2 text-right text-muted-foreground">{{ item.quantity }}</span>
            <span class="col-span-2 text-right text-muted-foreground">{{ item.unit_price.toLocaleString() }}</span>
            <span class="col-span-2 text-right font-medium">{{ item.total.toLocaleString() }}</span>
          </div>
        </div>

        <Separator />

        <!-- Totals -->
        <div class="flex flex-col gap-2 text-sm ml-auto w-64">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Subtotal</span>
            <span>ZMW {{ invoice.subtotal.toLocaleString() }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">VAT ({{ invoice.tax_rate }}%)</span>
            <span>ZMW {{ invoice.tax_amount.toLocaleString() }}</span>
          </div>
          <Separator />
          <div class="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>ZMW {{ invoice.total_amount.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="invoice.notes" class="rounded-lg bg-muted/50 border px-4 py-3 text-sm text-muted-foreground">
          <p class="font-medium text-foreground mb-1">Notes</p>
          {{ invoice.notes }}
        </div>
      </div>

      <DialogFooter class="flex-wrap gap-2">
        <Button variant="outline" @click="emit('update:open', false)">Close</Button>
        <Button
          v-for="action in nextActions"
          :key="action.status"
          :variant="action.variant"
          @click="emit('status-change', action.status)"
        >
          {{ action.label }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
