# System Architecture
## PSAU Academic Management System v2.1

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                        │
│                                                                               │
│   Staff Browser              Student Browser           Mobile (PWA)          │
│   /dashboard                 /portal/dashboard         Same React app        │
│   /students                  /portal/grades            Responsive            │
│   /grades/approvals          /portal/transcript        Offline page          │
└─────────────┬────────────────────────┬────────────────────────┬──────────────┘
              │ HTTPS                  │ HTTPS                  │ HTTPS
              ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CDN / EDGE LAYER                                      │
│                                                                               │
│   CloudFront (prod) / Nginx (local)                                          │
│   - Serves static React SPA from S3                                          │
│   - Routes /api/* → Application Load Balancer                                │
│   - TLS termination                                                           │
│   - Static asset caching (1y for hashed assets, no-cache for index.html)    │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │ HTTP (internal)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION LAYER                                       │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Express.js API (Node.js 20)                       │   │
│   │                                                                       │   │
│   │  Middleware Chain (every request):                                    │   │
│   │  requestId → helmet → cors → morgan → rateLimit → auth → rbac →     │   │
│   │  validate → controller → service → repository → response             │   │
│   │                                                                       │   │
│   │  Route Groups:                                                        │   │
│   │  /api/v1/auth          /api/v1/students      /api/v1/grades          │   │
│   │  /api/v1/curriculum    /api/v1/enrollment    /api/v1/reports         │   │
│   │  /api/v1/backup        /api/v1/migration     /api/v1/profile         │   │
│   │  /api/v1/student/*     (student portal — role S only)                │   │
│   │                                                                       │   │
│   │  Background Jobs (node-cron):                                         │   │
│   │  03:00 UTC → auto-backup    03:05 UTC → backup retention cleanup     │   │
│   │  */5 min  → GPA recompute queue    00:00 UTC → lock old grades        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
              │                          │                    │
              │ pg                       │ ioredis            │ (future SES)
              ▼                          ▼                    ▼
