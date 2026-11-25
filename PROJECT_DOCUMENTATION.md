# Student Attendance System - Project Documentation

## 1. Purpose of this document

This file is the main technical guide for the whole repository.

It is written so that:

- a new developer can open the project on another device and understand it quickly
- another Codex session can understand the structure, flows, and ownership boundaries
- deployment or maintenance work can be done without rediscovering the system each time

This document covers:

- repository structure
- frontend and backend architecture
- major features and user roles
- code flow for important actions
- database schema overview
- Docker and local runtime notes
- where to edit code for common changes

## 2. Repository overview

Root folder:

`student-attend-frontend/`

Main contents:

- `BackEndProject/` - Laravel backend API
- `FrontEndProject/` - React frontend
- `docker-compose.yml` - full Docker stack
- `university_attendance.sql` - database dump / bootstrap source for MySQL container
- `local_university_attendance_backup_20260603_112122.sql` - local backup snapshot
- `student-attend-frontend.sln` - solution file kept in the repo root

## 3. High-level system summary

This project is a university attendance system with three main roles:

- `admin`
- `staff` (faculty member / doctor role in the UI)
- `student`

The system supports:

- authentication by role
- student account and staff account management
- subject/course assignment
- student sheet import by faculty
- subject extraction from uploaded student sheets
- QR-based attendance sessions
- flexible attendance sessions
- attendance history
- reporting
- student device binding / controlled activation

## 4. Tech stack

### Backend

- Laravel
- token-based API authentication
- MySQL

### Frontend

- React
- React Router
- Redux
- custom hooks and provider-based app state

### Infrastructure

- Docker Compose
- MySQL container
- phpMyAdmin container
- separate socket service container

## 5. Folder map

### Backend folder

`BackEndProject/`

Important subfolders:

- `app/Http/Controllers/Api/` - API endpoints and business flow entry points
- `app/Models/` - Eloquent models and relationships
- `app/Http/Resources/` - API response shaping
- `routes/api.php` - all API routes
- `database/migrations/` - schema evolution
- `README.md` - backend setup and environment notes
- `BackendSchema.md` - deeper schema notes already present in the repo

### Frontend folder

`FrontEndProject/`

Important subfolders:

- `src/routes/` - route trees per role
- `src/Dashboard/` - admin/staff dashboard pages
- `src/StudentApp/` - student application screens
- `src/hooks/` - auth/dashboard/socket logic
- `src/redux/` - state slices and async flows
- `src/context/` - providers
- `src/utils/` - constants, helpers, permissions

## 6. Runtime modes

The project can be run in two main ways:

### 6.1 Local split mode

Run backend and frontend separately on localhost.

Typical usage:

- backend API on `http://localhost:8000`
- frontend on `http://localhost:3000`
- socket server on `http://localhost:3001`

This is usually the easiest mode for day-to-day development when editing code directly.

### 6.2 Docker mode

Defined in [`docker-compose.yml`](./docker-compose.yml).

Services:

- `backend`
- `frontend`
- `socket`
- `mysql`
- `phpmyadmin`

Important ports:

- frontend: `3000`
- frontend https: `3443`
- backend: `8000`
- socket: `3001`
- mysql host port: `3307`
- phpMyAdmin: `8090`

phpMyAdmin is included so database contents can be inspected visually like a local admin panel.

## 7. User roles and access model

### Admin

Admin can:

- manage users
- assign staff to subjects
- manage students
- access attendance pages
- access reports
- access flexible attendance pages

### Staff

Staff can:

- sign in to dashboard
- start lecture attendance sessions
- start flexible attendance sessions
- record students into attendance
- see reports for assigned subjects only

Important rule:

Staff reports should be limited to subjects assigned to the logged-in staff member.

### Student

Student can:

- sign in with email, student ID, university ID, or national ID depending on current login handling
- scan attendance QR
- see registered subjects
- see attendance history
- manage profile and device-related behavior

## 8. Backend architecture

### 8.1 API route entry

Main route file:

