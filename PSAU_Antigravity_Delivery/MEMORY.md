# MEMORY.md
## Antigravity's Evolving Codebase Mental Model
### Update this file after every significant change. Commit it with your code.

---

> **Instructions:** This file is your working memory. It grows as the codebase grows.
> Before starting any task, read this file. After completing any task, update it.
> Never let it be more than 2 days stale. The goal: any engineer (or AI) reads this and
> understands the codebase in under 10 minutes.

---

## Current Build State

```
Phase:          [ ] 0-Foundation  [ ] 1-Auth  [ ] 2-Curriculum  
                [ ] 3-Enrollment  [ ] 4-Grades  [ ] 5-Portal  
                [ ] 6-Backup  [ ] 7-AWS
Last updated:   [DATE]
Last commit:    [HASH] [message]
Blocking issue: [none / describe]
```

---

## Module Inventory
*Update this table as you build each module*

| Module | Package | File | Status | Depends On | Notes |
|--------|---------|------|--------|-----------|-------|
| GPA formulas | shared | `lib/gpa.ts` | 🔴 Not started | — | CRITICAL — build first |
| Grade types | shared | `types/academic.ts` | 🔴 Not started | — | |
| Auth middleware | api | `middleware/auth.ts` | 🔴 Not started | `config/env.ts` | |
| RBAC middleware | api | `middleware/rbac.ts` | 🔴 Not started | `middleware/auth.ts` | |
| Zod validation | api | `middleware/validate.ts` | 🔴 Not started | — | |
| DB config | api | `config/database.ts` | 🔴 Not started | `config/env.ts` | SQLite in dev |
| Redis config | api | `config/redis.ts` | 🔴 Not started | `config/env.ts` | mock in dev |
| Error types | api | `lib/errors.ts` | 🔴 Not started | — | |
| Logger | api | `lib/logger.ts` | 🔴 Not started | `config/env.ts` | |
| Student ID service | api | `services/student-id.service.ts` | 🔴 Not started | DB | |
| Grade service | api | `services/grade.service.ts` | 🔴 Not started | GPA formulas, DB | most complex |
| GPA service | api | `services/gpa.service.ts` | 🔴 Not started | Grade service, shared | |
| Grade repository | api | `repositories/grade.repository.ts` | 🔴 Not started | DB config | |
| Student repository | api | `repositories/student.repository.ts` | 🔴 Not started | DB config | |
| Auth routes | api | `routes/v1/auth.ts` | 🔴 Not started | middleware | |
| Student routes | api | `routes/v1/students.ts` | 🔴 Not started | middleware | |
| Grade routes | api | `routes/v1/grades.ts` | 🔴 Not started | middleware | |
| GPA job | api | `jobs/gpa.job.ts` | 🔴 Not started | Grade service | |
| React app | web | `app/App.tsx` | 🔴 Not started | — | |
| Auth store | web | `features/auth/store.ts` | 🔴 Not started | — | Zustand |
| Grade entry | web | `features/grades/GradeEntrySheet.tsx` | 🔴 Not started | — | most complex UI |
| Student portal | web | `features/portal/` | 🔴 Not started | — | role S |

Status: 🔴 Not started | 🟡 In progress | 🟢 Complete | ⚠️ Has issues

---

## Data Flow Map
*How data moves through the system — update as you discover actual implementations*

### Grade Approval Flow
```
Instructor UI
  → PATCH /api/v1/grades/:enrollmentId  [validate: gradeUpdateSchema]
  → gradeController.update              [extract: {scores}]
  → gradeService.update()               [business: compute total, sgp, sp]
  → calculateGradePoint()               [from @psau/shared/lib/gpa.ts]
  → gradeRepository.upsert()            [SQL: INSERT ... ON CONFLICT UPDATE]
  → grade_audit_log INSERT              [audit: snapshot_before/after]
  → 200 {grade with preview}

  → POST /api/v1/grades/:enrollmentId/submit
  → gradeService.submit()               [validate: status must be DRAFT]
  → gradeRepository.setStatus(SUBMITTED)
  → grade_audit_log INSERT (SUBMITTED)
  → [notify coordinator]

  → POST /api/v1/grades/:enrollmentId/approve  [role: C or A only]
  → gradeService.approve()              [validate: status must be SUBMITTED]
  → gradeRepository.setStatus(APPROVED)
  → grade_audit_log INSERT (APPROVED)
  → gpaQueue.enqueue(studentId)         [async — do not block response]
  → 200 {approved grade}

  Background (gpa.job.ts, every 5 minutes):
  → gpaQueue.dequeue()
  → gpaService.recomputeForStudent(studentId, semesterId)
  → calculateSGPA(), calculateCGPA()    [from @psau/shared/lib/gpa.ts]
  → student_semester_records UPSERT     [cache updated]
  → academicStandingService.evaluate()  [WARNING / DISMISSED check]
```

### Student Portal Data Flow
```
Student login (role=S):
  → POST /api/v1/auth/login {username: studentId, password}
  → authService.login()
  → users JOIN WHERE student_id = username
  → JWT issued: {userId, role:'S', studentId}
  
Student views transcript:
  → GET /api/v1/student/me/transcript
  → requireAuth → requireRole(['S'])
  → studentPortalController.getTranscript()
  → studentPortalService.getTranscript(req.user.studentId)  ← studentId from TOKEN
  → transcriptRepository.findAll(studentId)
  ↑ SQL: WHERE student_id = $1  ← ENFORCED AT SQL LEVEL (not just middleware)
  → Response: all semesters, all grades (APPROVED only), CGPA history
```

