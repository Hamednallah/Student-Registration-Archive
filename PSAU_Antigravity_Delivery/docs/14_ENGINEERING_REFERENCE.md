# Engineering Reference
## Dependencies · i18n · Browser Support · Integration Points · Data Retention

---

## 1. Dependency Inventory — Every Package and Why

### `@psau/api` — Backend

| Package | Version | Purpose | Can Be Removed? |
|---------|---------|---------|----------------|
| `express` | ^4.19 | HTTP framework | No — core |
| `typescript` | ^5.4 | Type safety | No — core |
| `zod` | ^3.23 | Runtime validation + TypeScript type inference | No — validation is shared with web |
| `jsonwebtoken` | ^9.0 | JWT sign/verify | No — auth core |
| `bcrypt` | ^5.1 | Password hashing | No — security core |
| `pg` | ^8.12 | PostgreSQL client | No — production DB |
| `better-sqlite3` | ^9.6 | SQLite client | No — dev DB |
| `redis` | ^4.6 | Redis client | No — caching + queue |
| `winston` | ^3.13 | Structured logging | No — ops requirement |
| `morgan` | ^1.10 | HTTP request logging | No — ops requirement |
| `helmet` | ^7.1 | Security headers | No — security requirement |
| `express-rate-limit` | ^7.3 | Rate limiting | No — security requirement |
| `cors` | ^2.8 | CORS middleware | No — security requirement |
| `multer` | ^1.4 | File uploads (CSV migration) | No — migration feature |
| `node-cron` | ^3.0 | Scheduled jobs (backup, GPA recompute) | No — scheduler |
| `puppeteer` | ^22.0 | PDF generation (transcripts) | No — transcript feature |
| `papaparse` | ^5.4 | CSV parsing (migration) | No — migration feature |
| `@aws-sdk/client-cloudwatch` | ^3.x | CloudWatch metrics | Optional in dev |
| `@aws-sdk/client-s3` | ^3.x | S3 backup storage | Optional in dev |
| `@aws-sdk/client-ses` | ^3.x | Email via SES | Optional |
| `swagger-jsdoc` | ^6.2 | Generate OpenAPI spec from JSDoc | Dev/test only |
| `swagger-ui-express` | ^5.0 | Serve Swagger UI | Dev/test only |

### `@psau/shared` — Shared Library

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | ^3.23 | Validation schemas (used by both api and web) |
| `typescript` | ^5.4 | Type safety |

### `@psau/web` — Frontend

| Package | Version | Purpose | Can Be Removed? |
|---------|---------|---------|----------------|
| `react` | ^18.3 | UI framework | No — core |
| `react-dom` | ^18.3 | DOM rendering | No — core |
| `typescript` | ^5.4 | Type safety | No — core |
| `vite` | ^5.4 | Build tool | No — build |
| `@tanstack/react-query` | ^5.x | Server state management | No — data fetching |
| `zustand` | ^4.x | Client state (auth, UI) | No — auth state |
| `react-router-dom` | ^6.x | Client-side routing | No — routing |
| `react-hook-form` | ^7.x | Form state management | No — forms |
| `zod` | ^3.23 | Form validation (shared with api) | No — validation |
| `axios` | ^1.x | HTTP client (typed) | No — API calls |
| `@tanstack/react-table` | ^8.x | Headless table (virtualized) | No — large tables |
| `recharts` | ^2.x | Charts (CGPA trends, reports) | No — analytics |
| `i18next` | ^23.x | i18n framework | No — bilingual requirement |
| `react-i18next` | ^14.x | React bindings for i18next | No — bilingual requirement |
| `clsx` | ^2.x | Conditional class utilities | No — Tailwind patterns |
| `tailwind-merge` | ^2.x | Tailwind class deduplication | No — Tailwind patterns |
| `tailwindcss` | ^3.x | CSS framework | No — styling |
| `@radix-ui/*` | ^1.x | Accessible UI primitives | No — shadcn/ui base |
| `lucide-react` | ^0.x | Icon library | Optional (replaceable) |
| `@react-pdf/renderer` | ^3.x | PDF rendering in browser | No — transcript PDF |

