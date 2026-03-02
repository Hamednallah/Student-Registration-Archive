# Delivery Plan — v2.0 → v2.1
## Local First. AWS Second. No Phase Skipping.

---

## The Rule

> **v2.0 must be 100% complete, tested, and signed off before a single Terraform resource is provisioned.**
>
> This is not a suggestion. AWS infrastructure costs money. Deploying a system that hasn't passed local validation is waste.
>
> The sequence is: **Local Dev → Local Prod Simulation → Test Suite Green → v2.0 Sign-off → AWS Provision → AWS Deploy → v2.1 Sign-off**

---

## v2.0 — Local Delivery

**Target:** A fully functional production-grade system running on `docker-compose.prod.yml`.  
**Domain:** `localhost` (or university's local server)  
**Database:** PostgreSQL 15 (Docker container)  
**Redis:** Redis 7 (Docker container)  
**Web:** nginx serving React build  
**API:** Node.js production build (not dev mode)

### v2.0 Phase Map

```
Phase 0: Foundation         ──► Phase Gate 0
Phase 1: Auth & Structure   ──► Phase Gate 1
Phase 2: Curriculum         ──► Phase Gate 2
Phase 3: Enrollment         ──► Phase Gate 3
Phase 4: Grades             ──► Phase Gate 4  ← Most critical
Phase 5: Student Portal     ──► Phase Gate 5
Phase 6: Backup & Migration ──► Phase Gate 6
                               ──► v2.0 FINAL GATE ── Sign-off ──► Start v2.1
```

**Each gate must pass before the next phase begins. No exceptions.**

---

## Phase Gate Criteria

### Phase Gate 0 — Foundation

Antigravity must demonstrate ALL of the following before Phase 1:

```bash
# All GPA formula tests pass (BLOCKING — nothing proceeds if this fails)
pnpm --filter @psau/shared test --run
# Expected: ALL tests green, 0 failures

# TypeScript compiles with zero errors
pnpm type-check
# Expected: clean output, exit code 0

# ESLint passes
pnpm lint
# Expected: 0 errors, 0 warnings

# All 34 bugs from ANALYSIS.md confirmed fixed
# (Each fix has a regression test — run the specific test file)
pnpm --filter @psau/api test --run src/__tests__/regression/

# Database migrations run clean
docker compose -f docker/docker-compose.test.yml up postgres -d
pnpm db:migrate
# Expected: all migrations applied, no errors

# Dev environment starts
docker compose -f docker/docker-compose.dev.yml up
curl http://localhost:8080/health
# Expected: {"status":"ok","services":{"database":"connected"}}
```

**Sign-off checklist Phase 0:**
- [ ] 100% of GPA tests pass (verified against Advising Guide examples)
- [ ] All 34 regression tests pass  
- [ ] Zero TypeScript errors
- [ ] Zero ESLint warnings
- [ ] Migrations run clean against PostgreSQL 15
- [ ] Dev environment starts with single command
- [ ] Coverage: `@psau/shared` ≥ 95%

---

### Phase Gate 1 — Auth & University Structure

```bash
# Integration tests for auth
pnpm --filter @psau/api test:integration --run src/__tests__/integration/auth.test.ts

# Verify student ID generation
# Test cases from COMPLETE_SPEC_FINAL.md §3:
# Faculty 01, Dept 03, Year 2024, 47th student → 2024-01-03-0047
pnpm --filter @psau/api test --run src/__tests__/unit/student-id.test.ts

# Verify all 6 roles can authenticate
curl -X POST http://localhost:8080/api/v1/auth/login \
  -d '{"username":"admin","password":"..."}' | jq '.data.role'
# Should return "A"

# Verify student portal is blocked for non-S roles
curl http://localhost:8080/api/v1/student/me \
  -H "Authorization: Bearer $COORDINATOR_TOKEN"
# Must return 403, NOT student data
```

**Sign-off checklist Phase 1:**
- [ ] All 6 roles authenticate successfully
- [ ] Student ID format correct: `YYYY-FF-DD-NNNN`
- [ ] Token refresh works (15min access, 7d refresh)
- [ ] Student portal endpoints return 403 for non-S roles
- [ ] Student cannot see other students' data (verified with 2 test accounts)
- [ ] Admin-only: `/api/v1/users` (POST) returns 403 for R/C/I/U/S
- [ ] Coverage: auth middleware and RBAC ≥ 90%

---

### Phase Gate 2 — Curriculum

```bash
# Coordinator can build a curriculum plan
# 1. Create faculty + department
# 2. Create courses with assessment weights (must sum to 100)
# 3. Build curriculum: assign courses to semester levels
# 4. Verify assessment weights validation (sum ≠ 100 → 422)

# Test: weights must sum to 100
curl -X POST http://localhost:8080/api/v1/curricula/1/courses/CS-101/weights \
  -d '{"finalPct":60,"midtermPct":20,"assignmentsPct":15,"attendancePct":10}'
  # Must return 422 (60+20+15+10=105)

curl -X POST http://localhost:8080/api/v1/curricula/1/courses/CS-101/weights \
  -d '{"finalPct":60,"midtermPct":20,"assignmentsPct":10,"attendancePct":10}'
  # Must return 201 (60+20+10+10=100)
```

**Sign-off checklist Phase 2:**
- [ ] Full curriculum plan buildable through API
- [ ] Assessment weights validation enforced (must sum to 100)
- [ ] Prerequisite chains work (course B requires course A)
- [ ] Curriculum versioned by academic year
- [ ] Coverage: curriculum service ≥ 88%

---

### Phase Gate 3 — Enrollment

```bash
# Credit hour limits enforced (12–20 per semester)
# Enroll student in courses totalling 21 hours → 422 CREDIT_HOUR_LIMIT
# Enroll student in courses totalling 11 hours → 422 CREDIT_HOUR_LIMIT

# Prerequisite validation
# Student hasn't taken CS-101, tries to enroll in CS-201 (requires CS-101)
# Must return 422 PREREQUISITE_NOT_MET

# Enrollment types
# Registrar can set type: NEW, RESIT, REPEAT, ALTERNATE, DEFERRED
# Each type changes which GPA formula applies — verify this in Phase 4
```

**Sign-off checklist Phase 3:**
- [ ] Credit hour limits enforced (12 min, 20 max)
- [ ] Prerequisite check blocks ineligible enrollments
- [ ] Prerequisite waiver system works (admin/coordinator override)
- [ ] Bulk enrollment CSV import processes without errors
- [ ] Enrollment type set correctly (NEW vs RESIT vs REPEAT)
- [ ] Coverage: enrollment service ≥ 88%

---

### Phase Gate 4 — Grades (CRITICAL GATE)

This is the most important gate. Take the most time here.

```bash
# Full grade workflow test
pnpm --filter @psau/api test:integration --run src/__tests__/integration/grade-workflow.test.ts

# Verify formulas with Advising Guide examples
# Example from Guide p.33: 5 courses, scores [55,59,52,68,57], SGPA=2.35
# Load test student with exactly these grades, verify SGPA=2.35

# Verify APPROVED grade cannot be modified
curl -X PUT http://localhost:8080/api/v1/grades/1 \
  -H "Authorization: Bearer $COORDINATOR_TOKEN" \
  -d '{"finalScore":99}'
# Must return 409 GRADE_ALREADY_APPROVED

# Verify deprivation (حرمان)
# Enter attendance_pct=74 → enrollment_type should become DEPRIVED
# SGPA should treat this course as 0 points

# Verify substitution system
# Student repeating year: use example from Guide p.31-32
# Expected CGPA from example: 2.09
# System must compute exactly 2.09

# Verify audit log
SELECT * FROM grade_audit_log ORDER BY performed_at DESC LIMIT 10;
# Every grade state change must have an audit record

# Verify GPA recompute queue
# Approve 10 grades simultaneously, verify student_semester_records
# updated within 5 minutes (queue processes every 5 min)

# Verify Formula A vs Formula B
# NEW course, score 68 → sgp = round(68/25, 1) = 2.7
# RESIT course, score 51 → sgp = round((2/3)*(51/25+1), 1) = 2.0
# Both must be correct in system
```

**Sign-off checklist Phase 4:**
- [ ] ALL Advising Guide formula examples produce correct output (every single one)
- [ ] SGPA calculation correct for mixed enrollment types
- [ ] CGPA calculation correct (denominator = first-attempt hours only)
- [ ] Substitution system (نظام الاستبدال) correct
- [ ] APPROVED grade modification returns 409
- [ ] Audit log entry created for every state transition
- [ ] Deprivation (حرمان) correctly triggers when attendance < 75%
- [ ] Academic standing correctly assigned (GOOD/WARNING_1/WARNING_2/DISMISSED)
- [ ] Degree classification correct (First/Second I/Second II/Third)
- [ ] GPA recompute runs within 5 minutes of approval
- [ ] Grade entry UI shows correct live preview (matches server formula)
- [ ] Coverage: grade service + GPA service ≥ 90%

**If any formula test fails, STOP. Fix the formula. Do not proceed.**

---

### Phase Gate 5 — Student Portal

```bash
# Security: student cannot access other student's data
# Create two students (A and B), login as A, try to access B's transcript
curl http://localhost:8080/api/v1/student/me/transcript \
  -H "Authorization: Bearer $STUDENT_A_TOKEN"
  # Returns A's data ✓

# This must NOT return B's data:
curl http://localhost:8080/api/v1/students/STUDENT-B-ID/transcript \
  -H "Authorization: Bearer $STUDENT_A_TOKEN"
  # Must return 403 ✓

# E2E test: full student portal flow
pnpm test:e2e --grep "Student portal"

# Transcript PDF generates
curl http://localhost:8080/api/v1/student/me/transcript/pdf \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -o /tmp/test-transcript.pdf
file /tmp/test-transcript.pdf  # Must say "PDF document"
ls -la /tmp/test-transcript.pdf  # Must be > 50KB (real content)

# Arabic content in transcript
# Open PDF — must contain Arabic text, not boxes
```

**Sign-off checklist Phase 5:**
- [ ] Student cannot access other student's data (SQL-level enforcement verified)
- [ ] All portal pages load for role S
- [ ] Transcript PDF contains correct grades, CGPA, Arabic text
- [ ] Curriculum progress grid shows correct completed/in-progress/pending
- [ ] CGPA trend chart displays correctly
- [ ] First-login password change forced
- [ ] Coverage: portal routes ≥ 85%

---

### Phase Gate 6 — Backup & Migration

```bash
# Manual backup runs and produces a valid file
curl -X POST http://localhost:8080/api/v1/backup/run \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"configId":1}'

# Wait and verify
sleep 30
curl http://localhost:8080/api/v1/backup/logs?limit=1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[0].status'
# Must be "SUCCESS"

# Backup file is valid JSON (gunzip + validate)
gunzip -c /var/psau-backups/latest.json.gz | python3 -m json.tool > /dev/null
echo $?  # Must be 0

# Migration: upload test CSV, validate, import
# Use a test CSV with 100 students
curl -X POST http://localhost:8080/api/v1/migration/validate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "students=@tests/fixtures/migration/students_100.csv"
# Must return: 100 valid rows, 0 errors

# Retention policy works
# Create 10 backups, verify retention keeps only 7
```

**Sign-off checklist Phase 6:**
- [ ] Manual backup completes successfully
- [ ] Backup file is valid, non-empty JSON
- [ ] Restore from backup works (restore to clean DB, verify data)
- [ ] Migration CSV template downloadable
- [ ] Migration validation rejects invalid rows with clear error messages
- [ ] Migration import processes 100-student CSV without errors
- [ ] Backup retention policy enforced (7 daily, 4 weekly, 12 monthly)
- [ ] Scheduled backup runs via cron (verify in logs)
- [ ] Coverage: backup service ≥ 85%

---

### v2.0 FINAL GATE — Local Production Sign-off

```bash
# Start production simulation
docker compose -f docker/docker-compose.prod.yml up -d

# Wait for health
sleep 60
curl https://localhost/health  # Through nginx

# Run the full test suite against the prod simulation
SMOKE_TEST_URL=https://localhost pnpm test:smoke

# Run load test
k6 run \
  --env BASE_URL=http://localhost:8080 \
  --vus 100 \
  --duration 5m \
  tests/load/exam-season.js

# Coverage report
pnpm test:coverage
# Verify all thresholds met (85-90%)

# Security scan
pnpm audit --audit-level=high
# Zero HIGH or CRITICAL vulnerabilities

# All 8 page categories work:
# Admin dashboard, Coordinator grade approval, Instructor grade entry,
# Registrar enrollment, Student portal, Backup admin, Reports, Receipts
```

**v2.0 Sign-off checklist:**
- [ ] `docker compose -f docker/docker-compose.prod.yml up` starts clean
- [ ] All 6 roles can log in and access their respective UIs
- [ ] Complete grade workflow: entry → submit → approve → student sees result
- [ ] Transcript PDF generates correctly with Arabic text
- [ ] Backup completes, file is valid
- [ ] Load test passes SLOs at 100 VUs
- [ ] Test coverage ≥ 85% for all packages
- [ ] Zero HIGH/CRITICAL security vulnerabilities
- [ ] Zero TypeScript errors in production build
- [ ] All regression tests for 34 original bugs pass
- [ ] Arabic UI renders correctly (RTL, no broken characters)
- [ ] `MEMORY.md` is current and accurate

**Only after this checklist is complete: begin v2.1.**

---

## v2.1 — AWS Delivery

**Target:** The v2.0 system running on AWS infrastructure.  
**No new features in v2.1.** This phase is infrastructure and operations only.

### v2.1 Phase Map

```
AWS-0: Pre-flight checks            ──► Gate AWS-0
AWS-1: Infrastructure provision     ──► Gate AWS-1
AWS-2: First deployment             ──► Gate AWS-2
AWS-3: Monitoring & alarms setup    ──► Gate AWS-3
AWS-4: DNS cutover + TLS            ──► Gate AWS-4
AWS-5: Load test on AWS             ──► Gate AWS-5
                                    ──► v2.1 Sign-off
```

### AWS Phase Gates

**Gate AWS-0 — Pre-flight**
- [ ] AWS account and IAM role created (see `docs/06_AWS_DEPLOYMENT.md §Step 1`)
- [ ] All secrets generated and stored in AWS Secrets Manager
- [ ] Domain registered/accessible in Route 53
- [ ] GitHub Actions secrets configured (AWS role ARN, region, account ID)
- [ ] Terraform backend S3 bucket created
- [ ] `terraform plan` reviewed and approved (no surprises)

**Gate AWS-1 — Infrastructure**
- [ ] `terraform apply` completes with zero errors
- [ ] VPC, subnets, security groups created correctly
- [ ] RDS PostgreSQL accessible from ECS (not from internet)
- [ ] ElastiCache Redis accessible from ECS (not from internet)
- [ ] S3 buckets created with correct permissions
- [ ] ECR repositories created
- [ ] All security groups: principle of least privilege

**Gate AWS-2 — First Deployment**
- [ ] GitHub Actions pipeline runs successfully end-to-end
- [ ] API container running in ECS, health check passing
- [ ] Web assets in S3, CloudFront distribution active
- [ ] Database migrations ran successfully via ECS task
- [ ] Initial seed data (admin user) created
- [ ] API health check returns `{"status":"ok"}` at AWS domain

**Gate AWS-3 — Monitoring**
- [ ] All CloudWatch alarms created and in OK state
- [ ] CloudWatch dashboard accessible and showing data
- [ ] SNS topics configured and test notification received
- [ ] All 8 Logs Insights saved queries created
- [ ] Container Insights enabled on ECS cluster

**Gate AWS-4 — DNS & TLS**
- [ ] ACM certificate issued and validated
- [ ] `https://psau.edu.sd` routes to CloudFront
- [ ] `https://api.psau.edu.sd` routes to ALB
- [ ] TLS 1.2+ enforced (TLS 1.0/1.1 blocked)
- [ ] HSTS header present (`Strict-Transport-Security: max-age=31536000`)
- [ ] HTTP → HTTPS redirect working

**Gate AWS-5 — Load Test on AWS**
```bash
# Run exam season load test against production AWS
k6 run \
  --env BASE_URL=https://api.psau.edu.sd \
  --env STUDENT_TOKENS="[...]" \
  --vus 200 \
  --duration 10m \
  tests/load/exam-season.js

# Required results:
# P95 < 500ms ✓
# Error rate < 0.1% ✓
# Zero 5xx errors ✓
# ECS auto-scaling triggers and adds tasks ✓
# ECS scales back down after load ✓
```

**v2.1 Sign-off checklist:**
- [ ] All AWS-0 through AWS-5 gates pass
- [ ] Load test at 200 VUs passes all SLOs
- [ ] Auto-scaling verified (scale up + scale down)
- [ ] Rollback tested (deploy a known-bad image, verify auto-rollback)
- [ ] Backup runs to S3 and is verified restorable
- [ ] Runbook executed for at least 2 playbooks (simulate incidents)
- [ ] All monitoring alerts fire correctly (test by triggering conditions)
- [ ] Full E2E test suite passes against production URL
- [ ] RDS Multi-AZ failover tested (verify < 60s downtime)
- [ ] Cost monitoring set up (Budget alert at 120% of estimated monthly)
- [ ] `MEMORY.md` updated with AWS architecture details

---

## What "Done" Means at Each Version

### v2.0 Done:
The university can run this system on a local server (or any Docker-capable machine) and manage:
- 30,000 student records
- Faculty → Department → Curriculum hierarchy
- Course enrollment with prerequisite validation
- Grade entry → approval workflow
- GPA computation per SUST 2019/2020 rules
- Student self-service portal
- Daily automated backups
- Data migration from legacy system via CSV

### v2.1 Done:
The same system, hosted on AWS, with:
- Auto-scaling (2–10 ECS tasks based on CPU/memory)
- Multi-AZ database (zero downtime on AZ failure)
- CloudFront CDN (fast globally, especially for Arabic regions)
- CloudWatch monitoring with actionable alerts
- One-command deploy via GitHub Actions
- Documented rollback procedure
- Verified runbook for all incident scenarios
