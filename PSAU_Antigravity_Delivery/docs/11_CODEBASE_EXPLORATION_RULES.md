# Codebase Exploration Rules
## How Antigravity Must Work With This Repository

---

> Every rule here exists because senior engineers who skip these steps create bugs that
> are harder to fix than the original feature. You are working on a production codebase
> trusted with 30,000 students' academic records. Exploration is not optional. It is engineering.

---

## The Core Law: SEARCH → MAP → REASON → MODIFY

Never jump to MODIFY. The phases are sequential. You cannot skip.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│   SEARCH          MAP            REASON          MODIFY          │
│                                                                   │
│   "What         "How does      "What is       "Write code       │
│    exists?"      it connect?"   the right      that fits        │
│                               approach?"      the system"       │
│                                                                   │
│   grep           diagram        plan           implement         │
│   find           trace          test first     follow pattern    │
│   read           list deps      edge cases     update MEMORY     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: SEARCH — Discover Structure

Before modifying anything, answer these questions by reading the code:

### 1.1 What already exists?

```bash
# Find where a concept lives
grep -rn "gradePoint\|grade_point" packages/ --include="*.ts" | head -30

# Find all files in a feature area
find packages/api/src -name "*.ts" | xargs grep -l "enrollment" | sort

# Find all route definitions
grep -rn "router\.\(get\|post\|put\|patch\|delete\)" packages/api/src/routes/ --include="*.ts"

# Find all exported functions/classes from a module
grep -n "^export" packages/shared/src/lib/gpa.ts

# Find all imports of a specific symbol
grep -rn "import.*calculateGradePoint" packages/ --include="*.ts"

# Find all places a table is queried
grep -rn "FROM grades\|INTO grades\|UPDATE grades" packages/api/src/ --include="*.ts"
```

### 1.2 What does this function call?

```bash
# Find the implementation of a function
grep -n "calculateSGPA" packages/shared/src/lib/gpa.ts

# Find all callers
grep -rn "calculateSGPA" packages/ --include="*.ts"

# Trace the call chain: where does gradeService get called?
grep -rn "gradeService\." packages/api/src/ --include="*.ts"
grep -rn "GradeService" packages/api/src/ --include="*.ts"

# Find what a controller depends on
head -30 packages/api/src/controllers/grade.controller.ts
```

### 1.3 What tests exist?

```bash
# Find all test files for a feature
find packages -name "*.test.ts" -o -name "*.spec.ts" | xargs grep -l "Grade\|grade" | sort

# Understand what behaviors are already tested
grep -n "it\('\|it\(\"\|describe\(" packages/api/src/__tests__/integration/grades.test.ts

# Find the test helper structure
ls packages/api/src/__tests__/helpers/
```

### 1.4 What migrations exist?

```bash
# See all migrations in order
ls -1 db/migrations/ | sort

# Read the latest migration to understand current schema
cat db/migrations/$(ls -1 db/migrations/ | sort | tail -1)

# Find the table you need
grep -l "CREATE TABLE grades\|ALTER TABLE grades" db/migrations/
```

---

## Phase 2: MAP — Build the Relationship Graph

Before writing code, write this analysis block. Put it in a comment or in MEMORY.md:

```
TASK: [What you are implementing]
SPEC REFERENCE: [COMPLETE_SPEC_FINAL.md §X.Y or ANALYSIS.md BugN]

RELATED SYMBOLS:
  Types:
    - [TypeName] in [file] — [what it represents]
  Repository methods:
    - [RepositoryName].[method] in [file] — [what it does]
  Service methods:
    - [ServiceName].[method] in [file] — [how it's called]
  Middleware:
    - [middleware] in [file] — [what it validates/guards]

CALL HIERARCHY (trace the full request path):
  [HTTP verb] /api/v1/[endpoint]
    → [controller].[method]
    → [service].[method]
    → [repository].[method]
    → [SQL statement]
    → [side effects: audit log, metrics, cache invalidation, queue]

DEPENDENCIES (what must exist before my code):
  - [thing] must exist in [location]
  - [thing] must be imported from [module]

ENTRY POINTS (how users trigger this):
  - [UI action] → [API call]
  - [scheduled job] → [method call]
  - [event] → [handler]

SIDE EFFECTS (what else my change touches):
  - [effect] in [component] — [why]
  - [effect] in [component] — [why]

EXISTING PATTERN I WILL FOLLOW:
  [Which existing feature/file is most similar to what I'm building?]
  [File path of the pattern I'm following:]
```

