# Security Threat Model & Hardening Checklist
## What We Defend Against and How

---

## Threat Model

### Assets We Protect
1. **Student academic records** — grades, CGPA, academic standing (highest sensitivity)
2. **Student personal data** — name, department, ID number
3. **Grade approval integrity** — once approved, grade is a legal record
4. **System availability** — 30,000 students need access during exam season
5. **Authentication tokens** — compromise gives full account access
6. **Backup files** — contain entire university database

### Threat Actors
| Actor | Capability | Likely Goal |
|-------|-----------|-------------|
| Malicious student | Web browser, basic scripting | See other students' grades, change own grade |
| Rogue instructor | API access with valid token | Approve their own grades, change grades after approval |
| External attacker | Internet access, scanning tools | Database access, admin account creation |
| Compromised staff account | Valid credentials | Bulk data export, grade manipulation |
| Insider threat | Internal network access | Same as compromised staff + physical access |

---

## Threat → Control Mapping

### T1: Student Accesses Another Student's Records

**Threat:** A student modifies the API request to access a different student's transcript, grades, or enrollment.

**Controls:**
1. JWT token encodes `studentId` — cannot be changed without a new token
2. All student-portal SQL queries include `WHERE student_id = $1` (from token, not request)
3. RBAC middleware blocks non-S roles from student portal endpoints

**Verification test:**
```typescript
it('student A cannot access student B transcript', async () => {
  const resA = await request(app)
    .get('/api/v1/student/me/transcript')
    .set('Authorization', `Bearer ${studentAToken}`);
  
  expect(resA.status).toBe(200);
  expect(resA.body.data.studentId).toBe(STUDENT_A_ID);
  
  // Try to get student B's transcript using student A's token
  const resB = await request(app)
    .get(`/api/v1/students/${STUDENT_B_ID}/transcript`)
    .set('Authorization', `Bearer ${studentAToken}`);
  
  expect(resB.status).toBe(403);
  expect(resB.body.data).toBeUndefined();
});
```

---

### T2: Instructor Approves Own Grades

**Threat:** An instructor submits grades and then approves them, bypassing coordinator review.

**Controls:**
1. RBAC: `requireRole(['A', 'C'])` on approve endpoint — instructors (role I) cannot approve
2. Self-approval check: if `submittedBy === approverId` → `403 CANNOT_SELF_APPROVE`
3. Grade audit log records who submitted and who approved — detectable post-hoc

**Implementation:**
```typescript
async approve(gradeId: number, approverId: number): Promise<Grade> {
  const grade = await this.gradeRepo.findById(gradeId);
  
  if (grade.submittedBy === approverId) {
    throw new ForbiddenError('CANNOT_SELF_APPROVE', 
      'Cannot approve grades you submitted',
      'لا يمكنك الموافقة على درجات قمت بتقديمها');
  }
  // ...
}
```

---

### T3: Modification of Approved Grade

**Threat:** Anyone (including admin) modifies an already-approved grade outside the correct correction workflow.

**Controls:**
1. API returns `409 GRADE_ALREADY_APPROVED` for any update to an approved grade
2. Correction requires admin-level operation with mandatory audit log reason
3. `entry_status = 'APPROVED'` check in service layer before any mutation

---

### T4: Unauthorized Account Creation (Privilege Escalation)

**Threat:** External attacker calls `POST /api/v1/users` to create an admin account.

**Controls:**
1. The public register endpoint (`/api/register`) is DELETED — does not exist
2. `POST /api/v1/users` requires `Authorization: Bearer [Admin token]`
3. `requireRole(['A'])` on all user creation endpoints
4. No endpoint creates a user with role A except via another admin

**Verification:**
```bash
# This must return 401 (unauthenticated)
curl -X POST https://api.psau.edu.sd/api/v1/users \
  -d '{"username":"evil","password":"evil","role":"A"}'
```

---

### T5: SQL Injection

**Threat:** Attacker sends malicious SQL in a query parameter or request body.

**Controls:**
1. All database queries use parameterized queries — never string concatenation
2. Zod validation strips unexpected fields from request body
3. WAF (AWS WAFv2) blocks common SQL injection patterns

**Verification:**
```bash
# Must return 200 with empty results, NOT a 500 or partial data
curl "http://localhost:8080/api/v1/students?q='; DROP TABLE students; --" \
  -H "Authorization: Bearer $TOKEN"
```

---

### T6: Brute Force Login

**Threat:** Attacker attempts thousands of password guesses against a known username.

**Controls:**
1. Rate limiting: 10 login attempts per IP per 15 minutes → `429 Too Many Requests`
2. Account lockout: 10 failed attempts → locked for 15 minutes
3. Response time is constant whether username exists or not (no user enumeration)
4. bcrypt with cost factor 12 (≈150ms per hash check — slows offline attacks)

---

### T7: Session Hijacking via XSS

**Threat:** Attacker injects JavaScript that reads the auth token and sends it to a remote server.

