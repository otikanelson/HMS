# Project Reorganization Summary

**Date:** 2026-09-19  
**Commit:** Refactor project structure and clean up debug scripts

## What Changed

### 1. Frontend Restructure
Moved files to better organize React application:
- `contexts/AuthContext.js` → `context/AuthContext.js`
- `components/ProtectedRoute.js` → `routes/ProtectedRoute.js`
- `config/axios.js` → `lib/axios.js`

Updated 13 import statements across the frontend to match new paths.

### 2. Backend Cleanup
- ✅ Deleted stale `dist/` directory (rebuilt fresh)
- ✅ Removed 7 one-off debug scripts:
  - `backfill-patient-status.js`
  - `check-both-databases.js`
  - `check-user.js`
  - `create-user-for-staff.js`
  - `fix-nelson-access-level.js`
  - `reset-users.js`
  - `verify-seed-data.js`

### 3. Security Improvements
- Updated `create-admin.js` to require password via environment variable
- No more hardcoded passwords in scripts

## Files With Direct MongoDB Access

For future SQLite migration, these 15 files interact directly with the database:

**Routes (9 files):**
1. `backend/src/routes/auth.js` - User & Session
2. `backend/src/routes/patients.js` - PatientFile
3. `backend/src/routes/staff.js` - Staff, User, Session
4. `backend/src/routes/dashboard.js` - PatientFile, Staff
5. `backend/src/routes/profile.js` - User, Session
6. `backend/src/routes/notices.js` - Notice
7. `backend/src/routes/activityLog.js` - ActivityLog
8. `backend/src/routes/adminNotes.js` - AdminNote
9. `backend/src/routes/payroll.js` - PayrollRun, PayrollEntry, Staff

**Other (2 files):**
- `backend/src/middleware/auth.js` - User, Session
- `backend/src/utils/activityLogger.js` - ActivityLog

**Scripts (4 files):**
- Seed scripts: `seed-patients.js`, `seed-staff.js`, `seed-notices.js`, `create-admin.js`

## Migration Strategy (Future)

When migrating to SQLite:
1. Create repository/data access layer (DAL) in `backend/src/repositories/`
2. Implement both MongoDB and SQLite versions
3. Refactor the 15 files above to use repositories instead of direct model calls
4. Use environment variable to switch implementations

## Build Verification

✅ Backend: Compiled successfully with `npm run build`  
⏳ Frontend: Imports verified, ready for testing

## No Breaking Changes

- All API routes unchanged
- All business logic intact
- All function/variable names preserved
- Only structural reorganization

## Next Steps

1. Test frontend build: `cd frontend && npm run build`
2. Test locally before deployment
3. Deploy to Vercel
4. Consider credential rotation (if credentials were shared)
