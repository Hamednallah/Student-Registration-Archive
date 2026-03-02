# Phase Gates — Detailed Acceptance Criteria
## Exact Pass/Fail Commands for Every Phase

> Each gate is a hard stop. Phase N+1 does not start until Phase N gate passes.
> Run every command. Paste every result. No estimation.

---

## Phase Gate 0 — Foundation

**Must demonstrate ALL before Phase 1:**

```bash
# G0.1: GPA formula tests — ABSOLUTE BLOCKER
pnpm --filter @psau/shared test --run
# REQUIRED: 0 failures, 0 skipped
# The formula tests from docs/04_TESTING_STRATEGY.md Section 3.1 must all pass

# G0.2: TypeScript zero errors
pnpm type-check
# REQUIRED: exit code 0

# G0.3: ESLint zero warnings
pnpm lint
# REQUIRED: "0 problems" 

# G0.4: All 34 bugs from ANALYSIS.md resolved
# Verify by running the regression tests for each bug:
pnpm test --run --reporter verbose 2>&1 | grep "@regression"
# REQUIRED: All @regression tagged tests pass

# G0.5: Dev environment starts cleanly
docker compose -f docker/docker-compose.dev.yml up -d
sleep 30
curl http://localhost:8080/health | jq .status
# REQUIRED: "ok"

# G0.6: Database migrations run on empty DB
docker compose -f docker/docker-compose.test.yml up postgres -d
sleep 15
pnpm db:migrate
# REQUIRED: exit code 0, all migrations applied
```

**Gate 0 sign-off:** `___________________` Date: `_______`

---

## Phase Gate 1 — Auth & University Structure

```bash
# G1.1: Auth tests pass
pnpm --filter @psau/api test:integration -- --grep "auth"
# REQUIRED: all passing

# G1.2: Student ID format correct
# Test: create 5 students in different depts, verify ID format YYYY-FF-DD-NNNN
curl -X POST http://localhost:8080/api/v1/students \
  -H "Authorization: Bearer $REGISTRAR_TOKEN" \
  -d '{"nameAr":"أحمد محمد","nameEn":"Ahmed Mohamed","facultyId":1,"departmentId":1}'
# REQUIRED: studentId matches /^\d{4}-\d{2}-\d{2}-\d{4}$/

# G1.3: All 6 roles can authenticate
for ROLE in admin registrar coordinator instructor user student; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:8080/api/v1/auth/login \
    -d "{\"username\":\"$ROLE\",\"password\":\"$ROLE\"}")
  echo "$ROLE: $STATUS"
done
# REQUIRED: all return 200

# G1.4: Student first login forces password change
# Log in as newly created student → attempt to access any resource
# REQUIRED: 403 PASSWORD_CHANGE_REQUIRED until password changed

# G1.5: Student cannot access another student's data
STUDENT_A_TOKEN=$(get_token_for student_a)
curl http://localhost:8080/api/v1/student/me \
  -H "Authorization: Bearer $STUDENT_A_TOKEN" | jq .data.studentId
# Must match student_a's ID — not any other student

# G1.6: RBAC working for all role/endpoint combinations
pnpm test:integration -- --grep "role|permission|forbidden"
# REQUIRED: all passing

# G1.7: Faculty/Department CRUD works
pnpm test:integration -- --grep "faculties|departments"
# REQUIRED: all passing
```

**Gate 1 sign-off:** `___________________` Date: `_______`

---

## Phase Gate 2 — Curriculum

```bash
# G2.1: Curriculum builder integration tests
pnpm test:integration -- --grep "curriculum|course"
# REQUIRED: all passing

# G2.2: Assessment weights sum validation
# Attempt to create course with weights not summing to 100%
curl -X POST http://localhost:8080/api/v1/curricula/1/courses \
  -H "Authorization: Bearer $COORDINATOR_TOKEN" \
  -d '{"courseId": 1, "weights": {"final": 40, "midterm": 30, "assignments": 20}}'
# weights = 40+30+20 = 90, not 100
# REQUIRED: 422 ASSESSMENT_WEIGHTS_INCOMPLETE

# G2.3: Coordinator can build a complete curriculum
# Manual test: Create academic year → semester → 5 course offerings → assign instructors
# REQUIRED: All operations complete without error
```

**Gate 2 sign-off:** `___________________` Date: `_______`

---

## Phase Gate 3 — Enrollment

