# Quality Standards
## Rules Antigravity Must Follow — No Exceptions

---

## 1. TypeScript Standards

### Strict Mode — Always On
```json
// tsconfig.json — applies to ALL packages
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

**`any` is banned.** Use `unknown` and narrow it. ESLint rule `@typescript-eslint/no-explicit-any` is set to `error`.

### Type Naming
```typescript
// Interfaces: PascalCase with noun
interface StudentRecord { ... }
interface GradeEntry { ... }

// Types (unions/intersections): PascalCase
type EnrollmentType = 'NEW' | 'RESIT' | 'REPEAT' | 'ALTERNATE' | 'DEPRIVED';
type Role = 'A' | 'R' | 'C' | 'I' | 'U' | 'S';

// Enums: only for truly fixed values (prefer const objects for flexibility)
// ❌ Don't use TypeScript enums (they transpile poorly)
// ✅ Use const objects + type extraction:
const ENROLLMENT_TYPE = {
  NEW: 'NEW',
  RESIT: 'RESIT',
  REPEAT: 'REPEAT',
} as const;
type EnrollmentType = typeof ENROLLMENT_TYPE[keyof typeof ENROLLMENT_TYPE];
```

### No Type Assertions Without Comment
```typescript
// ❌ Silent cast — forbidden
const user = req.user as AuthUser;

// ✅ Assertion with rationale — allowed
// Zod middleware guarantees req.user is AuthUser at this point in the chain
const user = req.user as AuthUser;

// ✅ Better: use a type guard
function isAuthUser(u: unknown): u is AuthUser {
  return typeof u === 'object' && u !== null && 'userId' in u;
}
```

---

## 2. ESLint Configuration

```javascript
// .eslintrc.js — root config
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: './tsconfig.json' },
  plugins: ['@typescript-eslint', 'import', 'security'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/strict-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:import/typescript',
    'plugin:security/recommended',
  ],
  rules: {
    // Absolute bans
    'no-console': 'error',                    // use logger
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',  // use optional chain
    'no-var': 'error',
    
    // Import order (enforced)
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc' }
    }],
    
    // Code quality
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',  // must await or void
    '@typescript-eslint/no-misused-promises': 'error',
    'no-return-await': 'off',
    '@typescript-eslint/return-await': ['error', 'in-try-catch'],  // needed for proper stack traces
    
    // Security
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    
    // React-specific (web package only)
    'react-hooks/exhaustive-deps': 'error',
    'react-hooks/rules-of-hooks': 'error',
  }
};
```

---

## 3. Code Structure Rules

### Service Layer Pattern (Backend)
Every business logic operation lives in a Service. Controllers only:
1. Extract validated input from `req`
2. Call a service method
3. Return the response

```typescript
// ✅ Correct — thin controller
export const gradeController = {
  async submitGrade(req: Request, res: Response) {
    const { enrollmentId } = req.params;
    const result = await gradeService.submit(Number(enrollmentId), req.user.userId);
    return ok(res, result);
  }
};

// ❌ Wrong — fat controller with business logic
export const gradeController = {
  async submitGrade(req: Request, res: Response) {
    const grade = await db('grades').where({ enrollment_id: req.params.enrollmentId }).first();
    if (grade.entry_status !== 'DRAFT') throw new ApiError('GRADE_NOT_DRAFT', 409);
    await db('grades').update({ entry_status: 'SUBMITTED', submitted_at: new Date() });
    // ... business logic does not belong here
  }
};
```

### Repository Pattern (Database Access)
No raw SQL in services. SQL lives in repository classes.

```typescript
// repositories/grade.repository.ts
export class GradeRepository {
  async findByEnrollment(enrollmentId: number): Promise<Grade | null> {
    const row = await pool.query<GradeRow>(
      `SELECT g.*, e.student_id, e.enrollment_type
       FROM grades g
       JOIN enrollments e ON e.enrollment_id = g.enrollment_id
       WHERE g.enrollment_id = $1`,
      [enrollmentId]
    );
    return row.rows[0] ? mapGradeRow(row.rows[0]) : null;
  }
}
```

### Error Handling
All errors must flow through the error hierarchy:

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly messageAr: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string | number) {
    super(`${resource.toUpperCase()}_NOT_FOUND`, 404,
      `${resource} غير موجود`,
      `${resource} with id ${id} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, messageAr: string) {
    super(code, 409, messageAr, message);
  }
}

export class ValidationError extends AppError {
  constructor(public readonly details: ZodError) {
    super('VALIDATION_ERROR', 422, 'خطأ في البيانات المدخلة', 'Validation failed');
  }
}

// Global error handler (always last middleware)
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn('Application error', { code: err.code, requestId: req.id });
    return res.status(err.httpStatus).json({
      success: false,
      error: { code: err.code, message: err.message, message_ar: err.messageAr }
    });
  }
  
  logger.error('Unhandled error', { err, requestId: req.id });
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', message_ar: 'حدث خطأ غير متوقع' }
  });
}
```

---

## 4. Database Standards

### Migration Files
Migrations use sequential timestamps. Never edit a committed migration — add a new one.

```
db/migrations/
  20240101000001_create_faculties.sql
  20240101000002_create_departments_update.sql
  20240101000003_create_academic_years.sql
  ...
