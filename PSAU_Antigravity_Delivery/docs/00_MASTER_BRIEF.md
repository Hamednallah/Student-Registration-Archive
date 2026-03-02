# PSAU Academic Management System
## Master Engineering Brief — Google Antigravity Handoff
### Version 2.1 | Delivery Target: AWS Production

---

> **To Antigravity:** This document is your single source of truth and entry point.  
> Read every document in the `/docs` folder before writing a single line of code.  
> Ambiguity is not acceptable. If something is unclear, the spec is wrong — escalate immediately.

---

## 0. Document Map — Read In This Order

| # | File | Purpose | Must-Read |
|---|------|---------|-----------|
| 00 | `00_MASTER_BRIEF.md` | This file — orientation and rules | ✅ |
| 01 | `01_ARCHITECTURE.md` | System design, data flow, component map | ✅ |
| 02 | `02_QUALITY_STANDARDS.md` | Code quality rules you must follow | ✅ |
| 03 | `03_DOCKER_ENVIRONMENTS.md` | Dev / Test / Prod Docker setup | ✅ |
| 04 | `04_TESTING_STRATEGY.md` | Test plan, coverage targets, patterns | ✅ |
| 05 | `05_CI_CD_PIPELINE.md` | GitHub Actions pipeline — every stage | ✅ |
| 06 | `06_AWS_DEPLOYMENT.md` | v2.1 AWS infrastructure and delivery | ✅ |
| 07 | `07_MONITORING_OBSERVABILITY.md` | Metrics, alerting, SLOs, dashboards | ✅ |
| 08 | `08_RUNBOOK.md` | Operational procedures and incident response | ✅ |
| — | `COMPLETE_SPEC_FINAL.md` | Full system spec (academic rules, schema, API) | ✅ |

**Artifact files (implement exactly as specified):**
- `docker/docker-compose.dev.yml`
- `docker/docker-compose.test.yml`
- `docker/docker-compose.prod.yml`
- `docker/Dockerfile.api`
- `docker/Dockerfile.web`
- `ci/github-actions/*.yml`
- `aws/terraform/**`

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| System name | PSAU Academic Management System |
| Client | Port Sudan Ahlia University |
| Academic framework | نظام الساعات المعتمدة 2019 تعديل 2020 |
| Students | ~30,000 active |
| Peak concurrent users | ~5,000 (exam season) |
| Delivery environment | AWS (v2.1) |
| Version target | v2.1.0 |

---

## 2. Absolute Rules — Non-Negotiable

These rules govern every line of code, every config, every test Antigravity writes.

### 2.1 Academic Correctness
The GPA formulas from the Advising Guide are **immutable law**.  
Formula A (new course): `sgp = round(X / 25, 1)`  
Formula B (resit/repeat): `sgp = round((2/3) * (X/25 + 1), 1)`  
Pass mark: **50** (not 60 — the guide is explicit)  
Any deviation from these formulas is a critical defect, not a bug.

**Verification:** Unit tests for ALL examples from the Advising Guide (pages 33–43) must pass before any grade-related code is merged. These tests are the ground truth.

### 2.2 Security
- No hardcoded secrets anywhere — ever. Secrets live in AWS Secrets Manager.
- JWT access tokens: 15-minute expiry. Refresh tokens: 7-day expiry, httpOnly cookies.
- Every student-facing endpoint enforces `student_id = req.user.student_id` at the SQL level.
- The public register endpoint does not exist. User creation is admin-only.
- Helmet, rate limiting, CSRF protection are enabled from day one — not "to add later."

### 2.3 Data Integrity
- All DB writes to academic records use transactions.
- Grades are immutable once `entry_status = 'APPROVED'`. Any attempt to modify approved grades returns `409 GRADE_ALREADY_APPROVED`.
- The `grade_audit_log` records every change — this is not optional.
- Soft delete only — no hard deletes on students, grades, or academic records.

