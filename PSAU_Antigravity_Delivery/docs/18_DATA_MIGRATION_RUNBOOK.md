# Data Migration Runbook
## Importing Real University Data — Step by Step

---

> This document covers migrating existing university data into the PSAU system.
> Every step is executed in order. No step is optional. No step is skipped.
> Run in a staging environment first — always verify before touching production.

---

## Overview

The migration imports 6 data categories in this exact order (order matters — FK constraints):

```
1. Faculties          → No dependencies
2. Departments        → Depends on: Faculties
3. Courses            → Depends on: Departments (for dept ownership)
4. Students           → Depends on: Faculties, Departments
5. Grade History      → Depends on: Students, Courses, Semesters
6. Enrollment History → Depends on: Students, Courses, Semesters
```

**Import faculties before departments. Import students before grades. Never reverse this.**

---

## CSV Templates

Download templates from the running system:
```bash
curl http://localhost:8080/api/v1/migration/templates/faculties.csv -o faculties_template.csv
curl http://localhost:8080/api/v1/migration/templates/departments.csv -o departments_template.csv
curl http://localhost:8080/api/v1/migration/templates/courses.csv -o courses_template.csv
curl http://localhost:8080/api/v1/migration/templates/students.csv -o students_template.csv
curl http://localhost:8080/api/v1/migration/templates/grade_history.csv -o grade_history_template.csv
curl http://localhost:8080/api/v1/migration/templates/enrollment_history.csv -o enrollment_history_template.csv
```

---

## Template Specifications

### faculties.csv

```csv
faculty_code,name_ar,name_en,dean_name_ar,dean_name_en
01,كلية علوم الحاسوب وتقنية المعلومات,Faculty of Computer Science & IT,أ.د. محمد أحمد,Prof. Mohamed Ahmed
02,كلية الطب,Faculty of Medicine,أ.د. فاطمة علي,Prof. Fatima Ali
```

| Column | Required | Format | Rules |
|--------|----------|--------|-------|
| `faculty_code` | ✅ | 2 digits, zero-padded | Unique, 01-99 |
| `name_ar` | ✅ | Arabic text | Max 200 chars |
| `name_en` | ✅ | English text | Max 200 chars |
| `dean_name_ar` | ❌ | Arabic text | Can be empty |
| `dean_name_en` | ❌ | English text | Can be empty |

### departments.csv

```csv
faculty_code,dept_number,dept_code,name_ar,name_en,head_name_ar,head_name_en
01,01,CS,قسم علوم الحاسوب,Computer Science Dept.,أ. أحمد محمد,Dr. Ahmed Mohamed
01,02,SE,قسم هندسة البرمجيات,Software Engineering Dept.,,
```

| Column | Required | Format | Rules |
|--------|----------|--------|-------|
| `faculty_code` | ✅ | Matches faculties.csv | Must exist in faculties |
| `dept_number` | ✅ | 2 digits, zero-padded | Unique per faculty |
| `dept_code` | ✅ | 2-10 uppercase chars | Unique across all depts |
| `name_ar` | ✅ | Arabic text | Max 200 chars |
| `name_en` | ✅ | English text | Max 200 chars |

### students.csv

```csv
student_id,name_ar,name_en,faculty_code,dept_code,admission_year,admission_type,is_active,national_id,phone,email
2020-01-01-0001,أحمد محمد علي,Ahmed Mohamed Ali,01,CS,2020,NEW,true,123456789,0912345678,ahmed@example.com
2020-01-01-0002,فاطمة عبدالله,Fatima Abdullah,01,CS,2020,TRANSFER,true,987654321,0912345679,
```

| Column | Required | Format | Rules |
|--------|----------|--------|-------|
| `student_id` | ✅ | YYYY-FF-DD-NNNN | **Use existing IDs — do NOT let system generate** |
| `name_ar` | ✅ | Arabic text | Max 200 chars |
| `name_en` | ✅ | English text | Max 200 chars |
| `faculty_code` | ✅ | 2-digit code | Must match faculties |
| `dept_code` | ✅ | Dept code | Must match departments in that faculty |
| `admission_year` | ✅ | YYYY | 2010-currentYear |
| `admission_type` | ✅ | NEW\|TRANSFER\|PARALLEL | |
| `is_active` | ✅ | true\|false | |
| `national_id` | ❌ | Digits | Can be empty |
| `phone` | ❌ | Text | Can be empty |
| `email` | ❌ | Email format | Can be empty |

