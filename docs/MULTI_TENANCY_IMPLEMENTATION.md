# Multi-Tenancy Implementation Plan — Lodge Management System

> The backend has been fully migrated to a multi-tenant architecture. This document outlines
> the phased frontend implementation plan to align the backoffice with the new architecture,
> introduce the **LodgeCentral Backoffice** (platform-admin portal), and handle the new
> authentication flows introduced by org-scoping.

---

## Architecture Overview

The system now has three distinct user classes, each with their own token type and API base path:

| Class | Token | Scope | Base Path |
|---|---|---|---|
| **Staff** | `Bearer <token>` | Org-scoped — JWT contains `org_id` | `/api/v1/` |
| **Backoffice (Platform Admin)** | `Bearer <backoffice_token>` | Platform-level — sees all orgs | `/api/v1/backoffice/` |
| **Guest** | `Bearer <guest_token>` | Standalone — no org | `/api/v1/guest/` |

### Key Rules
- Staff users **never need to send `org_id`** in request bodies — it is read from their JWT server-side.
- The backoffice portal is a **separate application** from the lodge staff backoffice — different login, different token, different routes.
- A staff user whose email exists in **more than one org** triggers a two-step login: step 1 returns an org list, step 2 re-sends with `org_id` selected.
- Any user returned with `change_password: true` must be redirected to a password change screen immediately after login.

---

## What Needs to Change

### Existing Backoffice (Staff App)

| Area | Change Required |
|---|---|
| Login flow | Handle multi-org response (`requires_org_selection: true`) — show org picker before completing login |
| Auth token key | Confirm `lodge_token` is used (already done) |
| `change_password` redirect | Already partially implemented — verify it triggers correctly on login |
| User management | Role field now uses `role_id` for change-role endpoint (`POST /admin/users/{id}/role`) |
| API client | No base path changes — all staff endpoints stay at `/api/v1/` |
| Org context | Add org name/logo to the sidebar header (returned in the login response) |

### New: LodgeCentral Backoffice Portal (Platform Admin App)

A completely separate Vue 3 application (or isolated route namespace) for platform administrators. This is **not** the same as the lodge staff backoffice. It manages all organisations from a single platform-level view.

---

## Phase 1 — Staff App: Multi-Org Login Flow

**Goal:** Handle the new two-step login response without breaking existing single-org users.

### 1.1 Update Auth Types

File: `src/types/auth.ts`

```typescript
export interface LoginResponse {
  token: string
  user: AuthUser
}

export interface MultiOrgLoginResponse {
  requires_org_selection: true
  orgs: { org_id: string; org_name: string }[]
}

export type LoginResult = LoginResponse | MultiOrgLoginResponse
```

### 1.2 Update Auth Store Login Action

File: `src/stores/auth.ts`

- After `POST /api/v1/auth/login`, check if `requires_org_selection === true`
- If yes: store the `orgs` array in a `pendingOrgs` ref and set a `requiresOrgSelection` flag
- If no: proceed with existing login flow (store token + user)

```typescript
const pendingOrgs = ref<{ org_id: string; org_name: string }[]>([])
const requiresOrgSelection = ref(false)

async function login(email: string, password: string, orgId?: string) {
  const res = await authApi.login({ email, password, org_id: orgId })
  if ('requires_org_selection' in res && res.requires_org_selection) {
    pendingOrgs.value = res.orgs
    requiresOrgSelection.value = true
    return
  }
  // normal single-org flow
  setToken(res.token)
  user.value = res.user
  requiresOrgSelection.value = false
  pendingOrgs.value = []
}
```

### 1.3 Org Picker Component

File: `src/components/auth/OrgPickerDialog.vue`

- Modal shown on `LoginView` when `requiresOrgSelection === true`
- Lists orgs returned from step 1 as selectable cards (org name)
- On select → calls `authStore.login(email, password, selectedOrgId)` to complete step 2
- Design: simple dialog, list of org name buttons, no cancel (user must pick)

### 1.4 LoginView Update

File: `src/views/auth/LoginView.vue`

- Watch `authStore.requiresOrgSelection` — show `OrgPickerDialog` when true
- No other changes needed

### Phase 1 Deliverable
Staff users at lodges with multiple org memberships can log in and pick their org. Single-org users are unaffected.

---

## Phase 2 — Staff App: Org Context in UI

**Goal:** Surface the org identity (name, logo) in the staff backoffice so users know which organisation they're operating in.

### 2.1 Update AuthUser Type

The login response now includes `org_id`. Add org name/logo if returned by `GET /api/v1/auth/me`:

```typescript
export interface AuthUser {
  user_id: string
  full_name: string
  email: string
  role: SystemUserRole
  org_id: string
  org_name?: string
  org_logo_url?: string
  change_password: boolean
}
```

### 2.2 Sidebar Org Header

File: `src/components/layout/AppSidebar.vue`

- Replace the current static app name with the org name from `authStore.user.org_name`
- If `org_logo_url` is present, show it as a small logo beside the name
- Fall back to "Lodge Management" if not present

### 2.3 change_password Guard

File: `src/router/index.ts`

- In the navigation guard, after `fetchCurrentUser`, check `authStore.user.change_password`
- If `true` and not already on `/change-password`, redirect there
- Block all other navigation until password is changed

### Phase 2 Deliverable
Users see their organisation's name in the sidebar. First-login users are forced to change their password before accessing any other screen.

---

## Phase 3 — Staff App: Role ID for Role Changes

**Goal:** The change-role endpoint now accepts `role_id` instead of a role string. Update the users store and any role-change UI.

### 3.1 Role Mapping

The backend uses `role_id` (UUID) for the `POST /admin/users/{id}/role` endpoint. The role IDs are org-specific and must be fetched or mapped. Check if `GET /api/v1/users` returns `role_id` alongside `role` string — if so, store both.

### 3.2 Update Users Store

File: `src/stores/users.ts`

- Update `changeRole(userId, roleId)` to POST `{ role_id }` (not `{ role }`)
- If the role list needs to be fetched separately, add a `fetchRoles()` action

### 3.3 Update SystemUser Type

```typescript
export interface SystemUser {
  id: string
  full_name: string
  email: string
  role: SystemUserRole
  role_id: string        // add this
  status: SystemUserStatus
  // ...
}
```

### Phase 3 Deliverable
Role changes in the system users table correctly use `role_id` and don't break on the new backend.

---

## Phase 4 — LodgeCentral Backoffice Portal (New App)

**Goal:** Build the platform-admin portal as described in the design files. This is a separate Vue 3 app (or a clearly isolated namespace in the existing project) for LodgeCentral platform administrators.

### Design System

The portal uses a different visual identity from the lodge staff backoffice:

- **Primary:** Forest Green `#17341d` (dark sidebar, primary actions)
- **Secondary:** Terracotta `#904c27` (accents, highlights, CTAs)
- **Background:** Warm sand `#fff8f4`
- **Font:** Manrope throughout
- **Sidebar:** Dark (primary green) with light text — contrasts against the light content area

### 4.1 Authentication

File: `src/views/backoffice/LoginView.vue`

- Separate login form posting to `POST /api/v1/backoffice/auth/login`
- Stores `backoffice_token` separately (key: `lodge_backoffice_token`)
- On success → redirect to `/backoffice/dashboard`
- `change_password: true` → redirect to `/backoffice/change-password`

### 4.2 Layout & Navigation

File: `src/layouts/BackofficeLayout.vue`

Sidebar navigation (matches design):
```
LodgeCentral Backoffice
├── Dashboard          (overview stats)
├── Organizations      (list + manage all orgs)
├── Provisioning       (create new org + admin)
└── Platform Admins    (manage backoffice users)
```

- Sidebar uses dark primary green background
- Active nav item: left-edge terracotta accent bar + semi-transparent white highlight
- Top bar: platform admin name, avatar, "System Overview" label

### 4.3 Dashboard

File: `src/views/backoffice/DashboardView.vue`

KPI cards (from design):
- **Total Organizations** — count, active vs provisioning breakdown
- **Total Active Staff** — across all orgs
- **Capacity Utilization** — percentage across all orgs
- **System Health** — API latency, DB connectivity, auth services status

Recent Activity feed:
- Org provisioned, admin privilege changes, config resets, domain verifications
- Each entry: icon, event description, org name, actor, timestamp

Quick Actions:
- New Org (→ provisioning flow)
- Add Admin (→ platform admins)
- Backup, Reports

API: `GET /api/v1/backoffice/` — check if a dashboard stats endpoint exists; if not, aggregate from org list.

### 4.4 Organisation Management

File: `src/views/backoffice/OrganizationsView.vue`

Table/list of all organisations (from design):
- Columns: Org name, email, joined date, status badge (Active / Inactive / Suspended), last login, actions
- Actions per row: Edit, View Staff (`group`), Block/Unblock
- Filters: search, status
- Top stats: Total Lodges, Active Capacity %, Pending Approvals, System Health

API:
- `GET /api/v1/backoffice/organizations` — list
- `PUT /api/v1/backoffice/organizations/{id}` — edit (name, email, phone, address, logo_url)
- `DELETE /api/v1/backoffice/organizations/{id}` — delete (with confirmation dialog)