### 2.4 Bilingual Everything
- All user-facing strings have Arabic and English translations.
- All error responses include `message` (English) and `message_ar` (Arabic).
- RTL layout is not an afterthought — it is the primary layout direction.
- Test the UI in Arabic before testing it in English.

### 2.5 Zero Ambiguity Policy
If any instruction in these documents is ambiguous, stop and document the ambiguity with your interpretation, then proceed with your interpretation noted. Do not guess silently.

---

## 3. Tech Stack (Canonical — Do Not Deviate Without Written Approval)

### Backend
```
Runtime:          Node.js 20 LTS
Language:         TypeScript 5.4
Framework:        Express 4.x
Database:         PostgreSQL 15 (prod/test) | SQLite (dev only)
DB Client:        node-postgres (pg) with connection pooling
Cache:            Redis 7 (prod/test) | in-memory mock (dev)
Auth:             JWT (jsonwebtoken) + bcrypt (argon2 in future iteration)
Validation:       Zod 3
Logging:          Winston 3 + Morgan (HTTP)
Scheduling:       node-cron 3
Email:            Nodemailer (SES transport in prod)
PDF:              Puppeteer (transcript generation)
File uploads:     Multer (CSV migration uploads)
API docs:         swagger-jsdoc + swagger-ui-express
Testing:          Vitest + Supertest
```

### Frontend
```
Framework:        React 18.3
Language:         TypeScript 5.4
Build:            Vite 5.4
State (server):   TanStack Query v5
State (client):   Zustand 4
Routing:          React Router v6 (data router)
Forms:            React Hook Form 7 + Zod
UI:               shadcn/ui + Radix UI + Tailwind CSS 3
Tables:           TanStack Table v8 (virtualized)
Charts:           Recharts 2
i18n:             i18next + react-i18next
PDF viewer:       @react-pdf/renderer
HTTP:             Axios (typed)
Testing:          Vitest + React Testing Library + MSW 2 + Playwright
```

### Infrastructure (v2.1 — AWS)
```
Compute:          ECS Fargate (API) + CloudFront + S3 (Web)
Database:         RDS PostgreSQL 15 (Multi-AZ)
Cache:            ElastiCache Redis 7 (cluster mode)
File storage:     S3 (backups, migration files, transcript PDFs)
Secrets:          AWS Secrets Manager
DNS:              Route 53
TLS:              ACM (auto-renewed)
CDN:              CloudFront
Logs:             CloudWatch Logs
Metrics:          CloudWatch Metrics + Container Insights
Alerts:           CloudWatch Alarms → SNS → Email/Slack
IaC:              Terraform 1.7
CI/CD:            GitHub Actions
Container reg:    Amazon ECR
```

### Monorepo Structure
```
psau/
├── packages/
│   ├── shared/          @psau/shared     — types, constants, GPA formulas
│   ├── api/             @psau/api        — Express backend
│   └── web/             @psau/web        — React frontend
├── docker/              — all Docker and compose files
├── terraform/           — AWS infrastructure as code
├── .github/workflows/   — CI/CD pipelines
├── docs/                — this folder
└── scripts/             — utility scripts (seed, migrate, etc.)
```

---

## 4. Environments

| Environment | Purpose | Database | Redis | Domain |
|-------------|---------|----------|-------|--------|
| **dev** | Local development | SQLite | Mock (in-memory) | localhost |
| **test** | CI and integration tests | PostgreSQL 15 (Docker) | Redis 7 (Docker) | — |
| **prod** | Production (AWS) | RDS PostgreSQL 15 Multi-AZ | ElastiCache Redis 7 | psau.edu.sd |

**Dev environment** must be fully runnable with a single command:  
`docker compose -f docker/docker-compose.dev.yml up`

**Test environment** must be runnable with:  
`docker compose -f docker/docker-compose.test.yml up --abort-on-container-exit`

---

## 5. Branching Strategy