---

## 2. i18n Completeness Checklist

### Translation Files Structure

```
packages/web/src/locales/
├── ar.json    ← Arabic (PRIMARY — build this first)
└── en.json    ← English (secondary)
```

### Required Translation Keys (Minimum)

Every key below must exist in BOTH `ar.json` and `en.json` before v2.0 delivery.

```json
// ar.json — Arabic keys (complete list)
{
  "app": {
    "name": "نظام الإدارة الأكاديمية - جامعة بورتسودان الأهلية",
    "loading": "جاري التحميل...",
    "error": "حدث خطأ",
    "notFound": "الصفحة غير موجودة"
  },
  "auth": {
    "login": "تسجيل الدخول",
    "logout": "تسجيل الخروج",
    "username": "اسم المستخدم",
    "password": "كلمة المرور",
    "required": "هذا الحقل مطلوب",
    "invalid": "اسم المستخدم أو كلمة المرور غير صحيحة",
    "changePassword": "تغيير كلمة المرور",
    "firstLoginMessage": "يجب تغيير كلمة المرور عند تسجيل الدخول لأول مرة"
  },
  "roles": {
    "A": "مشرف",
    "R": "أمين سجلات",
    "C": "منسق أكاديمي",
    "I": "أستاذ",
    "U": "مستخدم",
    "S": "طالب"
  },
  "student": {
    "id": "الرقم الجامعي",
    "name": "الاسم",
    "faculty": "الكلية",
    "department": "القسم",
    "admissionYear": "سنة القبول",
    "status": {
      "GOOD": "منتظم",
      "WARNING_1": "إنذار أول",
      "WARNING_2": "إنذار ثاني",
      "DISMISSED": "فصل",
      "REPEAT_YEAR": "إعادة سنة"
    }
  },
  "grades": {
    "finalExam": "الاختبار النهائي",
    "midterm": "الاختبار المرحلي",
    "assignments": "الواجبات",
    "attendance": "الحضور",
    "totalScore": "المجموع",
    "gradePoint": "نقطة الدرجة",
    "letterGrade": "التقدير",
    "status": {
      "DRAFT": "مسودة",
      "SUBMITTED": "مقدم للاعتماد",
      "APPROVED": "معتمد",
      "REJECTED": "مرفوض"
    },
    "submit": "تقديم للاعتماد",
    "approve": "اعتماد",
    "reject": "رفض",
    "approvalQueue": "قائمة الانتظار للاعتماد",
    "alreadyApproved": "لا يمكن تعديل درجة معتمدة"
  },
  "enrollment": {
    "types": {
      "NEW": "مقرر جديد",
      "RESIT": "إزالة رسوب",
      "REPEAT": "إعادة دراسة",
      "ALTERNATE": "بديل",
      "DEPRIVED": "حرمان",
      "DEFERRED": "مؤجل"
    }
  },
  "gpa": {
    "sgpa": "المعدل الفصلي",
    "cgpa": "المعدل التراكمي",
    "creditHours": "الساعات المعتمدة",
    "coursePoints": "نقاط المقرر"
  },
  "transcript": {
    "title": "السجل الأكاديمي الرسمي",
    "download": "تحميل PDF",
    "print": "طباعة",
    "degreeClass": {
      "FIRST": "الدرجة الأولى",
      "SECOND_1": "الثانية قسم أول",
      "SECOND_2": "الثانية قسم ثاني",
      "THIRD": "الدرجة الثالثة"
    }
  },
  "backup": {
    "title": "النسخ الاحتياطي",
    "runNow": "تشغيل الآن",
    "schedule": "جدولة",
    "history": "السجل",
    "status": {
      "RUNNING": "جاري التنفيذ",
      "SUCCESS": "نجح",
      "FAILED": "فشل"
    }
  },
  "errors": {
    "STUDENT_NOT_FOUND": "الطالب غير موجود",
    "GRADE_ALREADY_APPROVED": "لا يمكن تعديل درجة معتمدة",
    "GRADE_NOT_SUBMITTED": "يجب تقديم الدرجة أولاً",
    "PREREQUISITE_NOT_MET": "المتطلب السابق غير مستوفى",
    "CREDIT_HOUR_LIMIT": "تجاوز الحد المسموح من الساعات",
    "UNAUTHORIZED": "غير مصرح لك",
    "FORBIDDEN": "ليس لديك صلاحية",
    "VALIDATION_ERROR": "خطأ في البيانات المدخلة",
    "CANNOT_SELF_APPROVE": "لا يمكنك الموافقة على درجات قمت بتقديمها",
    "RATE_LIMIT_EXCEEDED": "تجاوزت عدد المحاولات المسموح بها"
  }
}
```

