# Tender Care HMS — Project Scope & System Definition

**Purpose of this document:** define exactly who uses this system, what it does, what it deliberately does *not* do, and how each user moves through it — so that every feature built afterward has a clear reason to exist.

---

## 1. The Problem (as stated)

A small local hospital is struggling with three specific things:

1. **Staff payroll management** — no reliable system for tracking who's owed what, when they were paid, and payroll history.
2. **Patient file storage** — physical paper files get lost or take too long to locate.
3. **Patient record access & workflow** — staff can't quickly find or retrieve the right file when they need it.

This is an **administrative and operations tool**, not a clinical one. It exists to solve logistics and payroll problems, not to manage patient health.

---

## 2. What This System Explicitly Is NOT

Stating this clearly now prevents scope creep later. This system will **not** include:

- Clinical diagnosis, treatment plans, or prescriptions
- Medical history, lab results, or test records
- Billing, insurance claims, or patient invoicing
- A patient-facing portal or patient logins
- Multi-branch / multi-facility management (single hospital, single location)
- Full HR suite (leave management, performance reviews, disciplinary records, recruitment)
- Automated bank transfers (payroll is *tracked*, not *disbursed*, by this system — see §4.3)

If any of these turn out to be needed later, they're new projects, not extensions bolted onto this one.

---

## 3. Who Uses This System

This is the most important fork in the whole design, so it's worth being explicit.

### 3.1 Every staff record is its own login — no separate "user account" concept

**Decision:** a staff record and a login account are the same thing, not two systems to keep in sync. This solves the turnover problem directly:

- Creating a staff member can issue them login credentials in the same step (system-generated initial password, forced change on first login — no reliance on staff having a personal email).
- Deactivating a staff member (the existing "off duty" soft-delete) **disables their login at the same time**, automatically. No separate account-management step to forget when someone leaves.
- Access stays low-risk even with frequent turnover, because permissions are narrow by role (see §3.2) — a stale or misused account can't do much damage.

The Administrator and Records Operator roles are still special-purpose accounts (not tied to a clinical staff record), since they represent the back-office, not clinical staff.

### 3.2 Roles

| Role | Who | Can do |
|---|---|---|
| **Administrator** | Hospital administrator / owner | Everything: manage staff records, run payroll, full patient file access, all dashboards |
| **Records Operator** | Front-desk / records clerk | Patient file registration, search, location updates, staff directory search — **no payroll access, no ability to delete staff or files** |
| **Clinical Staff** | Doctors, nurses, trainee nurses, midwives — anyone with an active staff record | Admit a patient (mark a file active / in-treatment), search patient files (read-only), view their own schedule — **no payroll, no staff directory edits, no deletion rights, no other staff's schedule** |

`DOCTOR`, `NURSE`, `TRAINEE_NURSE`, `MIDWIFE`, `MAINTENANCE` remain attributes of the staff record for directory/scheduling purposes — they don't change what the Clinical Staff role can do. (Whether `MAINTENANCE` staff get logins at all, versus being directory-only like before, is worth a quick call — they likely don't need patient admission access.)

---

## 4. Core Modules

### 4.1 Patient File Management
**Goal:** know where a physical patient file is, right now, in under 10 seconds.

In scope:
- Register a new patient file (ID, name, phone, physical location: cabinet → shelf → folder)
- Search by patient ID, name, or phone number
- Update a file's physical location, with a history log of past locations
- View a patient file's current location and history
- **Admission**: Clinical Staff can mark a file/patient as active (admitted/in-treatment) — this is a status change, not a clinical entry
- **Discharge/archival**: mark a file as discharged/inactive, keeping it out of active search results by default while still retrievable by ID/name search
- Delete/retire a file record permanently (admin only — separate from discharge, which is reversible)

Out of scope: anything about what's *inside* the file (diagnosis, notes, history).

### 4.2 Staff Directory & Scheduling
**Goal:** a reliable, searchable staff list with duty status and schedule.

In scope:
- Add/edit staff records (name, role, contact info, shift, schedule, on/off-duty status)
- Search and filter staff by role, shift, or duty status
- Soft-deactivate a staff member (set off-duty rather than deleting)

Out of scope: leave requests, performance reviews, disciplinary history.

### 4.3 Payroll (new build)
**Goal:** solve the actual stated pain point — know what every staff member is owed, track that they were paid, and keep a history.

