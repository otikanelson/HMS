# Testing Checklist - Tender Care HMS

## Role-Based Access Control Tests

### Test Accounts Required
- **Administrator**: nelson (or create test admin)
- **Records Operator**: (create test account)
- **Clinical Staff**: (create test account linked to staff record)

---

## 1. ADMINISTRATOR ACCESS TESTS

### Dashboard Access ✓
- [ ] Can see full dashboard with stats
- [ ] Can see recent patient files
- [ ] Can see on-duty staff
- [ ] Can see notices board
- [ ] Can post new notices
- [ ] Can delete notices
- [ ] Can see "My Notes" panel
- [ ] Can add/edit/delete personal notes

### Patient Management ✓
- [ ] Can search patients
- [ ] Can view patient files
- [ ] Can add new patients
- [ ] Can update file locations
- [ ] Can see location history
- [ ] [FUTURE] Can mark admitted/discharged
- [ ] [FUTURE] Can archive files
- [ ] [FUTURE] Can permanently delete files

### Staff Management ✓
- [ ] Can view staff directory with full details (including salary/bank)
- [ ] Can search/filter staff
- [ ] Can add new staff members
- [ ] Can see auto-generated login credentials
- [ ] Can edit weekly schedule (all staff)
- [ ] Can deactivate staff (sets off-duty + disables login)

### Payroll ✓
- [ ] [FUTURE] Can access payroll menu
- [ ] [FUTURE] Can create payroll runs
- [ ] [FUTURE] Can adjust entries
- [ ] [FUTURE] Can approve/mark paid

### Activity Log ✓
- [ ] [FUTURE] Can access Reports menu
- [ ] [FUTURE] Can view activity log

### Navigation ✓
- [ ] Dashboard menu visible
- [ ] Patients menu visible
- [ ] Staff menu visible
- [ ] Add Patient button works
- [ ] Add Staff button works
- [ ] [FUTURE] Payroll menu visible
- [ ] [FUTURE] Reports menu visible

---

## 2. RECORDS OPERATOR ACCESS TESTS

### Dashboard Access ✓
- [ ] Can see dashboard with stats only
- [ ] Can see recent patient files
- [ ] Can see on-duty staff
- [ ] Can see notices board
- [ ] CANNOT post notices (button disabled)
- [ ] CANNOT see "My Notes" panel

### Patient Management ✓
- [ ] Can search patients
- [ ] Can view patient files
- [ ] Can add new patients
- [ ] Can update file locations
- [ ] Can see location history
- [ ] [FUTURE] Can mark admitted (once feature exists)
- [ ] [FUTURE] Can mark discharged (once feature exists)
- [ ] CANNOT archive files
- [ ] CANNOT delete files

### Staff Management ✓
- [ ] CANNOT see searchable staff directory on /staff page
- [ ] CAN see weekly schedule (read-only)
- [ ] CANNOT edit schedule
- [ ] CANNOT add staff
- [ ] CANNOT deactivate staff