---

## Phase 3: REASON — Plan Before Implementing

Answer all of these. If you cannot answer one, explore more first.

### 3.1 What is the correct approach?

Read the most similar existing implementation. Find it with:
```bash
# Most similar feature to what you're building:
grep -rn "[concept]" packages/api/src/services/ --include="*.ts" -l
```

Your implementation **must follow the same pattern**. No introducing new patterns without documenting why in MEMORY.md.

### 3.2 What tests will you write FIRST?

List every test case before opening the implementation file:

```
Unit tests:
  1. [service].[method]: [condition] → [expected output]
  2. [service].[method]: [condition] → [expected output]
  (minimum 5 cases per service method)

Integration tests:
  1. Happy path: [full request → response]
  2. Auth error: unauthenticated → 401
  3. Auth error: wrong role → 403
  4. Validation error: [invalid input] → 422
  5. Not found: [missing resource] → 404
  6. Business rule violation: [condition] → [error code]

Edge cases:
  - Null/undefined inputs
  - Boundary values (e.g., credit hours exactly 12, exactly 20)
  - Concurrent access (e.g., two instructors submitting same offering simultaneously)
  - Race conditions in GPA recompute
```

### 3.3 What migrations are needed?

Before writing any application code, write the migration:
```bash
# Create migration file
touch db/migrations/$(date +%Y%m%d%H%M%S)_[description].sql

# Migration must have:
# - BEGIN / COMMIT
# - Description comment
# - Down migration commented at bottom
# - Index rationale comments
```

### 3.4 What could go wrong?

Specifically for academic data:
- What if a grade is approved while you're computing CGPA?
- What if a student transfers departments mid-semester?
- What if the GPA queue processes a student twice simultaneously?
- What if attendance % is entered as 0.75 instead of 75?

---

## Phase 4: MODIFY — Implement With Discipline

### 4.1 Rules for every change

```
1. Write the failing test FIRST (Red)
2. Write the minimal implementation to make it pass (Green)  
3. Refactor if needed, keeping tests green (Refactor)
4. Check: does it follow the existing codebase pattern? (Consistency)
5. Run the full test suite — no regressions (Verify)
6. Update MEMORY.md (Document)
7. Commit with conventional commit message (Commit)
```

### 4.2 Never introduce a new pattern without justification

```typescript
// ❌ Wrong: inventing a new pattern because you prefer it
class GradeManager {  // We use Repository pattern, not Manager
  async process(id: number) { ... }
}

// ✅ Right: follow the existing pattern
class GradeRepository {
  async findById(id: number): Promise<Grade | null> { ... }
  async approve(id: number, approverId: number): Promise<Grade> { ... }
}
```

### 4.3 Every query must be explained

```typescript
// ✅ Always name columns explicitly — no SELECT *
const result = await pool.query<GradeRow>(`
  -- Phase 4: Grade approval — fetch grade with student context for audit log
  SELECT 
    g.grade_id,
    g.enrollment_id,
    g.total_score,
    g.grade_point,
    g.letter_grade,
    g.entry_status,
    e.student_id,
    e.enrollment_type,
    co.semester_id
  FROM grades g
  JOIN enrollments e ON e.enrollment_id = g.enrollment_id
  JOIN course_offerings co ON co.offering_id = e.offering_id
  WHERE g.grade_id = $1
    AND g.entry_status = 'SUBMITTED'
  FOR UPDATE                      -- Lock row during approval transaction
`, [gradeId]);

// After writing: run EXPLAIN ANALYZE in psql
// Paste the output in a comment below the query
// If Seq Scan on table > 1000 rows: add index before merging
```