[`BackEndProject/routes/api.php`](./BackEndProject/routes/api.php)

This file is the API map for:

- auth
- catalog
- user management
- student management
- lecture sessions
- attendance
- flexible attendance

### 8.2 Important controllers

#### Auth

[`BackEndProject/app/Http/Controllers/Api/AuthController.php`](./BackEndProject/app/Http/Controllers/Api/AuthController.php)

Responsible for:

- login
- token creation
- current user payload
- student device validation during login

#### Students

[`BackEndProject/app/Http/Controllers/Api/StudentController.php`](./BackEndProject/app/Http/Controllers/Api/StudentController.php)

Responsible for:

- student CRUD
- student scoping by allowed colleges
- student payload normalization
- device binding activation flows

#### Attendance

[`BackEndProject/app/Http/Controllers/Api/AttendanceController.php`](./BackEndProject/app/Http/Controllers/Api/AttendanceController.php)

Responsible for:

- QR scan processing
- manual attendance
- attendance listing
- duplicate protection
- attendance history for students
- synchronization of flexible attendance into official attendance surfaces

#### Flexible attendance

[`BackEndProject/app/Http/Controllers/Api/AdHocAttendanceController.php`](./BackEndProject/app/Http/Controllers/Api/AdHocAttendanceController.php)

Responsible for:

- create flexible sessions
- reopen or close flexible sessions
- add/remove students inside flexible sessions
- export and manage flexible session records
- migrate or sync flexible attendance into normal lecture attendance flow

### 8.3 Important models

#### User

[`BackEndProject/app/Models/User.php`](./BackEndProject/app/Models/User.php)

This is the central identity model for all roles.

Important fields used by the system:

- `id`
- `name`
- `full_name`
- `email`
- `password`
- `role`
- `permissions`
- `allowed_colleges`
- `student_id`
- `university_id`
- `national_id`
- `college`

Important relationships:

- assigned courses
- student registrations
- lecture sessions
- attendance records
- API tokens
- student device binding

#### User API shape

Returned through:

[`BackEndProject/app/Http/Resources/UserResource.php`](./BackEndProject/app/Http/Resources/UserResource.php)

The frontend expects:

- basic identity
- role
- permissions
- allowed colleges
- courses
- student identifiers
- student registrations

## 9. Frontend architecture

### 9.1 Application shell

Entry:

[`FrontEndProject/src/App.js`](./FrontEndProject/src/App.js)

Main providers used there:

- Redux provider
- language provider
- app-level providers
- route tree

### 9.2 Route organization

Main route file:

[`FrontEndProject/src/routes/AppRoutes.js`](./FrontEndProject/src/routes/AppRoutes.js)

Sub-routes:

- [`src/routes/AdminRoutes.js`](./FrontEndProject/src/routes/AdminRoutes.js)
- [`src/routes/DoctorRoutes.js`](./FrontEndProject/src/routes/DoctorRoutes.js)
- [`src/routes/StudentRoutes.js`](./FrontEndProject/src/routes/StudentRoutes.js)

Behavior:

- dashboard routes are used for admin/staff
- student routes are split between desktop and mobile student layouts
- route access depends on role and dashboard permissions

### 9.3 Auth state and user flow

Main auth hook/controller:

- [`FrontEndProject/src/hooks/useAuth.js`](./FrontEndProject/src/hooks/useAuth.js)
- [`FrontEndProject/src/hooks/useAuthController.js`](./FrontEndProject/src/hooks/useAuthController.js)

Important frontend auth behavior:

- login dispatch stores user and token
- non-student roles load managed users after login
- sign out clears auth and users state
- doctor/staff report data depends on assigned courses

### 9.4 Frontend feature areas

#### Dashboard pages

Located under:

`FrontEndProject/src/Dashboard/pages/`

Important pages include:

- attendance page
- flexible attendance page
- reports page
- students page
- courses page
- settings page

#### Student app

Located under:

`FrontEndProject/src/StudentApp/`

Main student surfaces:

- QR scan
- history
- profile

## 10. Core feature flows