```bash
# G3.1: Enrollment integration tests
pnpm test:integration -- --grep "enrollment"
# REQUIRED: all passing

# G3.2: Prerequisite validation works
# Create course B with prerequisite A. Attempt to enroll student in B without passing A.
# REQUIRED: 409 PREREQUISITE_NOT_MET

# G3.3: Bulk enrollment performance
# Enroll 100 students simultaneously
time curl -X POST http://localhost:8080/api/v1/enrollments/bulk \
  -H "Authorization: Bearer $REGISTRAR_TOKEN" \
  -d @tests/fixtures/bulk-enrollment-100.json
# REQUIRED: completes in < 10 seconds

# G3.4: Cannot enroll dismissed student
# Create student with academic_status=DISMISSED, attempt enrollment
# REQUIRED: 409 STUDENT_DISMISSED
```

**Gate 3 sign-off:** `___________________` Date: `_______`

---

## Phase Gate 4 — Grades (MOST CRITICAL)

```bash
# G4.1: Grade workflow integration tests — ALL must pass
pnpm test:integration -- --grep "grade|approval"
# REQUIRED: all passing

# G4.2: Grade state machine — all transitions
# Verify correct HTTP codes for each invalid transition:
# - Submit DRAFT → 200
# - Submit SUBMITTED → 409 GRADE_ALREADY_SUBMITTED
# - Submit APPROVED → 409 GRADE_ALREADY_APPROVED
# - Approve SUBMITTED → 200
# - Approve DRAFT → 409 GRADE_NOT_SUBMITTED
# - Modify APPROVED → 409 GRADE_ALREADY_APPROVED
pnpm test:integration -- --grep "grade state machine"
# REQUIRED: all 6 states tested and passing

# G4.3: Self-approval prevention
pnpm test:integration -- --grep "CANNOT_SELF_APPROVE"
# REQUIRED: passing

# G4.4: Audit log entry on every state change
# After running grade workflow, verify:
psql $TEST_DATABASE_URL -c "
  SELECT action, performed_at, performed_by 
  FROM grade_audit_log 
  WHERE grade_id = $TEST_GRADE_ID 
  ORDER BY performed_at;"
# REQUIRED: entries for DRAFT→SUBMITTED and SUBMITTED→APPROVED

# G4.5: GPA recomputes after approval
# Approve a grade, wait for queue processor (max 5 min), verify CGPA updated
sleep 310  # 5 minutes + 10 seconds buffer
psql $TEST_DATABASE_URL -c "
  SELECT cgpa, computed_at FROM student_semester_records 
  WHERE student_id = '$TEST_STUDENT_ID' ORDER BY computed_at DESC LIMIT 1;"
# REQUIRED: computed_at is within last 5 minutes

# G4.6: Formula spot check on 10 random grades
psql $TEST_DATABASE_URL << 'SQL'
SELECT 
  g.total_score, g.grade_point, e.enrollment_type,
  CASE e.enrollment_type
    WHEN 'NEW' THEN ROUND(g.total_score::numeric / 25, 1)
    ELSE ROUND((2.0/3) * (g.total_score::numeric/25 + 1), 1)
  END AS expected,
  g.grade_point = CASE e.enrollment_type
    WHEN 'NEW' THEN ROUND(g.total_score::numeric / 25, 1)
    ELSE ROUND((2.0/3) * (g.total_score::numeric/25 + 1), 1)
  END AS formula_correct
FROM grades g
JOIN enrollments e ON e.enrollment_id = g.enrollment_id
WHERE g.entry_status = 'APPROVED'
ORDER BY RANDOM() LIMIT 10;
SQL
# REQUIRED: ALL formula_correct = true

# G4.7: Attendance deprivation flag
# Enter grade with attendance_pct < 75 
# REQUIRED: enrollment automatically flagged as DEPRIVED
# REQUIRED: grade_point = 0, letter_grade = F

# G4.8: Grade entry sheet E2E test
pnpm test:e2e -- --grep "grade entry workflow"
# REQUIRED: passing
```

**Gate 4 sign-off (requires lead engineer):** `___________________` Date: `_______`

---

## Phase Gate 5 — Student Portal