Proposed scope for v1:
- Each staff record already carries `salary`, `bankAccount`, `accountNumber` — payroll builds directly on this.
- **Payroll Run**: a defined pay period (e.g. "August 2026") created by an admin, containing one **Payroll Entry** per active staff member.
- **Payroll Entry**: staff member, base salary, any manual adjustment (bonus/deduction) with a note, resulting total, and a status (`PENDING` → `APPROVED` → `PAID`).
- Admin can review a run, adjust individual entries, approve the run, then mark it paid.
- View payroll history per staff member and per run.
- **Explicitly out of scope for v1**: automated bank disbursement, tax computation, statutory deduction calculations. The system produces a clear record of what's owed and confirms it was paid — actually moving the money stays a manual bank step outside this system, unless you tell me otherwise.

This is deliberately the leanest version that solves "we don't know who's been paid" — it can grow into more automated payroll later.

### 4.4 Dashboard
**Goal:** at-a-glance status for the administrator.

In scope: total patient files, cabinet/storage distribution, recent activity, staff on/off duty counts, upcoming/recent payroll runs.

### 4.5 Auth & Access Control
Login, session management, and the three roles above enforced on every route (not just "logged in or not," but "allowed to do *this specific thing* or not").

---

## 5. User Flows

### 5.1 Administrator
1. Logs in → dashboard (patient file stats, staff on duty, payroll status at a glance)
2. Adds a new staff member with salary/bank details when hired
3. At month-end: creates a payroll run → reviews auto-generated entries → adjusts any bonuses/deductions → approves → marks paid
4. Adds a new Records Operator or Clinical Staff member (issuing login credentials happens automatically when the staff record is created)
5. Can do anything a Records Operator or Clinical Staff member can do, plus everything above

### 5.2 Records Operator
1. Logs in → dashboard (patient file stats only — no payroll visibility)
2. A patient arrives → searches by name/ID/phone → finds file → sees current cabinet/shelf/folder
3. File is pulled and later returned to a different shelf → updates location, system logs the change
4. New patient → registers a new file with a location
5. Looks up a staff member's shift/on-duty status when needed (e.g., "is Dr. Adebayo on duty today?")
6. **Cannot** access payroll, cannot delete staff, cannot manage user accounts

### 5.3 Clinical Staff (doctor, nurse, midwife, trainee nurse)
1. Logs in with credentials issued when their staff record was created
2. Sees their own schedule/shift on landing — nothing else on the dashboard
3. A patient arrives → searches by name/ID/phone → marks the file as admitted/active
4. When treatment concludes → marks the file as discharged
5. **Cannot** see payroll, other staff's schedules, edit the staff directory, or delete anything

---

## 6. Decisions Made

- ✅ Clinical staff **do** get logins, tied 1:1 to their staff record, with automatic provisioning/deprovisioning to handle turnover (§3.1).
- ✅ Payroll v1 is simple: flat salary + manual bonus/deduction note, no structured tax/pension/loan fields.
- ✅ Payroll only *tracks* status (pending/approved/paid) — no bank disbursement integration.
- ✅ Patient files get discharge/archival status, not just physical location.
- ✅ Weekly shift schedule (day/night/off, Mon–Sun) is visible to every role for coordination purposes, editable by Administrator only. Records Operator loses the general searchable staff directory on the Staff page as a result — schedule-only, same as Clinical Staff, on that specific page.
- ✅ AdminNotes (private scratchpad, separate from public Notices) are private to whoever created them, not shared across Administrator accounts.

## 7. Open Questions (still need your call)