### 10.1 Login flow

1. User selects role.
2. Frontend sends credentials to backend login endpoint.
3. Backend finds the user by role-aware lookup.
4. Password is verified.
5. For students, device binding rules may be checked.
6. Token is created.
7. Frontend stores user payload and routes user to role-specific home.

Important note:

Frontend and backend both rely on normalized role values. The backend mainly uses `staff` for faculty members, even if some UI wording still says doctor.

### 10.2 Student import flow

The system has evolved so that student sheet import is a core source of truth for:

- student records
- subject extraction per faculty
- subject/faculty linkage

Expected behavior of the import process:

- uploaded sheet belongs to one selected faculty
- all student data for that faculty is refreshed from the sheet
- subjects are extracted from student registrations in that sheet
- old subjects not present in the current faculty import should not remain as stale options for that faculty
- duplicate subjects should not be created

This behavior matters especially for:

- flexible attendance subject dropdowns
- student registration data
- reports and attendance visibility

### 10.3 Official lecture attendance flow

1. Staff starts a lecture session.
2. Backend creates a `lecture_sessions` record.
3. QR payload is generated and refreshed by time window.
4. Student scans QR.
5. Backend validates:
   - session is active
   - QR is fresh
   - student is registered to the subject/type/group
   - student has not already attended that week for the same course context
6. Backend writes to `attendance_records`.
7. Attendance appears in staff/admin attendance and reporting pages.

### 10.4 Flexible attendance flow

Flexible attendance exists for cases where the staff member needs to take attendance without relying only on fixed assigned subjects inside the normal dashboard flow.

Current intended flow:

1. Staff chooses in order:
   - faculty
   - subject
   - subject type
   - group
   - week
2. Staff sets QR refresh time window.
3. Staff creates or reopens a flexible session.
4. Students are added by QR scan or manual recording.
5. Flexible records are synchronized into official attendance behavior so they can appear in:
   - attendance page
   - reports page
   - student history

Important implementation rule:

Flexible attendance is not meant to live as a disconnected side channel. It should map back to real subject attendance semantics.

### 10.5 Student history flow

Student history combines two explicit attendance outcomes for the selected academic term:

- presence from `attendance_records`
- absence from `administrative_subject_absences`

`student_registrations` supplies the student's enrolled subjects and validates subject/type/group eligibility. A registration by itself is not an absence and must never create an absent history row.

The desired final behavior is:

- no duplicate attendance rows just because a student scanned multiple times for the same course/week context
- student history reflects real attendance events that were accepted by the system
- an explicit absence entered by an administrator appears in student history and profile statistics
- presence wins if the same student/session is ever recorded in both outcome paths
- flexible attendance should also become visible when it has been synchronized into official attendance records

## 11. Flexible attendance implementation notes

Main frontend file:

[`FrontEndProject/src/Dashboard/pages/FlexibleAttendancePage/index.js`](./FrontEndProject/src/Dashboard/pages/FlexibleAttendancePage/index.js)

Important UI state currently includes:

- selected faculty
- selected subject
- subject type
- group
- week
- QR refresh seconds

Supported QR windows:

- 5 seconds
- 10 seconds
- 15 seconds

Important recent design direction already reflected in the codebase:

- create button and reopen button are context-sensitive
- duplicate session creation should be prevented
- session state should be closed when leaving the page or refreshing
- QR timing should honor the selected refresh value instead of always falling back to 5

## 12. API surface summary

Main groups from `routes/api.php`:

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### Catalog

- `GET /api/catalog/faculties`

### Admin-managed users

- list/create/update/delete users
- assign and remove courses for staff

### Students

- list/create/update/delete students
- locked student activation endpoints

### Lecture sessions

- create/list/update/delete lecture sessions

### Attendance

- QR scan
- manual attendance
- list attendance
- delete attendance rows
- student attendance history

### Flexible attendance

- create/list flexible sessions
- add student
- delete session
- remove session record
- close session
- reopen session
- migrate/sync flexible attendance

## 13. Database schema overview