### i18n Quality Checklist

Before v2.0 delivery:
- [ ] All keys in `ar.json` exist in `en.json` and vice versa
- [ ] No hardcoded Arabic or English strings in React components (all use `t('key')`)
- [ ] Date formatting uses locale-aware format (Arabic: dd/mm/yyyy, English: mm/dd/yyyy)
- [ ] Number formatting uses locale-aware format (Arabic numerals are optional — verify with university)
- [ ] Grade letter names use Arabic when in Arabic mode: A+ = ممتاز
- [ ] PDF transcripts render Arabic text correctly (right-to-left, no boxes)
- [ ] Error messages from API (`message_ar`) display in Arabic UI

---

## 3. Browser and Device Support Matrix

| Browser | Minimum Version | Desktop | Mobile | Notes |
|---------|----------------|---------|--------|-------|
| Chrome | 100+ | ✅ | ✅ | Primary test browser |
| Firefox | 100+ | ✅ | ✅ | |
| Safari | 16+ | ✅ | ✅ | iOS students likely on iPhone |
| Edge | 100+ | ✅ | ✅ | Common in university labs |
| Samsung Internet | 18+ | — | ✅ | Common in Sudan |
| Chrome (Android) | 100+ | — | ✅ | Common in Sudan |

**Not supported:** IE11, Opera Mini, very old Android WebView

**Critical RTL test:** Every layout change must be tested in Chrome with the interface set to Arabic (RTL). Use Chrome DevTools → Rendering → Force RTL to verify layouts.

**Device priority:**
1. Desktop (1920×1080, 1366×768) — staff/instructor use
2. Mobile (375×812, 414×896) — students checking grades
3. Tablet (768×1024) — less common but supported

---

## 4. Integration Points

### 4.1 Google Drive (Backup Destination)

**Purpose:** Cloud backup destination for university data.  
**Auth:** OAuth2 with offline access (refresh token stored in DB)  
**Scopes needed:** `https://www.googleapis.com/auth/drive.file`  
**Flow:**
```
Admin → POST /api/v1/backup/gdrive/auth
  → Redirect to Google OAuth consent screen
  → Google → GET /api/v1/backup/gdrive/callback?code=xxx
  → Exchange code for access + refresh tokens
  → Store refresh token encrypted in backup_configs
```
**File format:** `psau-backup-YYYY-MM-DDTHH-MM-SS.json.gz` in a dedicated Google Drive folder  
**Failure mode:** If Google Drive is unavailable, backup falls back to local storage. Never fails silently.

### 4.2 AWS SES (Email)

**Purpose:** Password reset emails, account lockout notifications (future: grade notifications).  
**Used in:** `v2.1 only`  
**From address:** `noreply@psau.edu.sd` (must be verified in SES)  
**Templates:** Stored as files in `packages/api/src/email-templates/`  
**Failure mode:** Email failure is logged but never blocks the main operation (fire-and-forget)

### 4.3 AWS S3 (Backup Storage)

**Purpose:** Cloud backup destination in v2.1.  
**Used in:** v2.1 only (v2.0 uses local storage)  
**Path:** `s3://psau-backups-production/YYYY/MM/DD/backup-TIMESTAMP.json.gz`  
**Lifecycle policy:** S3 lifecycle rule mirrors the retention policy (7 daily, 4 weekly, 12 monthly)