```

Migration file format:
```sql
-- 20240101000001_create_faculties.sql
-- Description: Creates faculties table for university hierarchy
-- Author: Antigravity
-- Date: 2024-01-01

BEGIN;

CREATE TABLE faculties (
  faculty_id   SMALLSERIAL  PRIMARY KEY,
  ...
);

-- Always document index rationale
-- Index: name lookup and faculty filter on student queries
CREATE INDEX idx_faculties_code ON faculties(faculty_code);

COMMIT;
```

### Query Rules
```typescript
// ❌ Never build SQL with string concatenation
const query = `SELECT * FROM students WHERE name = '${name}'`;  // SQL INJECTION

// ✅ Always parameterize
const result = await pool.query(
  'SELECT * FROM students WHERE name_ar ILIKE $1',
  [`%${name}%`]
);

// ❌ Never SELECT *
const rows = await pool.query('SELECT * FROM grades');

// ✅ Always name columns explicitly
const rows = await pool.query(`
  SELECT g.grade_id, g.total_score, g.grade_point, g.letter_grade,
         g.entry_status, e.student_id, e.enrollment_type
  FROM grades g
  JOIN enrollments e ON e.enrollment_id = g.enrollment_id
  WHERE g.enrollment_id = $1
`, [enrollmentId]);

// ❌ Never use OFFSET for pagination on large tables
const rows = await pool.query('SELECT * FROM students LIMIT 50 OFFSET 5000');

// ✅ Keyset pagination on student_id (indexed)
const rows = await pool.query(
  'SELECT * FROM students WHERE student_id > $1 ORDER BY student_id LIMIT $2',
  [cursor, limit]
);
```

### Transaction Rules
All multi-table writes must use transactions:

```typescript
async function approveGrade(gradeId: number, approverId: number): Promise<Grade> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const grade = await gradeRepository.findById(gradeId, client);
    if (grade.entry_status !== 'SUBMITTED') {
      throw new ConflictError('GRADE_NOT_SUBMITTED', 'Grade must be submitted before approval', 'يجب تقديم الدرجة قبل الموافقة عليها');
    }
    
    const updated = await gradeRepository.approve(gradeId, approverId, client);
    await auditLogRepository.log({ ... }, client);
    await gpaQueue.enqueue(grade.studentId, client);
    
    await client.query('COMMIT');
    return updated;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

---

## 5. API Standards

### Every Endpoint Must Have
1. Authentication middleware (`requireAuth`)
2. Authorization middleware (`requireRole(['A', 'R'])`)
3. Zod validation middleware for body/params/query
4. Swagger JSDoc comment
5. Error handling (via the global error handler — no try/catch in routes)

```typescript
/**
 * @openapi
 * /api/v1/grades/{enrollmentId}/approve:
 *   post:
 *     tags: [Grades]
 *     summary: Approve a submitted grade
 *     description: Marks a grade as approved. Only Coordinators and Admins can approve.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApproveGradeInput'
 *     responses:
 *       200:
 *         description: Grade approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Grade not found
 *       409:
 *         description: Grade not in SUBMITTED status
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  '/grades/:enrollmentId/approve',
  requireAuth,
  requireRole(['A', 'C']),
  validate(approveGradeSchema),
  asyncHandler(gradeController.approve)
);
```

### Response Shape (No Exceptions)
```typescript
// Success
{ "success": true, "data": { ... }, "message": "Grade approved" }

// Success with pagination
{
  "success": true,
  "data": [...],
  "meta": { "total": 1250, "page": 1, "limit": 50, "pages": 25 }
}

// Error
{
  "success": false,
  "error": {
    "code": "GRADE_ALREADY_APPROVED",
    "message": "Cannot modify an approved grade",
    "message_ar": "لا يمكن تعديل درجة معتمدة"
  }
}
```

---

## 6. React/Frontend Standards

### Component Rules
```typescript
// ❌ Class components — forbidden
class StudentCard extends React.Component { ... }

// ✅ Functional components only
export function StudentCard({ student }: StudentCardProps) { ... }

// ❌ Default exports for components — avoid (makes refactoring harder)
export default function StudentCard() { ... }

// ✅ Named exports
export function StudentCard() { ... }
// Exception: page-level components (React Router convention)
```

### Custom Hooks
All non-trivial state logic lives in custom hooks:

```typescript
// features/grades/hooks/useGradeEntry.ts
export function useGradeEntry(offeringId: number) {
  const { data: grades, isLoading, error } = useOfferingGrades(offeringId);
  const updateMutation = useUpdateGrade();
  const submitMutation = useSubmitGrade();
  
  const handleScoreChange = useCallback((enrollmentId: number, component: GradeComponent, value: number) => {
    // client-side preview calculation using @psau/shared formula
    const preview = calculateGradePreview(value, component);
    // optimistic update
    updateMutation.mutate({ enrollmentId, component, value, preview });
  }, [updateMutation]);
  
  return { grades, isLoading, error, handleScoreChange, submitMutation };
}
```

