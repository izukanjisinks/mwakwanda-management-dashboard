# HR System Backend — Technical Specification

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Module Specifications](#4-module-specifications)
   - 4.1 [Employee Management](#41-employee-management)
   - 4.2 [Leave & Attendance](#42-leave--attendance)
   - 4.3 [Payroll](#43-payroll)
   - 4.4 [Recruitment](#44-recruitment)
   - 4.5 [Performance Management](#45-performance-management)
5. [Database Schema](#5-database-schema)
6. [API Endpoints](#6-api-endpoints)
7. [Business Rules & Validation](#7-business-rules--validation)
8. [Project Structure](#8-project-structure)
9. [Migration Order](#9-migration-order)
10. [Build Phases](#10-build-phases)

---

## 1. Overview

A modular HR system backend built in Go, following a clean layered architecture. The system manages the full employee lifecycle — from recruitment and onboarding through payroll, leave, attendance, and performance management.

**Tech Stack:**

- Language: Go 1.22+
- Router: Chi
- Database: PostgreSQL
- ORM: GORM
- Auth: JWT + bcrypt
- Decimal handling: shopspring/decimal
- PDF generation: chromedp or wkhtmltopdf
- File storage: S3-compatible (MinIO for self-hosted)
- Migrations: golang-migrate

---

## 2. Architecture

### Layered Pattern

Every entity in the system follows the same layered flow:

```
Model → Interface → Repository → Service → Handler → Route
```

| Layer        | Responsibility                                                     |
| ------------ | ------------------------------------------------------------------ |
| Model        | Struct definitions, enums, GORM tags, validation tags              |
| Interface    | Go interface contracts for both Repository and Service              |
| Repository   | Database queries, implements the repository interface              |
| Service      | Business logic, validation, orchestration, implements service interface |
| Handler      | Parses HTTP requests, calls the service, returns JSON responses    |
| Route        | Registers endpoints on the router, attaches middleware             |

### Dependency Injection

All layers receive their dependencies through constructor functions. Services receive repository interfaces, handlers receive service interfaces. This allows for easy testing with mocks.

```go
// Example wiring
employeeRepo := repository.NewEmployeeRepository(db)
employeeService := services.NewEmployeeService(employeeRepo, departmentRepo)
employeeHandler := handlers.NewEmployeeHandler(employeeService)
```

---

## 3. Authentication & Authorization

### Users & Roles

The system separates authentication users from HR employee records. A `users` table handles login credentials and a `roles` table defines access levels. The `employees` table links to `users` via `user_id`.

Not every user is necessarily an employee (e.g., system administrators), and not every employee needs system access.

### Roles

| Role         | Description                                      |
| ------------ | ------------------------------------------------ |
| super_admin  | Full system access, can manage all modules       |
| hr_manager   | Manage employees, payroll, recruitment, leave     |
| manager      | Approve leave, view team attendance, review team  |
| employee     | Self-service: own profile, leave requests, payslips |

### Middleware Stack

All protected routes pass through the following middleware chain:

1. **auth.go** — Validates JWT token, extracts user claims, attaches user context.
2. **rbac.go** — Checks if the authenticated user's role has permission for the requested resource and action.
3. **cors.go** — Handles cross-origin request headers.

### Permission Model

Permissions are defined as `resource:action` pairs. Examples:

- `employees:read`, `employees:write`, `employees:delete`
- `leave_requests:approve`
- `payroll:run`, `payroll:approve`
- `own_profile:read`, `own_profile:write` (self-service)

---

## 4. Module Specifications

---

### 4.1 Employee Management

Manages the core employee data and organizational structure.

#### 4.1.1 Departments

Represents organizational divisions within the company.

**Fields:** id, name, code (unique short code), description, parent_department_id (self-referencing for nested departments), manager_id (FK to employees), is_active, created_at, updated_at, deleted_at (soft delete).

**Business Rules:**

- Department codes must be unique and uppercase (e.g., "ENG", "FIN", "HR").
- A department can have one manager at a time.
- Deleting a department is a soft delete. It cannot be deleted if active employees are assigned to it.
- Departments can be nested to represent hierarchies (e.g., Engineering → Backend, Frontend).

**Operations:** Create, update, list (with pagination and filters), get by ID, soft delete, get department tree (hierarchical), list employees in department.

---

#### 4.1.2 Positions

Defines job titles, grades, and bands within the organization.

**Fields:** id, title, code, department_id, grade_level, min_salary, max_salary, description, is_active, created_at, updated_at, deleted_at.

**Business Rules:**

- Position codes must be unique.
- min_salary must be less than or equal to max_salary.
- An employee's base salary should fall within the position's salary band (warning, not hard block).
- Cannot delete a position if active employees hold it.

**Operations:** Create, update, list (filter by department, grade), get by ID, soft delete.

---

#### 4.1.3 Employees

The central entity of the HR system. Represents a person employed by the organization.

**Fields:** id, user_id (FK to users, nullable), employee_number (unique, auto-generated), first_name, last_name, email (work email), personal_email, phone, date_of_birth, gender, national_id, marital_status, address, city, state, country, department_id, position_id, manager_id (self-referencing FK to employees), hire_date, probation_end_date, employment_type (full_time, part_time, contract, intern), employment_status (active, on_leave, suspended, terminated, resigned), termination_date, termination_reason, profile_photo_url, created_at, updated_at, deleted_at.

**Employee Number Generation:** Format `EMP-YYYYMMDD-XXXX` where XXXX is a sequential counter. Example: `EMP-20260101-0042`.

**Business Rules:**

- employee_number is auto-generated on creation and immutable.
- email must be unique among active employees.
- An employee must belong to an existing, active department.
- An employee must hold an existing, active position.
- manager_id must reference another active employee (no self-reference).
- hire_date is required. termination_date must be after hire_date.
- Changing employment_status to "terminated" or "resigned" requires termination_date and termination_reason.
- Soft delete only. Hard deletes are not allowed.

**Operations:** Create, update, list (with pagination, search by name/email/number, filter by department/position/status/type), get by ID, get by employee number, soft delete, get direct reports, get org chart subtree, upload/update profile photo.

**Emergency Contacts:** Stored as a related sub-resource on the employee. Fields: name, relationship, phone, email. One employee can have multiple emergency contacts.

---

#### 4.1.4 Employee Documents

Stores files related to an employee (contracts, IDs, certifications, etc.).

**Fields:** id, employee_id, document_type (contract, id_document, certification, offer_letter, warning_letter, other), title, description, file_url (S3 path), file_name, file_size, mime_type, uploaded_by (user_id), expiry_date (for certifications), is_verified, verified_by, verified_at, created_at, updated_at, deleted_at.

**Business Rules:**

- Files are uploaded to S3-compatible storage. The database stores only the reference URL.
- Allowed MIME types: PDF, JPEG, PNG, DOCX.
- Maximum file size: 10MB per document.
- Documents with an expiry_date should trigger a notification 30 days before expiry (future enhancement).
- Only HR roles can verify documents.

**Operations:** Upload document for employee, list documents by employee (filter by type), download document (signed URL), verify document, delete document (soft delete).

---

### 4.2 Leave & Attendance

---

#### 4.2.1 Leave Types

Configurable leave categories.

**Fields:** id, name (e.g., "Annual Leave", "Sick Leave"), code (unique, e.g., "AL", "SL"), description, default_days_per_year, is_paid, is_carry_forward_allowed, max_carry_forward_days, requires_approval, requires_document (e.g., medical certificate for sick leave > 3 days), is_active, created_at, updated_at.

**Default Leave Types (seeded):**

| Code | Name              | Days/Year | Paid | Carry Forward |
| ---- | ----------------- | --------- | ---- | ------------- |
| AL   | Annual Leave      | 21        | Yes  | Yes (max 5)   |
| SL   | Sick Leave        | 15        | Yes  | No            |
| PL   | Parental Leave    | 90        | Yes  | No            |
| UL   | Unpaid Leave      | —         | No   | No            |
| CL   | Compassionate Leave | 5       | Yes  | No            |
| ML   | Marriage Leave    | 3         | Yes  | No            |

**Business Rules:**

- Leave type codes must be unique.
- default_days_per_year can be 0 for unpaid or unlimited types.
- Deactivating a leave type does not affect existing balances or historical requests.

**Operations:** Create, update, list (active only / all), get by ID.

---

#### 4.2.2 Leave Balances

Tracks how many days of each leave type an employee has available.

**Fields:** id, employee_id, leave_type_id, year, total_entitled, used, pending (days currently in approved-but-not-yet-taken or pending requests), carried_forward, adjustment (manual admin adjustments), balance (computed: total_entitled + carried_forward + adjustment - used - pending), created_at, updated_at.

**Business Rules:**

- One balance record per employee per leave type per year.
- Balances are auto-initialized when a new year starts or when an employee is created mid-year (prorated based on remaining months).
- Carry-forward is calculated at year-end: min(remaining_balance, max_carry_forward_days).
- HR can manually adjust balances with a reason logged in the audit trail.
- The `balance` field is always computed, never set directly.
- `pending` is incremented when a leave request is submitted and decremented when it is approved, rejected, or cancelled.

**Operations:** Get balances for employee (all types or specific type for a year), initialize balances for new year, adjust balance (admin), get balance summary across team/department.

---

#### 4.2.3 Leave Requests

An employee's request to take time off.

**Fields:** id, employee_id, leave_type_id, start_date, end_date, total_days (computed, excluding weekends and holidays), reason, status (pending, approved, rejected, cancelled), reviewed_by (employee_id of approver), reviewed_at, review_comment, attachment_url (for medical certificates, etc.), created_at, updated_at.

**Status Flow:**

```
                ┌──────────┐
                │ PENDING  │
                └────┬─────┘
                     │
            ┌────────┼────────┐
            ▼        │        ▼
       ┌─────────┐   │   ┌──────────┐
       │ APPROVED│   │   │ REJECTED │
       └─────────┘   │   └──────────┘
                     ▼
               ┌───────────┐
               │ CANCELLED │
               └───────────┘
```

- An employee can cancel a PENDING request at any time.
- An employee can cancel an APPROVED request only if the start_date is in the future.
- Only managers (of the employee) or HR can approve/reject.
- Rejected or cancelled requests restore the pending balance.

**Business Rules:**

- start_date must be today or in the future.
- end_date must be >= start_date.
- total_days is calculated server-side by counting business days between start_date and end_date, excluding weekends (Saturday/Sunday) and company holidays.
- The employee must have sufficient balance (balance >= total_days) at time of submission.
- Overlapping leave requests for the same employee are not allowed.
- If the leave type requires a document (e.g., sick leave > 3 consecutive days), attachment_url should be provided (warn but don't hard block).
- On approval: deduct from `used`, restore `pending`. On rejection/cancellation: restore `pending`.

**Operations:** Create request, cancel request (by employee), approve request (by manager/HR), reject request (by manager/HR), list requests (filter by employee, status, date range, department), get by ID.

---

#### 4.2.4 Attendance

Tracks daily clock-in and clock-out times.

**Fields:** id, employee_id, date, clock_in, clock_out, total_hours (computed), status (present, absent, half_day, on_leave, holiday, weekend), overtime_hours, notes, source (manual, system, biometric), created_at, updated_at.

**Business Rules:**

- One attendance record per employee per date.
- clock_out must be after clock_in.
- total_hours = clock_out - clock_in (in decimal hours), minus any standard break time.
- Overtime is calculated as: max(0, total_hours - standard_work_hours). Standard work hours default to 8.
- If an employee has an approved leave for a date, the status is automatically set to "on_leave".
- If the date is a company holiday, status is "holiday".
- If the date is a weekend (Saturday/Sunday), status is "weekend".
- Attendance records can be manually created or edited by HR for corrections.
- Late arrivals: if clock_in is more than 15 minutes after shift start (configurable), it is flagged.

**Operations:** Clock in, clock out, get attendance for employee by date range, get daily attendance for department, create/edit manual entry (HR only), get attendance summary (monthly report: days present, absent, late, overtime hours).

---

#### 4.2.5 Holidays

Company-wide or location-specific holidays.

**Fields:** id, name, date, description, is_recurring (same date every year), location (nullable, for location-specific holidays), is_active, created_at, updated_at.

**Business Rules:**

- Holidays affect leave day calculations (excluded from business days).
- Holidays affect attendance (auto-marked as "holiday").
- Recurring holidays are auto-generated for each new year.
- If location is null, the holiday applies to all employees.

**Operations:** Create, update, list (by year, by location), delete.

---

### 4.3 Payroll

---

#### 4.3.1 Salary Structures

A template that defines which pay components apply to a group of employees.

**Fields:** id, name (e.g., "Full-Time Engineering", "Contract Staff"), description, is_active, created_at, updated_at.

**Operations:** Create, update, list, get by ID, get structure with all components.

---

#### 4.3.2 Salary Components

Individual pay elements that make up a salary structure.

**Fields:** id, structure_id, name (e.g., "Base Salary", "Housing Allowance", "Income Tax"), type (earning or deduction), calc_method (fixed, percent_of_base, percent_of_gross, formula, variable), default_amount (for fixed), percentage (for percent-based), is_taxable, is_mandatory, sort_order, created_at, updated_at.

**Calculation Methods:**

| Method           | Description                                             |
| ---------------- | ------------------------------------------------------- |
| fixed            | A fixed monetary amount                                 |
| percent_of_base  | A percentage of the base salary                         |
| percent_of_gross | A percentage of the total gross earnings                |
| formula          | Custom formula (future enhancement)                     |
| variable         | Manually entered each pay period (e.g., overtime, bonus)|

**Business Rules:**

- Every structure must have at least one earning component.
- "Base Salary" should always be present and is typically the first earning component.
- Components are ordered by sort_order for display purposes.
- Deduction components cannot exceed gross earnings (validated at computation time).

**Operations:** Add component to structure, update component, remove component, reorder components.

---

#### 4.3.3 Employee Salaries

Links an employee to a salary structure with their specific amounts.

**Fields:** id, employee_id, structure_id, base_salary, effective_from, effective_to (nullable — null means current), is_active, created_at, updated_at.

**Component Overrides:** A related sub-resource that allows overriding default amounts for specific components. Fields: id, employee_salary_id, component_id, override_amount.

**Business Rules:**

- An employee can only have one active salary assignment at a time (effective_to is null).
- When a new salary is assigned, the previous one's effective_to is set to the day before.
- base_salary should ideally fall within the position's min_salary and max_salary range (warning, not hard block).
- Salary history is preserved — old records are never deleted.

**Operations:** Assign salary to employee, update salary (creates new record, closes old one), get current salary for employee, get salary history, add/update component override.

---

#### 4.3.4 Payroll Runs

A payroll run represents a single payroll processing cycle for a given period.

**Fields:** id, period_start, period_end, period_label (e.g., "January 2026"), status, created_by (user_id), approved_by (user_id, nullable), total_gross, total_deductions, total_net, employee_count, notes, created_at, computed_at, approved_at, processed_at, closed_at.

**Status Flow:**

```
┌────────┐     ┌───────────┐     ┌──────────────────┐     ┌──────────┐     ┌───────────┐     ┌────────┐
│ DRAFT  │────▶│ COMPUTING │────▶│ PENDING_APPROVAL │────▶│ APPROVED │────▶│ PROCESSED │────▶│ CLOSED │
└────────┘     └───────────┘     └──────────────────┘     └──────────┘     └───────────┘     └────────┘
                                         │                                        │
                                         ▼                                        ▼
                                    ┌──────────┐                            ┌──────────┐
                                    │ REJECTED │──── (back to DRAFT)        │  FAILED  │
                                    └──────────┘                            └──────────┘
```

**Business Rules:**

- Only one payroll run can be active (non-CLOSED) for a given period.
- A DRAFT run can be recomputed any number of times (idempotent — overwrites existing entries).
- Only HR manager or finance roles can initiate a payroll run.
- Only finance/super_admin roles can approve.
- Once CLOSED, no modifications are allowed. Corrections require a new adjustment run.
- Payroll summaries (total_gross, total_net, employee_count) are updated after computation.

**Operations:** Create run (DRAFT), trigger computation, review summary, approve, reject (back to DRAFT), process (generate payslips + bank file), close, list runs (filter by status, period), get run details with entries.

---

#### 4.3.5 Payroll Entries

One entry per employee within a payroll run. Contains the computed results.

**Fields:** id, payroll_run_id, employee_id, employee_number, employee_name (denormalized for historical record), department_name (denormalized), position_title (denormalized), base_salary, gross_pay, total_earnings, total_deductions, net_pay, working_days, paid_days, proration_factor, created_at, updated_at.

**Business Rules:**

- Entries are generated by the payroll computation engine, not created manually.
- Denormalized fields (employee_name, department_name, etc.) capture the values at the time of computation so payslip records remain accurate even if the employee's details change later.
- Entries can be manually adjusted while the run is in DRAFT or PENDING_APPROVAL status, with an audit log entry.

---

#### 4.3.6 Payroll Line Items

Individual earning or deduction lines within a payroll entry.

**Fields:** id, payroll_entry_id, component_name, component_type (earning or deduction), amount, is_variable, metadata (JSONB — extra context like hours, rate, formula breakdown), sort_order, created_at.

---

#### 4.3.7 Payroll Computation Engine

The core calculation logic. This is a service, not a database entity.

**Computation Flow (per employee):**

```
1. Retrieve employee's active salary assignment and structure.
2. Retrieve attendance summary for the pay period.
3. Retrieve approved leave records for the pay period.
4. Calculate proration factor:
   - If employee joined mid-period: paid_days = business_days from hire_date to period_end.
   - If employee left mid-period: paid_days = business_days from period_start to termination_date.
   - Otherwise: paid_days = total_working_days - unpaid_leave_days.
   - proration_factor = paid_days / total_working_days_in_period.

5. Compute Earnings:
   For each earning component in the salary structure (ordered by sort_order):
   - fixed:            amount = default_amount (or override) × proration_factor
   - percent_of_base:  amount = base_salary × (percentage / 100) × proration_factor
   - percent_of_gross: amount = running_gross × (percentage / 100) × proration_factor
   - variable:         amount = manually entered value for this period (e.g., overtime, bonus)
   - Add to running gross total.

6. Compute Deductions:
   a. Calculate taxable income = sum of all earnings where is_taxable = true.
   b. Calculate income tax using the TaxCalculator (country-specific, based on tax brackets).
   c. For each deduction component:
      - fixed:            amount = default_amount (or override)
      - percent_of_base:  amount = base_salary × (percentage / 100)
      - percent_of_gross: amount = gross_pay × (percentage / 100)
      - variable:         amount = manually entered value
   d. Total deductions = sum of all deduction line items.

7. Net Pay = Gross Pay − Total Deductions.

8. Validation:
   - Net pay must be >= 0. If negative, flag the entry for review.
   - Total deductions must not exceed gross pay.
```

**Tax Calculator:**

Designed as an interface to support multiple country implementations:

```go
type TaxCalculator interface {
    Calculate(taxableIncome decimal.Decimal, period Period) decimal.Decimal
    GetBrackets() []TaxBracket
}
```

Each country implementation defines its own tax brackets, thresholds, and relief rules. The system ships with a default implementation that can be configured via the database or environment.

**Important Technical Rules:**

- All monetary calculations use `shopspring/decimal`. Never use `float64` for money.
- Computation is idempotent — running it again for the same payroll run overwrites previous entries.
- The computation runs synchronously for small employee counts (<500). For larger sets, it can be run as a background job.

---

#### 4.3.8 Payslip Generation

After a payroll run is APPROVED, payslips are generated as PDF documents.

**Fields (payslips table):** id, payroll_entry_id, employee_id, payroll_run_id, file_url (S3 path), file_name, generated_at, sent_at (nullable — when notification was sent), created_at.

**Generation Flow:**

```
PayrollRun status → APPROVED
    │
    ▼
For each PayrollEntry in the run:
    │
    ├── 1. Gather data: employee info, all line items, period, YTD totals.
    ├── 2. Render HTML from the payslip template (templates/payslip/payslip_template.html).
    ├── 3. Convert HTML → PDF (using chromedp or wkhtmltopdf).
    ├── 4. Upload PDF to S3 storage.
    ├── 5. Save payslip record in database with file_url.
    └── 6. Send notification to employee (email or in-app).
```

**Payslip Content:**

- Company name, logo, address.
- Employee name, number, department, position.
- Pay period (start date — end date).
- Earnings table: component name, amount (one row per earning line item).
- Deductions table: component name, amount (one row per deduction line item).
- Summary: Gross Pay, Total Deductions, Net Pay.
- Year-to-date totals: YTD Gross, YTD Deductions, YTD Net.
- Bank account number (masked, e.g., "****4532").
- Generation date.

**Business Rules:**

- Payslips are generated in bulk (all employees in a run at once).
- Employees can only access their own payslips.
- HR can access any employee's payslips.
- Payslip PDFs are immutable once generated. If corrections are needed, a new payroll run is created.

**Operations:** Generate payslips for a run, get payslip for employee by period, list payslips for employee, download payslip (signed URL).

---

### 4.4 Recruitment

---

#### 4.4.1 Job Postings

Open positions that the company is hiring for.

**Fields:** id, title, department_id, position_id, description, requirements, employment_type (full_time, part_time, contract, intern), location, salary_range_min, salary_range_max, show_salary (boolean — whether to display salary in posting), status (draft, open, on_hold, closed, filled), posted_by (user_id), posted_at, closing_date, number_of_openings, created_at, updated_at, deleted_at.

**Status Flow:**

```
DRAFT → OPEN → ON_HOLD → OPEN (reopen)
                  │
                  ▼
            CLOSED / FILLED
```

**Business Rules:**

- Only HR roles can create and manage job postings.
- closing_date must be in the future when posting is set to OPEN.
- A posting is automatically set to CLOSED when closing_date passes (via scheduled job or on-access check).
- number_of_openings tracks how many hires are needed. Status changes to FILLED when all openings have accepted offers.

**Operations:** Create, update, list (filter by status, department), get by ID, change status, soft delete.

---

#### 4.4.2 Applicants

Candidates who apply for job postings.

**Fields:** id, job_posting_id, first_name, last_name, email, phone, resume_url (S3 path), cover_letter_url, source (website, referral, linkedin, agency, other), referred_by (employee_id, nullable), pipeline_stage (applied, screening, interview, offer, hired, rejected, withdrawn), rejection_reason, notes, applied_at, created_at, updated_at.

**Pipeline Stages:**

```
APPLIED → SCREENING → INTERVIEW → OFFER → HIRED
    │         │           │          │
    └─────────┴───────────┴──────────┴──── REJECTED / WITHDRAWN
```

**Business Rules:**

- Email must be unique per job posting (one application per person per posting).
- The same person can apply to multiple job postings.
- Moving an applicant to HIRED triggers the option to create an employee record.
- When stage changes to REJECTED, rejection_reason should be provided.
- WITHDRAWN is set by the applicant or on their behalf.

**Operations:** Create applicant, update stage, list applicants for a posting (filter by stage), get by ID, upload/update resume, bulk reject.

---


### 4.5 Performance Management

---

#### 4.5.1 Review Cycles

Defines a time-bound performance review period.

**Fields:** id, name (e.g., "H1 2026 Review", "Annual 2025"), description, start_date, end_date, review_deadline (date by which all reviews must be submitted), status (draft, active, in_review, completed, cancelled), created_by (user_id), created_at, updated_at.

**Status Flow:**

```
DRAFT → ACTIVE → IN_REVIEW → COMPLETED
                      │
                      ▼
                  CANCELLED
```

- DRAFT: Cycle is being configured.
- ACTIVE: Goals are being set and tracked.
- IN_REVIEW: The review period is open — managers and employees submit reviews.
- COMPLETED: All reviews are finalized.

**Business Rules:**

- Only one cycle can be ACTIVE at a time per scope (though you can have overlapping cycles for different review types).
- review_deadline must be after end_date.
- Transitioning to COMPLETED locks all associated reviews.

**Operations:** Create cycle, update cycle, change status, list cycles, get cycle with review statistics (how many completed, pending).

---

#### 4.5.2 Performance Reviews

Individual review records within a cycle.

**Fields:** id, review_cycle_id, employee_id, reviewer_id (employee_id — typically the manager), self_assessment (text), self_rating (1-5), manager_assessment (text), manager_rating (1-5), overall_rating (1-5, can be computed or overridden), status (pending_self_review, pending_manager_review, completed, cancelled), goals_met_count, goals_total_count, submitted_at, completed_at, created_at, updated_at.

**Review Flow:**

```
PENDING_SELF_REVIEW → PENDING_MANAGER_REVIEW → COMPLETED
         │                     │
         └─────────────────────┴──── CANCELLED
```

1. When a cycle moves to IN_REVIEW, review records are auto-created for all active employees.
2. The employee fills in their self-assessment and self-rating (status → PENDING_MANAGER_REVIEW).
3. The manager fills in their assessment and rating (status → COMPLETED).

**Rating Scale:**

| Rating | Label        |
| ------ | ------------ |
| 1      | Unsatisfactory |
| 2      | Needs Improvement |
| 3      | Meets Expectations |
| 4      | Exceeds Expectations |
| 5      | Outstanding  |

**Business Rules:**

- One review per employee per cycle.
- An employee cannot review themselves (reviewer_id ≠ employee_id).
- Reviews can only be edited while in their respective pending status.
- Once COMPLETED, reviews are immutable.
- goals_met_count and goals_total_count are computed from the Goals module.

**Operations:** Get review for employee in cycle, submit self-assessment, submit manager assessment, list reviews in cycle (filter by status, department), get review statistics for cycle.

---

#### 4.5.3 Goals

Objectives set for employees, tracked over a review cycle.

**Fields:** id, employee_id, review_cycle_id (nullable — goals can exist outside a cycle), title, description, category (individual, team, company), key_results (JSONB array of measurable outcomes), target_date, status (not_started, in_progress, completed, cancelled), progress_percentage (0-100), created_by (user_id), created_at, updated_at.

**Key Results Structure (JSONB):**

```json
[
  {
    "description": "Increase test coverage to 80%",
    "target_value": 80,
    "current_value": 65,
    "unit": "%"
  },
  {
    "description": "Reduce API response time to under 200ms",
    "target_value": 200,
    "current_value": 350,
    "unit": "ms"
  }
]
```

**Business Rules:**

- Goals can be created by the employee or their manager.
- progress_percentage is manually updated by the employee.
- If linked to a review cycle, the goal's status is considered during performance reviews.
- Goals not linked to a cycle are standalone (personal development goals).
- Completed and cancelled goals cannot be edited.

**Operations:** Create goal, update goal, update progress, list goals for employee (filter by cycle, status, category), delete goal (soft delete), get goal statistics for employee.

---

## 5. Database Schema

### Entity Relationship Summary

```
users ─────────────┐
                    │ 1:1 (optional)
                    ▼
roles ◄──── users.role_id
                    
departments ───┐ self-ref (parent_department_id)
               │
positions ─────┤ FK department_id
               │
employees ─────┤ FK department_id, position_id, manager_id (self-ref), user_id
    │
    ├── employee_documents     (1:N)
    ├── emergency_contacts     (1:N)
    ├── employee_salaries      (1:N, one active at a time)
    │       └── component_overrides (1:N)
    │
    ├── leave_balances         (1:N per leave_type per year)
    ├── leave_requests         (1:N)
    ├── attendance              (1:N, one per date)
    │
    ├── performance_reviews    (1:N per review_cycle)
    ├── goals                  (1:N)
    │
    └── applicants.hired → creates employee
    
leave_types ◄── leave_balances, leave_requests
holidays (standalone)

salary_structures ──┐
    └── salary_components (1:N)

payroll_runs ──┐
    └── payroll_entries (1:N per employee)
        └── payroll_line_items (1:N per entry)

payslips ── FK payroll_entry_id, employee_id

job_postings ──┐ FK department_id, position_id
    └── applicants (1:N)

review_cycles ──┐
    ├── performance_reviews (1:N)
    └── goals (N:1 optional)
```

### Key Constraints

- All tables use UUID primary keys.
- All tables include created_at (timestamp with timezone, default now()).
- All tables include updated_at (timestamp with timezone, auto-updated).
- Entities that support soft delete include deleted_at (nullable timestamp).
- All monetary fields use NUMERIC(15,2).
- All foreign keys have appropriate ON DELETE constraints (RESTRICT for most, SET NULL where appropriate).
- Unique constraints: employee.employee_number, employee.email (where deleted_at IS NULL), department.code, position.code, leave_type.code.
- Indexes on: frequently filtered columns (status, employee_id, department_id, date ranges), foreign keys, and soft-delete columns.

---

## 6. API Endpoints

All endpoints are prefixed with `/api/v1`. Protected routes require a valid JWT in the Authorization header.

### Authentication

| Method | Endpoint              | Description         | Auth  |
| ------ | --------------------- | ------------------- | ----- |
| POST   | /auth/login           | Login, receive JWT  | No    |
| POST   | /auth/refresh         | Refresh JWT token   | Yes   |
| POST   | /auth/logout          | Invalidate token    | Yes   |
| GET    | /auth/me              | Get current user    | Yes   |

### Departments

| Method | Endpoint                          | Description                | Role               |
| ------ | --------------------------------- | -------------------------- | ------------------- |
| POST   | /hr/departments                   | Create department          | hr_manager, super_admin |
| GET    | /hr/departments                   | List departments           | All authenticated   |
| GET    | /hr/departments/:id               | Get department             | All authenticated   |
| PUT    | /hr/departments/:id               | Update department          | hr_manager, super_admin |
| DELETE | /hr/departments/:id               | Soft delete department     | super_admin         |
| GET    | /hr/departments/tree              | Get department hierarchy   | All authenticated   |
| GET    | /hr/departments/:id/employees     | List employees in dept     | manager, hr_manager, super_admin |

### Positions

| Method | Endpoint                   | Description           | Role               |
| ------ | -------------------------- | --------------------- | ------------------- |
| POST   | /hr/positions              | Create position       | hr_manager, super_admin |
| GET    | /hr/positions              | List positions        | All authenticated   |
| GET    | /hr/positions/:id          | Get position          | All authenticated   |
| PUT    | /hr/positions/:id          | Update position       | hr_manager, super_admin |
| DELETE | /hr/positions/:id          | Soft delete position  | super_admin         |

### Employees

| Method | Endpoint                              | Description                    | Role               |
| ------ | ------------------------------------- | ------------------------------ | ------------------- |
| POST   | /hr/employees                         | Create employee                | hr_manager, super_admin |
| GET    | /hr/employees                         | List employees (paginated)     | manager, hr_manager, super_admin |
| GET    | /hr/employees/:id                     | Get employee                   | Self, manager, hr_manager, super_admin |
| PUT    | /hr/employees/:id                     | Update employee                | hr_manager, super_admin |
| DELETE | /hr/employees/:id                     | Soft delete                    | super_admin         |
| GET    | /hr/employees/:id/direct-reports      | Get direct reports             | Self (if manager), hr_manager, super_admin |
| POST   | /hr/employees/:id/documents           | Upload document                | Self, hr_manager    |
| GET    | /hr/employees/:id/documents           | List documents                 | Self, hr_manager, super_admin |
| GET    | /hr/employees/:id/emergency-contacts  | List emergency contacts        | Self, hr_manager    |
| POST   | /hr/employees/:id/emergency-contacts  | Add emergency contact          | Self, hr_manager    |

### Leave Types

| Method | Endpoint               | Description        | Role               |
| ------ | ---------------------- | ------------------ | ------------------- |
| POST   | /hr/leave-types        | Create leave type  | hr_manager, super_admin |
| GET    | /hr/leave-types        | List leave types   | All authenticated   |
| GET    | /hr/leave-types/:id    | Get leave type     | All authenticated   |
| PUT    | /hr/leave-types/:id    | Update leave type  | hr_manager, super_admin |

### Leave Balances

| Method | Endpoint                                      | Description              | Role               |
| ------ | --------------------------------------------- | ------------------------ | ------------------- |
| GET    | /hr/leave-balances/me                         | My leave balances        | employee            |
| GET    | /hr/leave-balances/employee/:id               | Employee's balances      | manager, hr_manager, super_admin |
| POST   | /hr/leave-balances/initialize/:year           | Initialize balances for year | hr_manager, super_admin |
| PUT    | /hr/leave-balances/:id/adjust                 | Manual adjustment        | hr_manager, super_admin |

### Leave Requests

| Method | Endpoint                              | Description           | Role               |
| ------ | ------------------------------------- | --------------------- | ------------------- |
| POST   | /hr/leave-requests                    | Submit leave request  | employee            |
| GET    | /hr/leave-requests/me                 | My leave requests     | employee            |
| GET    | /hr/leave-requests                    | List all requests     | manager, hr_manager, super_admin |
| GET    | /hr/leave-requests/:id                | Get request           | Self, manager, hr_manager |
| PUT    | /hr/leave-requests/:id/cancel         | Cancel request        | Self                |
| PUT    | /hr/leave-requests/:id/approve        | Approve request       | manager, hr_manager |
| PUT    | /hr/leave-requests/:id/reject         | Reject request        | manager, hr_manager |

### Attendance

| Method | Endpoint                              | Description               | Role               |
| ------ | ------------------------------------- | ------------------------- | ------------------- |
| POST   | /hr/attendance/clock-in               | Clock in                  | employee            |
| PUT    | /hr/attendance/clock-out              | Clock out                 | employee            |
| GET    | /hr/attendance/me                     | My attendance records     | employee            |
| GET    | /hr/attendance/employee/:id           | Employee attendance       | manager, hr_manager, super_admin |
| GET    | /hr/attendance/department/:id         | Department daily report   | manager, hr_manager, super_admin |
| POST   | /hr/attendance/manual                 | Create manual entry       | hr_manager          |
| PUT    | /hr/attendance/:id                    | Edit attendance record    | hr_manager          |
| GET    | /hr/attendance/summary                | Monthly summary report    | manager, hr_manager, super_admin |

### Holidays

| Method | Endpoint              | Description       | Role               |
| ------ | --------------------- | ----------------- | ------------------- |
| POST   | /hr/holidays          | Create holiday    | hr_manager, super_admin |
| GET    | /hr/holidays          | List holidays     | All authenticated   |
| PUT    | /hr/holidays/:id      | Update holiday    | hr_manager, super_admin |
| DELETE | /hr/holidays/:id      | Delete holiday    | hr_manager, super_admin |

### Salary Structures

| Method | Endpoint                                     | Description              | Role               |
| ------ | -------------------------------------------- | ------------------------ | ------------------- |
| POST   | /hr/salary-structures                        | Create structure         | hr_manager, super_admin |
| GET    | /hr/salary-structures                        | List structures          | hr_manager, super_admin |
| GET    | /hr/salary-structures/:id                    | Get with components      | hr_manager, super_admin |
| PUT    | /hr/salary-structures/:id                    | Update structure         | hr_manager, super_admin |
| POST   | /hr/salary-structures/:id/components         | Add component            | hr_manager, super_admin |
| PUT    | /hr/salary-structures/:id/components/:cid    | Update component         | hr_manager, super_admin |
| DELETE | /hr/salary-structures/:id/components/:cid    | Remove component         | hr_manager, super_admin |

### Employee Salaries

| Method | Endpoint                                  | Description               | Role               |
| ------ | ----------------------------------------- | ------------------------- | ------------------- |
| POST   | /hr/employee-salaries                     | Assign salary             | hr_manager, super_admin |
| GET    | /hr/employee-salaries/employee/:id        | Get current salary        | hr_manager, super_admin |
| GET    | /hr/employee-salaries/employee/:id/history| Get salary history        | hr_manager, super_admin |
| PUT    | /hr/employee-salaries/:id                 | Update (creates new)      | hr_manager, super_admin |

### Payroll Runs

| Method | Endpoint                              | Description              | Role               |
| ------ | ------------------------------------- | ------------------------ | ------------------- |
| POST   | /hr/payroll-runs                      | Create run (DRAFT)       | hr_manager, super_admin |
| GET    | /hr/payroll-runs                      | List runs                | hr_manager, super_admin |
| GET    | /hr/payroll-runs/:id                  | Get run with summary     | hr_manager, super_admin |
| GET    | /hr/payroll-runs/:id/entries          | Get all entries in run   | hr_manager, super_admin |
| POST   | /hr/payroll-runs/:id/compute          | Trigger computation      | hr_manager, super_admin |
| PUT    | /hr/payroll-runs/:id/approve          | Approve run              | super_admin         |
| PUT    | /hr/payroll-runs/:id/reject           | Reject run (→ DRAFT)     | super_admin         |
| POST   | /hr/payroll-runs/:id/process          | Process (generate slips) | hr_manager, super_admin |
| PUT    | /hr/payroll-runs/:id/close            | Close run                | super_admin         |

### Payslips

| Method | Endpoint                              | Description           | Role               |
| ------ | ------------------------------------- | --------------------- | ------------------- |
| GET    | /hr/payslips/me                       | My payslips           | employee            |
| GET    | /hr/payslips/employee/:id             | Employee's payslips   | hr_manager, super_admin |
| GET    | /hr/payslips/:id/download             | Download payslip PDF  | Self, hr_manager    |

### Job Postings

| Method | Endpoint                              | Description           | Role               |
| ------ | ------------------------------------- | --------------------- | ------------------- |
| POST   | /hr/job-postings                      | Create posting        | hr_manager, super_admin |
| GET    | /hr/job-postings                      | List postings         | All authenticated (OPEN only for employee) |
| GET    | /hr/job-postings/:id                  | Get posting           | All authenticated   |
| PUT    | /hr/job-postings/:id                  | Update posting        | hr_manager, super_admin |
| PUT    | /hr/job-postings/:id/status           | Change status         | hr_manager, super_admin |
| DELETE | /hr/job-postings/:id                  | Soft delete           | hr_manager, super_admin |

### Applicants

| Method | Endpoint                                  | Description            | Role               |
| ------ | ----------------------------------------- | ---------------------- | ------------------- |
| POST   | /hr/applicants                            | Create applicant       | hr_manager          |
| GET    | /hr/job-postings/:id/applicants           | List for posting       | hr_manager, super_admin |
| GET    | /hr/applicants/:id                        | Get applicant          | hr_manager, super_admin |
| PUT    | /hr/applicants/:id                        | Update applicant       | hr_manager          |
| PUT    | /hr/applicants/:id/stage                  | Change pipeline stage  | hr_manager          |
| POST   | /hr/applicants/:id/convert-to-employee    | Hired → Employee       | hr_manager, super_admin |


### Review Cycles

| Method | Endpoint                              | Description            | Role               |
| ------ | ------------------------------------- | ---------------------- | ------------------- |
| POST   | /hr/review-cycles                     | Create cycle           | hr_manager, super_admin |
| GET    | /hr/review-cycles                     | List cycles            | All authenticated   |
| GET    | /hr/review-cycles/:id                 | Get cycle with stats   | hr_manager, super_admin |
| PUT    | /hr/review-cycles/:id                 | Update cycle           | hr_manager, super_admin |
| PUT    | /hr/review-cycles/:id/status          | Change status          | hr_manager, super_admin |

### Performance Reviews

| Method | Endpoint                                          | Description                 | Role               |
| ------ | ------------------------------------------------- | --------------------------- | ------------------- |
| GET    | /hr/performance-reviews/me                        | My reviews                  | employee            |
| GET    | /hr/performance-reviews/cycle/:id                 | All reviews in cycle        | hr_manager, super_admin |
| GET    | /hr/performance-reviews/:id                       | Get review                  | Self, reviewer, hr_manager |
| PUT    | /hr/performance-reviews/:id/self-assessment       | Submit self-assessment      | Self                |
| PUT    | /hr/performance-reviews/:id/manager-assessment    | Submit manager assessment   | reviewer            |

### Goals

| Method | Endpoint                              | Description           | Role               |
| ------ | ------------------------------------- | --------------------- | ------------------- |
| POST   | /hr/goals                             | Create goal           | employee, manager   |
| GET    | /hr/goals/me                          | My goals              | employee            |
| GET    | /hr/goals/employee/:id                | Employee goals        | manager, hr_manager, super_admin |
| GET    | /hr/goals/:id                         | Get goal              | Self, manager, hr_manager |
| PUT    | /hr/goals/:id                         | Update goal           | Self, manager       |
| PUT    | /hr/goals/:id/progress                | Update progress       | Self                |
| DELETE | /hr/goals/:id                         | Soft delete           | Self, manager, hr_manager |

---

## 7. Business Rules & Validation

### Global Rules

- All list endpoints support pagination via `page` and `page_size` query parameters (defaults: page=1, page_size=20, max page_size=100).
- All list endpoints support `sort_by` and `sort_order` (asc/desc) query parameters.
- All date inputs must be in ISO 8601 format (YYYY-MM-DD or RFC3339 for timestamps).
- All monetary values are stored as NUMERIC(15,2) and transmitted as strings in JSON to avoid floating point issues.
- All soft-deleted records are excluded from list queries by default. Pass `include_deleted=true` to include them (admin only).
- All write operations return the created/updated entity in the response body.
- Error responses follow a consistent format: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`.

### Self-Service Rules

Employees accessing their own data (via `/me` endpoints) can:

- View their own profile, leave balances, leave requests, attendance, payslips, reviews, and goals.
- Update limited profile fields (personal_email, phone, address, emergency contacts).
- Submit leave requests and cancel their own pending/approved-future requests.
- Clock in/out.
- Submit self-assessments during review periods.
- Create and update progress on their own goals.

Employees cannot:

- View other employees' salaries, payslips, or performance reviews.
- Approve their own leave requests.
- Modify payroll data.
- Access recruitment data.

---

## 8. Project Structure

```
back-office-backend/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── database/
│   │   ├── db.go
│   │   └── migration_setup.ps1
│   ├── handlers/
│   │   ├── health.go
│   │   ├── employee_handler.go
│   │   ├── department_handler.go
│   │   ├── position_handler.go
│   │   ├── employee_document_handler.go
│   │   ├── leave_type_handler.go
│   │   ├── leave_request_handler.go
│   │   ├── leave_balance_handler.go
│   │   ├── attendance_handler.go
│   │   ├── holiday_handler.go
│   │   ├── salary_structure_handler.go
│   │   ├── employee_salary_handler.go
│   │   ├── payroll_run_handler.go
│   │   ├── payslip_handler.go
│   │   ├── job_posting_handler.go
│   │   ├── applicant_handler.go
│   │   ├── review_cycle_handler.go
│   │   ├── performance_review_handler.go
│   │   └── goal_handler.go
│   ├── interfaces/
│   │   ├── user_interface.go
│   │   ├── role_interface.go
│   │   ├── employee_interface.go
│   │   ├── department_interface.go
│   │   ├── position_interface.go
│   │   ├── employee_document_interface.go
│   │   ├── leave_type_interface.go
│   │   ├── leave_request_interface.go
│   │   ├── leave_balance_interface.go
│   │   ├── attendance_interface.go
│   │   ├── holiday_interface.go
│   │   ├── salary_structure_interface.go
│   │   ├── employee_salary_interface.go
│   │   ├── payroll_run_interface.go
│   │   ├── payroll_calculator_interface.go
│   │   ├── tax_calculator_interface.go
│   │   ├── payslip_interface.go
│   │   ├── job_posting_interface.go
│   │   ├── applicant_interface.go
│   │   ├── review_cycle_interface.go
│   │   ├── performance_review_interface.go
│   │   └── goal_interface.go
│   ├── middleware/
│   │   ├── auth.go
│   │   ├── cors.go
│   │   └── rbac.go
│   ├── models/
│   │   ├── user.go
│   │   ├── role.go
│   │   ├── employee.go
│   │   ├── department.go
│   │   ├── position.go
│   │   ├── employee_document.go
│   │   ├── leave_type.go
│   │   ├── leave_request.go
│   │   ├── leave_balance.go
│   │   ├── attendance.go
│   │   ├── holiday.go
│   │   ├── salary_structure.go
│   │   ├── salary_component.go
│   │   ├── employee_salary.go
│   │   ├── payroll_run.go
│   │   ├── payroll_entry.go
│   │   ├── payroll_line_item.go
│   │   ├── payslip.go
│   │   ├── job_posting.go
│   │   ├── applicant.go
│   │   ├── review_cycle.go
│   │   ├── performance_review.go
│   │   └── goal.go
│   ├── repository/
│   │   ├── user_repository.go
│   │   ├── role_repository.go
│   │   ├── employee_repository.go
│   │   ├── department_repository.go
│   │   ├── position_repository.go
│   │   ├── employee_document_repository.go
│   │   ├── leave_type_repository.go
│   │   ├── leave_request_repository.go
│   │   ├── leave_balance_repository.go
│   │   ├── attendance_repository.go
│   │   ├── holiday_repository.go
│   │   ├── salary_structure_repository.go
│   │   ├── employee_salary_repository.go
│   │   ├── payroll_run_repository.go
│   │   ├── payroll_entry_repository.go
│   │   ├── payslip_repository.go
│   │   ├── job_posting_repository.go
│   │   ├── applicant_repository.go
│   │   ├── review_cycle_repository.go
│   │   ├── performance_review_repository.go
│   │   └── goal_repository.go
│   ├── routes/
│   │   ├── routes.go
│   │   ├── public_routes.go
│   │   ├── middleware_helpers.go
│   │   ├── employee_routes.go
│   │   ├── department_routes.go
│   │   ├── leave_routes.go
│   │   ├── attendance_routes.go
│   │   ├── payroll_routes.go
│   │   ├── recruitment_routes.go
│   │   └── performance_routes.go
│   └── services/
│       ├── user_service.go
│       ├── role_service.go
│       ├── employee_service.go
│       ├── department_service.go
│       ├── position_service.go
│       ├── employee_document_service.go
│       ├── leave_type_service.go
│       ├── leave_request_service.go
│       ├── leave_balance_service.go
│       ├── attendance_service.go
│       ├── holiday_service.go
│       ├── salary_structure_service.go
│       ├── employee_salary_service.go
│       ├── payroll_run_service.go
│       ├── payroll_calculator.go
│       ├── tax_calculator.go
│       ├── payslip_generator.go
│       ├── job_posting_service.go
│       ├── applicant_service.go
│       ├── review_cycle_service.go
│       ├── performance_review_service.go
│       └── goal_service.go
├── pkg/
│   └── utils/
│       ├── hashing.go
│       ├── jwt.go
│       ├── response.go
│       ├── sessions.go
│       ├── decimal.go
│       ├── pagination.go
│       ├── file_storage.go
│       └── pdf.go
├── templates/
│   └── payslip/
│       └── payslip_template.html
├── migrations/
│   ├── 001_create_users.up.sql / .down.sql
│   ├── 002_create_roles.up.sql / .down.sql
│   ├── 003_create_departments.up.sql / .down.sql
│   ├── 004_create_positions.up.sql / .down.sql
│   ├── 005_create_employees.up.sql / .down.sql
│   ├── 006_create_employee_documents.up.sql / .down.sql
│   ├── 007_create_leave_types.up.sql / .down.sql
│   ├── 008_create_leave_balances.up.sql / .down.sql
│   ├── 009_create_leave_requests.up.sql / .down.sql
│   ├── 010_create_holidays.up.sql / .down.sql
│   ├── 011_create_attendance.up.sql / .down.sql
│   ├── 012_create_salary_structures.up.sql / .down.sql
│   ├── 013_create_salary_components.up.sql / .down.sql
│   ├── 014_create_employee_salaries.up.sql / .down.sql
│   ├── 015_create_payroll_runs.up.sql / .down.sql
│   ├── 016_create_payroll_entries.up.sql / .down.sql
│   ├── 017_create_payroll_line_items.up.sql / .down.sql
│   ├── 018_create_payslips.up.sql / .down.sql
│   ├── 019_create_job_postings.up.sql / .down.sql
│   ├── 020_create_applicants.up.sql / .down.sql
│   ├── 022_create_review_cycles.up.sql / .down.sql
│   ├── 023_create_performance_reviews.up.sql / .down.sql
│   └── 024_create_goals.up.sql / .down.sql
├── docs/
│   ├── hr_module_overview.md
│   ├── payroll_flow.md
│   └── er_diagram.md
├── Dockerfile
├── docker-compose.yml
├── Makefile
├── go.mod / go.sum
└── README.md
```

---

## 9. Migration Order

Migrations must run in the numbered order due to foreign key dependencies:

| #   | Table                  | Depends On                                    |
| --- | ---------------------- | --------------------------------------------- |
| 001 | users                  | —                                             |
| 002 | roles                  | users (for FK on role assignment)              |
| 003 | departments            | self (parent_department_id)                    |
| 004 | positions              | departments                                   |
| 005 | employees              | users, departments, positions, self (manager)  |
| 006 | employee_documents     | employees, users                               |
| 007 | leave_types            | —                                             |
| 008 | leave_balances         | employees, leave_types                         |
| 009 | leave_requests         | employees, leave_types                         |
| 010 | holidays               | —                                             |
| 011 | attendance             | employees                                     |
| 012 | salary_structures      | —                                             |
| 013 | salary_components      | salary_structures                              |
| 014 | employee_salaries      | employees, salary_structures                   |
| 015 | payroll_runs           | users                                         |
| 016 | payroll_entries        | payroll_runs, employees                        |
| 017 | payroll_line_items     | payroll_entries                                |
| 018 | payslips               | payroll_entries, employees, payroll_runs        |
| 019 | job_postings           | departments, positions, users                  |
| 020 | applicants             | job_postings, employees                        |
| 022 | review_cycles          | users                                         |
| 023 | performance_reviews    | review_cycles, employees                       |
| 024 | goals                  | employees, review_cycles                       |

---

## 10. Build Phases

### Phase 1 — Foundation (Weeks 1–2)

- Project setup (Go modules, Docker, Makefile, config).
- Database connection and migration runner.
- User authentication (JWT login, refresh, middleware).
- Role and RBAC middleware.
- Department CRUD.
- Position CRUD.
- Employee CRUD with search, pagination, and filters.
- Employee documents upload/download.
- Emergency contacts sub-resource.

**Deliverable:** Core employee management is functional. Users can log in, manage departments, positions, and employee records.

### Phase 2 — Leave & Attendance (Weeks 3–4)

- Leave types configuration.
- Leave balance initialization and management.
- Leave request submission, approval, rejection, cancellation.
- Business day calculation (excluding weekends and holidays).
- Holiday management.
- Attendance clock-in / clock-out.
- Manual attendance entry and correction.
- Attendance summary reports.

**Deliverable:** Full leave and attendance lifecycle is working. Employees can request leave, managers can approve, and attendance is tracked.

### Phase 3 — Payroll (Weeks 5–7)

- Salary structures and components.
- Employee salary assignment and history.
- Payroll run lifecycle (create, compute, review, approve, process, close).
- Payroll computation engine (earnings, deductions, tax, proration).
- Tax calculator interface with default implementation.
- Payslip PDF generation and storage.
- Payslip download (signed URLs).
- Payroll summary and comparison reports.

**Deliverable:** End-to-end payroll processing. HR can run payroll, generate payslips, and employees can download them.

### Phase 4 — Recruitment (Weeks 8–9)

- Job posting management.
- Applicant tracking with pipeline stages.
- Resume upload and management.
- Applicant-to-employee conversion.

**Deliverable:** Recruitment pipeline from posting to hire.

### Phase 5 — Performance Management (Weeks 10–11)

- Review cycle management.
- Auto-generation of review records.
- Self-assessment and manager assessment flows.
- Goal setting with key results.
- Goal progress tracking.
- Review statistics and reports.

**Deliverable:** Complete performance review cycle with goal tracking.

### Phase 6 — Polish & Reporting (Week 12)

- Audit logging for all sensitive operations.
- Dashboard API (headcount, leave utilization, payroll totals, open positions).
- Data export (CSV/Excel for payroll, attendance, employee lists).
- API documentation (Swagger/OpenAPI).
- Comprehensive error handling and input validation.
- Unit and integration tests for critical paths.

**Deliverable:** Production-ready system with reporting, auditing, and documentation.
