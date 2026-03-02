# Architecture Decision Records (ADRs)
## Every Significant Decision, Why It Was Made, What Was Rejected

> ADRs prevent re-litigation. Before questioning any decision here, read its record.
> If you still believe a decision should change, write a new ADR proposing the change
> with evidence, add it here, and discuss before implementing.

---

## ADR-001: GPA Formulas Are Immutable — Cannot Be Changed Without Advising Guide Update

**Status:** Accepted  
**Date:** 2025-01  
**Context:** The SUST Credit Hour System 2019/2020 defines specific formulas for grade point calculation. These differ from standard 4.0 GPA systems used elsewhere.

**Decision:** The formulas in `packages/shared/src/lib/gpa.ts` are treated as academic law. They encode the Advising Guide (pages 33–43) exactly. No one — not an engineer, not a product manager — can change them without a formal update to the Advising Guide and explicit re-approval.

**Formulas:**
- Formula A (NEW): `sgp = round(X / 25, 1)`
- Formula B (RESIT/REPEAT): `sgp = round((2/3) * (X/25 + 1), 1)`
- Pass mark: 50 (not 60)

**Consequences:** 
- All GPA formula test cases are legally binding, not optional
- Any refactoring of this file requires re-running all Advising Guide examples as tests
- The `@psau/shared` package gets higher coverage targets (95%) than other packages for this reason

**Alternatives rejected:**
- Standard 4.0 GPA (A=4.0, B=3.0, etc.): Rejected because SUST uses a different scale
- Hardcoding in the API: Rejected because the client needs the same formula for live preview

---

## ADR-002: Student Data Access Enforced at SQL Level (Not Just Middleware)

**Status:** Accepted  
**Date:** 2025-01  
**Context:** Students (role S) must only see their own records. This could be enforced only at the route/middleware level.

**Decision:** Every database query for student-specific data includes `WHERE student_id = $1` where `$1` is `req.user.studentId` (from the JWT token). This is in addition to the RBAC middleware check.

**Why not middleware-only:**  
Defense in depth. If a middleware is accidentally removed, bypassed, or misconfigured, the SQL WHERE clause still protects the data. One layer of security is not enough for student academic records.

**Implementation:**
```typescript
// In every student portal repository method:
async getTranscript(studentId: string): Promise<TranscriptRow[]> {
  return pool.query(`
    SELECT ...
    FROM grades g
    JOIN enrollments e ON e.enrollment_id = g.enrollment_id
    WHERE e.student_id = $1   ← This is never req.body.studentId
                               ← Always req.user.studentId from JWT
  `, [studentId]);
}
// studentId comes only from JWT — never from request body or URL params
```

**Consequences:** All student portal repository methods take `studentId` as a parameter sourced from the JWT token, not from URL parameters.

---

## ADR-003: Monorepo with Shared GPA Library

**Status:** Accepted  
**Date:** 2025-01  
**Context:** The frontend shows a live grade preview as the instructor types. The backend computes the final grades. Both must use identical formulas.

**Decision:** A monorepo with `@psau/shared` package containing:
- GPA formulas (used by both API and Web)
- TypeScript types (shared interface definitions)
- Constants (grade scale, enrollment types, role codes)

**Why not separate repos:**  
If the GPA formula is in two places, they will drift. A bug fix in the backend formula won't be applied to the frontend preview, causing the instructor to see a different grade than what the system actually stores. This is a data integrity issue.

**Why not just the backend:**  
The frontend needs to compute grades client-side for the live preview UX (before the user submits, they see what grade will be assigned). Making an API call on every keystroke would add 150ms+ latency to each keystroke — unacceptable UX.

**Consequences:**
- `@psau/shared` builds to both CommonJS (for Node.js API) and ESM (for Vite web)
- `@psau/shared` has the strictest test coverage requirement (95%)
- Any change to `gpa.ts` must pass all Advising Guide test cases

---

## ADR-004: PostgreSQL in Test/Prod, SQLite in Dev

**Status:** Accepted  
**Date:** 2025-01  
**Context:** Developers need to run the system locally without installing PostgreSQL. Production requires PostgreSQL for performance and reliability.