### 4.4 Puppeteer (PDF Generation)

**Purpose:** Renders HTML transcript to PDF for download.  
**How it works:** Renders the same React component used for the web view, then exports to PDF.  
**Known issues:** 
- Puppeteer requires Chromium — Docker image must include it (installed in Dockerfile.api)
- Arabic font must be bundled — `noto-sans-arabic` included in Docker image
- Puppeteer must run in headless mode with `--no-sandbox` flag in Docker

**Performance:** Single PDF generation: ~1.5s. Cache PDF for 1 hour per student (avoid repeated Puppeteer launches).

---

## 5. Data Retention Policy

| Data Type | Retention | Basis | Implementation |
|-----------|-----------|-------|---------------|
| Student academic records | Permanent (or 50 years) | University legal requirement | `deleted_at IS NULL` (soft delete only) |
| Grade audit log | 7 years minimum | Academic integrity | Separate CloudWatch log group with 7-year retention |
| User activity log | 1 year | Security audit | `user_activity_log`, partition by month, delete old partitions |
| Backup files (local) | 7 daily / 4 weekly / 12 monthly | Disaster recovery | Retention job runs nightly |
| Backup files (S3) | Same as local | Disaster recovery | S3 lifecycle rules |
| Error logs | 90 days | Debugging | CloudWatch log group retention |
| HTTP access logs | 30 days | Traffic analysis | CloudWatch log group retention |
| WAF logs | 30 days | Security analysis | CloudWatch log group retention |
| Temp files (PDF, CSV) | 24 hours | Storage | Cron job cleans `/tmp` |

---

## 6. Semantic Versioning and Changelog

### Version Format: `MAJOR.MINOR.PATCH`

| Change type | Version bump | Example |
|-------------|-------------|---------|
| Breaking API change | MAJOR | v2.0.0 → v3.0.0 |
| New feature (backward compatible) | MINOR | v2.0.0 → v2.1.0 |
| Bug fix | PATCH | v2.0.0 → v2.0.1 |
| Hotfix | PATCH | v2.1.0 → v2.1.1 |

### Changelog Format (`CHANGELOG.md`)

```markdown
# Changelog

## [2.1.0] — 2025-MM-DD
### Added
- AWS ECS Fargate deployment
- CloudFront CDN for web assets
- Auto-scaling (2-10 ECS tasks based on CPU/memory)
- CloudWatch monitoring dashboard and alarms

### Changed
- Backup storage: local → AWS S3
- PDF generation: runs in ECS, not local Puppeteer

## [2.0.0] — 2025-MM-DD
### Added
- Full academic management system (9 phases)
- Student portal (role S)
- GPA computation per SUST 2019/2020 rules
- Grade workflow: entry → submit → approve
- Transcript PDF generation (Arabic + English)
- Backup system (local + Google Drive)
- Data migration wizard

### Fixed
- All 34 bugs from original codebase audit (ANALYSIS.md)
- RTL navigation underline
- Silent student auto-creation
- Auth token not cleared on logout
- [... all 34 bugs]
```

---

## 7. Error Budget Tracking

### Monthly Error Budget Worksheet

Copy this template and fill weekly:

```
Month: [MONTH YEAR]
SLO: 99.5% availability (3.6 hours downtime budget)

Week 1:
  Incidents: [list]
  Downtime: [minutes]
  Remaining budget: [minutes]

Week 2:
  Incidents: [list]
  Downtime: [minutes]
  Remaining budget: [minutes]

Week 3: ...
Week 4: ...

Month Summary:
  Total downtime: [minutes]
  Budget used: [%]
  Budget remaining: [minutes]
  Action if > 80% consumed: freeze non-critical deployments, focus on reliability

P95 response time trend:
  Week 1 P95: [ms]
  Week 2 P95: [ms]
  Week 3 P95: [ms]
  Week 4 P95: [ms]
  Trend: [improving / stable / degrading]
  Action if degrading 3 weeks: open performance investigation ticket
```