**CRITICAL:** `student_id` must be the EXISTING ID from the previous system.  
Do NOT let the system auto-generate IDs during migration — that would break references.  
The migration API accepts `student_id` directly and bypasses auto-generation.

### grade_history.csv

```csv
student_id,course_code,academic_year,semester_number,enrollment_type,final_score,midterm_score,assignments_score,attendance_pct,total_score,grade_point,letter_grade
2020-01-01-0001,CS101,2020/2021,1,NEW,75,16,9,92,,,
2020-01-01-0001,CS102,2020/2021,1,NEW,50,12,8,78,,,
2020-01-01-0001,CS101,2021/2022,1,RESIT,55,,,88,,,
```

| Column | Required | Notes |
|--------|----------|-------|
| `total_score`, `grade_point`, `letter_grade` | ❌ | Leave empty — system calculates from components |
| `enrollment_type` | ✅ | NEW\|RESIT\|REPEAT\|ALTERNATE |
| `attendance_pct` | ✅ if < 100 | If empty, defaults to 100% |

**Important:** If component scores (final, midterm, assignments) are not available from the old system, you may provide `total_score` directly. In that case, leave component columns empty and provide total_score. The system will store total_score and compute grade_point from it.

---

## Step-by-Step Migration Process

### Phase 1: Prepare Data

```bash
# 1. Export data from existing system to CSV files
# 2. Open each CSV and verify:
#    - UTF-8 encoding (critical for Arabic text)
#    - No BOM character at start of file
#    - Date formats: YYYY or YYYY/YYYY for academic years
#    - All required columns present
#    - No trailing whitespace in IDs

# Verify encoding
file -i faculties.csv  # Should show: charset=utf-8
python3 -c "
import csv
with open('students.csv', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        if not row['student_id'].strip():
            print(f'Row {i+1}: missing student_id')
        # Add more checks
"
```

### Phase 2: Dry Run (Validation Only)

```bash
# Upload each file for validation WITHOUT importing
# The API validates and returns errors without writing anything

curl -X POST http://localhost:8080/api/v1/migration/validate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@faculties.csv" \
  -F "type=faculties" \
  | jq .

# Expected response format:
# {
#   "valid": true,           ← or false
#   "rowCount": 12,
#   "errors": [],            ← or list of row-level errors
#   "warnings": []
# }

# Fix ALL errors before proceeding to import.
# Run validation for each file type.
```

### Phase 3: Import (In Dependency Order)

```bash
# Import function with progress monitoring
import_and_wait() {
  local FILE=$1
  local TYPE=$2
  
  echo "Importing $TYPE..."
  
  # Start import (returns jobId immediately)
  RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/migration/import \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -F "file=@$FILE" \
    -F "type=$TYPE")
  
  JOB_ID=$(echo $RESPONSE | jq -r .jobId)
  echo "Job started: $JOB_ID"
  
  # Poll SSE progress stream
  curl -s http://localhost:8080/api/v1/migration/status/$JOB_ID \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Accept: text/event-stream" \
    | while IFS= read -r line; do
        echo "$line"
        if echo "$line" | grep -q '"status":"COMPLETE"'; then break; fi
        if echo "$line" | grep -q '"status":"FAILED"'; then
          echo "❌ Import FAILED"
          exit 1
        fi
      done
  
  echo "✅ $TYPE import complete"
}

# RUN IN THIS ORDER:
import_and_wait faculties.csv faculties
echo "Verify: SELECT COUNT(*) FROM faculties;"

import_and_wait departments.csv departments
echo "Verify: SELECT COUNT(*) FROM departments;"

import_and_wait courses.csv courses
echo "Verify: SELECT COUNT(*) FROM courses;"

import_and_wait students.csv students
echo "Verify: SELECT COUNT(*) FROM students;"

import_and_wait grade_history.csv grade_history
echo "Verify: SELECT COUNT(*) FROM grades WHERE entry_status = 'APPROVED';"

import_and_wait enrollment_history.csv enrollment_history
echo "Verify: SELECT COUNT(*) FROM enrollments;"
```

### Phase 4: Post-Import Verification