### Accessibility (WCAG 2.1 AA Required)
```typescript
// All interactive elements must have accessible labels
<button aria-label={t('grades.submit.aria')} onClick={handleSubmit}>
  {t('grades.submit')}
</button>

// All images have alt text
<img src={logo} alt={t('university.logo.alt')} />

// All form inputs have associated labels
<label htmlFor="student-id">{t('student.id')}</label>
<input id="student-id" type="text" ... />

// Error states are announced
<div role="alert" aria-live="polite">
  {error && <ErrorMessage message={error} />}
</div>

// Focus management on modal open/close
useEffect(() => {
  if (isOpen) modalRef.current?.focus();
}, [isOpen]);
```

### Tailwind Class Organization
```typescript
// Use cn() (clsx + tailwind-merge) for conditional classes
import { cn } from '@/lib/utils';

<div className={cn(
  // Base
  'flex items-center gap-3 rounded-lg p-4',
  // Variants
  variant === 'success' && 'bg-green-50 text-green-800 border border-green-200',
  variant === 'warning' && 'bg-amber-50 text-amber-800 border border-amber-200',
  variant === 'error'   && 'bg-red-50 text-red-800 border border-red-200',
  // State
  isLoading && 'opacity-50 pointer-events-none',
  // Override
  className,
)}>
```

---

## 7. Testing Standards

See `04_TESTING_STRATEGY.md` for full detail. Minimum here:

**Coverage threshold — enforced in CI (build fails below this):**
```json
{
  "coverage": {
    "statements": 85,
    "branches": 85,
    "functions": 88,
    "lines": 85
  }
}
```

**Every bug fix gets a regression test before the fix is written.**
Red → Green — not Green → "I think this is right."

**Test naming:**
```typescript
// Pattern: describe('unit under test', () => { it('does X when Y') })
describe('GradeService.calculateGradePoint', () => {
  it('applies Formula A for NEW enrollment type', () => { ... });
  it('applies Formula B for RESIT enrollment type', () => { ... });
  it('applies Formula B for REPEAT enrollment type', () => { ... });
  it('clamps score to 0 when negative input given', () => { ... });
  it('clamps score to 100 when > 100 input given', () => { ... });
  it('rounds to 1 decimal place', () => { ... });
  it('matches Advising Guide example: score 55 → sgp 2.2', () => { ... });
});
```

---

## 8. Git & Review Standards

### Pre-commit Hooks (Husky — enforced)
```bash
# .husky/pre-commit
npm run lint          # ESLint — must pass
npm run type-check    # tsc --noEmit — must pass
npm run test:unit     # unit tests — must pass
```

### Pre-push Hooks
```bash
# .husky/pre-push
npm run test          # all tests including integration
```

### PR Requirements
- PR title follows Conventional Commits format
- PR description includes: what changed, why, how to test, screenshots (for UI)
- All CI checks pass
- Minimum 1 approving review required (2 for anything touching grades or auth)
- No `TODO` or `FIXME` comments without an associated issue number

### Forbidden in PRs
- `console.log` statements
- `any` type annotations  
- Commented-out code blocks (delete dead code)
- Hardcoded strings without i18n key
- `// @ts-ignore` or `// eslint-disable` without explaining why in a comment
- Secrets or tokens of any kind

---

## 9. Logging Standards

```typescript
// Every log entry must be structured JSON in production
// Fields: level, message, timestamp, requestId, userId (if applicable), data

// ✅ Correct — structured with context
logger.info('Grade approved', {
  requestId: req.id,
  userId: req.user.userId,
  gradeId,
  studentId: grade.studentId,
  courseId: grade.courseId,
});

// ❌ Wrong — unstructured, hard to query
logger.info(`Grade ${gradeId} approved by user ${req.user.userId}`);

// Log levels:
// error  — system errors that need immediate attention
// warn   — recoverable errors (validation failures, 404s, rate limits)
// info   — business events (login, grade submission, backup complete)
// debug  — detailed technical info (DB queries, cache hits)
// http   — HTTP request/response (morgan)
```

---

## 10. Security Code Review Checklist

Before every PR is merged, the reviewer verifies:

- [ ] No SQL constructed by string concatenation
- [ ] All user input passes through Zod validation before use  
- [ ] Student data endpoints check `student_id = req.user.student_id`
- [ ] No sensitive data (passwords, tokens) appears in logs
- [ ] No secrets in code or config files
- [ ] File upload endpoints validate MIME type AND magic bytes (not just extension)
- [ ] Rate limiting applies to any state-changing endpoint added
- [ ] New tables/columns follow the naming convention (snake_case)
- [ ] Migration is reversible (has DOWN section)

---

## 11. Performance Code Review Checklist

- [ ] Database queries use parameterized queries
- [ ] N+1 queries are not present (use JOINs or DataLoader pattern)
- [ ] Large list queries use pagination
- [ ] Expensive computations are not run on every request (cache or pre-compute)
- [ ] Response payloads don't include unused fields
- [ ] Images and static assets are compressed
- [ ] React components don't re-render unnecessarily (use memo/useCallback where justified)
- [ ] TanStack Table uses virtualization for lists > 100 rows
