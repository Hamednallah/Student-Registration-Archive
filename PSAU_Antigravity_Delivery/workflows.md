# PSAU Academic Management System — Workflows

## 1. Feature Development Workflow

This is the standard inner-loop workflow for developing any feature, route, or service.

1. **Pre-flight Checks**
   - Ensure you are on the `develop` branch.
   - Run `pnpm type-check` and `pnpm test:unit` to ensure a clean slate.
2. **SEARCH: Context Gathering**
   - Search the codebase to understand where the feature fits.
   - Find all dependent types, tables, and existing implementations.
3. **MAP: Relationship Graphing**
   - Outline the execution path (e.g., HTTP Request → Controller → Validation → Service → Repository → DB).
   - Document expected Side Effects (e.g., Audit logs, metric emission, GPA re-computation).
4. **REASON: Test Driven Design**
   - Pre-define the integration test cases covering: Happy Path, 401 (Unauthenticated), 403 (Forbidden), 422 (Validation), 404 (Not Found), 409 (Conflict).
5. **MODIFY: Implementation**
   - Implement the actual code following existing Repository / Service / Controller patterns.
   - Run specific tests `pnpm vitest run <file>` to verify behavior.
6. **Validation & Polish**
   - Run `pnpm type-check` (zero errors allowed).
   - Run `pnpm lint` (zero warnings allowed).
   - Run the full test suite `pnpm test:unit` and `pnpm test:integration`.
7. **Documentation**
   - Update `MEMORY.md` with new endpoints introduced, DB changes, and testing notes.

## 2. Phase Delivery Workflow

This is the workflow for moving from one functional phase to the next, adhering to the Version Delivery Plan.

1. **Gate Verification**
   - Run every command listed under the specific gate in `docs/19_PHASE_GATES_DETAILED.md`.
   - You must receive zero failures. All scripts must exit with code 0.
2. **Sign-off Protocol**
   - Record the passing results. No estimation or skipping is allowed.
3. **Task Board Update**
   - Mark the current Phase Gate as `[x]` in `task.md`.
   - Update `MEMORY.md` to reflect the transition.
4. **Initiate Next Phase**
   - Review the requirements for the next phase defined in `COMPLETE_SPEC_FINAL.md`.
   - Setup any necessary seeds or blank integration test files before implementing logic.

## 3. Database Migration Workflow

When schema changes are required to support a new feature.

1. **Write the Migration**
   - Create a sequential `.ts` or `.sql` migration file in `db/migrations/`.
   - Use `knex` schema builder.
   - Include both `up` (apply) and `down` (rollback) methods.
2. **Apply to Local Test Database**
   - Ensure the PostgreSQL Docker container is running (`docker compose -f docker/docker-compose.test.yml up postgres -d`).
   - Run `pnpm db:migrate`.
3. **Verify Integrity**
   - Attempt rolling back using `pnpm db:rollback` to ensure there are no syntax errors in the `down` function.
   - Run `pnpm test:integration` to ensure schema changes did not break existing repository methods.

## 4. Full Delivery Pipeline (CI/CD Emulation)

How to emulate the GitHub Actions pipeline locally before committing to `main` or triggering a deployment.

1. **Static Analysis Step**
   - `pnpm install --frozen-lockfile`
   - `pnpm lint`
   - `pnpm type-check`
2. **GPA Mission-Critical Step**
   - `pnpm --filter @psau/shared build`
   - `pnpm --filter @psau/shared test --run src/lib/__tests__/gpa.test.ts` (Immediate abort if any test fails)
3. **Testing Suite Step**
   - `pnpm test:coverage` (for all packages)
   - Ensure thresholds are met (Shared > 95%, API/Web > 85%).
   - `pnpm test:integration`
4. **Environment Health Check**
   - `docker compose -f docker/docker-compose.dev.yml up -d`
   - `curl http://localhost:8080/health` (Expect JSON ok response).
