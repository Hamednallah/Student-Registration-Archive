# Contributing to PSAU Academic System

## Welcome

You are joining a production system trusted with 30,000 students' academic records.
This is not a prototype. Every line of code has real consequences.

Before writing any code, read these documents in order. This is not optional:

1. `.cursorrules` — How to work with this repo (AI and human engineers both follow this)
2. `docs/00_MASTER_BRIEF.md` — What we're building and the absolute rules
3. `docs/02_QUALITY_STANDARDS.md` — Code quality rules
4. `docs/15_CODEBASE_MAP.md` — Symbol graph and module map
5. `docs/COMPLETE_SPEC_FINAL.md` Section 1 — Academic rules (understand the domain)
6. `MEMORY.md` — Current state of the codebase

Estimated reading time: 3–4 hours. This investment saves days of rework.

---

## Local Setup

### Prerequisites

- Node.js 20 LTS
- pnpm 9+ (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker Desktop
- Git

### First Time Setup

```bash
git clone https://github.com/psau/academic-system.git psau
cd psau
corepack enable
pnpm install

# Start development environment
docker compose -f docker/docker-compose.dev.yml up

# In another terminal — verify everything is running
curl http://localhost:8080/health | jq .
open http://localhost:5173
open http://localhost:8080/api-docs
```

### Seed Development Data

```bash
docker exec psau-api-dev pnpm db:seed
# Creates: 2 faculties, 4 departments, 10 courses, 20 students
# Users: admin/admin, registrar/registrar, instructor/instructor, coord/coordinator, student/student
```

---

## Development Workflow

### Starting a Feature

```bash
# 1. Sync with develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/grade-rejection-notification

# 3. SEARCH → MAP → REASON before coding (see .cursorrules)
# 4. Write tests first
# 5. Implement
# 6. Verify all tests pass
pnpm test:unit
pnpm type-check
pnpm lint

# 7. Push and open PR to develop
git push origin feature/grade-rejection-notification
```

### Before Every Commit

Husky runs these automatically. They must pass:
```bash
pnpm lint         # ESLint — zero warnings allowed
pnpm type-check   # TypeScript — zero errors allowed
pnpm test:unit    # Unit tests — all must pass
```

### Running Tests

```bash
pnpm test:unit                    # Unit tests (fast, no Docker needed)
pnpm test:integration             # Integration tests (needs Docker)
pnpm test:e2e                     # E2E tests (needs full stack)
pnpm test:coverage                # Coverage report (must meet thresholds)
pnpm --filter @psau/shared test   # Just shared package tests
```

---

## Code Style Reference

### Naming Conventions

```
Files:          kebab-case.ts (grade-entry.service.ts)
Classes:        PascalCase (GradeService)
Functions:      camelCase (calculateGradePoint)
Constants:      UPPER_SNAKE_CASE (ENROLLMENT_TYPE)
DB columns:     snake_case (grade_point, entry_status)
API response:   camelCase (gradePoint, entryStatus)
CSS classes:    Tailwind utilities only (no custom CSS)
i18n keys:      dot.separated (grades.submit.label)
```

### i18n — Adding New Strings

Every user-visible string must have both Arabic and English:

```bash
# 1. Add key to both files:
packages/web/src/i18n/ar.json   → "grades": { "submit": { "label": "تقديم" } }
packages/web/src/i18n/en.json   → "grades": { "submit": { "label": "Submit" } }

# 2. Use in component:
const { t } = useTranslation();
<button>{t('grades.submit.label')}</button>
```

Key naming rules:
- Max 3 levels deep: `feature.component.element`
- Error messages: `errors.<ERROR_CODE>` (matches error code registry)
- Labels: `<feature>.<element>.label`
- Placeholders: `<feature>.<element>.placeholder`
- Descriptions: `<feature>.<element>.description`

---

## Architecture Rules — Never Break These

1. **GPA formulas** live ONLY in `packages/shared/src/lib/gpa.ts`
2. **SQL** lives ONLY in `packages/api/src/repositories/`
3. **Business logic** lives ONLY in `packages/api/src/services/`
4. **Route handlers** only call services — no business logic in controllers
5. **Components** only call custom hooks — no direct API calls in JSX
6. **Secrets** never in code — environment variables only
7. **Console.log** never in source — use logger

---

## PR Guidelines

### PR Title Format
```
feat(grades): add batch grade rejection
fix(auth): resolve token not cleared on logout
test(gpa): add substitution system test cases
docs(runbook): add playbook for GPA queue backup
```

### PR Description Template
```markdown
## What
Brief description of the change

## Why
Why this change was needed

## How to Test
1. Step-by-step instructions to test manually
2. Which test files were added/modified

## Screenshots (UI changes)
[paste before/after]

## Checklist
- [ ] Tests written and passing
- [ ] Coverage maintained
- [ ] Swagger updated (if API changed)
- [ ] Translations added (if new strings)
- [ ] MEMORY.md updated
- [ ] CODEBASE_MAP.md updated (if new module)
```

### Review Guidelines

**Who reviews what:**
- Auth or grade workflow changes: require 2 approvers
- GPA formula changes: require lead engineer + academic stakeholder
- Database migrations: require lead engineer
- All other: require 1 approver

**What to look for:**
- Does it follow `02_QUALITY_STANDARDS.md`?
- Are there tests for edge cases?
- Does it match existing patterns?
- Are there security implications?

---

## Getting Help

If stuck:
1. Check `docs/` — the answer is probably there
2. Check `MEMORY.md` — understand current state
3. Read similar existing code in the repo
4. Post in #psau-engineering with the error and what you've tried

Never: guess and proceed without noting the assumption somewhere.