### 4.4 After every significant change

Update `MEMORY.md`:
```markdown
## Change: [Date]
- Added: [what you added and why]
- Modified: [what you changed and why]  
- Pattern used: [existing pattern you followed]
- Tests added: [N unit, M integration]
- Coverage: [before → after]
- Migration: [migration filename if applicable]
- Open issues: [anything that needs follow-up]
```

---

## File Type Strategy for Each Purpose

| You need to... | File type | Why |
|---|---|---|
| Understand the codebase | `MEMORY.md` | Your evolving mental model |
| Know the rules | `AGENTS.md` | Identity and workflow |
| Know the system spec | `docs/COMPLETE_SPEC_FINAL.md` | Academic rules, schema, API |
| Know what bugs were fixed | `docs/ANALYSIS.md` | 34 original bugs, all resolved |
| Know the quality rules | `docs/02_QUALITY_STANDARDS.md` | TypeScript, ESLint, patterns |
| Know the test strategy | `docs/04_TESTING_STRATEGY.md` | Coverage targets, all test patterns |
| Know what to build next | `docs/10_VERSION_DELIVERY_PLAN.md` | Phase gates and acceptance criteria |
| Know the AWS setup | `docs/06_AWS_DEPLOYMENT.md` | Terraform, deployment steps |
| Know how to operate | `docs/08_RUNBOOK.md` | Incident playbooks, maintenance |
| Understand a decision | `MEMORY.md §Decisions Made` | Every non-obvious choice explained |
| Trace data flow | `MEMORY.md §Data Flow Map` | Request-to-response traces |
| Know what's next | `MEMORY.md §Current Build State` | Phase progress |

---

## Specific Exploration Commands for This Codebase

```bash
# "How does GPA calculation work?"
cat packages/shared/src/lib/gpa.ts
cat packages/shared/src/__tests__/gpa.test.ts
grep -rn "calculateCGPA\|calculateSGPA" packages/api/src/ --include="*.ts"

# "How is a route protected?"
cat packages/api/src/middleware/auth.ts
cat packages/api/src/middleware/rbac.ts
grep -n "requireAuth\|requireRole" packages/api/src/routes/v1/grades.ts

# "How are errors returned?"
cat packages/api/src/lib/errors.ts
cat packages/api/src/middleware/error-handler.ts
grep -rn "throw new.*Error\|throw new NotFound\|throw new Conflict" packages/api/src/services/ --include="*.ts" | head -10

# "What does the student portal see?"
cat packages/api/src/routes/v1/student-portal.ts
grep -n "student_id.*req.user\|req.user.*student_id" packages/api/src/ -r --include="*.ts"

# "What's the database schema right now?"
ls -1 db/migrations/ | sort | tail -5  # Recent migrations
psql $DATABASE_URL -c "\d grades"       # In test environment

# "What does an integration test look like here?"
cat packages/api/src/__tests__/integration/grades.test.ts
cat packages/api/src/__tests__/helpers/test-db.ts  # Test utilities

# "What CSS/style patterns does the frontend use?"
grep -rn "cn(\|className=" packages/web/src/components/ui/ --include="*.tsx" | head -20
```

---

## Red Flags — Stop and Investigate If You See These

| Red flag | What it means | What to do |
|---|---|---|
| Seq Scan in EXPLAIN ANALYZE on table > 1000 rows | Missing index | Add index before merging |
| `any` in TypeScript | Type safety hole | Fix the type |
| `catch (e) {}` (empty catch) | Error swallowed silently | Handle or log the error |
| `console.log` | Not production-safe | Replace with logger |
| String concatenation in SQL | SQL injection risk | Parameterize |
| Multiple awaits in a loop | N+1 query | Batch or JOIN |
| Mutation of approved grade succeeds | Data integrity breach | Add guard immediately |
| GPA formula result differs from manual calculation | Academic error | STOP and fix |
| Test passes without implementation | Test is wrong | Fix the test |
| > 3 files changed for a "simple" fix | Ripple effect detected | Re-scope, document impact |
