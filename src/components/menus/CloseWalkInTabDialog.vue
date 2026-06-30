<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2, CheckCircle2, User, Building2, FileText } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getApiError } from '@/utils/errors'
import type { Order, CloseWalkInOrderPayload } from '@/types/menu'
import type { Invoice } from '@/types/invoice'
import { menusApi } from '@/services/api/menus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const props = defineProps<{ open: boolean; order: Order | null }>()
const emit = defineEmits<{ 'update:open': [boolean]; invoiced: [Invoice] }>()

const router = useRouter()

interface Form {
  client_name: string
  client_type: 'individual' | 'corporate'
  client_email: string
  client_phone: string
  client_tpin: string
  due_date: string
  notes: string
}

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().split('T')[0]!
}

const form = ref<Form>({
  client_name: '',
  client_type: 'individual',
  client_email: '',
  client_phone: '',
  client_tpin: '',
  due_date: defaultDueDate(),
  notes: '',
})

const loading = ref(false)
const createdInvoice = ref<Invoice | null>(null)

watch(() => props.open, (open) => {
  if (open) {
    form.value = {
      client_name: props.order?.client_name ?? '',
      client_type: 'individual',
      client_email: '',
      client_phone: '',
      client_tpin: '',
      due_date: defaultDueDate(),
      notes: props.order?.notes ?? '',
    }
    createdInvoice.value = null
  }
})

const orderTotal = computed(() =>
  props.order?.total ?? props.order?.items.reduce((s, i) => s + (i.subtotal ?? i.total ?? 0), 0) ?? 0,
)

const canSubmit = computed(() => form.value.client_name.trim().length > 0 && !loading.value)

async function submit() {
  if (!props.order || !canSubmit.value) return
  loading.value = true
  try {
    const payload: CloseWalkInOrderPayload = {
      client_name: form.value.client_name.trim(),
      client_type: form.value.client_type,
      client_email: form.value.client_email || undefined,
      client_phone: form.value.client_phone || undefined,
      client_tpin: form.value.client_type === 'corporate' && form.value.client_tpin ? form.value.client_tpin : undefined,
      due_date: form.value.due_date || undefined,
      notes: form.value.notes || undefined,
    }
    const invoice = await menusApi.convertToInvoice(props.order.id, payload)
    createdInvoice.value = invoice
    emit('invoiced', invoice)
    toast.success(`Invoice ${invoice.invoice_number} created successfully.`)
  } catch (err) {
    toast.error(getApiError(err, 'Failed to generate invoice.'))
  } finally {
    loading.value = false
  }
}

function close() {
  emit('update:open', false)
}

function viewInvoices() {
  emit('update:open', false)
  router.push('/invoices')
}

function fmt(n: number) {
  return n.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-lg">

      <!-- ── Success state ────────────────────────────────────────────────── -->
      <template v-if="createdInvoice">
        <div class="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 class="size-14 text-green-500" />
          <div>
            <h3 class="text-lg font-semibold">Invoice Created</h3>
            <p class="text-muted-foreground text-sm mt-0.5">The walk-in tab has been closed and invoiced.</p>
          </div>
          <div class="rounded-xl border bg-muted/40 px-6 py-4 w-full text-left flex flex-col gap-2 text-sm mt-2">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Invoice No.</span>
              <span class="font-mono font-semibold">{{ createdInvoice.invoice_number }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Client</span>
              <span class="font-medium">{{ createdInvoice.client_name }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Total</span>
              <span class="font-semibold">ZMW {{ fmt(createdInvoice.total_amount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Status</span>
              <span class="capitalize">{{ createdInvoice.status }}</span>
            </div>
          </div>
        </div>
        <DialogFooter class="gap-2">
          <Button variant="outline" @click="close">Done</Button>
          <Button @click="viewInvoices">
            <FileText class="size-4 mr-2" />
            View Invoices
          </Button>
        </DialogFooter>
      </template>

      <!-- ── Form state ──────────────────────────────────────────────────── -->
      <template v-else>
        <DialogHeader>
          <DialogTitle>Close Tab &amp; Generate Invoice</DialogTitle>
          <DialogDescription>
            {{ order?.order_number }} · {{ order?.items.length }} item{{ order?.items.length !== 1 ? 's' : '' }}
          </DialogDescription>
        </DialogHeader>

        <!-- Order summary -->
        <div class="rounded-xl border bg-muted/30 overflow-hidden">
          <div class="max-h-44 overflow-y-auto divide-y">
            <div
              v-for="item in order?.items"
              :key="item.id"
              class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
            >
              <div class="flex-1 min-w-0">
                <span class="font-medium truncate block">{{ item.item_name ?? item.menu_item?.name }}</span>
                <span v-if="item.notes" class="text-xs text-muted-foreground">{{ item.notes }}</span>
              </div>
              <div class="text-right shrink-0">
                <p class="font-semibold">ZMW {{ fmt(item.subtotal ?? item.total ?? 0) }}</p>
                <p class="text-xs text-muted-foreground">× {{ item.quantity }}</p>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between px-4 py-2.5 border-t bg-muted/40 text-sm font-semibold">
            <span>Total</span>
            <span>ZMW {{ fmt(orderTotal) }}</span>
          </div>
        </div>

        <!-- Client details form -->
        <div class="flex flex-col gap-4 mt-1">
          <!-- Client type toggle -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium">Client Type</label>
            <div class="flex gap-1 rounded-lg border bg-muted/40 p-1">
              <button
                type="button"
                class="flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-all"
                :class="form.client_type === 'individual' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
                @click="form.client_type = 'individual'"
              >
                <User class="size-3.5" />
                Individual
              </button>
              <button
                type="button"
                class="flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-all"
                :class="form.client_type === 'corporate' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'"
                @click="form.client_type = 'corporate'"
              >
                <Building2 class="size-3.5" />
                Corporate
              </button>
            </div>
          </div>

          <!-- Name -->
          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium">
              {{ form.client_type === 'corporate' ? 'Company / Client Name' : 'Client Name' }}
              <span class="text-destructive ml-0.5">*</span>
            </label>
            <Input v-model="form.client_name" placeholder="Enter name" />
          </div>

          <!-- Email + Phone -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium">Email</label>
              <Input v-model="form.client_email" type="email" placeholder="email@example.com" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium">Phone</label>
              <Input v-model="form.client_phone" type="tel" placeholder="+260..." />
            </div>
          </div>

          <!-- TPIN (corporate only) -->
          <div v-if="form.client_type === 'corporate'" class="flex flex-col gap-1.5">
            <label class="text-sm font-medium">TPIN</label>
            <Input v-model="form.client_tpin" placeholder="e.g. 1001757365" class="font-mono" />
          </div>

          <!-- Due date + Notes -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium">Due Date</label>
              <Input v-model="form.due_date" type="date" />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium">Notes</label>
              <Input v-model="form.notes" placeholder="Optional notes" />
            </div>
          </div>
        </div>

        <DialogFooter class="gap-2 mt-1">
          <Button variant="outline" :disabled="loading" @click="close">Cancel</Button>
          <Button :disabled="!canSubmit" @click="submit">
            <Loader2 v-if="loading" class="size-4 mr-2 animate-spin" />
            <FileText v-else class="size-4 mr-2" />
            Generate Invoice
          </Button>
        </DialogFooter>
      </template>

    </DialogContent>
  </Dialog>
</template>