---

## Decisions Made
*Record every non-obvious decision and WHY — prevents re-litigation*

| # | Decision | Why | Alternative Rejected | Date |
|---|---------|-----|---------------------|------|
| 1 | Keyset pagination over OFFSET | OFFSET scans N rows; keyset uses index directly. Critical for 30k students. | OFFSET pagination | — |
| 2 | GPA pre-computed and cached in student_semester_records | Cannot compute CGPA for 30k students on every dashboard request | On-demand calculation | — |
| 3 | GPA recompute is async (queue + job) | 200 grade approvals at exam time → synchronous would cascade and timeout | Synchronous recompute | — |
| 4 | Student_id as JWT subject for role S | Self-documenting, collision-proof (already unique PK), readable in logs | UUID user_id | — |
| 5 | SQLite in dev, PostgreSQL in test/prod | Developers need zero-config local setup; tests must mirror production | PostgreSQL everywhere | — |
| 6 | Zod for validation (not Joi) | Shared between server and client; TypeScript-native types | Joi (server-only) | — |
| 7 | Student data access enforced at SQL level | Defense in depth — even if RBAC middleware is bypassed, SQL WHERE clause protects | Middleware-only check | — |
| 8 | Named exports for React components | Easier refactoring, clearer import paths, consistent with the codebase | Default exports | — |
| 9 | httpOnly cookies for refresh tokens | Cannot be stolen by XSS; access token (short-lived) in memory only | localStorage | — |
| 10 | APPROVED grades immutable | Academic integrity — once approved, a grade is a legal record | Allow edits with audit | — |

---

## Known Issues / Tech Debt
*Track everything that needs attention — nothing hidden*

| ID | Issue | Severity | File | Noted On | Resolved |
|----|-------|---------|------|---------|---------|
| TD-001 | [Add as you discover] | | | | |

---

## External Dependencies & Integration Points

| Service | Used For | Config Location | Status |
|---------|---------|----------------|--------|
| PostgreSQL 15 | Primary database (test/prod) | `DATABASE_URL` env var | Required |
| SQLite | Development database | `DATABASE_URL=sqlite:./data/psau.db` | Auto-used in dev |
| Redis 7 | Caching, GPA queue | `REDIS_URL` env var | Optional (in-memory fallback) |
| Google Drive | Backup destination | `GDRIVE_CLIENT_ID/SECRET` env vars | Optional |
| AWS SES | Email (password reset, notifications) | `AWS_SES_FROM_ADDRESS` env var | Production only |
| AWS S3 | Backup storage (v2.1) | `AWS_S3_BACKUP_BUCKET` env var | Production only |
| AWS ECR | Container registry | Configured in GitHub Actions | Production only |

---

## Test Coverage Snapshot
*Update after each test run*

```
Last run: [DATE]
Command: pnpm test:coverage

@psau/shared:   statements: __%  branches: __%  functions: __%
@psau/api:      statements: __%  branches: __%  functions: __%
@psau/web:      statements: __%  branches: __%  functions: __%

Target: 85% statements, 85% branches, 88% functions
Status: [PASSING / FAILING]
```

---

## Active Work Log
*What are you working on right now?*

```
Current task: [describe]
Phase: [SEARCH / MAP / REASON / MODIFY]

Files I have read:
- [ ] [file path]

Files I plan to modify:
- [ ] [file path] — reason

Tests I will write first:
- [ ] [test name]

Uncertainties I resolved:
- [question] → [answer] → [source]

Uncertainties still open:
- [question] — [exploration steps I will take]
```

---

## Codebase Patterns Reference
*Document the patterns you discover so every module is consistent*

### Repository Pattern
```typescript
// All repositories follow this shape:
export class [Entity]Repository {
  constructor(private pool: Pool) {}
  
  async findById(id: number): Promise<[Entity] | null>
  async findAll(filters: [Entity]Filters, pagination: Pagination): Promise<[Entity][]>
  async create(data: Create[Entity]Input): Promise<[Entity]>
  async update(id: number, data: Partial<[Entity]>): Promise<[Entity]>
  async softDelete(id: number): Promise<void>
}
```

### Service Pattern
```typescript
// All services follow this shape:
export class [Entity]Service {
  constructor(
    private [entity]Repo: [Entity]Repository,
    private auditRepo: AuditLogRepository,
    // other dependencies
  ) {}
  
  // Methods throw AppError subtypes, never raw Error
  // Mutations use transactions
  // Emit metrics on significant events
}
```

### API Response Pattern
```typescript
// All success responses:
return ok(res, data, 'Optional message');           // 200
return created(res, data);                           // 201
return paginated(res, data, { total, page, limit }); // 200 with meta

// All error responses flow through global errorHandler middleware
// Controllers never catch errors — they propagate to errorHandler
```

---

## Migration History
*Track schema changes as they happen*

| Migration | What Changed | Rationale |
|-----------|-------------|-----------|
| [Add migrations as you create them] | | |
