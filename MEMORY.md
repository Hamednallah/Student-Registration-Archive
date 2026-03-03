# MEMORY.md

## Antigravity's Evolving Codebase Mental Model

### Update this file after every significant change. Commit it with your code

---

> **Instructions:** This file is your working memory. It grows as the codebase grows.
> Before starting any task, read this file. After completing any task, update it.
> Never let it be more than 2 days stale.

---

## Current Build State

```
Phase:          [x] 0-Foundation (PARTIALLY PASSING — ESLint + 95%+ coverage still needed in CI)
                [ ] 1-Auth  [ ] 2-Curriculum
                [ ] 3-Enrollment  [ ] 4-Grades  [ ] 5-Portal
                [ ] 6-Backup  [ ] 7-AWS
Last updated:   2026-03-03
Last commit:    feat(shared): correct SUST grade scale per §1.2 + add shared types + ESLint
Blocking issue: Phase 1 refactor needed (no Repository/Service layers yet in API)
```

---

## Module Inventory

| Module | Package | File | Status | Depends On | Notes |
|--------|---------|------|--------|-----------|-------|
| GPA formulas | shared | `lib/gpa.ts` | 🟢 Complete | — | 54/54 tests green, SUST grade scale correct |
| Shared academic types | shared | `types/academic.ts` | 🟢 Complete | — | EnrollmentType, GradeEntry, Transcript |
| Shared user types | shared | `types/users.ts` | 🟢 Complete | — | Role (A/R/C/I/U/S), AuthUser, JwtPayload |
| Shared API types | shared | `types/api.ts` | 🟢 Complete | — | ApiSuccess, ApiPaginated, ApiError (bilingual) |
| Grade constants | shared | `constants/grades.ts` | 🟢 Complete | types/academic | Grade scale, PASS_SCORE=50, thresholds |
| Auth middleware | api | `middleware/auth.ts` | 🟡 In progress | `config/env.ts` | JWT verify → req.user. Needs 15min+refresh fix |
| RBAC middleware | api | `middleware/rbac.ts` | 🟡 In progress | `middleware/auth.ts` | Basic done, needs testing |
| Zod validation middleware | api | `middleware/validate.ts` | 🔴 Not started | — | REQUIRED before Phase Gate 1 |
| Audit middleware | api | `middleware/audit.ts` | 🔴 Not started | — | Auto-logs to user_activity_log |
| DB config | api | `config/database.ts` | 🟢 Complete | `config/env.ts` | SQLite dev / PostgreSQL prod |
| Redis config | api | `config/redis.ts` | 🔴 Not started | `config/env.ts` | In-memory mock for dev |
| Error types | api | `lib/errors.ts` | 🟢 Complete | — | AppError hierarchy |
| Logger | api | `lib/logger.ts` (was config/logger.ts) | 🟢 Complete | `config/env.ts` | Winston |
| Response helpers | api | `lib/response.ts` | 🔴 Not started | — | ok(), created(), paginated() |
| Auth controller | api | `controllers/auth.controller.ts` | 🟡 In progress | DB directly (wrong) | No service/repo layer |
| Auth routes | api | `routes/v1/auth.ts` | 🟡 In progress | middleware | Exists but needs rework |
| User repository | api | `repositories/user.repository.ts` | 🔴 Not started | DB config | |
| Student repository | api | `repositories/student.repository.ts` | 🔴 Not started | DB config | keyset pagination |
| Auth service | api | `services/auth.service.ts` | 🔴 Not started | user.repo | 15min JWT + 7d refresh cookie |
| Student ID service | api | `services/student-id.service.ts` | 🔴 Not started | DB | YYYY-FF-DD-NNNN format |
| Grade service | api | `services/grade.service.ts` | 🔴 Not started | GPA formulas, DB | most complex |
| React app | web | `app/App.tsx` | 🟡 In progress | — | Exists but wrong structure (pages/ not features/) |
| Auth store | web | `features/auth/store.ts` | 🔴 Not started (was in pages/) | — | Zustand |
| Grade entry | web | `features/grades/GradeEntrySheet.tsx` | 🔴 Not started | — | most complex UI |
| Student portal | web | `features/portal/` | 🔴 Not started | — | role S |
| i18n | web | `lib/i18n.ts` + locales | 🔴 Not started | — | i18next required per spec |

Status: 🔴 Not started | 🟡 In progress | 🟢 Complete | ⚠️ Has issues

---

## What Was Built (Session History)

### Session 1 — Monorepo + GPA + API Scaffold

- Created pnpm monorepo: `@psau/shared`, `@psau/api`, `@psau/web`
- `packages/shared/src/lib/gpa.ts` — GPA formulas (Formula A/B, SGPA, CGPA, substitution)
- `packages/api` — Express app, Helmet/CORS/Morgan, auth+RBAC middleware, Winston logger
- `packages/api/db/migrations/001_initial_schema.sql` — initial PostgreSQL schema
- `packages/api/db/seeds/dev_seed.sql` — dev seed data
- `packages/web` — React 18 + Vite, Zustand, TanStack Query, login page, dashboard, students list
- Docker: `docker-compose.dev.yml`, `Dockerfile.api`, `Dockerfile.web`
- Git: pushed to Hamednallah/Student-Registration-Archive

### Session 2 — UI Theme Fix + Git Author Fix

- Rewrote `packages/web/src/index.css` — V1 purple/gold light-mode theme, Tajawal font
- Fixed university name: "جامعة بورتسودان الأهلية / Port Sudan Ahlia University" in all files
- Fixed git author: all commits now show <hamednallah@gmail.com>

### Session 3 — Spec Compliance Fixes

