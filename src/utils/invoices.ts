import type { Invoice, InvoiceStatus } from '@/types/invoice'

// The backend never flips status to 'overdue' once due_date passes — invoices
// just sit at 'issued'/'draft' forever, so relying on the raw status alone
// makes every "Overdue" total/badge/filter show zero. Derive it instead: an
// issued/draft invoice whose due date has passed counts as overdue, on top of
// any invoice the backend did mark that way directly.
export function isInvoiceOverdue(inv: Invoice): boolean {
  if (inv.status === 'paid' || inv.status === 'cancelled') return false
  if (inv.status === 'overdue') return true
  if (!inv.due_date) return false
  return new Date(inv.due_date).getTime() < Date.now()
}

// The status the UI should treat/display this invoice as — upgrades a
// past-due issued/draft invoice to 'overdue' so badges, filters, and totals
// all agree with each other.
export function effectiveInvoiceStatus(inv: Invoice): InvoiceStatus {
  return isInvoiceOverdue(inv) ? 'overdue' : inv.status
}