1. **Do `MAINTENANCE` staff need logins too**, or should they stay directory-only (no patient admission or schedule-viewing need)?
2. **Credential handout mechanics**: when a staff record is created, how should the initial password reach that person — printed and handed over by the admin, a default pattern they're told verbally, something else? (No email/SMS assumed available.)
3. Is a fourth role ever likely (e.g., a "Payroll Manager" who can't touch patient files), or are three roles enough for the foreseeable future?

---

## 8. Functional Requirements

Each requirement should be independently testable — "does the system do this, yes or no."

### 8.1 Patient File Management

| ID | Requirement |
|---|---|
| FR-1.1 | Records Operator or Administrator can register a new patient file with patient ID, full name, phone number, and initial physical location (cabinet/shelf/folder). |
| FR-1.2 | Any authenticated user can search patient files by patient ID, name, or phone number. |
| FR-1.3 | Any authenticated user can view a file's current location and its full timestamped location history. |
| FR-1.4 | Records Operator or Administrator can update a file's location; the system logs who made the change and when, automatically. |
| FR-1.5 | Clinical Staff can mark a file as admitted/active. |
| FR-1.6 | Clinical Staff, Records Operator, or Administrator can mark a file as discharged — removed from default active search results, not deleted. |
| FR-1.7 | Only Administrator can permanently delete a file record. |
| FR-1.8 | The system rejects duplicate patient IDs on creation. |

### 8.2 Staff Directory & Scheduling

| ID | Requirement |
|---|---|
| FR-2.1 | Administrator can create a staff record: name, role, contact info, salary, bank details, shift/schedule. |
| FR-2.2 | Creating a staff record automatically provisions that person's login (staff record = login, per §3.1). |
| FR-2.3 | Deactivating a staff record automatically disables that person's login. |
| FR-2.4 | Any authenticated user can search/filter staff by role, shift, or duty status. |
| FR-2.5 | Every authenticated role can view the full Weekly shift schedule (all staff, Monday–Sunday, day/night/off) — read-only for Records Operator and Clinical Staff. *(Supersedes the earlier "own schedule only" rule — see decision log below.)* |
| FR-2.6 | Only Administrator can edit the Weekly shift schedule — assigning day/night/off per staff member, per day. |

### 8.3 Payroll

| ID | Requirement |
|---|---|
| FR-3.1 | Administrator can create a Payroll Run for a period, auto-populated with one entry per active staff member using their stored salary. |
| FR-3.2 | Administrator can adjust an individual entry with a bonus/deduction amount plus a required note. |
| FR-3.3 | Each entry moves Pending → Approved → Paid; only Administrator changes status. |
| FR-3.4 | Payroll history is retained per staff member and per run; entries marked Paid become read-only. |
| FR-3.5 | No automatic tax/pension calculation in v1 — manual note field only (per your answer in §6). |

### 8.4 Authentication & Access Control

| ID | Requirement |
|---|---|
| FR-4.1 | Every route requires authentication except the landing page and login. |
| FR-4.2 | All three roles are enforced **server-side**, per action — not just hidden in the UI. A Clinical Staff account hitting a payroll endpoint directly must be rejected by the backend, regardless of what the frontend shows. |
| FR-4.3 | Passwords are hashed (already implemented via bcrypt); sessions use the existing access/refresh token pattern. |
| FR-4.4 | First login after account provisioning forces a password change before any other action. |
| FR-4.5 | Failed login attempts are rate-limited (already implemented in `auth.js` — carry forward, don't regress). |
| FR-4.6 | Sensitive actions (location changes, payroll status changes) are logged against the user who performed them. |

FR-4.2 is the one to watch most closely: the current backend has authentication (are you logged in) but not authorization (are you allowed to do *this*) — that gap needs closing before payroll or role differences mean anything in practice.

## 9. UX Principles for Non-Technical Staff

The hospital's staff are not assumed to be technically literate. Every screen should be built against these rules, not just the ones covering auth:

1. **Identity is always visible.** Whoever is logged in should be able to see, without hunting, who they're logged in as and what role they hold — already true of the topbar (avatar + name + role), but this bar should never be hidden or scrollable-away on any authenticated screen.
2. **"How do I get in" has one obvious answer.** One login form, one clear error when it fails ("Wrong username or password" — not a raw server error), and a non-self-service path for forgotten passwords: since staff turnover is high and email isn't assumed reliable (§3.1), password resets are handled by an Administrator in person, not an email link. This should be stated plainly on the login screen, not left for someone to guess.
3. **Permission boundaries are explained, not just enforced.** If a Clinical Staff account can't see Payroll, the UI shouldn't just omit the nav item silently — a new hire wondering "why don't I have that" is a support call waiting to happen. Prefer a visible-but-labeled state ("Payroll — Administrator only") over silent hiding, wherever it doesn't create a security or clutter problem.
4. **Every action gives visible feedback.** Loading spinners, success confirmations, and specific error messages — someone unsure if a click "worked" will click it three more times. This is already the pattern in `Login.js`'s spinner/error handling; every new form should follow it.
5. **Destructive or hard-to-reverse actions require a confirmation step.** Deleting a patient file, marking a payroll run as Paid — a plain-language "Are you sure?" with the consequence spelled out, not a generic browser `confirm()`.
6. **Plain language over jargon or codes.** No raw HTTP status codes, stack traces, or database error strings ever reach the screen. Every error message says what happened and what to do next, in the words a records clerk would use.
7. **Labels over icons.** Icon-only buttons are ambiguous for infrequent users — pair every icon with a text label, as already done throughout (e.g., "Add Patient", not just a `+`).

Any new frontend work — mine or Kiro's — should be checked against this list before being considered done.

## 10. What Happens Next
- The payroll schema/routes (Phase 3 of the backend plan)
- The role-based authorization middleware (Phase 2)
- Any frontend screens we touch next — each screen should map to a flow in §5, and nothing should be built that isn't in §4.