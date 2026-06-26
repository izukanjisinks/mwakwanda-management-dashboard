# Client Feedback — Corporate Billing & Cost Tracking

Feedback items to incorporate into the hospitality marketplace platform, focused on corporate cost-center billing, invoicing, and meal/person tracking.

## 1. Cost Center Number / Internal Order Number
- The cost center field can also be an internal order field. Add a select dropdown to allow choosing between the two.

## 2. Issued Invoice Sent Automatically to Approver
- Automatically email the attached invoice to the approver.

## 3. Track Paid Invoice
- a. Add an option to mark an invoice as paid.
- b. Add an option to attach proof of payment.

## 4. Tracking per Cost Center
- a. Track all costs under a given cost center.
- b. Show paid invoices and those pending payment.

## 5. Cost Tracking for Corporate client as a whole
- a. Produce reports of accumulated costs for each cost center.
- b. Show paid invoices and those pending payment (company-wide view).

## 6. Purpose of Booking Meal to Show on Invoice
- Display the purpose of the meal booking on the invoice (e.g., "Lunch for workers on Project X").

## 7. Include Man Number for Person Booking
- To strictly differentiate employee names in cases of identical names, include the employee ID ("man number") alongside the name.

## 8. Meal Tracking / RFID Cards
- For proof of meal collection and meal collection tracking for residents, link RFID card data to room and occupant.

## 9. History for Person Booking
- Include booking history per person to reduce data repetition and minimize possible errors during entry.

---

### Notes / Implications for Schema
- Cost center / internal order: likely a type-selector field on the corporate booking, not two separate columns.
- Invoice lifecycle needs a status (e.g., `issued`, `paid`, `pending`) plus a proof-of-payment attachment field.
- Reporting needs to roll up by cost center and by corporate client (e.g., Zambia Sugar) across both paid and pending invoices.
- Meal sessions/bookings need a "purpose" field for invoice display.
- Person/employee records need an ID/"man number" field distinct from name, for disambiguation.
- RFID integration ties meal collection events to room + occupant for proof of service.
- Person booking history should pull from prior bookings to auto-fill fields and reduce re-entry errors.
