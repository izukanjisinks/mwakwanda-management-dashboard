# Lodge Management System — Missing Features & Roadmap

> This document maps what each application in the ecosystem currently does, what is incomplete,
> and what a new **Lodge Companion App** would cover — targeting both **guests** and **cleaners**
> from a single mobile-first interface.

---

## 1. Ecosystem Overview

| Application | Stack | Users | Status |
|---|---|---|---|
| **Backoffice** | Vue 3 + Vite | Admin, Manager, Receptionist, Cleaner | Active |
| **Website** | Vue 3 + Vite | Guests (public) | Active |
| **Companion App** | TBD (Vue 3 PWA or React Native) | Guests (in-stay), Cleaners | **Not built** |

---

## 2. What Each App Currently Does

### 2.1 Backoffice
- Room inventory management (CRUD, availability toggle, image upload to Firebase)
- Booking management (create, edit, status updates)
- Client management (individual & corporate)
- Meal plan management
- Invoice management & PDF generation
- Workflow engine (booking approval — steps, transitions, task inbox)
- Cleaning assignments (assign cleaners to rooms with frequency)
- Cleaner dashboard (assigned rooms, urgency view, live clock)
- System user management (roles: admin, manager, receptionist, cleaner, guest)
- Reports (occupancy, revenue)
- Staff task inbox (approve/reject booking workflow tasks)

### 2.2 Website (Guest-facing)
- Home page with hero, room search, property grid
- Room listing & room detail view (with images)
- Reservation flow (stay dates, guest info, meal plan, preferences, summary)
- Guest registration & login
- My Bookings view (list of reservations with status)
- Booking detail view

---

## 3. What Is Missing / Incomplete

### 3.1 Backoffice Gaps

| Feature | Description |
|---|---|
| **Mark room as clean** | Cleaners can see what needs cleaning but cannot mark a room as done — they must notify the front desk verbally. No API action exists to close this loop. |
| **Cleaning checklist** | No per-room checklist before marking clean (bed, bathroom, minibar, floor etc). Different room types need different checklists. |
| **Cleaning history / log** | No record of who cleaned what and when. Needed for accountability and manager review. |
| **Room status management** | Room statuses (`available`, `occupied`, `not_ready`, `reserved`) exist in the type but the backoffice has no UI to update them manually or via checkout events. |
| **Supply requests** | No way for cleaners to flag low supplies (towels, toiletries) to management. |
| **Guest in-stay requests** | No screen for front desk to view and action requests made by guests currently staying (extra towels, maintenance, etc). |
| **Ratings & reviews** | No system for guests to rate their stay, individual rooms, or cleaners. |
| **Notifications** | No push or in-app alerts when a guest checks out so cleaners know a room is ready to turn around. |
| **Workflow — close loop** | When a booking is approved via the workflow, the booking status is not automatically updated to `confirmed`. This link between workflow tasks and booking records needs wiring. |
| **Remove console logs** | Debug `console.log` statements added during development remain in `WorkflowView.vue`, `stores/workflow.ts`, `stores/rooms.ts`, and `RoomImageDialog.vue`. |

<!-- ### 3.2 Website Gaps

| Feature | Description |
|---|---|
| **Invoice download** | Guests cannot download or view their invoices from the website. |
| **Cancel booking** | The cancel endpoint exists on the backend (`PATCH /guest/bookings/:id/cancel`) but there is no cancel action on the My Bookings page. |
| **Room images in listing** | Room images are now stored and returned by the backend but the website's `RoomCard` and `RoomDetailView` may not be displaying them from the real API yet. |
| **Profile editing** | No profile edit page for guests to update their name, phone, or ID number after registration. |
| **Ratings & reviews** | Guests cannot rate their stay or leave a review from the website post-checkout. |

--- -->

## 4. Lodge Companion App — Concept

A **mobile-first progressive web app (PWA)** or native app serving two distinct user groups
under one roof: **guests currently staying at the lodge** and **cleaning staff**.
The app sits between the website (pre-arrival) and the backoffice (internal operations)
and focuses entirely on the **in-stay experience**.

---

### 4.1 Guest Side

Guests log in with the same credentials they used to register on the website.
The app is available once a booking is confirmed and active.

#### Home / Dashboard
- Personalised greeting with their name and room number
- Active booking summary (room, check-in / check-out dates, meal plan)
- Quick-action buttons: Make a Request, Rate Your Stay, View Invoice