- **CRITICAL FIX:** `getLetterGrade()` corrected to SUST grade scale per §1.2
  - A+:3.6-4.0, A:3.2-3.5, B+:2.8-3.1, B:2.6-2.7, C+:2.4-2.5, C:2.0-2.3, F:<2.0
  - No D grade in SUST system
- **CRITICAL FIX:** `calculateSGPA()` — ALTERNATE now fully excluded per §1.3 + §1.7
- Expanded GPA test suite from 6 → 54 tests (all Advising Guide examples)
- Added `packages/shared/src/types/academic.ts` — academic domain types
- Added `packages/shared/src/types/users.ts` — role types + auth types
- Added `packages/shared/src/types/api.ts` — API envelope types (bilingual error)
- Added `packages/shared/src/constants/grades.ts` — SUST grade scale, PASS_SCORE=50
- Added `packages/shared/src/index.ts` — barrel export
- Added `.eslintrc.js` — per docs/02_QUALITY_STANDARDS.md
- Added `docker/docker-compose.test.yml` — per docs/03_DOCKER_ENVIRONMENTS.md
- Added `docker/docker-compose.prod.yml` — per docs/03_DOCKER_ENVIRONMENTS.md
- Added `docker/nginx.conf` — SPA + API proxy + security headers

---

## Known Issues / Tech Debt

| ID | Issue | Severity | File | Notes |
|----|-------|---------|------|-------|
| TD-001 | Auth uses single 24h JWT, no refresh token | HIGH | auth.controller.ts | Must fix for Phase Gate 1 |
| TD-002 | Auth controller queries DB directly (no service/repo layer) | HIGH | auth.controller.ts | Refactor in Phase 1 |
| TD-003 | No validate.ts middleware (Zod request validation) | HIGH | — | Required before Phase Gate 1 |
| TD-004 | No redis.ts config | MEDIUM | — | Phase 1 |
| TD-005 | Frontend uses pages/ structure, not features/ | HIGH | packages/web/src | Rework in Phase 2 |
| TD-006 | Frontend has no i18n (hardcoded Arabic strings) | HIGH | packages/web/src | Rework in Phase 2 |
| TD-007 | Frontend uses vanilla CSS not Tailwind + shadcn/ui | HIGH | packages/web/src | Rework in Phase 2 |
| TD-008 | No Swagger/OpenAPI annotations on any route | MEDIUM | packages/api | Required by Phase Gate 1 |

---

## Decisions Made

| # | Decision | Why | Alternative Rejected | Date |
|---|---------|-----|---------------------|------|
| 1 | Keyset pagination over OFFSET | OFFSET scans N rows; keyset uses index — critical for 30k students | OFFSET pagination | — |
| 2 | GPA pre-computed in student_semester_records | Can't compute CGPA for 30k on every request | On-demand | — |
| 3 | GPA recompute async (queue + job) | 200 grade approvals at exam time = timeout if sync | Sync | — |
| 4 | SQLite in dev, PostgreSQL in test/prod | Zero-config local setup | PostgreSQL everywhere | — |
| 5 | Zod for validation | TypeScript-native, client+server shared | Joi | — |
| 6 | SQL-level student_id enforcement | Defense-in-depth — bypassed middleware still protected | Middleware-only | — |
| 7 | APPROVED grades immutable | Legal academic records | Allow edits with audit | — |
| 8 | httpOnly refresh token cookie | XSS-safe for long-lived token | localStorage | — |
| 9 | SUST grade scale: A+:3.6, A:3.2, B+:2.8, B:2.6, C+:2.4, C:2.0, F:<2.0 | §1.2 of spec — NOT standard 4.0 | Standard 4.0 | 2026-03-03 |
| 10 | ALTERNATE fully excluded from SGPA | §1.3 + §1.7 spec — "ALTERNATE: excluded entirely from GPA" | Count in numerator | 2026-03-03 |

---

## External Dependencies

| Service | Used For | Config | Status |
|---------|---------|--------|--------|
| PostgreSQL 15 | Primary database (test/prod) | `DATABASE_URL` env var | Required |
| SQLite | Development database | `DATABASE_URL=sqlite:./data/psau.db` | Auto in dev |
| Redis 7 | Caching, GPA queue | `REDIS_URL` env var | Optional (in-memory fallback) |
| Google Drive | Backup destination | `GDRIVE_CLIENT_ID/SECRET` env vars | Optional |

---

## Migration History

| Migration | What Changed | Status |
|-----------|-------------|--------|
| 001_initial_schema.sql | All core tables (users, faculties, departments, courses, semesters, students, enrollments, grades, grade_audit_log, student_semester_records) | Applied in dev via SQLite |

---

## Active Work Log

```
Current task: Phase Gate 1 — Refactor API to Repository/Service/Controller layers
Phase: MODIFY

Files I will create next:
- [ ] packages/api/src/app.ts — Express app (separated from server.ts)
- [ ] packages/api/src/middleware/validate.ts — Zod validation
- [ ] packages/api/src/middleware/audit.ts — auto audit logging
- [ ] packages/api/src/config/redis.ts — in-memory mock for dev
- [ ] packages/api/src/lib/response.ts — ok(), created(), paginated()
- [ ] packages/api/src/repositories/user.repository.ts
- [ ] packages/api/src/repositories/student.repository.ts
- [ ] packages/api/src/services/auth.service.ts — 15min JWT + 7d httpOnly refresh
- [ ] packages/api/src/services/student-id.service.ts — YYYY-FF-DD-NNNN

Phase Gate 0 still needed:
- [ ] Run coverage check: `pnpm --filter @psau/shared test:coverage` → target 95%
- [ ] Run TypeScript check: `pnpm type-check`
```
