# Runbook
## Operational Procedures · Incident Response · Common Tasks

> This document is for anyone operating the PSAU system after deployment.  
> Every procedure is written to be executable by following the steps exactly, without prior knowledge.

---

## 1. Incident Response

### Severity Levels

| Severity | Definition | Response Time | Examples |
|----------|-----------|---------------|---------|
| **P0 — Critical** | System down or data corruption | Immediate (< 15 min) | 503 for all users, GPA calculation wrong, DB unreachable |
| **P1 — High** | Core feature broken, significant impact | < 1 hour | Grade submission broken, student portal 500, backup failing |
| **P2 — Medium** | Feature degraded, workaround exists | < 4 hours | Slow responses, PDF generation failing, non-critical 404s |
| **P3 — Low** | Minor issue, minimal impact | Next business day | Cosmetic bug, translation missing, non-critical warning |

### Incident Response Steps

```
P0/P1 Incident:
1. Acknowledge the alert in Slack/PagerDuty immediately
2. Post in #incidents channel: "[INCIDENT] Brief description — investigating"
3. Check the health endpoint: curl https://api.psau.edu.sd/health
4. Open CloudWatch dashboard
5. Run the relevant diagnostic queries (see Section 3)
6. Determine: rollback needed? Fix forward? Mitigate and investigate?
7. Execute remediation (see playbooks below)
8. Verify system is healthy
9. Post resolution: "[RESOLVED] What happened, what was fixed, duration"
10. Write post-mortem within 48 hours (blameless)
```

---

## 2. Common Operational Tasks

### 2.1 Manual Deployment

```bash
# Deploy specific image tag to ECS
AWS_REGION=me-south-1
CLUSTER=psau-production
SERVICE=psau-api
IMAGE=123456789.dkr.ecr.me-south-1.amazonaws.com/psau-api:develop-abc1234

# Get current task definition
TASK_FAMILY=psau-api-production
CURRENT_TASK=$(aws ecs describe-task-definition \
  --task-definition $TASK_FAMILY \
  --query 'taskDefinition' \
  --region $AWS_REGION)

# Create new task definition with updated image
NEW_TASK=$(echo $CURRENT_TASK | jq \
  --arg IMAGE "$IMAGE" \
  'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy) |
   .containerDefinitions[0].image = $IMAGE')

NEW_REVISION=$(aws ecs register-task-definition \
  --cli-input-json "$NEW_TASK" \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text \
  --region $AWS_REGION)

echo "New task definition: $NEW_REVISION"

# Update service
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $NEW_REVISION \
  --region $AWS_REGION

# Wait for deployment
aws ecs wait services-stable \
  --cluster $CLUSTER \
  --services $SERVICE \
  --region $AWS_REGION

echo "Deployment complete"
```

### 2.2 Emergency Rollback

```bash
# Roll back to previous task definition
AWS_REGION=me-south-1
CLUSTER=psau-production
SERVICE=psau-api

# Get previous task definition ARN (second deployment = previous stable)
PREV_TASK=$(aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --query 'services[0].deployments[?status==`PRIMARY`].taskDefinition | [0]' \
  --output text \
  --region $AWS_REGION)

# Note: PRIMARY is current, ACTIVE is being replaced
# For rollback, find the one before PRIMARY:
PREV_TASK=$(aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --query 'services[0].deployments | sort_by(@, &createdAt) | [-2].taskDefinition' \
  --output text \
  --region $AWS_REGION)

echo "Rolling back to: $PREV_TASK"

aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --task-definition $PREV_TASK \
  --force-new-deployment \
  --region $AWS_REGION

aws ecs wait services-stable \
  --cluster $CLUSTER \
  --services $SERVICE \
  --region $AWS_REGION

echo "Rollback complete"
```

### 2.3 Database Migration (Production)

```bash
# NEVER run migrations directly against RDS from local machine
# ALWAYS use an ECS task for production migrations

AWS_REGION=me-south-1
CLUSTER=psau-production
PRIVATE_SUBNET=$(terraform -chdir=terraform/environments/production output -raw private_subnet_id_1)
API_SG=$(terraform -chdir=terraform/environments/production output -raw api_security_group_id)

# Run migration task
TASK_ARN=$(aws ecs run-task \
  --cluster $CLUSTER \
  --task-definition psau-api-production \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET],securityGroups=[$API_SG],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"psau-api","command":["node","dist/db/migrate.js"],"environment":[{"name":"RUN_MIGRATIONS","value":"true"}]}]}' \
  --query 'tasks[0].taskArn' \
  --output text \
  --region $AWS_REGION)

echo "Migration task running: $TASK_ARN"

# Wait for completion
aws ecs wait tasks-stopped \
  --cluster $CLUSTER \
  --tasks $TASK_ARN \
  --region $AWS_REGION

# Check exit code
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster $CLUSTER \
  --tasks $TASK_ARN \
  --query 'tasks[0].containers[0].exitCode' \
  --output text \
  --region $AWS_REGION)

if [ "$EXIT_CODE" = "0" ]; then
  echo "✅ Migration completed successfully"
else
  echo "❌ Migration FAILED with exit code $EXIT_CODE"
  echo "Check logs at: /ecs/psau-api-production in CloudWatch"
  exit 1
fi
```