### Payroll ✓
- [ ] CANNOT access payroll menu (hidden)
- [ ] API call to /api/payroll/* returns 403

### Activity Log ✓
- [ ] CANNOT access Reports menu (hidden)
- [ ] API call to /api/activity-log returns 403

### Navigation ✓
- [ ] Dashboard menu visible
- [ ] Patients menu visible
- [ ] Staff menu visible
- [ ] Add Patient button works
- [ ] Add Staff button disabled/hidden
- [ ] Payroll menu hidden
- [ ] Reports menu hidden

---

## 3. CLINICAL STAFF ACCESS TESTS

### Dashboard Access ✓
- [ ] Can see minimal dashboard
- [ ] Can see own weekly schedule (7-day grid with today highlighted)
- [ ] Can see notices board
- [ ] CANNOT post notices
- [ ] CANNOT see stats/recent files/on-duty staff
- [ ] CANNOT see "My Notes" panel

### Patient Management ✓
- [ ] Can search patients
- [ ] Can view patient files
- [ ] CANNOT add new patients
- [ ] CANNOT update file locations
- [ ] [FUTURE] Can mark admitted
- [ ] [FUTURE] Can mark discharged
- [ ] CANNOT archive files
- [ ] CANNOT delete files

### Staff Management ✓
- [ ] CANNOT see searchable staff directory on /staff page
- [ ] CAN see weekly schedule (read-only, all staff)
- [ ] CANNOT edit schedule
- [ ] CANNOT add staff
- [ ] CANNOT deactivate staff
- [ ] Can see own salary/bank details when viewing own record

### Payroll ✓
- [ ] CANNOT access payroll menu (hidden)
- [ ] API call to /api/payroll/* returns 403

### Activity Log ✓
- [ ] CANNOT access Reports menu (hidden)
- [ ] API call to /api/activity-log returns 403

### Navigation ✓
- [ ] Dashboard menu visible (shows "Find Patient" button only)
- [ ] Patients menu visible
- [ ] Staff menu visible
- [ ] Add Patient button hidden/disabled
- [ ] Add Staff button hidden
- [ ] Payroll menu hidden
- [ ] Reports menu hidden

---

## 4. SERVER-SIDE AUTHORIZATION TESTS

### Direct API Tests (using curl/Postman)
Test each role attempting unauthorized actions:

#### Administrator Routes (should reject non-admin):
```bash
# Records Operator tries to create payroll run
curl -H "Authorization: Bearer <RECORDS_OPERATOR_TOKEN>" \
  -X POST http://localhost:3002/api/payroll/runs
# Expected: 403 Forbidden

# Clinical Staff tries to add staff
curl -H "Authorization: Bearer <CLINICAL_STAFF_TOKEN>" \
  -X POST http://localhost:3002/api/staff \
  -d '{"firstName":"Test","lastName":"Staff","role":"NURSE"}'
# Expected: 403 Forbidden

# Clinical Staff tries to view activity log
curl -H "Authorization: Bearer <CLINICAL_STAFF_TOKEN>" \
  http://localhost:3002/api/activity-log
# Expected: 403 Forbidden
```

#### Records Operator Routes (should reject Clinical Staff):
```bash
# Clinical Staff tries to add patient
curl -H "Authorization: Bearer <CLINICAL_STAFF_TOKEN>" \
  -X POST http://localhost:3002/api/patients \
  -d '{"patientId":"12345","fullName":"Test Patient",...}'
# Expected: 403 Forbidden (once FR-1.5 is implemented, admission is Clinical Staff+)
```

---

## 5. DATA SERIALIZATION TESTS

### Staff Data Access
- [ ] **Administrator viewing any staff**: Sees all fields (salary, bank, contact)
- [ ] **Records Operator viewing any staff**: Sees directory + operational (contact, schedule), NO salary/bank
- [ ] **Clinical Staff viewing other staff**: Sees directory + schedule only, NO contact, NO salary/bank
- [ ] **Clinical Staff viewing own record**: Sees everything including salary/bank

Test by hitting `/api/staff/:id` with different logged-in users.

---

## 6. AUTHENTICATION & SESSION TESTS

### Password Change ✓
- [ ] New staff forced to change password on first login
- [ ] Cannot access any page except /change-password until password changed
- [ ] After change, redirected to dashboard

### Session Management ✓
- [ ] Token expires after configured time
- [ ] Refresh token works
- [ ] Logout clears tokens
- [ ] Deactivated staff cannot log in

### Rate Limiting ✓
- [ ] Failed login attempts are rate-limited
- [ ] Lockout message is clear

---

## 7. UX COMPLIANCE TESTS

### Identity Visibility ✓
- [ ] Topbar always shows: name, role, avatar
- [ ] Never scrolls out of view

### Permission Boundaries ✓
- [ ] Disabled buttons show "Administrator only" tooltip
- [ ] Hidden features don't leave UI gaps/confusion

### Feedback ✓
- [ ] Every form submission shows loading spinner
- [ ] Success confirmations appear
- [ ] Error messages are specific and actionable

### Destructive Actions ✓
- [ ] Confirmation modals appear for:
  - [ ] Delete notice
  - [ ] Delete admin note
  - [ ] [FUTURE] Delete patient file
  - [ ] [FUTURE] Deactivate staff
  - [ ] [FUTURE] Mark payroll as paid

### Plain Language ✓
- [ ] No technical error messages reach users
- [ ] No HTTP status codes visible
- [ ] No stack traces visible

### Labels Over Icons ✓
- [ ] All buttons have text labels, not just icons

---

## 8. CLEANUP VERIFICATION

### File Naming ✓
- [x] WeeklySchedule.js (PascalCase)
- [x] WeeklySchedule.css (PascalCase)
- [x] All imports updated

### Old Field References ✓
- [x] No `staff.shift` references (old enum)
- [x] No `staff.schedule` references (old array)
- [x] All use `weeklySchedule` or `shiftDisplay` virtual

### Code Quality ✓
- [x] No console.log in production code (except backend debugging)
- [x] No commented-out code blocks
- [x] Consistent naming conventions

---

## Test Execution Log

| Test Category | Admin | Records Op | Clinical | Notes |
|--------------|-------|------------|----------|-------|
| Dashboard    | ⏳    | ⏳         | ⏳       |       |
| Patients     | ⏳    | ⏳         | ⏳       |       |
| Staff        | ⏳    | ⏳         | ⏳       |       |
| Payroll      | ⏳    | ⏳         | ⏳       | Future|
| Activity Log | ⏳    | ⏳         | ⏳       | Future|
| API Auth     | ⏳    | ⏳         | ⏳       |       |
| Serialization| ⏳    | ⏳         | ⏳       |       |

Legend: ⏳ Pending | ✅ Pass | ❌ Fail

---

## Known Issues / Tech Debt
- [ ] None currently (cleanup phase complete)

---

## Pre-Deployment Checklist
- [ ] All role-based tests pass
- [ ] All server-side authorization tests pass
- [ ] All data serialization tests pass
- [ ] All UX compliance checks pass
- [ ] Environment variables configured for production
- [ ] Database connection string uses production DB
- [ ] JWT secrets are production-grade (not default)
- [ ] CORS configured for production domain
- [ ] Rate limiting configured appropriately