**Decision:** Database adapter pattern:
- `NODE_ENV=development`: SQLite via `better-sqlite3`
- `NODE_ENV=test` and `NODE_ENV=production`: PostgreSQL via `pg`

**Why SQLite in dev (not Dockerized PostgreSQL):**  
Developer experience. `docker compose up` should just work with no configuration. SQLite needs no daemon, no password, no port — it's a file. A developer should be able to clone the repo and have it running in 60 seconds.

**Why PostgreSQL in test (not SQLite):**  
Tests must catch PostgreSQL-specific behavior: trigger semantics, JSONB, array types, `ILIKE`, `pg_trgm` extensions, concurrent transaction behavior. SQLite doesn't support all of these.

**Consequences:**
- SQL must be written to work on both (no PostgreSQL-specific syntax in queries)
- Exception: tests explicitly testing PostgreSQL features can use PostgreSQL-only syntax
- The database config module detects `DATABASE_URL` prefix (`sqlite:` vs `postgresql:`)

---

## ADR-005: GPA Recomputation Is Asynchronous (Queue + Background Job)

**Status:** Accepted  
**Date:** 2025-01  
**Context:** When a grade is approved, the student's SGPA and CGPA must be recomputed. During exam season, a coordinator may approve 200+ grades in a few minutes.

**Decision:** Grade approval enqueues the student ID. A background job (`gpa.job.ts`) processes the queue every 5 minutes in batches of 100.

**Why not synchronous:**  
Approving a grade would trigger CGPA recomputation, which requires reading all of the student's grades across all semesters, applying the substitution system, and computing academic standing. This takes ~50–200ms per student. If 200 grades are approved simultaneously, 200 concurrent DB operations would saturate the connection pool and cause timeouts for other users. The coordinator UI would hang for seconds while CGPA recomputes.

**Why not event-driven (pub/sub):**  
Over-engineered for 30,000 students. A simple queue table in the database is sufficient, observable, and easy to debug. Event-driven systems add operational complexity (message queue infrastructure, at-least-once delivery handling, dead letter queues).

**Consequences:**
- After a grade is approved, the student's CGPA may be stale for up to 5 minutes
- This is acceptable — students are not looking at their CGPA the moment a grade is approved
- The queue table (`gpa_recompute_queue`) is observable: `SELECT * FROM gpa_recompute_queue;`
- If the job fails, students have stale CGPAs until the job runs successfully

---

## ADR-006: APPROVED Grades Are Immutable

**Status:** Accepted  
**Date:** 2025-01  
**Context:** Once a coordinator approves a grade, can it be changed?

**Decision:** No. An APPROVED grade cannot be modified through any API endpoint. The API returns `409 GRADE_ALREADY_APPROVED` for any modification attempt on an approved grade.

**Rationale:** An approved grade is a legal academic record. Once approved, it represents the university's official position on that student's performance. Allowing modification creates liability, undermines academic integrity, and makes the audit log meaningless.

**How to correct a wrong approved grade:** Admin-only operation, not through the normal grade UI. Admin can set grade status back to DRAFT with a mandatory reason. This creates an audit log entry with the reason and the admin's identity. The grade is then re-submitted and re-approved through the normal workflow.

**Consequences:**
- Grade entry UI disables all inputs for APPROVED grades
- The `grade_audit_log` records the correction with full context
- No bulk "fix grades" operation exists — every correction is one at a time, deliberate

---

## ADR-007: Student ID Format YYYY-FF-DD-NNNN

**Status:** Accepted  
**Date:** 2025-01  
**Context:** Students need a unique, human-readable identifier. Multiple formats were considered.

**Decision:** `YYYY-FF-DD-NNNN` where:
- YYYY = admission year (2024)
- FF = faculty code, zero-padded to 2 digits (01)
- DD = department number within faculty, zero-padded (03)
- NNNN = sequential number for that year+faculty+dept (0047)

**Example:** `2024-01-03-0047` = admitted 2024, Faculty 01, Department 03 of that faculty, 47th student that year in that department.

**Why not UUID:**  
UUIDs are opaque. A registrar looking at `2024-01-03-0047` immediately knows: 2024 cohort, first faculty, third department. A UUID conveys nothing. Institutional IDs should be human-readable.

