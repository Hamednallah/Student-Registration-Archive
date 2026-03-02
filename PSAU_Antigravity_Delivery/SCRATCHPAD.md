# SCRATCHPAD.md
## Antigravity's Per-Task Working Notes
### Reset this file at the start of each task. Archive completed tasks to MEMORY.md.

---

> **How to use this file:**
> 1. Before touching any code, fill out the SEARCH and MAP sections below.
> 2. Use REASON to plan your tests before writing implementation.
> 3. Use MODIFY log to track what you changed.
> 4. When done, copy the "Lessons Learned" to MEMORY.md and clear this file.

---

## Current Task

```
Task:          [Describe in one clear sentence what you are implementing]
Phase gate:    [Which phase gate does this belong to: 0/1/2/3/4/5/6/AWS-0..5]
Spec ref:      [docs/COMPLETE_SPEC_FINAL.md §X.Y  OR  ANALYSIS.md Bug#N]
Started:       [DATE TIME]
Status:        [ ] SEARCH  [ ] MAP  [ ] REASON  [ ] MODIFY  [ ] DONE
```

---

## PHASE 1: SEARCH — Discovery Results

### What exists related to this task?

```bash
# Commands I ran:
$ grep -rn "[symbol]" packages/ --include="*.ts" | head -20
# Results: [paste output or summarize]

$ find packages -name "*.ts" | xargs grep -l "[concept]"
# Results: [paste output or summarize]

$ grep -rn "import.*[module]" packages/ --include="*.ts"
# Results: [paste output or summarize]
```

### Files I read before writing code:
- [ ] `[file path]` — [what I learned]
- [ ] `[file path]` — [what I learned]
- [ ] `[file path]` — [what I learned]

### Existing tests for this area:
- [ ] `[test file]` — [what it tests]

### Most similar existing implementation (the pattern I will follow):
```
File: [path]
What it does: [description]
How my task is similar: [explanation]
How my task differs: [explanation]
```

---

## PHASE 2: MAP — Relationship Graph

### Related Symbols

```
Types involved:
  - [TypeName] in [file:line] — [what it represents]
  - [TypeName] in [file:line] — [what it represents]

Repository methods involved:
  - [RepositoryName].[method] in [file:line] — [what it does]
  - [RepositoryName].[method] in [file:line] — [what it does]

Service methods involved:
  - [ServiceName].[method] in [file:line] — [what it does]

Middleware in the request chain:
  - [middlewareName] in [file:line] — [what it validates/guards]
```

### Full Call Hierarchy

```
User action: [what the user does in the UI]

HTTP: [METHOD] /api/v1/[path]
  → Middleware: requireAuth → requireRole([roles]) → validate(zodSchema)
  → [controller].[method](req, res)
      extracts: [what fields from req]
  → [service].[method](params)
      validates: [business rules checked]
      calls: [repository methods]
      side effects: [audit log / metrics / queue / cache invalidation]
  → [repository].[method](data)
      SQL: [what the query does]
      returns: [what type]
  → Response: [HTTP status] { success, data }

React side:
  User action → [component event handler]
  → [custom hook].[mutation]
  → axios.[method] → API call above
  → TanStack Query cache invalidation: [which query keys]
  → UI re-render: [what the user sees]
```

### Dependencies — What Must Exist Before My Code Works

```
- [ ] [thing] must exist in [location] — [why]
- [ ] [thing] must be importable from [module] — [why]
- [ ] [migration] must have run — [what column/table it creates]
- [ ] [env var] must be set — [what it controls]
```

### Side Effects — What Else My Change Touches

```
- [component/file] will be affected because: [reason]
- [component/file] will be affected because: [reason]
```

---

## PHASE 3: REASON — Test Plan

**Write every test case here BEFORE opening the implementation file.**

### Unit Tests I Will Write First

```typescript
describe('[ServiceName].[methodName]', () => {
  // 1. Happy path
  it('[condition] → [expected output]', () => { ... });
  
  // 2. Boundary values
  it('[boundary condition] → [expected]', () => { ... });
  it('[other boundary] → [expected]', () => { ... });
  
  // 3. Error cases
  it('throws [ErrorType] when [condition]', () => { ... });
  it('throws [ErrorType] when [condition]', () => { ... });
  
  // 4. Edge cases specific to this feature
  it('[edge case] → [expected]', () => { ... });
  
  // 5. Regression (if fixing a bug)
  it('[bug description] does not recur [Bug#N]', () => { ... });
});
```

### Integration Tests I Will Write First

```typescript
describe('[METHOD] /api/v1/[path]', () => {
  it('returns 401 when unauthenticated', async () => { ... });
  it('returns 403 when role is [wrong role]', async () => { ... });
  it('returns 422 when [invalid input]', async () => { ... });
  it('returns 404 when [resource not found]', async () => { ... });
  it('returns [status] on happy path with [input]', async () => { ... });
  it('returns [error code] when [business rule violated]', async () => { ... });
  // Audit: if this creates an audit log entry:
  it('creates audit log entry with correct action', async () => { ... });
});
```

### E2E Tests (if UI change)

```typescript
test('[user story description]', async ({ page }) => {
  // 1. [Setup step]
  // 2. [User action]
  // 3. [Expected result]
  // 4. [Edge case behavior]
});
```

### Edge Cases I Must Handle

```
- [What if input is null/undefined?] → [how I handle it]
- [What if concurrent requests?] → [how I handle it]
- [What if dependent data doesn't exist?] → [how I handle it]
- [What is the boundary value behavior?] → [how I handle it]
```

### Migration Needed?

```sql
-- Migration: db/migrations/[TIMESTAMP]_[description].sql
-- New column: [column name] [type] [constraints]
-- New table: [if applicable]
-- New index: [column] — rationale: [why this index is needed]
-- Down migration: [how to reverse]
```

---

## PHASE 4: MODIFY — Implementation Log

### Changes Made

```
[TIME] Created: [file path]
  - [what I added and why]
  - Pattern followed from: [existing file]

[TIME] Modified: [file path:line range]
  - [what I changed and why]
  - Before: [brief description]
  - After: [brief description]

[TIME] Created test: [test file path]
  - [N] unit tests, [M] integration tests
  - All passing: [YES / NO — if NO, describe issue]

[TIME] Created migration: [migration file]
  - Adds: [description]
  - Verified: migration runs clean on test DB: [YES/NO]
```

### Unexpected Discoveries During Implementation

```
Discovery: [what you found that wasn't in the MAP]
Impact: [how it affects the implementation]
Decision: [what you decided to do about it]
Documented in: MEMORY.md §Decisions Made (entry #[N])
```

### Blockers / Open Questions

```
Blocker: [describe]
What I tried: [exploration steps]
What I need: [what information or file would resolve this]
Action: [ ] Asked in issue tracker  [ ] Documented interpretation and proceeding
```

---

## Lessons Learned (Copy to MEMORY.md when done)

```
Task completed: [DATE]
Time taken: [estimate]

What worked well:
- [observation]

What slowed me down:
- [observation] — could be improved by: [suggestion]

Patterns discovered:
- [pattern name] at [file] — [when to use it]

Decisions I made (add to MEMORY.md §Decisions Made):
- [decision] — [rationale]

Tests added:
- [N] unit, [M] integration, [K] E2E
- Coverage changed: [before]% → [after]%

Files I added to MEMORY.md Module Inventory:
- [module name] | [package] | [file] | 🟢 Complete
```

---

## Archive: Completed Tasks

*Append completed scratchpad summaries here in reverse chronological order.*

```
[DATE] — [Task name] — [N unit tests, M integration tests] — Coverage: X% → Y%
```