This section is a working summary. For a deeper schema description, also read:

[`BackEndProject/BackendSchema.md`](./BackEndProject/BackendSchema.md)

### 13.1 Core tables

#### `users`

Stores all identities:

- admins
- staff
- students

Important columns:

- `id` string primary key
- `name`
- `full_name`
- `email`
- `password`
- `role`
- `permissions`
- `allowed_colleges`
- `student_id`
- `university_id`
- `national_id`
- `college`

#### `course_assignments`

Links staff to assigned courses/subjects.

Used for:

- dashboard course visibility
- staff reports
- assigned subject attendance flow

#### `student_registrations`

Stores student-to-subject registrations.

Important because it drives:

- whether a student is allowed to attend a subject
- subject extraction from uploaded student sheets
- student-facing subject visibility

Recent schema direction includes storing `subject_name` in addition to code and other registration context.

#### `api_tokens`

Stores issued login tokens for the frontend.

#### `student_device_bindings`

Stores device lock/activation behavior for student accounts.

### 13.2 Official attendance tables

#### `lecture_sessions`

Represents normal attendance sessions started by staff.

Used for:

- QR generation
- subject/type/group/week scoped sessions

#### `attendance_records`

Defined in:

[`BackEndProject/database/migrations/2026_05_09_000002_create_attendance_records_table.php`](./BackEndProject/database/migrations/2026_05_09_000002_create_attendance_records_table.php)

Key columns:

- `lecture_session_id`
- `student_id`
- `course_code`
- `lecture_type`
- `group`
- `week`
- `scanned_at`

Important uniqueness:

- unique per `lecture_session_id + student_id`

### 13.3 Flexible attendance tables

Defined initially in:

[`BackEndProject/database/migrations/2026_06_03_000001_create_ad_hoc_attendance_tables.php`](./BackEndProject/database/migrations/2026_06_03_000001_create_ad_hoc_attendance_tables.php)

#### `ad_hoc_attendance_sessions`

Key columns:

- `id`
- `user_id`
- `subject_name`
- `subject_code`
- `faculty`
- `group`
- `status`
- `started_at`
- `ended_at`
- `migrated_at`
- migration target fields

Later migrations also add session fields like:

- lecture type
- week
- QR window seconds
- linked lecture session ID

#### `ad_hoc_attendance_records`

Key columns:

- `ad_hoc_attendance_session_id`
- `student_id`
- `scanned_at`

Important uniqueness:

- unique per flexible session and student

### 13.4 Schema relationship summary

- one staff user can have many assigned courses
- one student can have many registrations
- one staff user can start many lecture sessions
- one lecture session can have many attendance records
- one flexible session can have many flexible attendance records
- flexible sessions can be linked or migrated into official lecture attendance context

## 14. Code flow by ownership

### If you need to change login behavior

Check:

- [`BackEndProject/app/Http/Controllers/Api/AuthController.php`](./BackEndProject/app/Http/Controllers/Api/AuthController.php)
- [`BackEndProject/app/Http/Resources/UserResource.php`](./BackEndProject/app/Http/Resources/UserResource.php)
- frontend auth slice and auth controller

### If you need to change student import behavior

Check:

- student import UI in dashboard pages
- backend student management/import controller logic
- subject extraction logic tied to student registrations

Also verify the result in:

- `student_registrations`
- faculty subject dropdowns
- reports visibility

### If you need to change attendance validation

Check:

- [`BackEndProject/app/Http/Controllers/Api/AttendanceController.php`](./BackEndProject/app/Http/Controllers/Api/AttendanceController.php)

This is where scan acceptance, duplicate rules, and subject registration validation live.

### If you need to change flexible attendance behavior

Check both:

- [`BackEndProject/app/Http/Controllers/Api/AdHocAttendanceController.php`](./BackEndProject/app/Http/Controllers/Api/AdHocAttendanceController.php)
- [`FrontEndProject/src/Dashboard/pages/FlexibleAttendancePage/index.js`](./FrontEndProject/src/Dashboard/pages/FlexibleAttendancePage/index.js)