**Why not sequential integers:**  
Sequential integers don't encode admission year or department. They also look arbitrary and become ambiguous when migrating from a previous system that used a different numbering scheme.

**Why not SSN/national ID:**  
Privacy. Students' national ID numbers should not be the system's primary key. The system ID is generated by the university for the purpose of this system.

**Consequences:**
- ID generation uses an atomic sequence table to prevent duplicates under concurrent admission
- Stored as `VARCHAR(15)` with dashes
- Sortable alphabetically = sortable chronologically (by year, then faculty, then dept, then student)
- All foreign keys reference this VARCHAR(15) format

---

## ADR-008: Keyset Pagination for Student and Enrollment Lists

**Status:** Accepted  
**Date:** 2025-01  
**Context:** Student list with 30,000 records, paginated 50 at a time.

**Decision:** Use keyset (cursor) pagination, not OFFSET pagination.

**Why not OFFSET:**
```sql
-- OFFSET scans N rows to discard them
SELECT * FROM students ORDER BY student_id LIMIT 50 OFFSET 5000;
-- PostgreSQL reads 5,050 rows to return 50. Gets worse every page.

-- Keyset uses the index directly
SELECT * FROM students WHERE student_id > '2022-01-01-0050' LIMIT 50;
-- PostgreSQL seeks to that position in the index, reads 50 rows. Same cost always.
```

At page 600 (30,000 students / 50 per page), OFFSET would scan 30,000 rows. Keyset scans 50. The difference is 600x.

**Consequences:**
- API returns `{ data: [...], nextCursor: "2022-01-01-0150" | null }` instead of `{ total, page, pages }`
- The frontend cannot jump to "page 47" — it can only go next/previous
- Search results still use OFFSET (typically small result sets, < 200 rows)
- New API shape: `GET /students?cursor=2022-01-01-0050&limit=50`

---

## ADR-009: React State Strategy — Zustand + TanStack Query (Not Redux)

**Status:** Accepted  
**Date:** 2025-01  
**Context:** The frontend needs state management for server data (student lists, grades) and client state (auth, UI state).

**Decision:** 
- **Server state:** TanStack Query v5 (fetching, caching, invalidation, optimistic updates)
- **Client state:** Zustand (auth token, UI preferences, language)
- **Form state:** React Hook Form (local to each form component)

**Why not Redux:**  
Redux adds boilerplate for this use case. The codebase has no need for a global action bus or time-travel debugging. TanStack Query handles all the complex cases (background refresh, cache invalidation, optimistic updates) that used to require Redux middleware like Redux Saga.

**Why Zustand (not Context API):**  
Context API re-renders all consumers when any value changes. Zustand is selector-based — components only re-render when the specific slice they subscribe to changes.

**Consequences:**
- No Redux in this codebase. If you see someone adding `redux` or `@reduxjs/toolkit`, reject the PR.
- Server state (grades, students, etc.) is ALWAYS fetched via TanStack Query, never stored in Zustand
- Auth state (token, user info, role) lives in Zustand

---

## ADR-010: Terraform for AWS Infrastructure (Not AWS CDK or SAM)

**Status:** Accepted  
**Date:** 2025-01  
**Context:** v2.1 requires AWS infrastructure provisioning.

**Decision:** Terraform with HCL configuration.

**Why not AWS CDK:**  
CDK uses TypeScript/Python to generate CloudFormation. While it's more powerful, it adds a compile step, requires understanding both CDK abstractions and the underlying CloudFormation. The infrastructure for this project is straightforward enough that HCL Terraform is more readable and maintainable.

**Why not manual console setup:**  
Not reproducible. Not auditable. Cannot be version-controlled. Infrastructure created manually cannot be recreated after a disaster or validated by code review.

**Why Terraform over CloudFormation directly:**  
Terraform state management is simpler. Terraform has better tooling (plan, show, workspace). Terraform works across providers (if we ever add non-AWS resources). Terraform community modules are more mature.

**Consequences:**
- All infrastructure changes go through `terraform plan` review before `apply`
- Infrastructure state stored in S3 with versioning
- No AWS console changes are allowed — everything through Terraform
- Exception: manual secret creation in Secrets Manager (not stored in Terraform state for security)