### 4.5 Provision New Organisation

Multi-step wizard (3 steps from design):

**Step 1 — Organisation Details** (`provision_organization_details`)
- Legal name, external reference ID
- Primary admin email, operational contact phone
- Headquarters address (street, city, region, postal code)

**Step 2 — Admin User Setup** (`provision_organization_admin_setup`)
- Administrator full name
- Business email address
- Info callout: temporary password + setup link emailed automatically

**Step 3 — Confirmation**
- Summary of org + admin details
- "Create Organization" button → `POST /api/v1/backoffice/organizations/provision`
- On success: toast + redirect to Organizations list

File: `src/views/backoffice/ProvisionView.vue`
Component: `src/components/backoffice/ProvisionWizard.vue`

### 4.6 Platform Admin Management

File: `src/views/backoffice/PlatformAdminsView.vue`

Table of backoffice users (from design):
- Columns: avatar/initials, name, email, status badge, last login, actions
- Actions: Reset Password, Lock / Unlock Account
- Top stats: Total Super-Admins count, Active Sessions, Security Audit status
- Security callout: "Adding a Super-Admin grants full ecosystem access. Verify identity out-of-band."
- Account health panel: Password Compliance %, 2FA Enrollment %, Avg rotation age

API:
- `GET /api/v1/backoffice/users` — list
- `POST /api/v1/backoffice/users` — create
- `PUT /api/v1/backoffice/users/{id}` — update
- `DELETE /api/v1/backoffice/users/{id}` — delete
- `POST /api/v1/backoffice/users/{id}/reset-password`
- `POST /api/v1/backoffice/users/{id}/lock` / `unlock`

### Phase 4 Deliverable
Platform administrators can log into LodgeCentral Backoffice, see a cross-org overview, provision new lodges, and manage platform-admin access.

---

## Phase 5 — Routing & Separation

**Goal:** Cleanly separate staff routes from backoffice routes and protect each with the right token.

### 5.1 Route Structure

```
/login                        → Staff login (existing)
/dashboard, /rooms, ...       → Staff app (existing, requires lodge_token)

/backoffice/login             → Platform admin login (new)
/backoffice/dashboard         → Platform overview (new, requires lodge_backoffice_token)
/backoffice/organizations     → Org management (new)
/backoffice/provisioning      → Provision wizard (new)
/backoffice/admins            → Platform admin management (new)
/backoffice/change-password   → Force password change (new)
```

### 5.2 API Client

Add a second API client instance for backoffice requests:

File: `src/services/api/backofficeClient.ts`

- Same structure as `client.ts`
- Reads token from `lodge_backoffice_token` key in localStorage
- Base path: same `VITE_API_URL` — backoffice endpoints are prefixed `/api/v1/backoffice/` in the path

### 5.3 Navigation Guard

Update `src/router/index.ts`:
- Routes with `meta: { requiresBackofficeAuth: true }` → check `lodge_backoffice_token`
- Routes with `meta: { requiresAuth: true }` → check `lodge_token` (existing)
- Backoffice routes redirect to `/backoffice/login` if token missing
- Staff routes redirect to `/login` if token missing

### Phase 5 Deliverable
Both apps run in the same codebase but are fully isolated by route namespace, token, and API client.

---

## Phase 6 — Polish & Edge Cases

| Item | Detail |
|---|---|
| **Org logo in sidebar** | Display `org_logo_url` from auth response in staff sidebar header |
| **Backoffice token refresh** | Handle 401 from backoffice endpoints → redirect to `/backoffice/login` |
| **Provision success email** | Show clear confirmation that credentials have been emailed to the new admin |
| **Block/suspend org** | Add block confirmation dialog in org management (destructive, requires typed confirmation) |
| **Audit trail** | Display recent activity feed on backoffice dashboard from system logs |
| **Empty state** | Zero-org state on backoffice dashboard for fresh installations |
| **Remove debug logs** | Strip all `console.log` calls added during development before deploying |

---

## Implementation Sequence Summary

| Phase | Feature | Effort | Depends On |
|---|---|---|---|
| 1 | Multi-org login flow (staff app) | Low | Nothing |
| 2 | Org context in staff sidebar + change_password guard | Low | Phase 1 |
| 3 | Role ID for role changes | Low | Nothing |
| 4 | LodgeCentral Backoffice portal (all screens) | High | Phase 5 |
| 5 | Route separation + backoffice API client | Medium | Nothing |
| 6 | Polish, edge cases, audit trail | Low | Phases 1–5 |

> Phases 1, 3, and 5 are independent and can be done in parallel. Phase 4 depends on Phase 5
> for routing but its UI components can be built before routing is wired up.