### If you need to change student mobile experience

Check:

- `FrontEndProject/src/StudentApp/`
- especially `ScanTab.tsx` and student app entry components

## 15. Current business rules to preserve

These rules are important to keep stable when editing the project:

1. Student sheet import is authoritative for faculty student registrations.
2. Subjects should be extracted from uploaded student sheets without duplicates.
3. Faculty subject visibility should reflect uploaded data, not stale static leftovers.
4. Staff report visibility should be limited to subjects assigned to the logged-in staff user.
5. Student attendance history should reflect accepted attendance, not inflated duplicates.
6. Flexible attendance should flow into real attendance/reporting behavior.
7. QR refresh timing should honor the selected timing value.
8. Leaving the flexible attendance page should not leave the session visually or functionally open by mistake.

## 16. Known architectural tension

There are two subject sources in the system history:

- static catalog/config-driven subject data in frontend constants
- dynamic subject data derived from uploaded student sheets and registrations

The more correct operational source is the dynamic registration-driven data.

When debugging subject dropdown issues, always check whether the UI is accidentally reading old static catalog data instead of registration-derived or backend-provided subject data.

## 17. Deployment and maintenance notes

### Frontend-only replacement on server

If the server already runs the backend separately and only frontend changes are needed, the safest long-term deployment approach is usually:

- build frontend artifacts
- replace only the built frontend output on the server

This avoids replacing backend files one by one when the backend did not change.

### Docker note

Docker is useful for consistent local setup, but if deployment is file-based on a real server, document clearly whether production uses:

- Docker
- local PHP + local Node build
- static frontend build served by web server

Do not assume production deployment matches local Docker layout.

## 18. Existing docs in the repo

Useful supporting files:

- [`BackEndProject/README.md`](./BackEndProject/README.md)
- [`BackEndProject/BackendSchema.md`](./BackEndProject/BackendSchema.md)
- `BackEndProject/Documentation.txt`
- [`FrontEndProject/README.md`](./FrontEndProject/README.md)
- `FrontEndProject/Documentation.txt`

This file is intended to be the top-level guide that points to those deeper docs when needed.

## 19. Quick start for a new Codex session

If a new Codex opens this repository, the fastest orientation order is:

1. Read this file.
2. Read [`BackEndProject/routes/api.php`](./BackEndProject/routes/api.php).
3. Read [`BackEndProject/BackendSchema.md`](./BackEndProject/BackendSchema.md).
4. Read:
   - [`BackEndProject/app/Http/Controllers/Api/AttendanceController.php`](./BackEndProject/app/Http/Controllers/Api/AttendanceController.php)
   - [`BackEndProject/app/Http/Controllers/Api/AdHocAttendanceController.php`](./BackEndProject/app/Http/Controllers/Api/AdHocAttendanceController.php)
   - [`BackEndProject/app/Http/Controllers/Api/StudentController.php`](./BackEndProject/app/Http/Controllers/Api/StudentController.php)
5. Read frontend routes in `FrontEndProject/src/routes/`.
6. Read [`FrontEndProject/src/Dashboard/pages/FlexibleAttendancePage/index.js`](./FrontEndProject/src/Dashboard/pages/FlexibleAttendancePage/index.js).
7. Read the student app files in `FrontEndProject/src/StudentApp/`.

## 20. Suggested future documentation improvements

If this project keeps growing, the next best docs to add are:

- dedicated API reference with request/response examples
- dedicated student import sheet format documentation
- dedicated production deployment guide
- dedicated troubleshooting guide for camera permissions and mobile browser behavior
- ERD image for the database

## 21. Final summary

This repository is a full attendance platform with:

- Laravel backend API
- React frontend
- role-based dashboards
- student QR attendance
- flexible attendance
- report generation
- student registration-driven subject data

The most important idea to keep in mind while editing the project is this:

attendance, subject visibility, and reporting should all stay aligned around the real registration data and the official attendance records, even when the entry point is a flexible session.