### 2.4 Trigger Manual Backup

```bash
# Via API (Admin token required)
curl -X POST https://api.psau.edu.sd/api/v1/backup/run \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"configId": 1}'  # Get configId from GET /api/v1/backup/configs

# Monitor backup progress (SSE)
curl https://api.psau.edu.sd/api/v1/backup/logs/latest \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 2.5 Reset a Student's Password

```bash
# Registrar or Admin function — no direct DB access needed
curl -X POST https://api.psau.edu.sd/api/v1/students/2022-01-03-0047/reset-password \
  -H "Authorization: Bearer $REGISTRAR_TOKEN"
# Returns: { "tempPassword": "Xk9mP2..." }
# Give temp password to student — they must change on next login
```

### 2.6 Unlock a Locked Account

```bash
curl -X POST https://api.psau.edu.sd/api/v1/users/42/unlock \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 2.7 Scale ECS Tasks Manually (Exam Season)

```bash
# Scale up before exam results release
aws ecs update-service \
  --cluster psau-production \
  --service psau-api \
  --desired-count 6 \
  --region me-south-1

# Scale back down after peak
aws ecs update-service \
  --cluster psau-production \
  --service psau-api \
  --desired-count 2 \
  --region me-south-1
```

---

## 3. Diagnostic Playbooks

### Playbook A: API Returns 500 Errors

```bash
# Step 1: Check health endpoint
curl https://api.psau.edu.sd/health | jq .

# Step 2: Check ECS task status
aws ecs describe-services \
  --cluster psau-production \
  --services psau-api \
  --query 'services[0].{running:runningCount,desired:desiredCount,pending:pendingCount,deployments:deployments[*].status}' \
  --region me-south-1

# Step 3: Check recent error logs
aws logs filter-log-events \
  --log-group-name /ecs/psau-api-production \
  --filter-pattern '{ $.level = "error" }' \
  --start-time $(date -d '10 minutes ago' +%s000) \
  --region me-south-1 | jq '.events[].message | fromjson'

# Step 4: Check DB connectivity from within ECS
# (Run a diagnostic task that tests DB connection)
aws ecs run-task \
  --cluster psau-production \
  --task-definition psau-api-production \
  --overrides '{"containerOverrides":[{"name":"psau-api","command":["node","-e","require(\"./dist/config/database\").pool.query(\"SELECT 1\").then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})"]}]}' \
  ...

# Step 5: If DB connection failed → check RDS status
aws rds describe-db-instances \
  --db-instance-identifier psau-postgres-production \
  --query 'DBInstances[0].{status:DBInstanceStatus,connections:Endpoint}' \
  --region me-south-1

# Step 6: If DB is fine → check Redis
# Step 7: If all infra is fine → it's an application bug → check recent deploy
# Step 8: If recent deploy → rollback (see 2.2)
```

### Playbook B: Slow API Responses (P95 > 1s)

```bash
# Step 1: Identify slow endpoints via CloudWatch Insights
# Run saved query "QUERY 2: Slowest API endpoints" in CloudWatch console

# Step 2: Check for slow DB queries
aws logs filter-log-events \
  --log-group-name /aws/rds/instance/psau-postgres-production/postgresql \
  --filter-pattern 'duration' \
  --region me-south-1 | grep "duration: [0-9][0-9][0-9][0-9]"
# Look for queries > 1000ms

# Step 3: Check DB connection pool
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=psau-postgres-production \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Maximum \
  --region me-south-1

# Step 4: Check Redis hit rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CacheHitRate \
  ...

# Step 5: Check ECS CPU utilization
# If CPU > 80% → scale up
aws ecs update-service \
  --cluster psau-production \
  --service psau-api \
  --desired-count 4 \
  --region me-south-1
```

### Playbook C: GPA Values Look Wrong

This is a **P0 incident** — stop all grade approvals immediately.

