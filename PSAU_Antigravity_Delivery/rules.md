# PSAU Academic Management System — Rules & Standards

## 1. Core Identity & Directives
- **Zero Ambiguity**: This is a production university system. Student records are legally binding. Never guess. If you do not know, explore using `grep`, `find`, or read the tests.
- **Academic Law**: The GPA formulas in `@psau/shared/src/lib/gpa.ts` are legally binding based on the SUST Credit Hour System 2019/2020. Do not optimize, simplify, or refactor them without Academic Stakeholder approval.
- **Transactions Everywhere**: No multi-table writes without SQL transactions to ensure zero data loss.

## 2. Mandatory Session Start Protocol
Before writing a single line of code in any session:
1. **Read `MEMORY.md`**: Understand the current state of the codebase.
2. **Review DB State**: Check `docker/docker-compose.dev.yml` and run migrations if needed.
3. **Verify Tests**: Run `pnpm test:unit` to ensure tests are green.
4. **Check Types**: Run `pnpm type-check` to ensure there are zero TypeScript errors.
5. **Phase Alignment**: Check `docs/10_VERSION_DELIVERY_PLAN.md` to know the exact phase and task you are working on.

## 3. The Prime Directive: SEARCH → MAP → REASON → MODIFY
Never jump straight to writing code. You must complete all four phases:

- **SEARCH**: Discover structure. Find where a concept lives, its callers, its tests, and its migrations.
- **MAP**: Document the full request path. Write out the Call Hierarchy, Dependencies, Entry Points, and Side Effects before coding.
- **REASON**: Plan before writing. Find the existing pattern. What tests must be written first? What are the edge cases? What migrations are needed?
- **MODIFY**: One change at a time. Red → Green → Refactor. Follow existing patterns. Update `MEMORY.md` after every significant change.

## 4. TypeScript & Linting Standards
- **Strict Mode Only**: `any` is absolutely banned. Use `unknown` and type guards.
- **No Silent Casts**: `as User` is forbidden without an explanatory comment and runtime check.
- **Type Naming**: Interfaces use `PascalCase` with nouns. Enums are forbidden; use `const` objects with `typeof / keyof` type extraction.
- **Null Safety**: Avoid `obj!.prop`. Prefer `obj?.prop ?? fallback`.
- **No Console Logs**: `console.log` is banned. Use the `logger` instance.

## 5. Architectural Boundaries
- **Service Layer**: Business logic lives ONLY in `packages/api/src/services/`. Controllers are thin: they validate input, call the service, and return the response.
- **Repository Pattern**: SQL queries live ONLY in `packages/api/src/repositories/`. No raw SQL in services.
- **Error Handling**: Use the `AppError` subclasses from `lib/errors.ts` (e.g., `NotFoundError`, `ConflictError`, `ValidationError`). Never `throw new Error()`.
- **Pagination**: Use keyset pagination (`WHERE id > $cursor`) for large tables. `OFFSET` is banned.
- **Security**: Parameterized queries ($1, $2...) are mandatory. String concatenation for SQL is banned.

## 6. Testing Strategy
- **Test Pyramid**: 70% Unit (Vitest), 25% Integration (Supertest), 5% E2E (Playwright).
- **Target Coverage**: 85-90% overall. CI will fail builds below this threshold.
- **Mandatory First Rule**: The GPA formula Unit tests MUST pass before any other code is written.
- **TDD Requirement**: Write test descriptions before writing the implementation to identify path matrices (happy path, 401, 403, 404, 422, 409).

## 7. Version Delivery Plan (Local → AWS)
- **Phase Gate Protocol**: Every phase has a specific gate containing automated bash scripts to verify completion.
- **No Phase Skipping**: Phase N+1 does not start until Phase N gate passes.
- **Local First**: v2.0 (local Docker) must be 100% complete and signed off before AWS provisioning begins.

## 8. Commit & Review Discipline
- **Commit Format**: Use conventional commits: `feat(domain): description`, `fix(domain): description`.
- **Storytelling**: Include what changed, tests added, and spec references (`Spec ref: COMPLETE_SPEC_FINAL.md §1.7`).
- **PR Rules**: Ensure zero warnings (ESLint), zero errors (TypeScript), and 100% passing tests. Require approvers based on domain sensitivity (Auth, Grades, GPA formulas).