```
main          — production-ready code only. Protected. Requires PR + 2 reviews.
develop       — integration branch. All feature branches merge here.
feature/*     — feature branches. Branch from develop.
fix/*         — bug fix branches. Branch from develop (or main for hotfixes).
release/v*    — release branches. Cut from develop, merged to main + develop.
hotfix/*      — emergency fixes. Branch from main, merged to main + develop.
```

**Commit message format (Conventional Commits — enforced by Husky):**
```
type(scope): description

feat(grades): add bulk grade entry endpoint
fix(auth): clear token cache on logout
test(gpa): add substitution system formula tests
docs(api): update swagger for enrollment endpoints
refactor(student): extract ID generation to service
chore(deps): upgrade node-postgres to 8.12
```

---

## 6. Definition of Done

A feature is "done" only when ALL of the following are true:

- [ ] Code passes TypeScript compilation with zero errors (`--strict` mode)
- [ ] ESLint passes with zero warnings
- [ ] All existing tests continue to pass
- [ ] New code has unit tests meeting coverage threshold (85–90%)
- [ ] Integration tests cover the happy path and at least 2 error paths
- [ ] Swagger docs updated for any new/changed endpoint
- [ ] Arabic and English translations added for all new user-facing strings
- [ ] Tested manually in the dev environment
- [ ] Tested in the test environment via CI
- [ ] PR description explains what and why, with screenshots for UI changes
- [ ] Code reviewed and approved

---

## 7. Performance Targets (SLOs)

These are measurable targets, not aspirations.

| Operation | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| Authentication (login) | < 200ms | < 400ms | < 800ms |
| Student list (paginated) | < 100ms | < 250ms | < 500ms |
| Grade entry (single) | < 150ms | < 300ms | < 600ms |
| Transcript generation (PDF) | < 2s | < 4s | < 8s |
| Dashboard stats | < 300ms | < 600ms | < 1200ms |
| GPA recompute (single student) | < 500ms | < 1s | < 2s |
| Backup (30k students) | < 5min | < 8min | < 15min |

**Uptime target:** 99.5% monthly (allowing ~3.6 hours downtime/month)

---

## 8. Security Baseline

Before any environment is considered deployable:

- [ ] Dependency audit passes (`npm audit --audit-level=high`)
- [ ] No secrets in source code (gitleaks scan passes)
- [ ] Helmet headers verified on all responses
- [ ] Rate limits tested and confirmed active
- [ ] SQL injection tests pass (automated + manual)
- [ ] JWT secret is 256-bit minimum, rotatable without downtime
- [ ] All student data access is logged in `user_activity_log`
- [ ] Backup encryption verified (AES-256)

---

## 9. Delivery Phases

| Phase | Scope | Acceptance Criteria |
|-------|-------|---------------------|
| **Phase 0** | Monorepo, shared GPA lib, DB migrations, all 34 bug fixes | All GPA unit tests pass; no critical bugs from ANALYSIS.md |
| **Phase 1** | Auth (all roles incl. Student `S`), faculty/dept CRUD, student registration with new ID | Login works for all 6 roles; student ID generated correctly |
| **Phase 2** | Academic calendar, curriculum builder, course management | Coordinator can build full curriculum plan |
| **Phase 3** | Enrollment (single + bulk), prerequisite validation | Registrar can enroll 100 students in < 10 seconds |
| **Phase 4** | Grade entry, approval workflow, GPA computation | Grades flow: Instructor → Coordinator approval → CGPA computed |
| **Phase 5** | Student portal, transcripts, reports | Student can view transcript; PDF generates correctly |
| **Phase 6** | Backup system (local + Google Drive), migration wizard | Full DB backup completes; import wizard processes 30k student CSV |
| **Phase 7** | AWS deployment (v2.1), monitoring, alerting | System passes load test at 5k concurrent users |

---

## 10. Contacts & Escalation

All ambiguities and blockers must be documented in the project issue tracker with tag `[BLOCKER]` and assigned to the lead engineer immediately. No silent assumptions.