```bash
# Step 1: Halt grade approvals
# Post in Slack: "#academic-staff: Grade approvals temporarily suspended — investigating"

# Step 2: Pull a suspect student's complete calculation
psql $DATABASE_URL << 'SQL'
SELECT 
  ssr.student_id,
  ssr.semester_id,
  ssr.sgpa AS cached_sgpa,
  ssr.cgpa AS cached_cgpa,
  ssr.computed_at,
  -- Manual calculation for verification
  ROUND(SUM(CASE WHEN e.enrollment_type != 'ALTERNATE' THEN g.course_points ELSE 0 END) /
        NULLIF(SUM(CASE WHEN e.enrollment_type != 'ALTERNATE' THEN c.credit_hours ELSE 0 END), 0), 2)
    AS manual_sgpa
FROM student_semester_records ssr
JOIN enrollments e ON e.student_id = ssr.student_id
JOIN course_offerings co ON co.offering_id = e.offering_id AND co.semester_id = ssr.semester_id
JOIN courses c ON c.course_id = co.course_id
LEFT JOIN grades g ON g.enrollment_id = e.enrollment_id
WHERE ssr.student_id = '2022-01-03-0001'
  AND ssr.semester_id = 3
GROUP BY ssr.student_id, ssr.semester_id, ssr.sgpa, ssr.cgpa, ssr.computed_at;
SQL

# Step 3: If manual_sgpa != cached_sgpa → formula bug
# Check git log for recent changes to gpa.service.ts or shared/lib/gpa.ts

# Step 4: If values match → display bug in frontend
# Check the React component that displays SGPA

# Step 5: If bug confirmed in formula code:
#   a. Create hotfix branch from main
#   b. Write failing test that reproduces the incorrect output
#   c. Fix the formula
#   d. Verify test passes
#   e. Run full test suite
#   f. Deploy hotfix (CI fast path)
#   g. Trigger GPA bulk recompute for affected semester

# Step 6: Trigger bulk recompute after fix
curl -X POST https://api.psau.edu.sd/api/v1/gpa/recalculate-semester/3 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Playbook D: Backup Failure

```bash
# Step 1: Check what failed
curl https://api.psau.edu.sd/api/v1/backup/logs?limit=5 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Common causes:
# - Disk full (local backup destination)
# - S3 permissions error
# - Google Drive token expired
# - DB connection timeout during backup

# Step 2: Check disk space (local backup destination)
df -h /var/psau-backups

# Step 3: Check S3 permissions
aws s3 ls s3://psau-backups-production/ --region me-south-1

# Step 4: Trigger manual backup after resolving cause
curl -X POST https://api.psau.edu.sd/api/v1/backup/run \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"configId": 1}'

# Step 5: Verify backup succeeded
curl https://api.psau.edu.sd/api/v1/backup/logs?limit=1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data[0].status'
# Must be "SUCCESS"
```

### Playbook E: Database Space Warning

```bash
# Check current storage usage
aws rds describe-db-instances \
  --db-instance-identifier psau-postgres-production \
  --query 'DBInstances[0].AllocatedStorage'

aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=psau-postgres-production \
  ...

# Check which tables are largest
psql $DATABASE_URL << 'SQL'
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) AS size,
  pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) AS size_bytes
FROM pg_tables
ORDER BY size_bytes DESC
LIMIT 20;
SQL

# If grade_audit_log is large, partition by month (already designed for this)
# If user_activity_log is large, archive old entries to S3
# RDS auto-scales to 500GB — modify limit if approaching:
aws rds modify-db-instance \
  --db-instance-identifier psau-postgres-production \
  --max-allocated-storage 1000 \
  --apply-immediately
```

---

## 4. Backup & Restore

### 4.1 Restore from Backup

```bash
# NEVER restore to production without a plan
# Restore procedure for production:
# 1. Create RDS snapshot before restoring (safety net)
# 2. Restore to a temporary RDS instance
# 3. Verify data integrity on the restored instance
# 4. If correct, restore to production during maintenance window

# Step 1: Create safety snapshot
aws rds create-db-snapshot \
  --db-instance-identifier psau-postgres-production \
  --db-snapshot-identifier psau-pre-restore-$(date +%Y%m%d%H%M%S) \
  --region me-south-1

# Step 2: Download backup from S3
aws s3 cp \
  s3://psau-backups-production/2025-01-15T03-00-00.backup.json.gz \
  /tmp/psau-backup.json.gz

# Step 3: Restore via API (handled by the restore service)
curl -X POST https://api.psau.edu.sd/api/v1/backup/restore \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "backup=@/tmp/psau-backup.json.gz" \
  -F "targetEnv=staging"  # NEVER restore directly to prod without staging verification
