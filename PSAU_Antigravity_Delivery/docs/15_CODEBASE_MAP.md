# CODEBASE MAP — Living Symbol Graph
## Pre-built Mental Model for Antigravity

> **Update this file every time you add a new module, service, or significant function.**  
> This is your orientating map. Read it before every session alongside MEMORY.md.  
> Stale maps cause bugs. Keep it current.

---

## Module Responsibilities

```
┌─────────────────────────────────────────────────────────────────────┐
│  @psau/shared  (packages/shared)                                    │
│                                                                      │
│  PURPOSE: Single source of truth for types, formulas, schemas.      │
│           Used by both API and Web. NEVER platform-specific code.   │
│                                                                      │
│  ├── src/lib/gpa.ts          ← THE MOST IMPORTANT FILE IN THE REPO  │
│  │      calculateGradePoint(score, enrollmentType) → number         │
│  │      calculateSGPA(courses[]) → number                           │
│  │      calculateCGPA(semesters[]) → number                         │
│  │      getLetterGrade(gradePoint) → string                         │
│  │      getDegreeClassification(cgpa) → ClassificationResult|null   │
│  │      getAcademicStatus(params) → AcademicStatus                  │
│  │      calculateSubstitutionCGPA(params) → number                  │
│  │                                                                   │
│  ├── src/types/              ← All shared TypeScript interfaces      │
│  │      academic.ts          Grade, Enrollment, Semester, GPA types  │
│  │      users.ts             User, Role, AuthUser types              │
│  │      university.ts        Faculty, Department, Course types       │
│  │      api.ts               ApiResponse<T>, PaginatedResponse<T>   │
│  │                                                                   │
│  ├── src/schemas/            ← Zod validation schemas                │
│  │      auth.schemas.ts      LoginInput, ChangePasswordInput         │
│  │      student.schemas.ts   CreateStudentInput, UpdateStudentInput  │
│  │      grade.schemas.ts     GradeEntryInput, GradeApprovalInput    │
│  │      enrollment.schemas.ts EnrollInput, BulkEnrollInput          │
│  │      backup.schemas.ts    BackupConfigInput, RestoreInput         │
│  │                                                                   │
│  └── src/constants/          ← Role definitions, status enums        │
│         roles.ts             ROLES object + Role type                │
│         grades.ts            GRADE_SCALE, ENROLLMENT_TYPE            │
│         academic.ts          ACADEMIC_STATUS, DEGREE_CLASS           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  @psau/api  (packages/api)                                          │
│                                                                      │
│  PURPOSE: HTTP API server. Business logic. Database access.         │
│                                                                      │
│  Entry Points:                                                       │
│    src/server.ts             Node.js server bootstrap               │
│    src/app.ts                Express app factory (testable)         │
│                                                                      │
│  ├── src/config/             ← Configuration (env validation)       │
│  │      env.ts               Zod-validated env vars (fails if bad)  │
│  │      database.ts          pg Pool setup + connection management   │
│  │      redis.ts             Redis client + in-memory mock for dev  │
│  │      logger.ts            Winston logger setup                   │
│  │                                                                   │
│  ├── src/middleware/         ← Express middleware                   │
│  │      auth.ts              requireAuth, requireRole([roles])       │
│  │      validate.ts          Zod validation middleware factory       │
│  │      requestId.ts         X-Request-ID injection                 │
│  │      rateLimit.ts         Tiered rate limiting configs           │
│  │      metrics.ts           Per-request CloudWatch metrics         │
│  │      errorHandler.ts      Global error → JSON response           │
│  │                                                                   │
│  ├── src/routes/             ← Route definitions (THIN layer)       │
│  │      index.ts             All routers mounted here               │
│  │      auth.routes.ts       POST /auth/login, /auth/refresh        │
│  │      faculties.routes.ts  CRUD /faculties                        │
│  │      departments.routes.ts CRUD /departments                     │
│  │      students.routes.ts   CRUD /students                         │
│  │      courses.routes.ts    CRUD /courses                          │
│  │      curricula.routes.ts  Curriculum builder endpoints           │
│  │      offerings.routes.ts  Course offering management             │
│  │      enrollments.routes.ts Enrollment management                 │
│  │      grades.routes.ts     Grade entry, submit, approve           │
│  │      gpa.routes.ts        GPA recompute, history                 │
│  │      transcripts.routes.ts Transcript + PDF generation           │
│  │      backup.routes.ts     Backup + restore                       │
│  │      migration.routes.ts  CSV migration import                   │
│  │      student.routes.ts    Student portal (role S only)           │
│  │      users.routes.ts      User management (Admin only)           │
│  │      health.routes.ts     /health endpoint (public)              │
│  │                                                                   │
│  ├── src/services/           ← Business logic (FAT layer)           │
│  │      auth.service.ts      Login, token, password management      │
│  │      student.service.ts   Student CRUD + ID generation           │
│  │      grade.service.ts     Grade workflow state machine           │
│  │      gpa.service.ts       GPA computation + recompute queue      │
│  │      enrollment.service.ts Enrollment + prerequisite check       │
│  │      curriculum.service.ts Curriculum + course weight mgmt       │
│  │      transcript.service.ts Transcript assembly + PDF             │
│  │      backup.service.ts    Backup + restore orchestration         │
│  │      migration.service.ts CSV import pipeline                   │
│  │      report.service.ts    Dean/dept/registrar reports            │
│  │                                                                   │
│  ├── src/repositories/       ← ALL SQL lives here. Nowhere else.    │
│  │      student.repository.ts  Students CRUD + ID sequence          │
│  │      grade.repository.ts    Grades CRUD + status queries         │
│  │      enrollment.repository.ts Enrollments + prerequisite query   │
│  │      gpa.repository.ts    student_semester_records CRUD          │
│  │      audit.repository.ts  grade_audit_log insert + query        │
│  │      backup.repository.ts Backup metadata + config queries       │
│  │                                                                   │
│  └── src/lib/                ← Shared utilities                     │
│         errors.ts            AppError hierarchy (ALL errors here)  │
│         metrics.ts           CloudWatch custom metrics              │
│         response.ts          ok(), created(), paginated() helpers   │
│         pagination.ts        Keyset + offset pagination utils       │
│         transformer.ts       camelCase ↔ snake_case conversion      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  @psau/web  (packages/web)                                          │
│                                                                      │
│  PURPOSE: React SPA. Role-based UI. RTL/LTR bilingual.             │
│                                                                      │
│  Entry Points:                                                       │
│    src/main.tsx              Vite entry, React root mount           │
│    src/app/router.tsx        React Router v6 data router definition │
│                                                                      │
│  ├── src/app/                ← Global setup                         │
│  │      providers.tsx        QueryClient, i18n, theme providers     │
│  │      router.tsx           All routes + code-split boundaries     │
│  │                                                                   │
│  ├── src/store/              ← Zustand global stores               │
│  │      authStore.ts         user, token, role, studentId           │
│  │      uiStore.ts           language (ar/en), theme, sidebar       │
│  │                                                                   │
│  ├── src/features/           ← Feature-first organization           │
│  │    Each feature has:                                              │
│  │      components/          UI components for this feature         │
│  │      hooks/               useQuery/useMutation custom hooks      │
│  │      api/                 Axios calls to API endpoints           │
│  │      types/               Feature-specific types (if any)        │
│  │                                                                   │
│  │    Features:                                                      │
│  │      auth/                Login page, token refresh logic        │
│  │      dashboard/           Role-specific dashboard home           │
│  │      students/            Registrar student management           │
│  │      grades/              Grade entry sheet + approval queue     │
│  │      curriculum/          Coordinator curriculum builder         │
│  │      enrollment/          Enrollment management                  │
│  │      transcripts/         Transcript view + PDF download         │
│  │      backup/              Backup config + restore wizard         │
│  │      migration/           CSV import wizard + progress           │
│  │      reports/             Academic reports by role               │
│  │      portal/              Student self-service (role S)          │
│  │        ├── dashboard/     CGPA summary + academic standing       │
│  │        ├── grades/        Current semester grades                │
│  │        ├── transcript/    Full transcript + PDF button           │
│  │        ├── gpa-history/   CGPA trend chart                       │
│  │        ├── curriculum/    Study plan grid                        │
│  │        └── profile/       Profile + change password              │
│  │                                                                   │
│  ├── src/components/         ← Shared UI components                 │
│  │      ui/                  shadcn/ui re-exports + customizations  │
│  │      layout/              AppShell, Sidebar, Header, RTL wrapper │
│  │      data-display/        DataTable, StatCard, Charts            │
│  │      feedback/            Toast, Alert, LoadingSpinner, Empty    │
│  │                                                                   │
│  ├── src/lib/                ← Utilities                            │
│  │      utils.ts             cn() (clsx+tailwind-merge)             │
│  │      axios.ts             Axios instance + interceptors          │
│  │      queryClient.ts       TanStack Query client + defaults       │
│  │                                                                   │
│  └── src/i18n/               ← Translations                         │
│         ar.json              Arabic (primary language)              │
│         en.json              English (secondary language)           │
│         index.ts             i18next initialization                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Critical Call Chains

### Chain 1: Instructor submits grades → Student sees CGPA update

```
Frontend:
  GradeEntrySheet.tsx
  → useSubmitGrade() hook
  → POST /api/v1/grades/:enrollmentId/submit
  
