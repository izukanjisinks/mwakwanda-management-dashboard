# Resident meal collection

*Lodge management platform — buffet-style meal collection billed directly to the room's accommodation invoice*

## 1. Overview

Resident meal collection covers a simpler case than the general meal system: no individual orders are taken. A meal collect session is a straightforward buffet — residents walk in, take what they want from the buffet, and eat. There is no per-order tracking and no QR-based entitlement model; the only thing the system needs to track is which room ate at which session, so the charge can be attributed to the correct accommodation bill.

Pricing is typically fixed per buffet (e.g. K100 per head).

## 2. Collection & billing flow

A single input field on the collection screen accepts either a typed resident ID or an RFID card scan — a USB RFID reader types its output directly into the same field, so no separate scan button or mode switch is needed.

- **ID entry** — if a reader isn't functional or hasn't been acquired yet, the resident's ID can simply be typed into the field instead. It's searched against all current residents, and on a match, the buffet charge is added to that resident's accommodation bill.
- **RFID scan** — cards are issued only to residents. Scanning a card automatically appends the buffet charge to that resident's running accommodation invoice.

Each resident carries their own RFID card to meal collect sessions. Rooms with capacity for more than one person are issued multiple cards — one per resident — so every person's collection is tracked and charged individually, without needing to specify a headcount at the point of scanning.

## 3. Meal collect sessions page

A page where the lodge can create and manage meal collect sessions. It shows a table of sessions and a button to create a new one.

### 3.1 Create session — form fields

| # | Field | Notes |
|---|---|---|
| 1 | Meal period | e.g. breakfast, lunch, dinner |
| 2 | Buffet type | Selected from the lodge's existing menu |
| 3 | Schedule | e.g. 06:00 – 09:00 |
| 4 | Auto open/close | Option to automatically open and close the session at the scheduled time |
| 5 | Days | Days on which the session should recur — select all days of the week, or specify individual days |

### 3.2 Sessions table — columns

| # | Column | Notes |
|---|---|---|
| 1 | Meal period | |
| 2 | Buffet type | |
| 3 | Schedule | |
| 4 | Status | closed, open, scheduled |
| 5 | Grace period | Time after the scheduled end during which a card can no longer be scanned |
| 6 | Actions | Open, Close, Cancel, Collect (opens the ID/RFID input screen) |

### 3.3 Session actions & lifecycle

- Sessions can be reopened, closed, and cancelled repeatedly — these are reversible status changes, not destructive actions.
- Sessions can also be deleted, but only by an authorized user.
- Short of deletion, a session always remains listed in the sessions table, regardless of its current status, so past sessions stay visible as a historical record.

## 4. RFID card assignments page

A page for assigning RFID cards to rooms at the lodge.

- New cards can be assigned to rooms that don't yet have one.
- Rooms with capacity for more than one occupant can have multiple cards assigned — one per resident — so each person in a shared room carries their own card.
- Rooms with lost or damaged cards can be issued a replacement card.

## 5. Open questions & recommendations

- **Duplicate scans** — consider whether the same resident's card can be scanned more than once within a single session, e.g. to avoid an accidental double-tap registering two charges, while still allowing a legitimate second visit to the buffet if that's meant to be billed separately.
- **Cancelling a session after charges were already applied** — decide whether cancellation should trigger an automatic reversal of any charges already posted to accommodation bills for that session, or whether that needs to be handled manually.
- **ID search ambiguity** — define what "ID" refers to (room number, national ID, internal resident/booking reference) and how the system should handle multiple or partial matches.
- **Audit trail** — even without the full entitlement model used elsewhere, it's worth keeping a simple collection log (room/resident, session, method used, timestamp, staff member) for billing disputes and reconciliation.
- **Grace period behavior** — clarify whether the grace period only blocks new scans, or also affects the session's displayed status (e.g. showing "closing soon" during the grace window).