┌─────────────────────┐   ┌─────────────────────┐  ┌────────────────────────┐
│   DATA LAYER         │   │   CACHE LAYER        │  │   OBJECT STORAGE       │
│                       │   │                       │  │                        │
│  PostgreSQL 15        │   │  Redis 7              │  │  S3                    │
│  (RDS Multi-AZ prod) │   │  (ElastiCache prod)   │  │  - Backups             │
│                       │   │                       │  │  - Migration CSVs      │
│  Primary tables:      │   │  Cached:              │  │  - Transcript PDFs     │
│  - faculties          │   │  - currentSemester    │  │                        │
│  - departments        │   │  - facultyList        │  │                        │
│  - students           │   │  - courseList         │  │                        │
│  - users              │   │  - dashboardStats     │  │                        │
│  - enrollments        │   │  - transcriptPDF      │  │                        │
│  - grades             │   │    (1hr TTL)          │  │                        │
│  - grade_audit_log    │   │                       │  │                        │
│  - student_semester   │   │  Queues:              │  │                        │
│    _records (GPA)     │   │  - gpa_recompute      │  │                        │
│  - backup_logs        │   │                       │  │                        │
│  - user_activity_log  │   │                       │  │                        │
└─────────────────────┘   └─────────────────────┘  └────────────────────────┘
```

---

## 2. Monorepo Package Architecture

```
psau/ (pnpm workspace root)
│
├── packages/shared/         @psau/shared
│   ├── src/
│   │   ├── lib/
│   │   │   ├── gpa.ts           ← CANONICAL GPA FORMULAS
│   │   │   │   calculateGradePoint(score, enrollmentType) → number
│   │   │   │   calculateSGPA(courses) → number
│   │   │   │   calculateCGPA(semesters) → number
│   │   │   │   getLetterGrade(sgp) → string
│   │   │   │   getAcademicStatus(params) → AcademicStatus
│   │   │   │   getDegreeClassification(cgpa) → DegreeClassification
│   │   │   │   calculateSubstitutionCGPA(params) → number
│   │   │   │
│   │   │   └── studentId.ts     ← ID FORMAT VALIDATION
│   │   │       isValidStudentId(id) → boolean
│   │   │       parseStudentId(id) → { year, faculty, dept, seq }
│   │   │
│   │   ├── types/
│   │   │   ├── academic.ts      ← Grade, Enrollment, Course, Curriculum
│   │   │   ├── user.ts          ← User, Role, AuthPayload
│   │   │   ├── student.ts       ← Student, StudentId
│   │   │   └── api.ts           ← ApiResponse<T>, PaginationMeta, ApiError
│   │   │
│   │   ├── constants/
│   │   │   ├── grades.ts        ← GRADE_SCALE, ENROLLMENT_TYPE, PASS_MARK=50
│   │   │   └── roles.ts         ← ROLE constants and display names
│   │   │
│   │   └── validators/
│   │       ├── grade.ts         ← Zod schemas for grade input
│   │       └── student.ts       ← Zod schemas for student registration
│   │
│   └── dist/                   (built output — gitignored)
│
├── packages/api/                @psau/api
│   ├── src/
│   │   ├── server.ts            ← Entry point. Starts Express, cron jobs
│   │   ├── app.ts               ← Express app factory (for testing)
│   │   ├── config/
│   │   │   ├── env.ts           ← Zod env validation (FAILS if vars missing)
│   │   │   ├── database.ts      ← pg Pool (PostgreSQL) or better-sqlite3 (dev)
│   │   │   └── redis.ts         ← ioredis client or InMemoryMock
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts          ← JWT verify → req.user
│   │   │   ├── rbac.ts          ← requireRole(['A','C']) → 403 if not matched
│   │   │   ├── validate.ts      ← Zod validate → 422 if invalid
│   │   │   ├── requestId.ts     ← X-Request-ID header
│   │   │   ├── audit.ts         ← Auto-log to user_activity_log
│   │   │   └── asyncHandler.ts  ← try/catch wrapper for async route handlers
│   │   │
│   │   ├── routes/v1/
│   │   │   ├── index.ts         ← Mounts all route groups
│   │   │   ├── auth.routes.ts
│   │   │   ├── students.routes.ts
│   │   │   ├── grades.routes.ts
│   │   │   ├── enrollments.routes.ts
│   │   │   ├── curriculum.routes.ts
│   │   │   ├── offerings.routes.ts
│   │   │   ├── academic-years.routes.ts
│   │   │   ├── reports.routes.ts
│   │   │   ├── backup.routes.ts
│   │   │   ├── migration.routes.ts
│   │   │   ├── profile.routes.ts
│   │   │   └── student-portal.routes.ts  ← /student/* role=S only
│   │   │
│   │   ├── controllers/
│   │   │   └── [*.controller.ts]         ← Thin: extract → service → respond
│   │   │
│   │   ├── services/
│   │   │   ├── gpa.service.ts            ← Uses @psau/shared formulas
│   │   │   ├── grade.service.ts          ← Workflow: draft→submit→approve
│   │   │   ├── student.service.ts        ← ID generation, portal data
│   │   │   ├── enrollment.service.ts     ← Prereqs, hour limits
│   │   │   ├── curriculum.service.ts
│   │   │   ├── backup.service.ts         ← Local + Google Drive + S3
│   │   │   ├── migration.service.ts      ← CSV validation + import
│   │   │   ├── report.service.ts         ← Aggregation queries
│   │   │   ├── transcript.service.ts     ← PDF generation (Puppeteer)
│   │   │   └── auth.service.ts           ← Login, token management
│   │   │
│   │   ├── repositories/
│   │   │   └── [*.repository.ts]         ← All SQL lives here
│   │   │
│   │   ├── jobs/
│   │   │   ├── backup.job.ts
│   │   │   ├── gpa-recompute.job.ts
│   │   │   └── grade-lock.job.ts
│   │   │
│   │   └── lib/
│   │       ├── errors.ts                 ← AppError hierarchy
│   │       ├── logger.ts                 ← Winston singleton
│   │       ├── response.ts               ← ok(), created(), paginated()
│   │       └── cache.ts                  ← withCache() helper
│   │
│   └── db/
│       ├── migrations/                   ← Sequential SQL migrations
│       └── seeds/                        ← Test and production seed data
│
└── packages/web/                @psau/web
    ├── src/
    │   ├── app/
    │   │   ├── App.tsx
    │   │   ├── router.tsx           ← All routes defined here
    │   │   └── providers.tsx        ← QueryClient, i18n, theme
    │   │
    │   ├── features/                ← Feature-first folder structure
    │   │   ├── auth/
    │   │   │   ├── LoginPage.tsx
    │   │   │   ├── hooks/useAuth.ts
    │   │   │   └── store/authStore.ts   ← Zustand auth state
    │   │   │
    │   │   ├── students/
    │   │   │   ├── StudentListPage.tsx
    │   │   │   ├── StudentDetailPage.tsx
    │   │   │   ├── StudentCreatePage.tsx
    │   │   │   ├── components/
    │   │   │   │   ├── StudentCard.tsx
    │   │   │   │   └── StudentIdBadge.tsx
    │   │   │   ├── hooks/
    │   │   │   │   ├── useStudents.ts    ← TanStack Query hooks
    │   │   │   │   └── useCreateStudent.ts
    │   │   │   └── api/students.api.ts
    │   │   │
    │   │   ├── grades/
    │   │   │   ├── GradeEntryPage.tsx
    │   │   │   ├── ApprovalQueuePage.tsx
    │   │   │   ├── components/
    │   │   │   │   ├── GradeEntrySheet.tsx   ← Spreadsheet-like input
    │   │   │   │   ├── GradePreview.tsx      ← Live calculation display
    │   │   │   │   └── ApprovalCard.tsx
    │   │   │   └── hooks/
    │   │   │       └── useGradeCalculation.ts  ← Client-side formula preview
    │   │   │
    │   │   ├── curriculum/
    │   │   ├── enrollment/
    │   │   ├── academic-calendar/
    │   │   ├── reports/
    │   │   ├── backup/
    │   │   ├── migration/
    │   │   ├── profile/
    │   │   ├── dashboard/
    │   │   │   ├── AdminDashboard.tsx
    │   │   │   ├── RegistrarDashboard.tsx
    │   │   │   ├── CoordinatorDashboard.tsx
    │   │   │   ├── InstructorDashboard.tsx
    │   │   │   └── UserDashboard.tsx
    │   │   │
    │   │   └── student-portal/       ← Role S only
    │   │       ├── PortalDashboard.tsx
    │   │       ├── PortalGrades.tsx
    │   │       ├── PortalTranscript.tsx
    │   │       ├── PortalGPAChart.tsx
    │   │       ├── PortalCurriculum.tsx
    │   │       └── PortalProfile.tsx
    │   │
    │   ├── components/              ← Shared across features
    │   │   ├── ui/                  ← shadcn/ui re-exports
    │   │   ├── layout/
    │   │   │   ├── AppLayout.tsx    ← Staff layout (sidebar + navbar)
    │   │   │   ├── PortalLayout.tsx ← Student portal layout
    │   │   │   ├── Sidebar.tsx      ← Role-aware nav items
    │   │   │   └── RoleGuard.tsx
    │   │   ├── data-display/
    │   │   │   ├── DataTable.tsx    ← TanStack Table wrapper
    │   │   │   └── VirtualList.tsx  ← For 30k-row queries
    │   │   └── feedback/
    │   │       ├── LoadingSkeleton.tsx
    │   │       ├── EmptyState.tsx
    │   │       └── ErrorBoundary.tsx
    │   │
    │   ├── hooks/
    │   │   ├── usePermission.ts     ← can(action, resource) → boolean
    │   │   └── useRTL.ts            ← current direction from i18n
    │   │
    │   └── lib/
    │       ├── axios.ts             ← Axios instance + interceptors
    │       ├── queryClient.ts       ← TanStack Query config
    │       └── i18n.ts              ← i18next config
    │
    ├── locales/
    │   ├── ar/                      ← Arabic translations (primary)
    │   │   ├── common.json
    │   │   ├── grades.json
    │   │   ├── students.json
    │   │   └── errors.json
    │   └── en/                      ← English translations
    │
    └── e2e/                         ← Playwright tests
```

---

## 3. Request Lifecycle (Every API Call)

```
Browser/Client
    │
    │ HTTPS request
    ▼
[Nginx/CloudFront]
    │ Strips TLS, forwards to ALB
    ▼
[ALB → ECS Task]
    │
    ▼
[requestId middleware]
    │ Generates UUID, sets X-Request-ID header
    ▼
[helmet middleware]
    │ Sets security headers (CSP, HSTS, etc.)
    ▼
[cors middleware]
    │ Validates origin against CORS_ORIGINS env var
    │ Returns 403 if not allowed
    ▼
[morgan HTTP logger]
    │ Logs: method, path, status, duration, requestId
    ▼
[rateLimit middleware]
    │ Checks IP against Redis counter
    │ Returns 429 if exceeded
    ▼
[requireAuth middleware]  (protected routes only)
    │ Extracts JWT from Authorization header
    │ Verifies signature + expiry
    │ Attaches { userId, role, studentId? } to req.user
    │ Returns 401 if invalid/missing
    ▼
[requireRole(['A','C'])] (role-protected routes)
    │ Checks req.user.role against allowed list
    │ Returns 403 if not in list
    ▼
[validate(schema)]
    │ Zod validates req.body / req.params / req.query
    │ Returns 422 with field-level errors if invalid
    │ Mutates req.body with coerced/typed data
    ▼
[asyncHandler(controller.method)]
    │ Wraps in try/catch — uncaught errors → errorHandler
    ▼
[controller]
    │ Extracts validated input from req
    │ Calls service method
    │ Calls ok(res, data) / created(res, data) / paginated(res, ...)
    ▼
[service]
    │ Business logic
    │ Calls repository (DB) and/or cache
    │ Throws AppError subclasses on failure
    │ Returns typed result
    ▼
[repository]
    │ Parameterized SQL query via pg.Pool
    │ Maps DB rows to domain types (snake_case → camelCase)
    │ Returns typed result or throws NotFoundError
    ▼
[pg.Pool → PostgreSQL]
    │ Connection from pool (max: 20)
    │ Statement timeout: 10s
    │ Returns rows
    ▼
Response flows back up the chain
    │
    │ JSON response
    ▼
[errorHandler middleware] (catches any thrown AppError)
    │ Maps to HTTP status + error code
    │ Logs at warn level (AppError) or error level (unexpected)
    │ Returns: { success: false, error: { code, message, message_ar } }
```

---

## 4. GPA Computation Data Flow

```
Grade Approved (coordinator clicks "Approve")
    │
    ▼
[grade.service.ts → approve()]
    │ DB transaction:
    │   UPDATE grades SET entry_status='APPROVED', approved_at=NOW()
    │   INSERT INTO grade_audit_log (...)
    │   INSERT INTO gpa_recompute_queue (student_id, reason='GRADE_APPROVED')
    │   COMMIT
    │
    ▼
[Response returned to coordinator immediately]  ← does not wait for GPA computation

... (up to 5 minutes later) ...

[gpa-recompute.job.ts — runs every 5 minutes]
    │
    ▼
[SELECT * FROM gpa_recompute_queue LIMIT 100 FOR UPDATE SKIP LOCKED]
    ← SKIP LOCKED prevents double-processing in multi-task ECS
    │
    ▼ For each student in batch:
[gpa.service.ts → recomputeForStudent(studentId, semesterId)]
    │
    │ 1. Load all enrollments for student in this semester
    │    JOIN grades ON enrollment_id
    │    WHERE entry_status = 'APPROVED'
    │
    │ 2. For each enrollment:
    │    - Get enrollment_type (NEW/RESIT/REPEAT/ALTERNATE/DEPRIVED)
    │    - Get credit_hours from course
    │    - Apply Formula A or B from @psau/shared
    │    - Calculate course_points = grade_point × credit_hours
    │    - Exclude ALTERNATE from sums
    │
    │ 3. SGPA = Σ(course_points) / Σ(credit_hours) [excl. ALTERNATE]
    │
    │ 4. Load all previous semester records for CGPA
    │    SELECT * FROM student_semester_records
    │    WHERE student_id = $1
    │    ORDER BY semester.year_id, semester.semester_num
    │
    │ 5. Check if repeat student (substitution system applies)
    │    If yes: use calculateSubstitutionCGPA from @psau/shared
    │    If no: standard CGPA = Σ(all_sp) / Σ(first_attempt_sch)
    │
    │ 6. Determine academic status:
    │    getAcademicStatus({ cgpa, previousWarnings }) from @psau/shared
    │
    │ 7. UPSERT student_semester_records
    │    ON CONFLICT (student_id, semester_id) DO UPDATE
    │
    │ 8. UPDATE grades SET grade_point, course_points, letter_grade
    │    (computed fields — stored for transcript performance)
    │
    ▼
[DELETE FROM gpa_recompute_queue WHERE student_id = $1]
```

---

## 5. Student Portal Data Access — Security Model

```
Student (role=S) logs in with student_id as username
    │
    ▼
JWT payload: { userId: 42, role: 'S', studentId: '2024-01-02-0047' }
    │
    ▼
Every /student/* endpoint:
    │
    ├── [requireAuth] → verifies JWT
    ├── [requireRole(['S'])] → rejects non-students
    │
    ▼
[student-portal.routes.ts]
    router.get('/student/me/grades', requireAuth, requireRole(['S']), ...)
    │
    ▼
[studentPortalController.getMyGrades]
    const { studentId } = req.user;  // from JWT — student cannot change this
    │
    ▼
[studentPortalService.getGrades(studentId)]
    │
    ▼
[gradeRepository.findByStudent(studentId)]
    // SQL:
    SELECT g.*, c.name_ar, c.credit_hours
    FROM grades g
    JOIN enrollments e ON e.enrollment_id = g.enrollment_id
    JOIN course_offerings co ON co.offering_id = e.offering_id
    JOIN courses c ON c.course_id = co.course_id
    WHERE e.student_id = $1           ← STUDENT_ID FROM JWT, NOT FROM URL
      AND g.entry_status = 'APPROVED' ← Students only see approved grades
    ORDER BY ...

    // The WHERE clause is the security. Even if a student crafts a request
    // to /student/me/grades with a manipulated body, the JWT studentId
    // is what goes into the SQL. They can ONLY ever see their own grades.
```

---

## 6. Backup System Architecture

```
Admin triggers backup (manual or scheduled)
    │
    ▼
[backup.service.ts → runBackup(configId)]
    │
    │ 1. Create backup_logs entry: status='RUNNING'
    │
    │ 2. Serialize all tables to JSON:
    │    { manifest: { version, created_at, table_counts },
    │      data: { faculties: [...], departments: [...], students: [...], ... } }
    │    (streams via cursor for large tables — never loads 30k rows at once)
    │
    │ 3. Compress: JSON → gzip (typically 10:1 compression ratio)
    │
    │ 4. Encrypt: gzip → AES-256-GCM (key from AWS Secrets Manager)
    │
    │ 5. Write to destination:
    │
    ├── LOCAL: write to /app/backups/
    │   filename: psau_backup_2025-01-15T02-00-00Z_<sha256[:8]>.json.gz.enc
    │
    ├── GDRIVE: upload to configured Google Drive folder via OAuth2
    │   (access token refreshed automatically)
    │
    └── S3 (prod): aws s3 cp to ${AWS_S3_BACKUP_BUCKET}/daily/
        Uses IAM task role — no credentials in code
    │
    │ 6. Compute SHA-256 of encrypted file → store in backup_logs
    │
    │ 7. UPDATE backup_logs: status='SUCCESS', file_size_bytes, checksum
    │
    │ 8. Apply retention policy:
    │    keep: last 7 daily backups
    │    keep: most recent of each past week (4 weeks)
    │    keep: most recent of each past month (12 months)
    │    delete: everything else

Restore flow:
    Admin uploads encrypted backup file via /api/v1/backup/restore
    → Verify SHA-256 checksum
    → Decrypt (AES-256-GCM)
    → Decompress
    → Validate manifest schema version
    → BEGIN TRANSACTION
    → TRUNCATE all tables CASCADE
    → INSERT data in dependency order (faculties first, grades last)
    → COMMIT
    → Trigger full GPA recompute for all students
```

---

## 7. Database Schema — Entity Relationship Summary

```
faculties (1) ──< departments (1) ──< students (1) ──< enrollments (M) >── course_offerings (M)
                      │                    │                  │                      │
                      │                    │                  │                      │
                    users (has           student_          grades (1)           courses (1)
                    faculty_id)         semester_
                      │                 records
                   instructors ──────< instructor_
                   (role=I or C)        assignments
                      │
                   curricula (1) ──< curriculum_courses
                      │                     │
                      │                 courses + 
                      │              course_assessment_
                      │                   weights
                 academic_years (1) ──< semesters (1) ──< course_offerings
```

---

## 8. State Machine — Grade Entry Status

```
                     [Instructor enters scores]
                              │
                              ▼
                           DRAFT ─────────────────────────────────────────┐
                              │                                             │
                    [Instructor/Coordinator                                 │
                       clicks Submit]                                       │
                              │                                             │
                              ▼                                             │
                         SUBMITTED ◄──────── [Coordinator rejects]         │
                              │                        │                    │
                    [Coordinator reviews]              │                    │
                              │                        │                    │
                     ┌────────┴────────┐               │                    │
                     │                 │               │                    │
                   [Approve]        [Reject]           │                    │
                     │                 │               │                    │
                     ▼                 └───► REJECTED ─┘                   │
                  APPROVED                  (Instructor sees note,          │
                     │                      can edit and resubmit)          │
                     │                                                       │
              [End of grace                                             [if enrollment
               period - admin                                            type changed]
               locks records]                                               │
                     │                                                       │
                     ▼                                                       │
                  LOCKED ──────────────────────────────────────────────────┘
         (immutable — no further changes
          except by Admin with audit log)

Rules:
- Only Instructor or Coordinator can submit (role I or C)
- Only Coordinator or Admin can approve/reject (role C or A)
- Instructor CANNOT approve grades for their own course submission
- Once APPROVED: grade_point, course_points, letter_grade are computed and frozen
- APPROVED triggers GPA recompute queue entry
- LOCKED: cannot be changed without Admin + audit log entry
```

---

## 9. Frontend State Architecture

```
Zustand Stores (client state — NOT persisted to localStorage):
│
├── authStore
│   { user: AuthUser | null, isAuthenticated: boolean }
│   actions: login(credentials), logout(), refreshToken()
│
├── uiStore
│   { sidebarOpen: boolean, language: 'ar' | 'en', theme: 'light' | 'dark' }
│   actions: toggleSidebar(), setLanguage(), setTheme()
│
└── gradeEntryStore
    { pendingChanges: Map<enrollmentId, GradeInput>, isDirty: boolean }
    actions: setScore(), clearPending(), submitAll()
    (Unsaved grade edits — not in React Query because they're optimistic)

TanStack Query Cache (server state):
│
├── ['students', filters, cursor]        → paginated student list
├── ['students', id]                      → single student detail
├── ['grades', 'offering', offeringId]   → grade sheet for offering
├── ['grades', 'pending-approval']        → coordinator approval queue
├── ['semester', 'current']               → current semester (staleTime: 1hr)
├── ['curriculum', deptId]               → curriculum plan
├── ['student-portal', 'me']             → student's own profile
├── ['student-portal', 'grades', sem]    → student's grades
└── ['student-portal', 'transcript']     → student's transcript

Invalidation rules:
- grade approved → invalidate ['grades', 'offering', *] + ['grades', 'pending-approval']
- enrollment changed → invalidate ['students', id]
- semester set-current → invalidate ['semester', 'current']
```

---

## 10. API Versioning Strategy

```
Current: /api/v1/*
Future:  /api/v2/* (when breaking changes needed)

Rules:
- v1 stays alive for minimum 12 months after v2 launch
- Additive changes (new endpoints, new optional fields) → v1, no version bump
- Breaking changes (removed fields, changed types) → v2
- Both versions run simultaneously during transition

Headers added to every response:
X-API-Version: 1.0.0
X-Request-ID: <uuid>
X-Response-Time: 45ms
```