API Route (grades.routes.ts):
  → requireAuth → requireRole(['A','C','I'])
  → validate(submitGradeSchema)
  → gradeController.submit()
  
GradeController:
  → gradeService.submit(enrollmentId, userId)
  
GradeService.submit():
  → gradeRepository.findById(enrollmentId)         [checks exists]
  → if grade.entryStatus !== 'DRAFT' → throw ConflictError
  → BEGIN TRANSACTION
  → gradeRepository.updateStatus(enrollmentId, 'SUBMITTED', submitterId)
  → auditRepository.log({ action: 'SUBMITTED', ... })
  → COMMIT
  → return updated grade

  [Later — Coordinator approves:]
GradeService.approve():
  → gradeRepository.findById(gradeId)
  → if submittedBy === approverId → throw ConflictError('CANNOT_SELF_APPROVE')
  → if status !== 'SUBMITTED' → throw ConflictError
  → BEGIN TRANSACTION
  → gradeRepository.updateStatus(gradeId, 'APPROVED', approverId)
  → auditRepository.log({ action: 'APPROVED', ... })
  → gpaQueue.enqueue(grade.studentId)              [async — does NOT block]
  → COMMIT
  
  [Background job — every 5 minutes:]
GPAService.processQueue():
  → gpaQueue.dequeue(batch of 100)
  → for each studentId:
    → enrollmentRepository.findAllApproved(studentId)
    → calculateSGPA() per semester        [from @psau/shared]
    → calculateCGPA() across all semesters [from @psau/shared]
    → gpaRepository.upsert(studentId, semesterId, sgpa, cgpa, status)
    → metrics.gpaQueueDepth(remaining)
  
  [Student portal:]