```

### 4.2 Point-in-Time Recovery (RDS)

```bash
# RDS has 30-day point-in-time recovery
# Use this for: accidental deletion, corruption

aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier psau-postgres-production \
  --target-db-instance-identifier psau-postgres-pitr-$(date +%Y%m%d) \
  --restore-time 2025-01-15T10:30:00Z \
  --region me-south-1

# Wait for restore
aws rds wait db-instance-available \
  --db-instance-identifier psau-postgres-pitr-$(date +%Y%m%d) \
  --region me-south-1

echo "PITR instance ready — verify data before promoting to production"
```

---

## 5. Maintenance Procedures

### 5.1 Rotating JWT Secrets (Zero Downtime)

JWT secret rotation requires a brief dual-validation window:

```bash
# Step 1: Generate new secret
NEW_SECRET=$(openssl rand -base64 48)

# Step 2: Update Secrets Manager (add new key, keep old)
aws secretsmanager put-secret-value \
  --secret-id psau/production/jwt-secrets \
  --secret-string "{\"jwt_secret\":\"$NEW_SECRET\",\"jwt_secret_old\":\"$OLD_SECRET\",\"rotate\":\"true\"}" \
  --region me-south-1

# Step 3: Deploy new code that accepts BOTH old and new secrets during validation
# (Code: try new secret first, fall back to old secret — allows in-flight tokens to work)

# Step 4: After 24 hours (all old tokens expired), remove jwt_secret_old
aws secretsmanager put-secret-value \
  --secret-id psau/production/jwt-secrets \
  --secret-string "{\"jwt_secret\":\"$NEW_SECRET\"}" \
  --region me-south-1
```

### 5.2 Dependency Updates

```bash
# Run monthly — check for security updates
pnpm audit --audit-level=moderate

# Update all dependencies (test thoroughly after)
pnpm update --recursive --latest

# After updating:
# 1. Run full test suite
# 2. Run E2E tests
# 3. Deploy to staging, smoke test
# 4. Deploy to production
```

### 5.3 Database Vacuum (Monthly)

```bash
# Run VACUUM ANALYZE to reclaim space and update statistics
psql $DATABASE_URL << 'SQL'
-- Check table bloat first
SELECT 
  schemaname, tablename,
  n_dead_tup, n_live_tup,
  round(n_dead_tup::numeric / nullif(n_live_tup + n_dead_tup, 0) * 100, 1) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;

-- Run VACUUM on bloated tables
VACUUM ANALYZE enrollments;
VACUUM ANALYZE grades;
VACUUM ANALYZE grade_audit_log;
VACUUM ANALYZE user_activity_log;
SQL
```

---

## 6. Post-Mortem Template

Use this for every P0 and P1 incident:

```markdown
# Post-Mortem: [Brief Title]

**Date:** YYYY-MM-DD  
**Duration:** X hours Y minutes  
**Severity:** P0 / P1  
**Impact:** [Who was affected, what could they not do]

## Timeline (UTC)
- HH:MM — Alert triggered / first report
- HH:MM — On-call engineer acknowledged
- HH:MM — Root cause identified
- HH:MM — Mitigation applied
- HH:MM — Service restored

## Root Cause
[Technical explanation — no blame, just facts]

## What Went Well
- [What helped us resolve it faster]
- [What monitoring caught it]

## What Went Poorly  
- [What slowed us down]
- [What monitoring missed]

## Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| [Specific fix] | [Name] | YYYY-MM-DD |
| [Add test to prevent regression] | [Name] | YYYY-MM-DD |
| [Improve alert] | [Name] | YYYY-MM-DD |

## Lessons Learned
[What would we do differently]
```

---

## 7. Pre-Exam Season Checklist

Run this 2 weeks before every exam period (when load spikes):

```bash
# Infrastructure
[ ] Scale ECS desired count to 4 (from 2)
[ ] Verify RDS read replica is healthy
[ ] Test Redis memory — clear unnecessary keys if > 70%
[ ] Verify auto-scaling policy is active
[ ] Pre-warm CloudFront cache

# Application
[ ] Run load test at 200 VUs — verify passes SLOs
[ ] Verify GPA recompute queue is empty
[ ] Test PDF generation under load (transcript PDF concurrency)
[ ] Verify all grade-related workflows functional (E2E)

# Data
[ ] Verify current semester is set correctly
[ ] Verify all course offerings are created for exam semester
[ ] Verify instructor assignments are complete

# Backup
[ ] Trigger manual backup and verify success
[ ] Verify backup restore works (restore to staging)
[ ] Confirm 30-day retention policy is active

# Communication
[ ] Notify academic staff of system availability
[ ] Confirm on-call schedule for exam results release day
```