**Controls:**
1. Access token stored in React memory (Zustand) — not in localStorage or cookies
2. Refresh token in `httpOnly` cookie — JavaScript cannot read it
3. Content Security Policy via Helmet blocks inline scripts and external JS sources
4. `SameSite=Strict` on refresh token cookie — cannot be sent from external origin

---

### T8: CSRF (Cross-Site Request Forgery)

**Threat:** Attacker tricks a logged-in user into making a state-changing request.

**Controls:**
1. API requires `Authorization: Bearer [token]` header — custom headers cannot be set by cross-origin requests without CORS preflight
2. Refresh token uses `SameSite=Strict` cookie
3. CORS policy allows only explicitly configured origins

---

### T9: Insecure Direct Object Reference (IDOR)

**Threat:** Attacker guesses or iterates IDs to access resources they shouldn't.

**Controls:**
1. Student IDs are format `YYYY-FF-DD-NNNN` — while guessable in format, access is still blocked by authorization
2. All resource access checks ownership or role before returning data
3. Internal IDs (grade_id, enrollment_id) are sequential integers — RBAC prevents unauthorized access

---

### T10: Backup File Exposure

**Threat:** Attacker downloads a backup file containing the entire university database.

**Controls:**
1. Backup files are AES-256 encrypted before storage
2. S3 bucket is private — no public access policy
3. IAM role for ECS task has write-only access to backup bucket (cannot list or read)
4. Backup download requires Admin token — no public endpoint for backups

---

## Pre-Production Security Checklist

### Authentication
- [ ] JWT secret is ≥ 32 random bytes (not a guessable string)
- [ ] JWT secret stored only in Secrets Manager — not in code, env files, or logs
- [ ] Refresh token has `httpOnly`, `secure`, `SameSite=Strict` attributes
- [ ] Password hashed with bcrypt cost ≥ 12
- [ ] `must_change_password` flag checked on every login for new accounts

### Authorization
- [ ] Every route has explicit `requireRole(...)` middleware
- [ ] Student portal endpoints check `student_id = req.user.studentId` at SQL level
- [ ] No endpoint creates a user without Admin authentication
- [ ] Coordinator cannot approve grades they submitted (self-approval check)

### Transport
- [ ] TLS 1.2+ enforced everywhere (no TLS 1.0/1.1)
- [ ] HSTS header with `max-age=31536000; includeSubDomains`
- [ ] HTTP to HTTPS redirect at load balancer
- [ ] Certificate from ACM (auto-renewed)

### Application
- [ ] Helmet enabled with full CSP
- [ ] Rate limiting active on login (10/15min) and sensitive operations (5/min)
- [ ] CORS origins are explicit (no `*`)
- [ ] DevTunnel/localhost URLs not in CORS config
- [ ] All SQL uses parameterized queries (grep for string concatenation in queries)
- [ ] Zod validation on all request inputs
- [ ] Error responses never include stack traces in production
- [ ] No sensitive data in log messages (passwords, full grade records, tokens)

### Infrastructure (v2.1 only)
- [ ] RDS not publicly accessible (private subnet only)
- [ ] ElastiCache not publicly accessible (private subnet only)
- [ ] S3 buckets have no public access policy
- [ ] IAM roles follow least privilege
- [ ] WAF enabled with SQL injection + Common rule sets
- [ ] CloudTrail enabled (API call audit log for AWS actions)
- [ ] GuardDuty enabled (threat detection)
- [ ] Security group rules: no `0.0.0.0/0` inbound except ALB on 443/80

### Dependency Security
- [ ] `npm audit --audit-level=high` returns zero issues
- [ ] Trivy container scan returns zero CRITICAL or HIGH CVEs
- [ ] Dependabot or Renovate configured for automatic dependency PRs
- [ ] No packages with known critical vulnerabilities
- [ ] All packages pinned to exact versions in `pnpm-lock.yaml`

---

## Penetration Test Checklist (Run Before v2.1 Go-Live)

```bash
# OWASP ZAP full scan against test environment
docker run -v $(pwd)/zap:/zap/wrk owasp/zap2docker-stable \
  zap-full-scan.py -t http://test-api:8080 -r /zap/wrk/report.html

# Check WAF blocks SQLi
curl "https://api.psau.edu.sd/api/v1/students?q=1' OR '1'='1" \
  -H "Authorization: Bearer $TOKEN"
# Must return 403 (WAF block) or 200 with empty results (parameterized query)

# Check rate limiting
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://api.psau.edu.sd/api/v1/auth/login \
    -d '{"username":"admin","password":"wrong"}'
done
# 401 x10, then 429 x5

# Check HTTPS enforced
curl -I http://psau.edu.sd
# Must return 301 redirect to https://

# Check security headers
curl -I https://api.psau.edu.sd/health | grep -iE "strict-transport|x-frame|x-content|csp"
# Must show all headers
```