Student → GET /api/v1/student/me/grades/current
  → requireAuth → requireRole(['S'])
  → studentPortalController.getCurrentGrades()
  → gradeRepository.findByStudentSemester(
      studentId: req.user.studentId,    // FROM JWT — not request
      semesterId: currentSemesterId,
      status: 'APPROVED'               // only approved grades shown
    )
```

### Chain 2: Student ID Generation (Thread-Safe)

```
Registrar → POST /api/v1/students
  → studentService.create(input)
  → BEGIN TRANSACTION (serializable isolation for ID generation)
  → SELECT faculty_code FROM faculties WHERE faculty_id = $1
  → SELECT dept_number FROM departments WHERE department_id = $1
  → UPDATE student_id_sequences
      SET last_sequence = last_sequence + 1
      WHERE year = $year AND department_id = $dept
      RETURNING last_sequence
  → id = `${year}-${facultyCode}-${deptNumber}-${padStart(seq, 4, '0')}`
  → INSERT INTO students (..., student_id = id)
  → INSERT INTO users (username = id, role = 'S', must_change_password = true)
  → COMMIT
  → return { student, tempPassword }  ← shown to Registrar once
```

### Chain 3: Transcript PDF Generation (Cached)

```
Student → GET /api/v1/student/me/transcript/pdf
  → transcriptService.generatePDF(studentId)
  
  [Cache check:]
  → redis.get(`transcript:${studentId}:pdf`)
  → if cached && not stale → return cached buffer
  
  [Generate:]
  → transcriptService.assemble(studentId)
    → gpaRepository.findAllSemesters(studentId)
    → enrollmentRepository.findAllWithGrades(studentId)
    → studentRepository.findById(studentId)
    → facultyRepository.findById(student.facultyId)
  → HTML template render (Handlebars/EJS)
    → bilingual: Arabic + English side by side
    → includes: university header, student info, semester-by-semester table
    → includes: SGPA per semester, final CGPA, degree classification
    → includes: Registrar signature line
  → puppeteer.launch() → page.setContent(html) → page.pdf()
  → redis.set(`transcript:${studentId}:pdf`, buffer, { EX: 3600 })
  → return buffer with Content-Type: application/pdf
```

---

## Data Flow Diagram

```
SOURCES                    SERVICES                    CONSUMERS
─────────                  ────────                    ─────────
Advising Guide             @psau/shared/gpa.ts         Backend GPA computation
(immutable law)       ──►  calculateGradePoint()   ──► Frontend grade preview
                           (single source)             (identical formula)

Instructor enters          GradeService               Student sees CGPA
scores via UI         ──►  Approval workflow      ──►  in portal
                           GPAService queue

Registrar creates          StudentService             Student logs in with
student record        ──►  generates student_id   ──►  their ID as username
                           creates User account