```bash
# G5.1: Student portal integration tests
pnpm test:integration -- --grep "student portal|/student/me"
# REQUIRED: all passing

# G5.2: Student sees ONLY approved grades
# Enter grade, leave in DRAFT. Student requests current grades.
# REQUIRED: draft grade NOT in response

# G5.3: Transcript PDF generates correctly
curl -o /tmp/test-transcript.pdf \
  http://localhost:8080/api/v1/student/me/transcript/pdf \
  -H "Authorization: Bearer $STUDENT_TOKEN"
file /tmp/test-transcript.pdf | grep "PDF"
# REQUIRED: "PDF document"
wc -c /tmp/test-transcript.pdf
# REQUIRED: > 20000 bytes (real content)

# G5.4: Transcript caches (second request faster)
time curl -o /dev/null http://localhost:8080/api/v1/student/me/transcript/pdf \
  -H "Authorization: Bearer $STUDENT_TOKEN"
# First call: ~3s (generates)
time curl -o /dev/null http://localhost:8080/api/v1/student/me/transcript/pdf \
  -H "Authorization: Bearer $STUDENT_TOKEN"
# Second call: < 200ms (from Redis)

# G5.5: Academic standing displayed correctly
# Student with 2 consecutive CGPA < 2.00 → WARNING_2 displayed
# REQUIRED: Portal shows correct warning badge

# G5.6: Student portal E2E test
pnpm test:e2e -- --grep "student portal"
# REQUIRED: passing including the full "check transcript" flow
```

**Gate 5 sign-off:** `___________________` Date: `_______`

---

## Phase Gate 6 — Backup & Migration

```bash
# G6.1: Backup integration tests
pnpm test:integration -- --grep "backup"
# REQUIRED: all passing

# G6.2: Full backup → restore cycle
# Step 1: Note current student count
COUNT_BEFORE=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM students")

# Step 2: Create a backup
BACKUP_JOB=$(curl -s -X POST http://localhost:8080/api/v1/backup/run \
  -H "Authorization: Bearer $ADMIN_TOKEN" -d '{"configId":1}' | jq -r .jobId)
# Wait for completion...

# Step 3: Add a student (to create change)
curl -X POST http://localhost:8080/api/v1/students ...

# Step 4: Restore backup
curl -X POST http://localhost:8080/api/v1/backup/restore \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "backupId=$BACKUP_JOB"

# Step 5: Verify count matches pre-backup
COUNT_AFTER=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM students")
[ "$COUNT_BEFORE" = "$COUNT_AFTER" ] && echo "✅ MATCH" || echo "❌ MISMATCH"
# REQUIRED: MATCH

# G6.3: Migration wizard imports all 6 CSV types without errors
# Run with test CSV files (10 rows each)
for TYPE in faculties departments courses students grade_history enrollment_history; do
  RESULT=$(curl -s -X POST http://localhost:8080/api/v1/migration/validate \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -F "file=@tests/fixtures/migration/$TYPE.csv" \
    -F "type=$TYPE")
  echo "$TYPE: $(echo $RESULT | jq .valid)"
done
# REQUIRED: all true

# G6.4: Backup scheduler runs at configured time (test with 1-minute interval in dev)
# Set BACKUP_INTERVAL=1m, wait 2 minutes, check backup_logs
psql $DATABASE_URL -c "SELECT status, created_at FROM backup_logs ORDER BY created_at DESC LIMIT 5;"
# REQUIRED: at least 1 SUCCESS entry in last 2 minutes
```

**Gate 6 sign-off:** `___________________` Date: `_______`

---

## v2.0 Final Gate — Before AWS

This is `docs/17_v2.0_SIGN_OFF.md` — all 8 sections must be complete.

```bash
# Summary check command — run this last
echo "=== v2.0 Final Gate Check ==="
echo -n "GPA formulas: "; pnpm --filter @psau/shared test --run 2>&1 | tail -1
echo -n "TypeScript: "; pnpm type-check 2>&1 | tail -1  
echo -n "Coverage (shared): "; pnpm --filter @psau/shared test:coverage 2>&1 | grep "Statements"
echo -n "Coverage (api): "; pnpm --filter @psau/api test:coverage 2>&1 | grep "Statements"
echo -n "Coverage (web): "; pnpm --filter @psau/web test:coverage 2>&1 | grep "Statements"
echo -n "Security audit: "; pnpm audit --audit-level=high 2>&1 | tail -1
echo -n "E2E tests: "; pnpm --filter @psau/web test:e2e 2>&1 | tail -1
echo -n "Prod docker: "; curl -s http://localhost:8080/health | jq .status
```

**v2.0 Final sign-off (requires 3 signatures — see 17_v2.0_SIGN_OFF.md):**

Lead: `_____________` Reviewer: `_____________` Academic: `_____________` Date: `_______`

**ONLY AFTER THIS IS SIGNED: Begin v2.1 AWS provisioning.**