#### Room Service Requests
- Submit requests by category:
  - **Housekeeping** — extra towels, pillows, blankets, toiletries
  - **Maintenance** — broken fixture, no hot water, faulty AC
  - **Food & Beverage** — room service, extra meals
  - **Concierge** — taxi, activities, local recommendations
- Each request has a status: `pending → in_progress → resolved`
- Guests can see live status updates on their open requests
- Guests can add a note / description to any request

#### Stay Rating
- After checkout, guests are prompted to rate:
  - **Overall stay** (1–5 stars)
  - **Room condition** (cleanliness, comfort)
  - **Individual cleaners** assigned to their room (optional, opt-in)
  - **Meal plan / food quality** (if applicable)
  - **Staff friendliness**
- Free-text comment field
- Ratings are visible to managers in the backoffice

#### My Booking
- View current and past bookings
- Download invoice as PDF
- Cancel an upcoming booking (pre-arrival only)

#### Profile
- View and edit personal details (name, phone, ID number)
- Change password

---

### 4.2 Cleaner Side

Cleaners log in with their existing backoffice credentials (role: `cleaner`).
The app is a focused, task-oriented interface — no administrative features.

#### Dashboard
- Live clock and shift greeting (already exists in backoffice cleaner view — port this)
- Today's room assignments ordered by priority:
  1. Checkout rooms (must be turned around for next guest)
  2. `not_ready` rooms
  3. Scheduled cleans (daily, every 2 days, weekly)
- Stats: Total assigned, Needs cleaning, Completed today

#### Room Detail & Checklist
- Tap a room to open its detail:
  - Room name, type, floor/location, capacity
  - Guest notes from front desk (e.g. "VIP arrival at 14:00", "allergic to feather pillows")
  - Room images for reference
- Cleaning checklist (varies by room type):
  - [ ] Bed made & linen replaced
  - [ ] Bathroom sanitised
  - [ ] Floors swept / vacuumed
  - [ ] Minibar restocked
  - [ ] Toiletries replenished
  - [ ] Surfaces wiped
  - [ ] Balcony / outdoor area tidied (cabin/suite)
  - [ ] AC/heating set to default
- Cleaner must check all items before **Mark as Clean** is enabled
- On mark as clean → room status updates to `available` via the backend

#### Supply Requests
- Flag a room as low on specific supplies
- Categories: Towels, Toiletries, Linen, Minibar, Cleaning products
- Request is sent to management and visible in the backoffice

#### Cleaning History
- Log of rooms cleaned today and this week
- Timestamp and checklist snapshot saved per clean
- Managers can view this history per cleaner in the backoffice

#### Notifications
- Alert when a guest checks out → room is ready to clean
- Alert when a new room is assigned
- Alert when a guest submits a housekeeping request for their room

---

## 5. Backend Endpoints Needed

The following endpoints do not currently exist in the API and would need to be built
to support the companion app:

| Endpoint | Method | Purpose |
|---|---|---|
| `/guest/requests` | `POST` | Submit a room service request |
| `/guest/requests` | `GET` | List my open requests |
| `/guest/requests/:id` | `PATCH` | Cancel a request |
| `/admin/requests` | `GET` | List all requests (backoffice) |
| `/admin/requests/:id/status` | `PATCH` | Update request status |
| `/guest/ratings` | `POST` | Submit a stay rating |
| `/admin/ratings` | `GET` | List all ratings (backoffice) |
| `/rooms/:id/status` | `PATCH` | Update room status (mark as clean) |
| `/rooms/:id/checklist` | `POST` | Submit a completed cleaning checklist |
| `/cleaning/history` | `GET` | Get cleaning log for the current cleaner |
| `/admin/cleaning/history` | `GET` | Get cleaning log for all cleaners |
| `/supply-requests` | `POST` | Submit a supply request |
| `/admin/supply-requests` | `GET` | List supply requests (backoffice) |

---

## 6. Priority Order

| Priority | Item |
|---|---|
| 🔴 High | Mark room as clean (backend + backoffice + companion app) |
| 🔴 High | Room status update flow tied to check-in / check-out events |
| 🔴 High | Guest room service requests |
| 🟡 Medium | Cleaning checklist per room type |
| 🟡 Medium | Stay ratings & reviews |
| 🟡 Medium | Supply requests |
| 🟡 Medium | Cleaning history / log |
| 🟡 Medium | Guest invoice download on website |
| 🟡 Medium | Guest cancel booking on website |
| 🟢 Low | Push notifications |
| 🟢 Low | Cleaner ratings by guests |
| 🟢 Low | Remove debug console logs from production code |