CSV files                  MigrationService           Historical data
(existing data)       ──►  ValidationPipeline    ──►  visible in reports
                           ImportPipeline              and transcripts
```

---

## Dependency Graph — Inter-Module

```
@psau/web ──────────────► @psau/shared (types, schemas, gpa formulas)
               │
@psau/api ──────────────► @psau/shared (types, schemas, gpa formulas)
               │
               ├──► PostgreSQL (pg Pool)
               ├──► Redis (cache + queue)
               ├──► AWS S3 (backup storage — prod only)
               └──► AWS CloudWatch (metrics — prod only)
```

---

## Database Table Ownership

Who owns each table (which service writes to it):

| Table | Owner Service | Other readers |
|-------|--------------|---------------|
| `faculties` | AdminService | All |
| `departments` | AdminService | All |
| `academic_years` | RegistrarService | All |
| `semesters` | RegistrarService | All |
| `courses` | CoordinatorService | All |
| `curricula` | CoordinatorService | EnrollmentService |
| `curriculum_courses` | CoordinatorService | EnrollmentService |
| `course_assessment_weights` | CoordinatorService | GradeService |
| `students` | RegistrarService (Registrar role) | All |
| `users` | AuthService, RegistrarService | AuthService |
| `course_offerings` | CoordinatorService | All |
| `enrollments` | EnrollmentService | GradeService, GPAService |
| `grades` | GradeService (Instructor enters, Coordinator approves) | GPAService, TranscriptService |
| `student_semester_records` | GPAService (background job) | Portal, Reports |
| `grade_audit_log` | GradeService (every state change) | Coordinators, Admins |
| `backup_configs` | BackupService | All |
| `backup_logs` | BackupService | All |
| `user_activity_log` | AuthMiddleware | Admins |
| `gpa_recompute_queue` | GradeService (enqueue), GPAService (dequeue) | — |
| `student_id_sequences` | StudentService | — |

---

## Indexes — What Exists and Why

```sql
-- These must exist before go-live. Verify with \d+ <table> in psql.

-- students: Arabic name search (university staff search in Arabic)
CREATE INDEX idx_students_name_ar_trgm ON students USING gin(name_ar gin_trgm_ops);

-- students: English name search
CREATE INDEX idx_students_name_en_trgm ON students USING gin(name_en gin_trgm_ops);

-- students: filter by department (most common registrar query)
CREATE INDEX idx_students_dept ON students(department_id);

-- students: filter by faculty (via student_id prefix)
CREATE INDEX idx_students_faculty ON students(
  substring(student_id, 6, 2)  -- extracts faculty code from YYYY-FF-DD-NNNN
);

-- enrollments: look up all students in a course offering (grade sheet load)
CREATE INDEX idx_enrollments_offering ON enrollments(offering_id);

-- enrollments: look up all courses for a student
CREATE INDEX idx_enrollments_student ON enrollments(student_id);

-- enrollments: covering index for grade sheet (includes enrollment_type)
CREATE INDEX idx_enrollments_offering_student ON enrollments(offering_id, student_id);

-- grades: primary lookup path (by enrollment)
CREATE INDEX idx_grades_enrollment ON grades(enrollment_id);

-- grades: approval queue (submitted grades waiting for coordinator)
CREATE INDEX idx_grades_submitted ON grades(entry_status)
  WHERE entry_status = 'SUBMITTED';

-- student_semester_records: CGPA history for student portal
CREATE INDEX idx_ssr_student_semester ON student_semester_records(student_id, semester_id);

-- grade_audit_log: partitioned by month (prevent index bloat on high-write table)
-- Each month partition automatically gets its own index
```

---

## Environment Variable Impact Map

| Variable | If Missing | Services Affected |
|----------|-----------|------------------|
| `JWT_SECRET` | Startup crash (Zod validation) | All authenticated routes |
| `DATABASE_URL` | Startup crash | All data operations |
| `REDIS_URL` | Degraded: GPA queue uses DB table fallback | GPA recompute, caching |
| `REDIS_ENABLED=false` | Uses in-memory mock (dev only) | Caching, GPA queue |
| `BACKUP_SCHEDULER_ENABLED` | No scheduled backups | Backup system |
| `SWAGGER_ENABLED=false` | No /api-docs route | Swagger UI |
| `AWS_REGION` | CloudWatch metrics disabled | Monitoring (gracefully) |
| `LOG_LEVEL` | Defaults to 'info' | Logging verbosity |

---

## What To Update Here

After every significant feature:
1. Add new functions to the module responsibility section
2. Add new call chains if a new complex workflow is added
3. Add new tables to the database table ownership map
4. Add new indexes if created
5. Update the dependency graph if new packages added