```sql
-- Run ALL of these queries. Every result must match expectation.

-- 1. Row counts match source
SELECT 
  (SELECT COUNT(*) FROM faculties) AS faculties,
  (SELECT COUNT(*) FROM departments) AS departments,
  (SELECT COUNT(*) FROM courses) AS courses,
  (SELECT COUNT(*) FROM students) AS students,
  (SELECT COUNT(*) FROM grades WHERE entry_status = 'APPROVED') AS approved_grades,
  (SELECT COUNT(*) FROM enrollments) AS enrollments;

-- 2. No orphaned students (all have valid dept + faculty)
SELECT COUNT(*) FROM students s 
WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.department_id = s.department_id);
-- Expected: 0

-- 3. Student IDs match expected format
SELECT COUNT(*) FROM students 
WHERE student_id NOT SIMILAR TO '[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]{4}';
-- Expected: 0

-- 4. Grade points are correct (spot check 50 random grades)
SELECT g.enrollment_id, g.total_score, g.grade_point, e.enrollment_type,
  -- Manual formula verification
  CASE e.enrollment_type
    WHEN 'NEW' THEN ROUND(g.total_score::numeric / 25, 1)
    WHEN 'RESIT' THEN ROUND((2.0/3) * (g.total_score::numeric/25 + 1), 1)
    WHEN 'REPEAT' THEN ROUND((2.0/3) * (g.total_score::numeric/25 + 1), 1)
  END AS expected_grade_point,
  g.grade_point = CASE e.enrollment_type
    WHEN 'NEW' THEN ROUND(g.total_score::numeric / 25, 1)
    WHEN 'RESIT' THEN ROUND((2.0/3) * (g.total_score::numeric/25 + 1), 1)
    WHEN 'REPEAT' THEN ROUND((2.0/3) * (g.total_score::numeric/25 + 1), 1)
  END AS is_correct
FROM grades g
JOIN enrollments e ON e.enrollment_id = g.enrollment_id
WHERE g.entry_status = 'APPROVED'
ORDER BY RANDOM()
LIMIT 50;
-- Expected: all is_correct = true

-- 5. CGPA computed for all students with approved grades
SELECT COUNT(*) FROM students s
WHERE EXISTS (
  SELECT 1 FROM grades g JOIN enrollments e ON e.enrollment_id = g.enrollment_id
  WHERE e.student_id = s.student_id AND g.entry_status = 'APPROVED'
) AND NOT EXISTS (
  SELECT 1 FROM student_semester_records ssr WHERE ssr.student_id = s.student_id
);
-- Expected: 0 (all students with grades have CGPA records)
```

### Phase 5: Trigger CGPA Recompute

After importing grades, GPA records need to be computed:

```bash
# Trigger bulk CGPA recompute for all historical data
curl -X POST http://localhost:8080/api/v1/gpa/recalculate-all \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq .
# Returns jobId — monitor with SSE as above

# This may take several minutes for large datasets (30,000 students)
# Monitor queue depth:
watch -n 10 'curl -s http://localhost:8080/health | jq .gpaQueueDepth'
```

---

## Rollback Plan

If migration fails or produces incorrect data:

```bash
# Method 1: Truncate and re-import
psql $DATABASE_URL << 'SQL'
TRUNCATE TABLE grade_audit_log CASCADE;
TRUNCATE TABLE grades CASCADE;
TRUNCATE TABLE enrollments CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE courses CASCADE;
TRUNCATE TABLE departments CASCADE;
TRUNCATE TABLE faculties CASCADE;
SQL
# Then re-run from Phase 3

# Method 2: Restore from pre-migration backup
# (Always take a backup before starting migration — see step below)
```

### Before Starting: Take a Backup

```bash
# ALWAYS do this before any migration
curl -X POST http://localhost:8080/api/v1/backup/run \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"configId": 1}'
# Wait for completion, verify backup file exists
```

---

## Common Migration Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `FACULTY_NOT_FOUND` in departments import | Departments file uses faculty_code not in faculties | Import faculties first; verify faculty_code matches |
| `STUDENT_ID_DUPLICATE` | CSV has duplicate student_id rows | Deduplicate CSV before import |
| `CSV_INVALID_ROW: invalid Arabic text` | File not UTF-8 encoded | Re-export with UTF-8 encoding |
| `GRADE_POINT_MISMATCH` after import | Source total_score and grade_point don't agree | Leave grade_point empty — system recalculates |
| `ENROLLMENT_TYPE unknown: EXAM` | Old system used different type codes | Map old codes to: NEW/RESIT/REPEAT/ALTERNATE |
| Timeouts on large files | File > 50MB | Split into chunks of 5,000 rows each |
