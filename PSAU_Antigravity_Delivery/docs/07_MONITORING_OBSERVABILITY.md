# Monitoring & Observability
## Metrics · Logs · Alerts · Dashboards · SLOs · Senior Quality Review

---

## Philosophy

> Monitoring is not something you add after delivery. Every feature ships with its observable signals already defined. If you cannot measure it, it does not exist.

Three pillars: **Metrics** (what's happening) + **Logs** (why it happened) + **Traces** (how long each step took).

---

## 1. SLOs — Service Level Objectives

These are the contractual targets. CloudWatch alarms fire when breached.

| SLO | Target | Measurement Window | Alert Threshold |
|-----|--------|-------------------|-----------------|
| API Availability | 99.5% | Rolling 30 days | Alert at 99.8% (budget burn warning) |
| API P95 Response Time | < 500ms | 5-minute rolling | Alert if P95 > 800ms for 5 min |
| API Error Rate (5xx) | < 0.5% | 5-minute rolling | Alert if > 1% for 3 min |
| DB Connection Pool | < 80% used | 1-minute rolling | Alert if > 85% |
| Grade Approval Latency | < 2s | Per transaction | Alert if avg > 3s |
| GPA Recompute Queue Depth | < 100 jobs | 5-minute rolling | Alert if > 200 |
| Backup Success Rate | 100% | Daily | Alert on any failure |
| Student Portal Response | < 300ms P95 | 5-minute rolling | Alert if > 600ms |

**Error budget:** 0.5% downtime = 3.6 hours/month = 2.16 minutes/day. Track burn rate weekly.

---

## 2. Application Metrics (Custom CloudWatch Namespace: `PSAU/Application`)

Every metric below is emitted by the API using the AWS SDK `PutMetricData`.

### 2.1 Business Metrics

```typescript
// packages/api/src/lib/metrics.ts
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

const cw = new CloudWatch({ region: process.env.AWS_REGION });

export const metrics = {
  async emit(name: string, value: number, unit = 'Count', dimensions: Record<string, string> = {}) {
    if (process.env.NODE_ENV !== 'production') return;  // no-op in dev/test
    
    await cw.putMetricData({
      Namespace: 'PSAU/Application',
      MetricData: [{
        MetricName: name,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value })),
      }],
    });
  },

  // Business events
  gradeSubmitted: (departmentId: string) =>
    metrics.emit('GradeSubmitted', 1, 'Count', { Department: departmentId }),

  gradeApproved: (departmentId: string) =>
    metrics.emit('GradeApproved', 1, 'Count', { Department: departmentId }),

  gradeRejected: (departmentId: string) =>
    metrics.emit('GradeRejected', 1, 'Count', { Department: departmentId }),

  studentCreated: (facultyId: string) =>
    metrics.emit('StudentCreated', 1, 'Count', { Faculty: facultyId }),

  transcriptGenerated: (type: 'web' | 'pdf') =>
    metrics.emit('TranscriptGenerated', 1, 'Count', { Type: type }),

  backupCompleted: (destination: 'local' | 'gdrive' | 's3', sizeBytes: number) => {
    metrics.emit('BackupCompleted', 1, 'Count', { Destination: destination });
    metrics.emit('BackupSizeBytes', sizeBytes, 'Bytes', { Destination: destination });
  },

  backupFailed: (destination: string) =>
    metrics.emit('BackupFailed', 1, 'Count', { Destination: destination }),

  loginAttempt: (success: boolean, role: string) =>
    metrics.emit('LoginAttempt', 1, 'Count', { Success: String(success), Role: role }),

  accountLocked: () =>
    metrics.emit('AccountLocked', 1, 'Count'),

  // Performance
  gpaRecomputeDuration: (durationMs: number, studentCount: number) => {
    metrics.emit('GPARecomputeDurationMs', durationMs, 'Milliseconds');
    metrics.emit('GPARecomputeStudentCount', studentCount, 'Count');
  },

  gpaQueueDepth: (depth: number) =>
    metrics.emit('GPAQueueDepth', depth, 'Count'),

  pdfGenerationDuration: (durationMs: number) =>
    metrics.emit('PDFGenerationMs', durationMs, 'Milliseconds'),
};
```

### 2.2 HTTP Metrics (auto-collected per-request)

```typescript
// middleware/metrics.ts — wraps every request
export function requestMetrics(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const route = req.route?.path ?? 'unknown';
    
    // These feed into CloudWatch dashboards
    metrics.emit('RequestDuration', durationMs, 'Milliseconds', {
      Method: req.method,
      Route: route,
      StatusCode: String(res.statusCode),
    });
    
    if (res.statusCode >= 500) {
      metrics.emit('ServerError', 1, 'Count', { Route: route });
    }
    if (res.statusCode >= 400 && res.statusCode < 500) {
      metrics.emit('ClientError', 1, 'Count', { Route: route });
    }
  });
  
  next();
}
```

---

## 3. Structured Logging

Every log line in production is JSON. This is non-negotiable — CloudWatch Logs Insights queries depend on it.

### 3.1 Log Schema

```typescript
// Every log entry contains:
{
  "level": "info",                          // error | warn | info | http | debug
  "timestamp": "2025-01-15T10:23:44.123Z",  // ISO 8601 UTC
  "requestId": "8f3a2c1d-...",              // X-Request-ID — ties all logs for a request
  "message": "Grade approved",
  
  // Optional but structured:
  "userId": 42,
  "role": "C",
  "studentId": "2022-01-03-0047",
  "gradeId": 1234,
  "duration": 87,                           // ms, when relevant
  "error": {                                // only on error/warn
    "code": "GRADE_ALREADY_APPROVED",
    "stack": "..."                          // only in dev
  }
}
```

### 3.2 Log Level Policy

| Level | When to use | Examples |
|-------|-------------|---------|
| `error` | System failure requiring immediate action | DB connection lost, OOM, uncaught exception |
| `warn` | Recoverable failure, potential issue | Validation error, 404, rate limit hit, failed login |
| `info` | Significant business event | Login success, grade approved, backup completed, student created |
| `http` | Every HTTP request (Morgan) | `GET /api/v1/students 200 87ms` |
| `debug` | Detailed technical info (dev/test only) | SQL query, cache hit/miss, token refresh |

**Never log PII:** No passwords, no full student records, no grade data in log messages. Log IDs only.

### 3.3 CloudWatch Log Groups

| Log Group | Source | Retention |
|-----------|--------|-----------|
| `/ecs/psau-api-production` | ECS task stdout | 90 days |
| `/aws/rds/instance/psau-postgres-production/postgresql` | RDS slow query log | 30 days |
| `/psau/application/audit` | Grade audit trail | 7 years (compliance) |
| `/psau/application/security` | Auth events, rate limits | 1 year |
| `/aws/waf/psau-production` | WAF decisions | 30 days |

---

## 4. CloudWatch Alarms

### 4.1 Critical Alarms (PagerDuty/phone call)

```hcl
# terraform/modules/monitoring/alarms.tf

# API availability — 5xx error rate > 1% for 5 minutes
resource "aws_cloudwatch_metric_alarm" "api_error_rate_critical" {
  alarm_name          = "psau-prod-api-error-rate-critical"
  alarm_description   = "API 5xx error rate exceeded 1% for 5 minutes"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  threshold           = 1.0
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "errors / requests * 100"
    label       = "Error Rate (%)"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "ServerError"
      namespace   = "PSAU/Application"
      period      = 60
      stat        = "Sum"
    }
  }

  metric_query {
    id = "requests"
    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions  = { LoadBalancer = aws_lb.main.arn_suffix }
    }
  }

  alarm_actions = [aws_sns_topic.critical_alerts.arn]
  ok_actions    = [aws_sns_topic.critical_alerts.arn]
}

# Database connections critical
resource "aws_cloudwatch_metric_alarm" "db_connections_critical" {
  alarm_name          = "psau-prod-db-connections-critical"
  alarm_description   = "RDS connection count above 85% of max_connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 42    # 85% of max_connections=50
  period              = 60
  statistic           = "Maximum"
  namespace           = "AWS/RDS"
  metric_name         = "DatabaseConnections"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.id }
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
}

# ECS task count drops below minimum
resource "aws_cloudwatch_metric_alarm" "ecs_task_count" {
  alarm_name          = "psau-prod-ecs-task-count-low"
  alarm_description   = "Running ECS tasks below minimum desired count"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  threshold           = 2    # Min desired count for prod
  period              = 60
  statistic           = "Minimum"
  namespace           = "ECS/ContainerInsights"
  metric_name         = "RunningTaskCount"
  dimensions          = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = "psau-api"
  }
  alarm_actions = [aws_sns_topic.critical_alerts.arn]
}

# GPA recompute queue depth — academic integrity risk
resource "aws_cloudwatch_metric_alarm" "gpa_queue_critical" {
  alarm_name          = "psau-prod-gpa-queue-critical"
  alarm_description   = "GPA recompute queue depth above 200 — students may see stale CGPAs"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  threshold           = 200
  period              = 300
  statistic           = "Maximum"
  namespace           = "PSAU/Application"
  metric_name         = "GPAQueueDepth"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
}

# Backup failure
resource "aws_cloudwatch_metric_alarm" "backup_failure" {
  alarm_name          = "psau-prod-backup-failure"
  alarm_description   = "Scheduled backup failed"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 0
  period              = 86400   # 24 hours
  statistic           = "Sum"
  namespace           = "PSAU/Application"
  metric_name         = "BackupFailed"
  alarm_actions       = [aws_sns_topic.critical_alerts.arn]
}
```

### 4.2 Warning Alarms (Slack notification)

```hcl
# API P95 response time > 800ms for 10 minutes
resource "aws_cloudwatch_metric_alarm" "api_latency_warning" {
  alarm_name          = "psau-prod-api-latency-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 800
  period              = 300
  extended_statistic  = "p95"
  namespace           = "PSAU/Application"
  metric_name         = "RequestDuration"
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
}

# Redis memory > 80%
resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "psau-prod-redis-memory-warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 80
  period              = 300
  statistic           = "Average"
  namespace           = "AWS/ElastiCache"
  metric_name         = "DatabaseMemoryUsagePercentage"
  dimensions          = { ReplicationGroupId = aws_elasticache_replication_group.main.id }
  alarm_actions       = [aws_sns_topic.warning_alerts.arn]
}

# High login failure rate (possible brute force)
resource "aws_cloudwatch_metric_alarm" "login_failures" {
  alarm_name          = "psau-prod-login-failures-warning"
  alarm_description   = "High login failure rate — possible brute force attempt"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 50    # 50 failures in 5 minutes
  period              = 300
  statistic           = "Sum"
  namespace           = "PSAU/Application"
  metric_name         = "LoginAttempt"
  # filter by Success=false using metric filter
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
}
```

### 4.3 SNS → Notification Routing

```hcl
resource "aws_sns_topic" "critical_alerts" {
  name = "psau-production-critical"
}

resource "aws_sns_topic_subscription" "critical_email" {
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "email"
  endpoint  = var.oncall_email
}

resource "aws_sns_topic_subscription" "critical_slack" {
  topic_arn = aws_sns_topic.critical_alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url_critical
}

resource "aws_sns_topic" "warning_alerts" {
  name = "psau-production-warning"
}

resource "aws_sns_topic_subscription" "warning_slack" {
  topic_arn = aws_sns_topic.warning_alerts.arn
  protocol  = "https"
  endpoint  = var.slack_webhook_url_warning
}

resource "aws_sns_topic" "security_alerts" {
  name = "psau-production-security"
}
```

---

## 5. CloudWatch Dashboard

```json
// monitoring/cloudwatch-dashboard.json
{
  "widgets": [
    {
      "type": "metric",
      "title": "API Health Overview",
      "properties": {
        "metrics": [
          ["PSAU/Application", "ServerError", { "stat": "Sum", "label": "5xx Errors/min" }],
          [".", "ClientError", { "stat": "Sum", "label": "4xx Errors/min" }],
          ["AWS/ApplicationELB", "RequestCount", { "stat": "Sum", "label": "Total Requests/min" }]
        ],
        "period": 60,
        "view": "timeSeries",
        "stacked": false,
        "title": "Request Volume & Errors"
      }
    },
    {
      "type": "metric",
      "title": "Response Time Percentiles",
      "properties": {
        "metrics": [
          ["PSAU/Application", "RequestDuration", { "stat": "p50", "label": "P50" }],
          [".", ".", { "stat": "p95", "label": "P95" }],
          [".", ".", { "stat": "p99", "label": "P99" }]
        ],
        "period": 300,
        "yAxis": { "left": { "label": "ms", "min": 0 } }
      }
    },
    {
      "type": "metric",
      "title": "Academic Operations",
      "properties": {
        "metrics": [
          ["PSAU/Application", "GradeSubmitted", { "stat": "Sum", "label": "Grades Submitted" }],
          [".", "GradeApproved", { "stat": "Sum", "label": "Grades Approved" }],
          [".", "GradeRejected", { "stat": "Sum", "label": "Grades Rejected" }],
          [".", "TranscriptGenerated", { "stat": "Sum", "label": "Transcripts Generated" }]
        ],
        "period": 3600,
        "title": "Academic Events (hourly)"
      }
    },
    {
      "type": "metric",
      "title": "GPA System Health",
      "properties": {
        "metrics": [
          ["PSAU/Application", "GPAQueueDepth", { "stat": "Maximum", "label": "Queue Depth" }],
          [".", "GPARecomputeDurationMs", { "stat": "Average", "label": "Avg Recompute Time (ms)" }]
        ],
        "period": 300,
        "annotations": {
          "horizontal": [{ "value": 200, "label": "Alert Threshold", "color": "#ff0000" }]
        }
      }
    },
    {
      "type": "metric",
      "title": "Infrastructure",
      "properties": {
        "metrics": [
          ["ECS/ContainerInsights", "CpuUtilized", { "stat": "Average", "label": "CPU %" }],
          [".", "MemoryUtilized", { "stat": "Average", "label": "Memory %" }],
          ["AWS/RDS", "DatabaseConnections", { "stat": "Maximum", "label": "DB Connections" }],
          ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", { "stat": "Average", "label": "Redis Memory %" }]
        ],
        "period": 300
      }
    },
    {
      "type": "metric",
      "title": "Security Events",
      "properties": {
        "metrics": [
          ["PSAU/Application", "LoginAttempt", { "stat": "Sum", "label": "Total Logins" }],
          [".", "AccountLocked", { "stat": "Sum", "label": "Accounts Locked" }],
          ["AWS/WAFV2", "BlockedRequests", { "stat": "Sum", "label": "WAF Blocked" }]
        ],
        "period": 300
      }
    }
  ]
}
```

---

## 6. CloudWatch Logs Insights Queries

Saved queries for the operations team. Run these in the CloudWatch console.

```sql
-- QUERY 1: Find all 5xx errors in last hour with context
fields @timestamp, requestId, message, error.code, userId, @log
| filter level = "error"
| filter @timestamp >= now() - 1h
| sort @timestamp desc
| limit 50

-- QUERY 2: Slowest API endpoints (P95 per route)
fields @timestamp, duration, route, method, statusCode
| filter ispresent(duration)
| stats percentile(duration, 95) as p95_ms, count() as requests
  by route, method
| sort p95_ms desc
| limit 20

-- QUERY 3: Failed login attempts by IP (brute force detection)
fields @timestamp, message, ip_address, userId
| filter message like /login/
| filter success = false
| stats count() as failures by ip_address
| sort failures desc
| limit 20

-- QUERY 4: Grade workflow audit (who approved what)
fields @timestamp, userId, action, gradeId, studentId
| filter action in ["GRADE_SUBMITTED", "GRADE_APPROVED", "GRADE_REJECTED"]
| sort @timestamp desc
| limit 100

-- QUERY 5: Student portal access patterns
fields @timestamp, studentId, route, duration
| filter role = "S"
| stats count() as views, avg(duration) as avg_ms
  by route, studentId
| sort views desc

-- QUERY 6: GPA recompute performance over time
fields @timestamp, durationMs, studentCount
| filter message = "GPA recompute completed"
| stats avg(durationMs) as avg_duration_ms,
        max(durationMs) as max_duration_ms,
        sum(studentCount) as total_students
  by bin(1h)

-- QUERY 7: Backup audit log
fields @timestamp, message, destination, fileSizeBytes, status
| filter message like /backup/i
| sort @timestamp desc
| limit 30

-- QUERY 8: Database slow queries (from RDS log group)
fields @timestamp, duration, statement
| filter duration > 1000      -- > 1 second
| sort duration desc
| limit 20
```

---

## 7. Senior Quality Review Checklist (Testing Phase)

This is the process Antigravity follows when testing is complete but before marking any phase "done." Every item must be checked against real data from the test environment.

### 7.1 Performance Review

Run these against the test environment with realistic data volume (use the migration wizard to load 10,000+ test students):

```bash
# Load test: student list endpoint
k6 run --vus 50 --duration 2m tests/load/student-list.js
# Pass criteria: P95 < 250ms, zero errors

# Load test: grade entry sheet (instructor workflow)
k6 run --vus 20 --duration 2m tests/load/grade-entry.js
# Pass criteria: P95 < 300ms, zero errors

# Load test: exam season simulation (peak usage)
# 200 concurrent users, mix of all roles
k6 run --vus 200 --duration 5m tests/load/exam-season.js
# Pass criteria: P95 < 500ms, error rate < 0.1%

# Load test file: tests/load/student-list.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<250'],
    http_req_failed: ['rate<0.001'],
  },
};

export default function () {
  const res = http.get('http://api:8080/api/v1/students?limit=50', {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(Math.random() * 2);
}
```

### 7.2 Database Query Analysis

For each major query pattern, run `EXPLAIN ANALYZE` and verify:

```sql
-- Student search (must use index)
EXPLAIN ANALYZE
SELECT student_id, name_ar, name_en, department_id
FROM students
WHERE name_ar ILIKE '%أحمد%'
ORDER BY student_id
LIMIT 50;
-- Required: "Index Scan" or "Bitmap Index Scan" — NOT "Seq Scan" on large tables

-- Grade sheet (offered course with all enrolled students)
EXPLAIN ANALYZE
SELECT e.enrollment_id, e.student_id, e.enrollment_type,
       g.final_score, g.midterm_score, g.assignments_score,
       g.attendance_pct, g.total_score, g.grade_point, g.letter_grade, g.entry_status
FROM enrollments e
LEFT JOIN grades g ON g.enrollment_id = e.enrollment_id
WHERE e.offering_id = 42
ORDER BY e.student_id;
-- Required: Index Scan on idx_enrollments_offering

-- CGPA history (student portal)
EXPLAIN ANALYZE
SELECT semester_id, sgpa, cgpa, academic_status
FROM student_semester_records
WHERE student_id = '2022-01-03-0047'
ORDER BY semester_id;
-- Required: Index Scan on idx_ssr_student_semester
```

**If any query shows Seq Scan on a table > 1000 rows: create missing index before delivery.**

### 7.3 N+1 Detection

```bash
# Enable query counting in test environment
export LOG_QUERY_COUNT=true

# Run through student list page
curl http://localhost:8080/api/v1/students?limit=50 \
  -H "Authorization: Bearer $TOKEN"

# Check logs for query count
grep "query_count" api.log | tail -1
# Acceptable: <= 3 queries for paginated list
# Unacceptable: query count scales with row count (N+1)
```

### 7.4 Memory Leak Detection

```bash
# Run API under sustained load for 10 minutes
# Monitor memory growth
watch -n 5 'docker stats psau-api-test --no-stream --format "{{.MemUsage}}"'

# Memory should stabilize, not grow linearly over time
# Acceptable: < 50MB growth over 10 minutes of sustained load
# Unacceptable: memory grows indefinitely
```

### 7.5 Security Verification

```bash
# 1. Verify no student can access another student's data
# Login as student A, try to access student B's transcript
curl http://localhost:8080/api/v1/student/me/transcript \
  -H "Authorization: Bearer $STUDENT_A_TOKEN"
# Must return student A's data only

curl http://localhost:8080/api/v1/students/2022-01-03-0999/transcript \
  -H "Authorization: Bearer $STUDENT_A_TOKEN"
# Must return 403, NOT another student's data

# 2. Verify rate limiting on login
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:8080/api/v1/auth/login \
    -d '{"username":"admin","password":"wrong"}'
done
# First 10: 401, After 10: 429

# 3. Verify APPROVED grades cannot be modified
GRADE_ID=$(get_approved_grade_id)
curl -X PUT http://localhost:8080/api/v1/grades/$GRADE_ID \
  -H "Authorization: Bearer $COORDINATOR_TOKEN" \
  -d '{"finalScore": 99}'
# Must return 409 GRADE_ALREADY_APPROVED

# 4. SQL injection test
curl "http://localhost:8080/api/v1/students?q='; DROP TABLE students;--" \
  -H "Authorization: Bearer $TOKEN"
# Must return empty results or 422, NOT a 500 error

# 5. Verify Helmet headers present
curl -I http://localhost:8080/api/v1/students \
  -H "Authorization: Bearer $TOKEN" | grep -E "x-frame|x-content|strict-transport"
# Must show all three headers
```

### 7.6 GPA Formula Verification Against Real Data

After loading test data, manually verify:

```sql
-- Pull a student's grade history
SELECT 
  s.semester_id,
  c.credit_hours,
  g.total_score,
  g.grade_point,
  g.course_points,
  e.enrollment_type
FROM enrollments e
JOIN course_offerings co ON co.offering_id = e.offering_id
JOIN courses c ON c.course_id = co.course_id
JOIN grades g ON g.enrollment_id = e.enrollment_id
WHERE e.student_id = '2022-01-03-0001'
ORDER BY s.semester_id, c.course_id;
```

Then manually compute CGPA using the Advising Guide formulas and compare to `student_semester_records.cgpa`. Any discrepancy is a **critical defect**.

### 7.7 Accessibility Audit

```bash
# Run axe-core via Playwright on all major pages
pnpm playwright test --project=accessibility

# Pages that must pass (zero violations):
# - /login
# - /dashboard
# - /students  
# - /portal/dashboard
# - /portal/transcript
# - /grades/approvals
# - /portal/grades
```

---

## 8. Operational Metrics Review (Weekly)

Every week during initial operation, the lead engineer reviews:

| Metric | Source | Action if Bad |
|--------|--------|--------------|
| P95 response time trend | CloudWatch | If increasing week-over-week, investigate queries |
| Cache hit rate | Redis INFO stats | If < 60%, review cache key strategy |
| DB connection pool max | RDS CloudWatch | If approaching limit, audit connection lifecycle |
| Error rate | CloudWatch | Any sustained > 0.1% triggers investigation |
| GPA queue depth trend | PSAU/Application | If growing, GPA job frequency needs adjustment |
| Failed backup count | Backup logs | Zero tolerance — any failure → immediate fix |
| Login failure count | Security logs | > 100/day → review rate limiting and lockout policy |
| Student portal adoption | Access logs | Track which pages students use (informs UX improvements) |
| PDF generation time | PSAU/Application | If P95 > 5s, investigate Puppeteer memory or caching |
