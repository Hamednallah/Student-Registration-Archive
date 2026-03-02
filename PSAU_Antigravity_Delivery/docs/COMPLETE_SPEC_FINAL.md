# PSAU Academic Management System
## Complete Technical Specification v2.0 — FINAL
### نظام إدارة الشؤون الأكاديمية — نظام الساعات المعتمدة 2019 تعديل 2020

---

> **Document Status:** FINAL — All requirements confirmed  
> **Academic Source of Truth:** Advising Guide 2019/2020, Sudan University of Science and Technology  
> **Target Stack:** Node.js/Express + PostgreSQL + React 18 (TypeScript)  
> **Scale:** ~30,000 students

---

## TABLE OF CONTENTS

1. Academic Rules (from Guide — immutable)
2. University Structure
3. Student ID System
4. Roles & Permissions
5. Database Schema — Complete
6. React Frontend Architecture
7. API Design
8. Backup System
9. Data Migration Strategy
10. Implementation Roadmap

---

## SECTION 1 — ACADEMIC RULES (Immutable — Source: Advising Guide)

### 1.1 Grade Point Calculation

> **CRITICAL:** If the system input contradicts these formulas, the formulas win.

**Formula A — New Course / First Attempt (مقرر جديد):**
```
sgp = round(X ÷ 25, 1)
```

**Formula B — Resit (إزالة رسوب) AND Repeat Study (إعادة دراسة):**
```
sgp = round((2/3) × ((X ÷ 25) + 1), 1)
```

Where: X = student's total score out of 100 | Pass mark = **50 (not 60)**

**Course Points (نقاط المقرر):**
```
sp = sgp × credit_hours
```

### 1.2 Grade Scale — SUST (NOT standard 4.0)
| Letter | Arabic | Point Range |
|--------|--------|-------------|
| A+     | ممتاز  | 3.6 – 4.0   |
| A      | جيد جداً | 3.2 – 3.5 |
| B+     | جيد جداً | 2.8 – 3.1 |
| B      | جيد    | 2.6 – 2.7   |
| C+     | —      | 2.4 – 2.5   |
| C      | مقبول  | 2.0 – 2.3   |
| F      | رسوب  | < 2.0       |

**Mapping formula:** given sgp → letter grade is a range lookup, not a separate calculation.

### 1.3 GPA Formulas

**Semester GPA (SGPA — المعدل الفصلي):**
```
SGPA = Σ(sp_ij) ÷ Σ(sch_ij)   [all courses in semester, excl. ALTERNATE]
       rounded to 2 decimals
```

**Cumulative GPA (CGPA — المعدل التراكمي):**
```
CGPA = Σ(sp_all_semesters) ÷ Σ(sch_first_attempt_only)
       rounded to 2 decimals
```

**Key rules:**
- Failed courses: 0 points, credit hours NOT re-counted in cumulative
- ALTERNATE (بديل): excluded entirely from GPA
- DEPRIVED (حرمان): counts as F=0 (attendance < 75%)

### 1.4 Repeat Student — Substitution System (نظام الاستبدال)
```
Cumulative Points  = original_csp + repeat_sem1_sp + repeat_sem2_sp
Cumulative Hours   = ORIGINAL csch (hours do NOT grow during repeat)
Substitution CGPA  = new_cumulative_points ÷ original_cumulative_hours
```

### 1.5 Degree Classification
| Class | Arabic | CGPA |
|-------|--------|------|
| First | الدرجة الأولى | 3.00 – 4.00 |
| Second Div. I | الثانية قسم أول | 2.70 – 2.99 |
| Second Div. II | الثانية قسم ثاني | 2.40 – 2.69 |
| Third | الدرجة الثالثة | 2.00 – 2.39 |

### 1.6 Academic Standing Rules
| Trigger | Consequence |
|---------|-------------|
| CGPA < 2.00 | Warning (إنذار) |
| 2 consecutive warnings, CGPA still < 2.00 | Dismissal (فصل) |
| 2 mandatory repeats in same semester | Dismissal |
| Fail > ⅔ of registered credit hours | Must repeat year |
| Fail ≥ 14 credit hours | Must repeat year |
| CGPA < 1.5 at 2nd warning | Must repeat year |
| Fail ≥ 7 courses | Must repeat year |
| Total fail/deferred > 20 credit hours | Must repeat year |

### 1.7 Enrollment Types
| Code | Arabic | GPA Treatment | Formula |
|------|--------|---------------|---------|
| NEW | مقرر جديد | Full weight | A |
| RESIT | إزالة رسوب | Full weight | B |
| REPEAT | إعادة دراسة | Full weight | B |
| ALTERNATE | بديل | **Excluded** | — |
| DEPRIVED | حرمان | Zero/Fail | A (score=0) |
| DEFERRED | مؤجل | Pending | — |

### 1.8 Semester Rules
- 2 semesters per year (optional 3rd: max 8 weeks, not mandatory)
- Min 12 – Max 20 credit hours per semester
- 15 teaching weeks per semester (registration + exams are separate)
- Advancement: carry ≤ 4 failed courses (≤10 hrs) to next semester

### 1.9 Assessment Components (All 4 mandatory)
1. Final Exam (امتحان نهائي)
2. Midterm (اختبار مرحلي)
3. Assignments / Coursework (واجبات)
4. Attendance (حضور — instructor enters final % at semester end)

**Attendance rule:** < 75% present → DEPRIVED (حرمان), sits exam as 0

---

## SECTION 2 — UNIVERSITY STRUCTURE

The system must model a real university hierarchy:

```
University (جامعة)
└── Faculty (كلية)          ← NEW LEVEL
    └── Department (قسم)    ← existing, now properly scoped
        └── Program/Major   ← implicit in curriculum
            └── Student
```

### Faculty Table
Each Faculty has:
- ID (auto: 01, 02, 03...)
- Arabic name + English name
- Dean (linked to a User)
- Is active

### Department (updated)
Each Department has:
- Faculty FK (new)
- Department number within faculty (for ID generation)
- Head of department (linked to User)

**Example structure:**
```
Faculty of Computer Science & IT (01)
├── Dept: Computer Science (01)
├── Dept: Software Engineering (02)  
└── Dept: Information Systems (03)

Faculty of Engineering (02)
├── Dept: Civil Engineering (01)
├── Dept: Electrical Engineering (02)
└── Dept: Mechanical Engineering (03)
```

---

## SECTION 3 — STUDENT ID SYSTEM

### Format: `YYYY-FF-DD-NNNN`

| Segment | Length | Meaning | Example |
|---------|--------|---------|---------|
| YYYY    | 4      | Admission year | 2024 |
| FF      | 2      | Faculty number (zero-padded) | 01 |
| DD      | 2      | Department number within faculty (zero-padded) | 03 |
| NNNN    | 4      | Sequential for year+dept (zero-padded) | 0047 |

**Full example:** `2024-01-03-0047`  
→ Admitted 2024, Faculty 01 (CS&IT), Dept 03 (Info Systems), 47th student that year

**Database storage:** `VARCHAR(15)` — stored with dashes for readability

**Generation logic:**
```sql
-- Get next sequence for this year+faculty+dept
SELECT LPAD(COALESCE(MAX(
  CAST(SPLIT_PART(student_id, '-', 4) AS INTEGER)
), 0) + 1, 4, '0')
FROM students
WHERE student_id LIKE CONCAT(:year, '-', :ff, '-', :dd, '-%')
```

**Why this format (vs alternatives):**
- Encodes 4 critical facts in the ID itself → ID is self-describing
- Human-readable: staff can read `2024-02-01-0012` and immediately know: 2024 admission, faculty 2, dept 1, student #12
- Sortable: alphabetical sort = chronological sort
- Collision-proof: sequence is per year+faculty+dept
- Transferable: if student transfers, old ID is preserved (new enrollment creates a record)

---

## SECTION 4 — ROLES & PERMISSIONS

### 4.1 Role Definitions

| Code | Name (EN) | Name (AR) | Scope |
|------|-----------|-----------|-------|
| A | Admin | مشرف | System-wide, all operations |
| R | Registrar | أمين سجلات | Enrollment, student records, academic years |
| C | Coordinator | منسق أكاديمي | Curriculum, grade approval, academic standing |
| I | Instructor | أستاذ / مدرس | Grade entry for assigned courses only |
| U | User | مستخدم | Receipt management (legacy role) |

### 4.2 Permission Matrix (Complete)

| Capability | A | R | C | I | U |
|------------|---|---|---|---|---|
| **Users & Roles** |||||
| Create/edit/delete users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| **University Structure** |||||
| Manage faculties | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage departments | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Academic Calendar** |||||
| Create academic years / semesters | ✅ | ✅ | ❌ | ❌ | ❌ |
| Set current semester | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Curriculum** |||||
| Create/edit courses | ✅ | ❌ | ✅ | ❌ | ❌ |
| Build curriculum plans | ✅ | ❌ | ✅ | ❌ | ❌ |
| Set assessment weights | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Students** |||||
| Create new student (generate ID) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Edit student profile | ✅ | ✅ | ❌ | ❌ | ❌ |
| View student profile | ✅ | ✅ | ✅ | ✅(own) | ✅(basic) |
| **Enrollment** |||||
| Enroll students in courses | ✅ | ✅ | ❌ | ❌ | ❌ |
| Set enrollment type | ✅ | ✅ | ❌ | ❌ | ❌ |
| Deprive student (حرمان) | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Grades** |||||
| Enter grades | ✅ | ❌ | ✅(all) | ✅(assigned) | ❌ |
| Submit grades for approval | ✅ | ❌ | ✅ | ✅ | ❌ |
| Approve/reject grades | ✅ | ❌ | ✅ | ❌ | ❌ |
| View grades | ✅ | ✅ | ✅ | ✅(own) | ❌ |
| **Academic Records** |||||
| View/print transcript | ✅ | ✅ | ✅ | ✅(own) | ❌ |
| Compute/view CGPA | ✅ | ✅ | ✅ | ✅(own) | ❌ |
| Apply academic standing | ✅ | ❌ | ✅ | ❌ | ❌ |
| Graduation clearance | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Reports** |||||
| System reports | ✅ | ✅ | ✅ | ❌ | ❌ |
| Department GPA analytics | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Receipts** |||||
| All receipt operations | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Backup & System** |||||
| Backup / restore | ✅ | ❌ | ❌ | ❌ | ❌ |
| System settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Data migration | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## SECTION 5 — DATABASE SCHEMA (PostgreSQL Production)

### 5.1 University Structure

```sql
-- ============================================================
-- FACULTIES
-- ============================================================
CREATE TABLE faculties (
  faculty_id       SMALLSERIAL PRIMARY KEY,
  faculty_code     VARCHAR(5)   NOT NULL UNIQUE,    -- e.g. '01', 'CS'
  name_ar          VARCHAR(150) NOT NULL,
  name_en          VARCHAR(150),
  dean_user_id     INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DEPARTMENTS (updated — now scoped to faculty)
-- ============================================================
-- ALTER existing departments table:
ALTER TABLE departments
  ADD COLUMN faculty_id        SMALLINT REFERENCES faculties(faculty_id),
  ADD COLUMN dept_number       SMALLINT,    -- number within faculty (01,02,03...)
  ADD COLUMN head_user_id      INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN is_active         BOOLEAN NOT NULL DEFAULT TRUE;

-- Composite unique: dept number unique within faculty
ALTER TABLE departments
  ADD CONSTRAINT uq_dept_per_faculty UNIQUE (faculty_id, dept_number);
```

### 5.2 Student (Updated — new ID format)

```sql
-- Update student table for new ID scheme
ALTER TABLE students
  ALTER COLUMN student_id TYPE VARCHAR(15);    -- YYYY-FF-DD-NNNN

-- Sequence table for ID generation (thread-safe)
CREATE TABLE student_id_sequences (
  admission_year   SMALLINT    NOT NULL,
  faculty_id       SMALLINT    NOT NULL REFERENCES faculties(faculty_id),
  department_id    INTEGER     NOT NULL REFERENCES departments(department_id),
  last_seq         SMALLINT    NOT NULL DEFAULT 0,
  PRIMARY KEY (admission_year, faculty_id, department_id)
);

-- Function to atomically generate next student ID
CREATE OR REPLACE FUNCTION generate_student_id(
  p_year SMALLINT, p_faculty_id SMALLINT, p_dept_id INTEGER
) RETURNS VARCHAR(15) AS $$
DECLARE
  v_faculty_code VARCHAR(2);
  v_dept_number  SMALLINT;
  v_seq          SMALLINT;
  v_id           VARCHAR(15);
BEGIN
  SELECT LPAD(faculty_code::TEXT, 2, '0') INTO v_faculty_code
    FROM faculties WHERE faculty_id = p_faculty_id;
  SELECT LPAD(dept_number::TEXT, 2, '0') INTO v_dept_number
    FROM departments WHERE department_id = p_dept_id;

  INSERT INTO student_id_sequences (admission_year, faculty_id, department_id, last_seq)
    VALUES (p_year, p_faculty_id, p_dept_id, 1)
    ON CONFLICT (admission_year, faculty_id, department_id)
    DO UPDATE SET last_seq = student_id_sequences.last_seq + 1
    RETURNING last_seq INTO v_seq;

  v_id := p_year::TEXT || '-' || v_faculty_code || '-'
       || LPAD(v_dept_number::TEXT, 2, '0') || '-'
       || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
```

### 5.3 Academic Calendar

```sql
CREATE TABLE academic_years (
  year_id          VARCHAR(9)   PRIMARY KEY,   -- '2024-2025'
  label_ar         VARCHAR(30)  NOT NULL,       -- 'العام الجامعي 2024/2025'
  label_en         VARCHAR(30),
  is_current       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Ensure only one current year
CREATE UNIQUE INDEX uq_one_current_year
  ON academic_years (is_current) WHERE is_current = TRUE;

CREATE TABLE semesters (
  semester_id      SERIAL       PRIMARY KEY,
  year_id          VARCHAR(9)   NOT NULL REFERENCES academic_years(year_id),
  semester_num     SMALLINT     NOT NULL CHECK (semester_num IN (1, 2, 3)),
  label_ar         VARCHAR(30)  NOT NULL,   -- 'الفصل الأول 2024/2025'
  label_en         VARCHAR(30),
  teaching_start   DATE,
  teaching_end     DATE,
  exam_start       DATE,
  exam_end         DATE,
  registration_start DATE,
  registration_end   DATE,
  is_current       BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (year_id, semester_num)
);

CREATE UNIQUE INDEX uq_one_current_semester
  ON semesters (is_current) WHERE is_current = TRUE;
```

### 5.4 Curriculum

```sql
CREATE TABLE courses (
  course_id        VARCHAR(20)  PRIMARY KEY,   -- e.g. 'CS-101', 'ENG-201'
  name_ar          VARCHAR(200) NOT NULL,
  name_en          VARCHAR(200),
  credit_hours     SMALLINT     NOT NULL CHECK (credit_hours BETWEEN 1 AND 6),
  contact_hours    SMALLINT,                   -- total weekly contact hours
  course_type      VARCHAR(10)  NOT NULL DEFAULT 'LECTURE',
                                               -- LECTURE | LAB | MIXED | FIELD
  department_id    INTEGER      NOT NULL REFERENCES departments(department_id),
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE course_prerequisites (
  id               SERIAL       PRIMARY KEY,
  course_id        VARCHAR(20)  NOT NULL REFERENCES courses(course_id),
  prerequisite_id  VARCHAR(20)  NOT NULL REFERENCES courses(course_id),
  is_mandatory     BOOLEAN      NOT NULL DEFAULT TRUE,  -- false = co-requisite
  UNIQUE (course_id, prerequisite_id)
);

CREATE TABLE course_assessment_weights (
  -- Defines grade component weights per course per curriculum version
  weight_id        SERIAL       PRIMARY KEY,
  course_id        VARCHAR(20)  NOT NULL REFERENCES courses(course_id),
  curriculum_id    INTEGER      NOT NULL,      -- FK added after curriculum table
  final_pct        SMALLINT     NOT NULL,
  midterm_pct      SMALLINT     NOT NULL,
  assignments_pct  SMALLINT     NOT NULL,
  attendance_pct   SMALLINT     NOT NULL,
  CONSTRAINT weights_sum_100 CHECK (
    final_pct + midterm_pct + assignments_pct + attendance_pct = 100
  ),
  UNIQUE (course_id, curriculum_id)
);

CREATE TABLE curricula (
  curriculum_id    SERIAL       PRIMARY KEY,
  department_id    INTEGER      NOT NULL REFERENCES departments(department_id),
  catalog_year     VARCHAR(9)   NOT NULL REFERENCES academic_years(year_id),
  -- The academic year this curriculum plan was adopted
  total_credit_hours SMALLINT   NOT NULL,
  duration_semesters SMALLINT   NOT NULL DEFAULT 8,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  notes            TEXT,
  created_by       INTEGER      REFERENCES users(user_id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, catalog_year)
);

ALTER TABLE course_assessment_weights
  ADD CONSTRAINT fk_caw_curriculum
  FOREIGN KEY (curriculum_id) REFERENCES curricula(curriculum_id);

CREATE TABLE curriculum_courses (
  id               SERIAL       PRIMARY KEY,
  curriculum_id    INTEGER      NOT NULL REFERENCES curricula(curriculum_id) ON DELETE CASCADE,
  course_id        VARCHAR(20)  NOT NULL REFERENCES courses(course_id),
  semester_level   SMALLINT     NOT NULL CHECK (semester_level BETWEEN 1 AND 12),
  -- Which semester in the study plan (1=first, 2=second, etc.)
  is_required      BOOLEAN      NOT NULL DEFAULT TRUE,
  max_students     INTEGER,                    -- null = unlimited
  UNIQUE (curriculum_id, course_id)
);
```

### 5.5 Course Offerings & Enrollment

```sql
CREATE TABLE course_offerings (
  offering_id      SERIAL       PRIMARY KEY,
  course_id        VARCHAR(20)  NOT NULL REFERENCES courses(course_id),
  semester_id      INTEGER      NOT NULL REFERENCES semesters(semester_id),
  section_label    VARCHAR(5)   NOT NULL DEFAULT 'A',
  capacity         INTEGER      NOT NULL DEFAULT 50,
  room             VARCHAR(50),
  schedule_notes   TEXT,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, semester_id, section_label)
);

CREATE TABLE instructor_assignments (
  id               SERIAL       PRIMARY KEY,
  offering_id      INTEGER      NOT NULL REFERENCES course_offerings(offering_id) ON DELETE CASCADE,
  instructor_id    INTEGER      NOT NULL REFERENCES users(user_id),
  is_primary       BOOLEAN      NOT NULL DEFAULT TRUE,
  assigned_by      INTEGER      REFERENCES users(user_id),
  assigned_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (offering_id, instructor_id)
);

CREATE TABLE enrollments (
  enrollment_id    SERIAL       PRIMARY KEY,
  student_id       VARCHAR(15)  NOT NULL REFERENCES students(student_id),
  offering_id      INTEGER      NOT NULL REFERENCES course_offerings(offering_id),
  enrollment_type  VARCHAR(15)  NOT NULL DEFAULT 'NEW',
  -- NEW | RESIT | REPEAT | ALTERNATE | DEPRIVED | DEFERRED
  status           VARCHAR(15)  NOT NULL DEFAULT 'ACTIVE',
  -- ACTIVE | DROPPED | WITHDRAWN | COMPLETED
  enrolled_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  enrolled_by      INTEGER      REFERENCES users(user_id),
  UNIQUE (student_id, offering_id)
);

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_offering ON enrollments(offering_id);
```

### 5.6 Grades (Core of the System)

```sql
CREATE TABLE grades (
  grade_id           SERIAL        PRIMARY KEY,
  enrollment_id      INTEGER       NOT NULL REFERENCES enrollments(enrollment_id) UNIQUE,

  -- Raw component scores (out of the component's max, NOT out of 100)
  -- Actual max for each component depends on course_assessment_weights
  final_score        DECIMAL(5,2),
  midterm_score      DECIMAL(5,2),
  assignments_score  DECIMAL(5,2),
  attendance_pct     DECIMAL(5,2),  -- percentage 0-100 (instructor enters this directly)
  attendance_score   DECIMAL(5,2),  -- computed: attendance_pct normalized to weight

  -- Computed totals (system calculates, never manually entered)
  total_score        DECIMAL(5,2),  -- X out of 100
  grade_point        DECIMAL(3,1),  -- sgp (Formula A or B based on enrollment_type)
  course_points      DECIMAL(6,2),  -- sp = sgp × credit_hours
  letter_grade       VARCHAR(3),    -- A+, A, B+, B, C+, C, F
  is_pass            BOOLEAN,       -- total_score >= 50

  -- Workflow states
  entry_status       VARCHAR(15)   NOT NULL DEFAULT 'DRAFT',
  -- DRAFT | SUBMITTED | APPROVED | REJECTED | LOCKED

  entered_by         INTEGER       REFERENCES users(user_id),
  entered_at         TIMESTAMPTZ,
  submitted_by       INTEGER       REFERENCES users(user_id),
  submitted_at       TIMESTAMPTZ,
  approved_by        INTEGER       REFERENCES users(user_id),
  approved_at        TIMESTAMPTZ,
  rejection_reason   TEXT,

  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Audit trail — immutable log of every change
CREATE TABLE grade_audit_log (
  log_id           BIGSERIAL     PRIMARY KEY,
  grade_id         INTEGER       NOT NULL REFERENCES grades(grade_id),
  action           VARCHAR(20)   NOT NULL,   -- CREATED | UPDATED | SUBMITTED | APPROVED | REJECTED
  performed_by     INTEGER       NOT NULL REFERENCES users(user_id),
  performed_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  snapshot_before  JSONB,        -- entire grades row before change
  snapshot_after   JSONB,        -- entire grades row after change
  ip_address       INET,
  note             TEXT
);

-- Prerequisite waivers
CREATE TABLE prerequisite_waivers (
  waiver_id        SERIAL        PRIMARY KEY,
  student_id       VARCHAR(15)   NOT NULL REFERENCES students(student_id),
  course_id        VARCHAR(20)   NOT NULL REFERENCES courses(course_id),
  prerequisite_id  VARCHAR(20)   NOT NULL REFERENCES courses(course_id),
  approved_by      INTEGER       NOT NULL REFERENCES users(user_id),
  approved_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  reason           TEXT          NOT NULL
);
```

### 5.7 GPA Cache (Performance-Critical at 30k Students)

```sql
CREATE TABLE student_semester_records (
  -- Pre-computed results per student per semester
  -- Recomputed when: grade approved, enrollment changed, deprivation applied
  record_id          SERIAL        PRIMARY KEY,
  student_id         VARCHAR(15)   NOT NULL REFERENCES students(student_id),
  semester_id        INTEGER       NOT NULL REFERENCES semesters(semester_id),

  -- Semester metrics
  semester_points    DECIMAL(8,2)  NOT NULL DEFAULT 0,
  semester_hours     SMALLINT      NOT NULL DEFAULT 0,
  sgpa               DECIMAL(4,2),

  -- Cumulative metrics (includes all previous semesters)
  cumulative_points  DECIMAL(12,2) NOT NULL DEFAULT 0,
  cumulative_hours   SMALLINT      NOT NULL DEFAULT 0,
  cgpa               DECIMAL(4,2),

  -- For repeat students using substitution system
  substitution_cumulative_points DECIMAL(12,2),
  substitution_cgpa              DECIMAL(4,2),

  -- Academic standing
  academic_status    VARCHAR(25)   NOT NULL DEFAULT 'GOOD',
  -- GOOD | WARNING_1 | WARNING_2 | DISMISSED | REPEAT_YEAR | INCOMPLETE | FROZEN
  status_note_ar     TEXT,         -- human-readable Arabic description
  fail_count         SMALLINT      DEFAULT 0,
  is_repeat_year     BOOLEAN       NOT NULL DEFAULT FALSE,
  is_eligible_advance BOOLEAN      NOT NULL DEFAULT TRUE,

  -- Graduation check (only applicable in final semesters)
  graduation_eligible   BOOLEAN,
  degree_classification VARCHAR(30),
  total_completed_hours SMALLINT,
  required_hours        SMALLINT,

  is_locked          BOOLEAN       NOT NULL DEFAULT FALSE,  -- locked after approval
  computed_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, semester_id)
);

CREATE INDEX idx_ssr_student ON student_semester_records(student_id);
CREATE INDEX idx_ssr_status ON student_semester_records(academic_status);
CREATE INDEX idx_ssr_cgpa ON student_semester_records(cgpa);
```

### 5.8 User Profile Extension

```sql
-- Extend existing users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS faculty_id      SMALLINT REFERENCES faculties(faculty_id),
  ADD COLUMN IF NOT EXISTS department_id   INTEGER  REFERENCES departments(department_id),
  -- Scopes instructor/coordinator to a faculty/dept. Null = all access
  ADD COLUMN IF NOT EXISTS last_login_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS login_count     INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_logins   SMALLINT  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until    TIMESTAMPTZ;

CREATE TABLE user_activity_log (
  log_id         BIGSERIAL     PRIMARY KEY,
  user_id        INTEGER       NOT NULL REFERENCES users(user_id),
  action         VARCHAR(60)   NOT NULL,
  -- LOGIN | LOGOUT | GRADE_ENTER | GRADE_SUBMIT | GRADE_APPROVE | ENROLL |
  -- BACKUP_RUN | STUDENT_CREATE | CURRICULUM_EDIT | REPORT_VIEW | etc.
  entity_type    VARCHAR(30),
  entity_id      VARCHAR(50),
  description    TEXT,
  ip_address     INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ual_user ON user_activity_log(user_id, created_at DESC);
```

### 5.9 Backup System

```sql
CREATE TABLE backup_configs (
  config_id       SERIAL        PRIMARY KEY,
  config_name     VARCHAR(100)  NOT NULL,
  destination     VARCHAR(10)   NOT NULL,  -- 'LOCAL' | 'GDRIVE'
  trigger_type    VARCHAR(10)   NOT NULL,  -- 'MANUAL' | 'AUTO'
  schedule_cron   VARCHAR(60),             -- e.g. '0 2 * * *' (auto only)
  retention_daily   SMALLINT    NOT NULL DEFAULT 7,
  retention_weekly  SMALLINT    NOT NULL DEFAULT 4,
  retention_monthly SMALLINT    NOT NULL DEFAULT 12,
  gdrive_folder_id  VARCHAR(100),
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_run_at     TIMESTAMPTZ,
  last_status     VARCHAR(10),
  last_size_bytes BIGINT,
  created_by      INTEGER       NOT NULL REFERENCES users(user_id),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE backup_logs (
  log_id          BIGSERIAL     PRIMARY KEY,
  config_id       INTEGER       REFERENCES backup_configs(config_id),
  triggered_by    INTEGER       REFERENCES users(user_id),  -- null if auto
  started_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  status          VARCHAR(10)   NOT NULL DEFAULT 'RUNNING',
  -- RUNNING | SUCCESS | FAILED | CANCELLED
  file_name       VARCHAR(255),
  file_size_bytes BIGINT,
  file_location   VARCHAR(500), -- server path or gdrive file ID
  row_counts      JSONB,        -- { students: 1234, grades: 5678, ... }
  error_message   TEXT,
  checksum        VARCHAR(64)   -- SHA-256 of backup file
);
```

---

## SECTION 6 — REACT FRONTEND ARCHITECTURE

### 6.1 Tech Stack (Senior Grade)

```
Framework:      React 18 + TypeScript 5
Build:          Vite 5
State (server): TanStack Query v5 (React Query)
State (client): Zustand 4
Routing:        React Router v6 (data router)
Forms:          React Hook Form 7 + Zod validation
UI Components:  shadcn/ui (Radix UI primitives)
Styling:        Tailwind CSS 3 + CSS custom properties (purple/gold theme)
Tables:         TanStack Table v8 (headless, virtualized for 30k rows)
Charts:         Recharts 2
i18n:           i18next + react-i18next (AR/EN full bilingual)
PDF:            react-pdf / @react-pdf/renderer
Date handling:  date-fns
HTTP client:    Axios with typed interceptors
Auth:           JWT (access + refresh tokens, stored in httpOnly cookies)
Testing:        Vitest + React Testing Library + MSW (mock service worker)
E2E:            Playwright
Code quality:   ESLint (typescript-eslint) + Prettier + Husky pre-commit
API types:      Shared TypeScript types between client and server (monorepo)
```

### 6.2 Project Structure

```
psau/
├── packages/
│   ├── shared/                   # Shared types, constants, validators
│   │   ├── types/
│   │   │   ├── academic.ts       # Course, Grade, Enrollment, CGPA types
│   │   │   ├── users.ts          # User, Role types
│   │   │   └── api.ts            # API response envelope types
│   │   ├── constants/
│   │   │   ├── grades.ts         # Grade scale, formulas, status codes
│   │   │   └── roles.ts          # Role permissions map
│   │   └── validators/
│   │       ├── grade.ts          # Zod schemas for grade entry
│   │       └── student.ts        # Zod schemas for student
│   │
│   ├── api/                      # Node.js/Express backend
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── database.ts   # PostgreSQL (prod) / SQLite (dev) adapter
│   │   │   │   └── env.ts        # Validated env vars with Zod
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts       # JWT verify + role check
│   │   │   │   ├── rbac.ts       # Role-based access control middleware
│   │   │   │   ├── validate.ts   # Zod request validation
│   │   │   │   └── audit.ts      # Automatic audit logging
│   │   │   ├── routes/
│   │   │   │   ├── v1/           # /api/v1/...
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   ├── students.ts
│   │   │   │   │   ├── grades.ts
│   │   │   │   │   ├── enrollments.ts
│   │   │   │   │   ├── curriculum.ts
│   │   │   │   │   ├── academic-years.ts
│   │   │   │   │   ├── backup.ts
│   │   │   │   │   ├── reports.ts
│   │   │   │   │   └── profile.ts
│   │   │   ├── services/
│   │   │   │   ├── gpa.service.ts        # All GPA calculations
│   │   │   │   ├── academic-standing.service.ts
│   │   │   │   ├── enrollment.service.ts
│   │   │   │   ├── backup.service.ts
│   │   │   │   └── student-id.service.ts
│   │   │   └── jobs/
│   │   │       └── backup.job.ts         # node-cron scheduled backups
│   │   └── tests/
│   │       ├── unit/
│   │       │   └── gpa.service.test.ts   # Formula tests with doc examples
│   │       └── integration/
│   │
│   └── web/                      # React frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── router.tsx            # All routes defined here
│       │   │   ├── providers.tsx         # QueryClient, i18n, theme
│       │   │   └── App.tsx
│       │   ├── features/                 # Feature-first structure
│       │   │   ├── auth/
│       │   │   │   ├── components/
│       │   │   │   ├── hooks/
│       │   │   │   └── api/
│       │   │   ├── students/
│       │   │   ├── grades/
│       │   │   │   ├── components/
│       │   │   │   │   ├── GradeEntrySheet.tsx   # Spreadsheet-like entry
│       │   │   │   │   ├── GradeApprovalQueue.tsx
│       │   │   │   │   └── TranscriptView.tsx
│       │   │   │   ├── hooks/
│       │   │   │   │   └── useGradeCalculation.ts  # Client-side formula preview
│       │   │   │   └── api/
│       │   │   ├── curriculum/
│       │   │   ├── enrollment/
│       │   │   ├── academic-calendar/
│       │   │   ├── reports/
│       │   │   ├── backup/
│       │   │   ├── profile/
│       │   │   └── dashboard/
│       │   ├── components/               # Shared UI components
│       │   │   ├── ui/                   # shadcn/ui re-exports + customizations
│       │   │   ├── layout/
│       │   │   │   ├── Sidebar.tsx       # Role-aware navigation
│       │   │   │   ├── Navbar.tsx        # RTL-fixed
│       │   │   │   └── RoleGuard.tsx     # Wraps protected routes
│       │   │   └── data-display/
│       │   │       ├── DataTable.tsx     # TanStack Table wrapper
│       │   │       └── VirtualTable.tsx  # For 30k-row queries
│       │   ├── hooks/
│       │   │   ├── useAuth.ts
│       │   │   ├── useRTL.ts
│       │   │   └── usePermission.ts
│       │   ├── lib/
│       │   │   ├── axios.ts              # Configured client + interceptors
│       │   │   ├── queryClient.ts
│       │   │   └── i18n.ts
│       │   └── types/                    # Re-exports from @psau/shared
│       └── tests/
```

### 6.3 Key Patterns

**API Layer (React Query):**
```typescript
// features/grades/api/grades.api.ts
export const gradesApi = {
  getByOffering: (offeringId: number) =>
    api.get<GradeRow[]>(`/v1/offerings/${offeringId}/grades`),

  bulkUpdate: (offeringId: number, grades: BulkGradeInput[]) =>
    api.put(`/v1/offerings/${offeringId}/grades/bulk`, grades),

  submit: (gradeId: number) =>
    api.post(`/v1/grades/${gradeId}/submit`),

  approve: (gradeId: number, note?: string) =>
    api.post(`/v1/grades/${gradeId}/approve`, { note }),
};

// features/grades/hooks/useGrades.ts
export const useOffering Grades = (offeringId: number) =>
  useQuery({
    queryKey: ['grades', 'offering', offeringId],
    queryFn: () => gradesApi.getByOffering(offeringId),
    staleTime: 30_000,
  });
```

**GPA Calculation — Client Preview (matches server exactly):**
```typescript
// shared/lib/gpa.ts — used by BOTH server and client (prevents formula drift)
export function calculateGradePoint(
  score: number,
  enrollmentType: 'NEW' | 'RESIT' | 'REPEAT'
): number {
  const capped = Math.max(0, Math.min(100, score));
  if (enrollmentType === 'NEW') {
    return Math.round((capped / 25) * 10) / 10;  // 1 decimal
  }
  return Math.round(((2 / 3) * (capped / 25 + 1)) * 10) / 10;
}

export function getLetterGrade(sgp: number): LetterGrade {
  if (sgp >= 3.6) return 'A+';
  if (sgp >= 3.2) return 'A';
  if (sgp >= 2.8) return 'B+';
  if (sgp >= 2.6) return 'B';
  if (sgp >= 2.4) return 'C+';
  if (sgp >= 2.0) return 'C';
  return 'F';
}
```

**Auth & RBAC:**
```typescript
// components/layout/RoleGuard.tsx
export const RoleGuard: React.FC<{
  allow: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ allow, children, fallback = <Forbidden /> }) => {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
};

// Usage:
<RoleGuard allow={['A', 'C']}>
  <GradeApprovalQueue />
</RoleGuard>
```

### 6.4 RTL/LTR Architecture

```typescript
// RTL-first: all Tailwind classes use logical properties
// text-start (not text-left), me-4 (not mr-4), ps-2 (not pl-2)

// i18n config
i18n.init({
  lng: 'ar',          // Arabic default
  fallbackLng: 'en',
  resources: { ar: arTranslations, en: enTranslations }
});

// Dynamic dir on html element
document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;
```

### 6.5 Page Structure (All Roles)

```
/login
/dashboard                     (role-specific widgets)
/students                      (R, A)
/students/:id                  (R, C, I, A)
/students/:id/transcript       (R, C, I, A)
/students/new                  (R, A)
/faculty                       (A)
/departments                   (A, R)
/academic-years                (A, R)
/academic-years/:id/semesters  (A, R)
/curriculum                    (A, C)
/curriculum/:deptId            (A, C)
/courses                       (A, C)
/offerings                     (A, R)
/offerings/:id/grades          (A, C, I — scope limited for I)
/grades/approvals              (A, C)
/enrollment                    (A, R)
/enrollment/bulk               (A, R)
/reports                       (A, R, C)
/reports/gpa-distribution      (A, R, C)
/reports/transcripts           (A, R, C)
/backup                        (A only)
/backup/history                (A only)
/migration                     (A only)
/profile                       (all authenticated)
/receipts                      (A, U — existing feature)
```

---

## SECTION 7 — API DESIGN (v1)

### Base URL: `/api/v1`

### Response Envelope (fix existing inconsistency)
```typescript
// ALL responses use this shape — no more mixed formats
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {            // for paginated lists
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface ApiError {
  success: false;
  error: {
    code: string;          // e.g. 'GRADE_ALREADY_APPROVED'
    message: string;       // human-readable
    message_ar?: string;   // Arabic translation
    details?: unknown;     // validation errors, etc.
  };
}
```

### New Endpoints

```
# University Structure
GET    /faculties
POST   /faculties
PUT    /faculties/:id
GET    /faculties/:id/departments

# Students (updated)
POST   /students                    # auto-generates ID
GET    /students?q=&dept=&year=&status=&page=&limit=
GET    /students/:id
PUT    /students/:id
GET    /students/:id/transcript
GET    /students/:id/academic-standing
GET    /students/:id/enrollments?semester=
GET    /students/:id/gpa-history

# Academic Calendar
GET    /academic-years
POST   /academic-years
GET    /academic-years/current
PUT    /academic-years/:id/set-current
POST   /academic-years/:id/semesters
GET    /semesters
GET    /semesters/current
PUT    /semesters/:id/set-current

# Curriculum
GET    /courses?dept=&active=
POST   /courses
PUT    /courses/:id
GET    /curricula?dept=
POST   /curricula
GET    /curricula/:id
PUT    /curricula/:id
POST   /curricula/:id/courses
DELETE /curricula/:id/courses/:courseId
POST   /curricula/:id/courses/:courseId/weights  # assessment weights

# Offerings & Enrollment
GET    /offerings?semester=&course=&dept=
POST   /offerings
POST   /offerings/:id/instructors
GET    /offerings/:id/roster               # enrolled students
POST   /enrollments                        # single enroll
POST   /enrollments/bulk                   # CSV import
DELETE /enrollments/:id
POST   /enrollments/:id/deprive
POST   /enrollments/check-eligibility      # validate before enrolling

# Grades
GET    /offerings/:id/grades               # grade sheet for offering
PUT    /grades                             # bulk upsert
POST   /grades/:enrollmentId/submit
POST   /grades/:enrollmentId/approve
POST   /grades/:enrollmentId/reject
GET    /grades/pending-approval            # coordinator queue
GET    /grades/:enrollmentId/history

# GPA
POST   /gpa/recalculate/:studentId         # trigger recompute
POST   /gpa/recalculate-semester/:semesterId  # bulk recompute

# Reports
GET    /reports/gpa-distribution?dept=&semester=
GET    /reports/academic-standing?semester=
GET    /reports/grade-completion?semester=
GET    /reports/enrollment-stats?semester=
GET    /reports/graduation-eligible?year=
POST   /reports/transcripts/bulk           # batch PDF generation

# Backup
GET    /backup/configs
POST   /backup/configs
PUT    /backup/configs/:id
DELETE /backup/configs/:id
POST   /backup/run                         # trigger manual backup
GET    /backup/logs
GET    /backup/logs/:id/download
POST   /backup/restore                     # upload + restore
GET    /backup/gdrive/auth
GET    /backup/gdrive/callback

# Migration
GET    /migration/templates                # download CSV templates
POST   /migration/validate                 # validate without importing
POST   /migration/import                   # import with dry-run option
GET    /migration/status/:jobId

# Profile
GET    /profile
PUT    /profile
POST   /profile/change-password
GET    /profile/activity
```

---

## SECTION 8 — BACKUP SYSTEM (Implementation Detail)

### Backup Payload Structure
```json
{
  "manifest": {
    "version": "2.0",
    "created_at": "2025-01-15T02:00:00Z",
    "db_engine": "postgresql",
    "app_version": "2.0.0",
    "checksum": "sha256:abc123...",
    "tables": {
      "students": 30247,
      "grades": 184920,
      "enrollments": 191445,
      "courses": 342,
      "curricula": 18
    }
  },
  "data": {
    "faculties": [...],
    "departments": [...],
    "academic_years": [...],
    "semesters": [...],
    "students": [...],
    "courses": [...],
    "curricula": [...],
    "curriculum_courses": [...],
    "course_assessment_weights": [...],
    "course_offerings": [...],
    "instructor_assignments": [...],
    "enrollments": [...],
    "grades": [...],
    "student_semester_records": [...],
    "users": [...],           ← passwords are hashed, safe to export
    "receipts": [...]
  }
}
```

### Retention Logic (node-cron job, runs daily at 3am)
```
keep: all backups from last 7 days
keep: one backup per week for last 4 weeks  
keep: one backup per month for last 12 months
delete: everything else
```

---

## SECTION 9 — DATA MIGRATION STRATEGY

### Approach: Guided CSV Import Wizard

The system generates typed templates. User fills them. System validates, previews, and imports.

### Templates

**1. `template_faculties.csv`**
```
faculty_code*, name_ar*, name_en
01, كلية علوم الحاسوب وتقانة المعلومات, Faculty of Computer Science & IT
```

**2. `template_departments.csv`**
```
dept_code*, name_ar*, name_en, faculty_code*
01, قسم علوم الحاسوب, Computer Science, 01
```

**3. `template_courses.csv`**
```
course_id*, name_ar*, name_en, credit_hours*, course_type, dept_code*,
final_pct*, midterm_pct*, assignments_pct*, attendance_pct*
CS-101, مبادئ البرمجة, Introduction to Programming, 3, LECTURE, 01, 60, 20, 10, 10
```

**4. `template_students.csv`**
```
existing_id, full_name_ar*, admission_year*, faculty_code*, dept_code*,
current_semester_level*, registration_status
```
- If `existing_id` is provided → preserve it (override auto-generation)
- Otherwise → system auto-generates `YYYY-FF-DD-NNNN`

**5. `template_grade_history.csv`**
```
student_id*, course_id*, academic_year*, semester_num*, enrollment_type*,
final_score, midterm_score, assignments_score, attendance_pct,
total_score*   ← REQUIRED for history (system validates formula ±0.5)
```
- System re-derives `grade_point`, `letter_grade` from `total_score`
- If provided GPA doesn't match calculation → flagged as warning (not error)

**6. `template_enrollment_history.csv`**
```
student_id*, course_id*, academic_year*, semester_num*, enrollment_type*, status*
```

### Import Wizard Steps
```
Step 1: Download Templates
Step 2: Upload Files (multi-file, any order)
Step 3: Validate
        → Shows: errors (blocking), warnings (non-blocking), statistics
        → e.g. "Row 247: student_id '2019-01-02-0012' not found"
Step 4: Preview Summary
        → "Will import: 30,247 students, 184,920 grade records"
        → "Will skip: 12 rows with errors"
Step 5: Import (with live progress bar via WebSocket or SSE)
Step 6: Download Import Report (CSV of all skipped rows + reasons)
```

---

## SECTION 10 — IMPLEMENTATION ROADMAP

### Phase 0: Foundation (Week 1)
- [ ] Monorepo setup (pnpm workspaces: `shared`, `api`, `web`)
- [ ] TypeScript config, ESLint, Prettier, Husky
- [ ] Shared types and GPA formula library (`@psau/shared`)
- [ ] Unit tests for ALL GPA formulas (verify against doc examples)
- [ ] Database migration scripts (new tables)
- [ ] Fix all 34 bugs from earlier analysis

### Phase 1: University Structure + Auth (Week 2)
- [ ] Faculty + Department CRUD
- [ ] User roles: R, C, I (new roles)
- [ ] Updated student registration with new ID generation
- [ ] JWT refresh tokens (access=15min, refresh=7d, httpOnly cookies)
- [ ] React app scaffold with routing, i18n, theme

### Phase 2: Academic Calendar + Curriculum (Week 3)
- [ ] Academic years + semesters
- [ ] Course management
- [ ] Curriculum builder (semester plan grid UI)
- [ ] Assessment weight configuration per course

### Phase 3: Enrollment (Week 4)
- [ ] Course offerings
- [ ] Instructor assignments
- [ ] Student enrollment (single + bulk CSV)
- [ ] Prerequisite validation + waiver system
- [ ] Credit hour limit enforcement (12–20)

### Phase 4: Grades (Week 5–6) — Most Complex
- [ ] Grade entry sheet (spreadsheet-like UI, Instructor view)
- [ ] Client-side grade calculation preview (live as you type)
- [ ] Attendance % entry → auto-deprivation flag at < 75%
- [ ] Bulk grade entry (paste from Excel)
- [ ] Submit for approval workflow
- [ ] Coordinator approval/rejection queue
- [ ] Grade audit log
- [ ] GPA recalculation engine (all SUST formulas including substitution)
- [ ] Academic standing determination + notifications

### Phase 5: Transcripts + Reports (Week 7)
- [ ] Official transcript (print/PDF — Arabic, with university header)
- [ ] Graduation eligibility check
- [ ] Degree classification
- [ ] GPA distribution charts
- [ ] Academic standing report
- [ ] Grade completion dashboard

### Phase 6: Backup + Migration (Week 8)
- [ ] Manual backup (local download + Google Drive)
- [ ] Scheduled auto-backup (node-cron)
- [ ] Backup restore wizard
- [ ] Migration CSV templates + import wizard

### Phase 7: User Profile + Polish (Week 9)
- [ ] Profile page (display name, password change, activity log)
- [ ] Role-based dashboards (5 different views)
- [ ] Notification system (warnings, approval needed, etc.)
- [ ] Dark mode
- [ ] PWA offline page
- [ ] Accessibility audit (WCAG 2.1 AA, RTL)
- [ ] E2E test suite (Playwright)

---

## APPENDIX A — GPA Formula Verification

*All examples taken directly from the Advising Guide (pages 33–43)*

**Example 1 — Semester GPA:**
```
Courses: 5 courses, 15 total credit hours
Scores:  55, 59, 52, 68, 57
Points:  2.2×2=4.4, 2.4×4=9.6, 2.1×3=6.3, 2.7×3=8.1, 2.3×3=6.9
Total points: 35.3
SGPA = 35.3 ÷ 15 = 2.35 ✓
```

**Example 2 — Cumulative with fails:**
Semester 1: 7 courses, 18 hrs, 3 failures (score 0) → SGPA = 20.7/18 = 1.15
Semester 2 + resits: cumulative 40.1 pts / 35 hrs → CGPA = 1.15 ✓

**Example 3 — Substitution system:**
After repeat over 2 semesters: 73.4 pts / 35 hrs → CGPA = 2.09 ✓

---

## APPENDIX B — Error Code Reference

| Code | HTTP | Meaning |
|------|------|---------|
| `STUDENT_NOT_FOUND` | 404 | |
| `DUPLICATE_ENROLLMENT` | 409 | Student already enrolled in this offering |
| `PREREQUISITE_NOT_MET` | 422 | Missing prerequisite course |
| `CREDIT_HOUR_LIMIT` | 422 | Would exceed 20 or go below 12 credit hours |
| `GRADE_ALREADY_APPROVED` | 409 | Cannot edit approved grade |
| `GRADE_NOT_SUBMITTED` | 422 | Cannot approve unsubmitted grade |
| `INVALID_SCORE_RANGE` | 422 | Score component out of valid range |
| `ATTENDANCE_DEPRIVE_THRESHOLD` | 400 | Action blocked — student deprived |
| `BACKUP_IN_PROGRESS` | 409 | Another backup is already running |
| `MIGRATION_VALIDATION_FAILED` | 422 | CSV errors (returns row-level detail) |


---
---

# ADDENDUM — Critical Gaps Addressed
## Bug Resolution Map + Student Portal + Scalability Architecture

# PSAU System — Spec Supplement
## Three Critical Gaps Addressed
### 1. ANALYSIS.md Bug Resolution Map | 2. Student Portal | 3. Backend Scalability

---

## GAP 1: ANALYSIS.md — All 34 Issues Resolved

The main spec said "fix all 34 bugs" in one line. That's not good enough.
Every issue has an explicit resolution below.

---

### CRITICAL BUGS (6 issues)

**Bug 1 — Route Shadow: `/receipts/search` unreachable**
_Resolution:_ Eliminated entirely by React migration. All routing moves to React Router client-side. The API now uses `/api/v1/receipts?q=` — no more static path collision with `/:id`. The new route file uses express-router in strict registration order with an ESLint rule (`no-unreachable-route` custom rule) to catch this class of bug at lint time.

**Bug 2 — `POST /receipt` (singular) vs `/receipts` (plural)**
_Resolution:_ All new API routes follow strict REST naming enforced by a route-naming linting rule. The old `/receipt` endpoint is renamed `/receipts` in migration. The double-validation pattern is deleted — Zod middleware is the single source of truth for request validation.

**Bug 3 — Silent student auto-creation in `receiptController`**
_Resolution:_ Receipt creation now requires a valid student ID that is looked up via `StudentService.findOrThrow()`. If the student doesn't exist, the API returns `404 STUDENT_NOT_FOUND`. No side effects on error. The auto-create path is deleted.

**Bug 4 — Frontend sends `?size=` but server reads `?limit=`**
_Resolution:_ TanStack Query + typed API client. All pagination parameters are defined once in `@psau/shared/types/api.ts` as:
```typescript
interface PaginationParams {
  page: number;
  limit: number;   // canonical name, enforced by TypeScript on both sides
}
```
The param name mismatch becomes a TypeScript compile error.

**Bug 5 — `registration_Status` case typo (badge always wrong)**
_Resolution:_ React + TypeScript. The student object is typed:
```typescript
interface Student {
  registration_status: 'F' | 'P' | 'N';  // lowercase, snake_case, canonical
}
```
The DB column is mapped to this type by the ORM layer. Accessing a non-existent property is a TypeScript error. Template strings that have casing mismatches don't compile.

**Bug 6 — `authTokenCache` never cleared on logout**
_Resolution:_ The entire token management is replaced. New pattern uses:
- Access tokens stored in React state (Zustand `authStore`) — cleared on logout
- Refresh tokens stored in `httpOnly` cookies — server clears on logout
- No module-level cache variable anywhere in the codebase
- Axios interceptor reads from Zustand store, not a cached variable

---

### SECURITY VULNERABILITIES (7 issues)

**Bug 7 — Helmet completely disabled**
_Resolution:_ Helmet 7 is enabled with a strict CSP:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],   // needed for Tailwind
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  crossOriginEmbedderPolicy: false,  // SSE requires this off
}));
```
A unit test asserts that these headers are present on every response.

**Bug 8 — CSRF protection disabled**
_Resolution:_ CSRF protection is no longer needed in the same form because:
- All API calls use `Authorization: Bearer <token>` header (custom header = CSRF-safe)
- JWT in httpOnly cookies uses `SameSite=Strict`
- For extra hardness: double-submit cookie pattern via `csrf-csrf` package on state-changing endpoints

**Bug 9 — Rate limiting disabled on login**
_Resolution:_ Tiered rate limiting on all sensitive endpoints:
```typescript
// Strict: login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json({
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message_ar: 'تجاوزت عدد المحاولات المسموح بها' }
  })
});

// General: all API routes
const generalLimiter = rateLimit({ windowMs: 60_000, max: 300 });

// Strict: password change
const sensitiveOpLimiter = rateLimit({ windowMs: 60_000, max: 5 });
```

**Bug 10 — `/api/register` publicly accessible (anyone can create admin)**
_Resolution:_ The public register endpoint is DELETED. User creation is exclusively `POST /api/v1/users` behind `requireRole(['A'])` middleware. New users are created by admins only. The invite flow (if added later) goes through a one-time token, never a public endpoint.

**Bug 11 — DevTunnel URLs hardcoded in CORS**
_Resolution:_ CORS origins come exclusively from environment variables:
```typescript
// config/env.ts — validated at startup with Zod
const envSchema = z.object({
  CORS_ORIGINS: z.string().transform(s => s.split(',')),
  JWT_SECRET: z.string().min(32),    // enforced minimum length
  JWT_REFRESH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().url(),
  // ... all env vars validated here
});

// Startup fails fast if any env var is missing/invalid
export const env = envSchema.parse(process.env);
```
If `CORS_ORIGINS` is missing, the app refuses to start.

**Bug 12 — `web.config` sets `Access-Control-Allow-Origin: *`**
_Resolution:_ The `web.config` is rewritten. The `Access-Control-Allow-Origin: *` header is removed. CORS is handled exclusively by the Express middleware layer, not by IIS headers. The new `web.config` only handles URL rewriting (SPA fallback) and security headers that Express doesn't set.

**Bug 13 — JWT secret undefined creates forgeable tokens**
_Resolution:_ Covered by Bug 11 fix — `JWT_SECRET` is validated by Zod at startup. If undefined or fewer than 32 characters, the process exits with a clear error message before any request is served.

---

### CODE QUALITY (13 issues)

**Bug 14 — `searchReceipts` is 100% duplicate of `getAllReceipts`**
_Resolution:_ Deleted. One `ReceiptService.findAll(filters)` method handles both. No duplication.

**Bug 15 — Double validation in controllers (Joi + manual checks)**
_Resolution:_ Validation is `zod` middleware only. Controllers never check `if (!field)`. The pattern:
```typescript
// middleware/validate.ts
export const validate = (schema: ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(422).json(formatZodError(result.error));
  req.body = result.data;   // mutate with parsed/coerced data
  next();
};
// Controller receives already-validated data — never checks manually
```

**Bug 16 — `getRecentReceipts` fetches entire table then slices in JS**
_Resolution:_ All queries use SQL `LIMIT`/`OFFSET` or keyset pagination (see Scalability section). `getRecentReceipts` becomes:
```sql
SELECT ... FROM receipts ORDER BY entry_date DESC LIMIT $1
```

**Bug 17 — `multer` configured but never used**
_Resolution:_ `multer` is now actually used — for CSV file uploads in the migration wizard (`POST /api/v1/migration/import`). Dead `upload` variable is replaced with proper route-specific usage.

**Bug 18 — `node-cron` installed but never imported**
_Resolution:_ Now used for scheduled backups in `jobs/backup.job.ts`. The job file is imported in `app.ts` and only activated when `BACKUP_SCHEDULER_ENABLED=true`.

**Bug 19 — Mixed logging (`console.log` + Winston)**
_Resolution:_ All `console.*` calls are removed. A single `logger` instance is used everywhere:
```typescript
// lib/logger.ts
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.colorize()
  ),
  transports: [ ... ]
});
```
ESLint rule `no-console` is enabled to catch any future regressions.

**Bug 20 — Bizarre fetch syntax (`let req = null; fetch(url, req = {...})`)**
_Resolution:_ Axios replaces all `fetch()` calls. The typed axios instance handles headers, base URL, and interceptors centrally. No raw fetch anywhere.

**Bug 21 — Global window pollution (`window.deleteStudent`, etc.)**
_Resolution:_ React event system. All interactions use `onClick`, `onChange` handlers. No `window.*` assignments exist.

**Bug 22 — Inline `<style>` tags in every page template**
_Resolution:_ Tailwind CSS utility classes + CSS custom properties. No inline styles. Tailwind's `@apply` for component-level styles.

**Bug 23 — `students/index.js` imports `../dashboard.js` for auth**
_Resolution:_ Auth state lives in Zustand `authStore`. Any component can call `useAuth()` without circular imports. The dependency graph is clean.

---

### INCONSISTENCIES (8 issues)

**Bug 24 — Mixed casing: `camelCase` / `snake_case` / `UPPER_SNAKE_CASE`**
_Resolution:_ All database columns stay `snake_case` (PostgreSQL convention). API responses are `camelCase` (JavaScript convention). A single `transformKeys` utility runs on all DB results:
```typescript
// Converts snake_case from DB → camelCase for API consumers
// Applied once in the DB adapter, never manually
```

**Bug 25 — `successResponse` parameter order swapped between controllers**
_Resolution:_ Replaced by typed response helpers:
```typescript
// lib/response.ts
export const ok = <T>(res: Response, data: T, message?: string) =>
  res.json({ success: true, data, message });

export const created = <T>(res: Response, data: T) =>
  res.status(201).json({ success: true, data });

// Impossible to swap params — TypeScript enforces types
```

**Bug 26 — REST violations (`POST /students/new`, `GET /department/stats/`)**
_Resolution:_ All routes follow REST conventions enforced by the route linting rule.

**Bug 27 — Ternary always the same `isEdit ? 'btn-primary' : 'btn-primary'`**
_Resolution:_ React. Conditional classes use `cn()` (clsx + tailwind-merge):
```typescript
<Button className={cn('btn', isEdit && 'btn-primary', !isEdit && 'btn-secondary')}>
```
This is auditable and correct.

**Bug 28 — Dashboard `totalStudentsValue` never reflects actual count**
_Resolution:_ TanStack Query fetches dashboard stats fresh. The response shape is typed — if the API shape changes, TypeScript catches it at compile time.

**Bug 29 — API base URL hardcoded to `localhost:5000`**
_Resolution:_ Vite environment variables:
```typescript
// lib/axios.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',  // defaults to relative path
});
```

**Bug 30 — DevTunnel URL in source comment**
_Resolution:_ Removed. No URLs in comments.

**Bug 31 — RTL nav underline bug (ALREADY FIXED)**
_Resolution:_ Already fixed in the CSS architecture phase. React component uses Tailwind logical properties (`start-0`, `end-0`, `mx-auto`) which handle RTL natively.

**Bugs 32–33 — Inline `style="margin-top: 20px"` and `float: right`**
_Resolution:_ React + Tailwind. No inline styles, no floats.

**Bug 34 — Handlebars minified bundle committed to source**
_Resolution:_ React renders natively. No template engine or vendored JS files.

---
---

## GAP 2: STUDENT PORTAL

The system must give students access to their own data — both registration and academic records. This is a significant addition that requires a new role, new routes, and a dedicated frontend section.

### Role: `S` — Student (طالب)

Students authenticate with their **student ID** as username and a password set during registration (or reset by Registrar).

```typescript
// Added to Role enum:
type Role = 'A' | 'R' | 'C' | 'I' | 'U' | 'S';
```

**Student user record:**
- `users.student_id` FK links the auth user to the academic record
- Password initially set by Registrar during enrollment year (or system-generated + emailed)
- First login forces password change

### Student Permission Matrix

| Capability | Student |
|---|---|
| View own profile (name, ID, dept, faculty) | ✅ |
| View own current semester enrollment | ✅ |
| View own full enrollment history | ✅ |
| View own grades (current semester) | ✅ if APPROVED |
| View own full grade history | ✅ |
| View own official transcript | ✅ |
| Print/PDF transcript | ✅ |
| View own SGPA + CGPA history | ✅ |
| View own academic standing | ✅ |
| View curriculum plan for their department | ✅ |
| View course schedule | ✅ |
| View own receipts | ✅ |
| **Edit anything** | ❌ |
| **View other students** | ❌ |
| **Bypass approval workflow** | ❌ |

> **CRITICAL SECURITY NOTE:** All student-facing endpoints enforce `student_id = req.user.student_id` at the database query level — not just in middleware. Even if a student somehow bypasses the role check, they can only ever see their own rows. Defense in depth.

### Student-Specific API Endpoints

```
# Authentication
POST   /auth/login          # works for all roles (detects student vs staff)
POST   /auth/refresh
POST   /auth/logout
POST   /auth/change-password-first-login

# Student portal (all require role=S AND student_id matches token)
GET    /student/me                          # profile + current status
GET    /student/me/enrollment              # current semester courses
GET    /student/me/enrollment/history      # all semesters
GET    /student/me/grades/current          # current semester grades (approved only)
GET    /student/me/grades/history          # all approved grades
GET    /student/me/transcript              # full official transcript
GET    /student/me/transcript/pdf          # downloadable PDF
GET    /student/me/gpa                     # SGPA + CGPA per semester + chart data
GET    /student/me/academic-standing       # warnings, dismissal status
GET    /student/me/curriculum              # their dept's curriculum plan
GET    /student/me/schedule               # course schedule current semester
GET    /student/me/receipts               # financial records
```

### Student Portal UI — Pages

```
/portal/login
/portal/dashboard        → Welcome card, CGPA summary, alerts (warnings), 
                           upcoming exams, current enrollment, recent grades
/portal/courses          → Current semester: course list, schedule, instructor
/portal/grades           → Current semester grade components (if approved)
/portal/grades/history   → Past semesters accordion (each shows grades + SGPA)
/portal/transcript       → Full official transcript view + Print/PDF button
/portal/gpa              → CGPA trend chart, semester-by-semester breakdown
/portal/curriculum       → Study plan grid: completed ✅, in progress 🔄, pending ⬜
/portal/receipts         → Payment history
/portal/profile          → Name, student ID (read-only), change password
```

### Student Dashboard Widgets

```
┌─────────────────┬─────────────────┬─────────────────┐
│  Current CGPA   │  Credits Done   │ Academic Status │
│      3.21       │   72 / 144      │      Good       │
│  (جيد جداً)     │   (50% complete)│    (منتظم)      │
└─────────────────┴─────────────────┴─────────────────┘
┌────────────────────────────────────────────────────┐
│  Current Semester: Semester 2 — 2024/2025          │
│  ┌───────────────┬──────┬──────────┬────────────┐  │
│  │ Course        │ Hrs  │ Instructor│ Grade      │  │
│  │ Algorithms    │ 3    │ Dr. Ahmed │ Pending ⏳ │  │
│  │ Networks      │ 3    │ Dr. Sara  │ B+ (3.1)  │  │
│  └───────────────┴──────┴──────────┴────────────┘  │
└────────────────────────────────────────────────────┘
┌──────────────────────────┐  ┌───────────────────────┐
│  CGPA Trend (sparkline)  │  │  Credit Progress Bar  │
│  2.8 → 3.0 → 3.1 → 3.21 │  │  ████████░░ 72/144    │
└──────────────────────────┘  └───────────────────────┘
```

### Transcript PDF Design

```
┌─────────────────────────────────────────────────────────────────┐
│                  جامعة بورتسودان الأهلية                        │
│               Port Sudan Ahlia University                       │
│                        [University Logo]                        │
│                    السجل الأكاديمي الرسمي                       │
│                     Official Academic Transcript                │
├─────────────────────────────────────────────────────────────────┤
│  Student Name: محمد أحمد عمر    Student ID: 2022-01-02-0047    │
│  Faculty: Engineering            Department: Civil Engineering  │
│  Admission Year: 2022            Generated: 2025-01-15          │
├─────────────────────────────────────────────────────────────────┤
│                   الفصل الأول 2022/2023                         │
│  Course Code  │ Course Name       │ Hrs │ Grade │ Points │ Type  │
│  CE-101       │ مبادئ الهندسة     │  3  │  B+   │  3.0   │ NEW   │
│  MATH-101     │ الرياضيات 1       │  4  │  A    │  3.4   │ NEW   │
│  ────────────────────────────────────────────────────────────  │
│  Semester: Hours=21  Points=65.4  SGPA=3.11                    │
│  Cumulative: Hours=21  Points=65.4  CGPA=3.11                  │
│  Status: Good Standing                                           │
├─────────────────────────────────────────────────────────────────┤
│  [repeats for each semester...]                                  │
├─────────────────────────────────────────────────────────────────┤
│  GRADUATION SUMMARY                                              │
│  Total Credit Hours Completed: 144/144                          │
│  Cumulative GPA: 3.21                                           │
│  Degree Classification: Second Division — First Class           │
│  (الدرجة الثانية — القسم الأول)                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Official stamp + Registrar signature line]                    │
│  This transcript is valid only with the official university seal│
└─────────────────────────────────────────────────────────────────┘
```

### User creation for Students

When Registrar creates a new student:
1. Student record created → ID auto-generated
2. User account auto-created: username = student_id, temp password generated
3. Temp password shown once to Registrar (to give to student) OR emailed
4. First login → forced password change
5. Student role assigned automatically

```typescript
// services/student.service.ts
async createStudent(input: CreateStudentInput, createdBy: number) {
  const studentId = await this.generateStudentId(input);
  
  await db.transaction(async (trx) => {
    // 1. Create student record
    await trx('students').insert({ ...studentData, student_id: studentId });
    
    // 2. Create auth user automatically
    const tempPassword = generateSecurePassword(); // 12-char random
    await trx('users').insert({
      username: studentId,
      password_hash: await bcrypt.hash(tempPassword, 12),
      role: 'S',
      student_id: studentId,
      must_change_password: true,
    });
    
    return { studentId, tempPassword };
  });
}
```

---
---

## GAP 3: BACKEND SCALABILITY FOR 30,000 STUDENTS

The system must handle:
- ~30,000 active students
- ~5,000 concurrent users during exam result season (peak)
- ~200,000+ grade records
- ~400,000+ enrollment records
- Transcript PDFs for all students during graduation

### 3.1 Connection Pool Strategy

```typescript
// config/database.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  
  // Pool sizing for 30k-student system:
  max: 20,              // max concurrent DB connections
  min: 5,               // keep 5 alive at idle
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  
  // Statement timeout — kills runaway queries
  statement_timeout: 10_000,      // 10 seconds max per query
  
  // Application name (shows in pg_stat_activity)
  application_name: 'psau-api',
});

// Pool event monitoring
pool.on('error', (err) => {
  logger.error('Unexpected DB pool error', { err });
});

pool.on('connect', () => {
  logger.debug('New DB connection established');
});

export { pool };
```

### 3.2 Database Indexes — Complete Strategy

```sql
-- ============================================================
-- STUDENT LOOKUPS (most frequent operation)
-- ============================================================
CREATE INDEX idx_students_dept ON students(department_id);
CREATE INDEX idx_students_faculty ON students(
  SPLIT_PART(student_id, '-', 2)  -- functional index on faculty segment
);
CREATE INDEX idx_students_year ON students(
  SPLIT_PART(student_id, '-', 1)::INT  -- admission year
);
-- Full text search on name (Arabic + English)
CREATE INDEX idx_students_name_trgm ON students USING GIN (
  (name_ar || ' ' || COALESCE(name_en, '')) gin_trgm_ops
);
-- Enable trigram extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ENROLLMENT (most read table)
-- ============================================================
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_offering ON enrollments(offering_id);
CREATE INDEX idx_enrollments_student_semester ON enrollments(student_id, offering_id);
CREATE INDEX idx_enrollments_type ON enrollments(enrollment_type) 
  WHERE enrollment_type IN ('RESIT', 'REPEAT', 'DEFERRED');

-- ============================================================
-- GRADES (second most read)
-- ============================================================
CREATE INDEX idx_grades_enrollment ON grades(enrollment_id);
CREATE INDEX idx_grades_status ON grades(entry_status) 
  WHERE entry_status IN ('SUBMITTED', 'REJECTED');  -- for approval queue
CREATE INDEX idx_grades_approver ON grades(approved_by, approved_at DESC);

-- ============================================================
-- GPA CACHE (critical for dashboard performance)
-- ============================================================
CREATE INDEX idx_ssr_student_semester ON student_semester_records(student_id, semester_id);
CREATE INDEX idx_ssr_cgpa ON student_semester_records(cgpa);
CREATE INDEX idx_ssr_status ON student_semester_records(academic_status);
CREATE INDEX idx_ssr_dept_semester ON student_semester_records(semester_id)
  INCLUDE (student_id, cgpa, academic_status);  -- covering index for dept reports

-- ============================================================
-- COURSE OFFERINGS (join table)
-- ============================================================
CREATE INDEX idx_offerings_semester ON course_offerings(semester_id);
CREATE INDEX idx_offerings_course ON course_offerings(course_id, semester_id);

-- ============================================================
-- AUDIT LOGS (append-only, partition by month)
-- ============================================================
-- Partition grade_audit_log by performed_at month
-- (prevents index bloat on a high-write table)
CREATE TABLE grade_audit_log (
  log_id         BIGSERIAL,
  performed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (performed_at);

-- Auto-create partitions (run monthly via cron)
CREATE TABLE grade_audit_log_2025_01 
  PARTITION OF grade_audit_log
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 3.3 Query Patterns — Pagination Strategy

For 30k students, never use `OFFSET` for deep pages. Use **keyset (cursor) pagination**:

```typescript
// ❌ SLOW: OFFSET-based (scans N rows to discard them)
SELECT * FROM students ORDER BY student_id LIMIT 50 OFFSET 5000;
-- PostgreSQL scans 5,050 rows

// ✅ FAST: Keyset-based (uses index directly)
SELECT * FROM students 
WHERE student_id > $1   -- cursor from last row of previous page
ORDER BY student_id 
LIMIT 50;
-- PostgreSQL scans only 50 rows

// Implementation in service:
async findStudents(filters: StudentFilters, cursor?: string, limit = 50) {
  return db('students')
    .where(cursor ? { student_id_gt: cursor } : {})  // keyset
    .andWhere(buildFilters(filters))
    .orderBy('student_id')
    .limit(limit + 1)   // fetch +1 to know if there's a next page
    .then(rows => ({
      data: rows.slice(0, limit),
      nextCursor: rows.length > limit ? rows[limit].student_id : null,
    }));
}
```

**Exception:** Small result sets (< 500 rows) use offset pagination — simpler and fine.

### 3.4 Caching Strategy (Redis)

```typescript
// Layer 1: Redis (for shared, session-agnostic data)
// Layer 2: TanStack Query (browser-level, per-user)

// What to cache in Redis:
const CACHE_KEYS = {
  currentSemester: 'semester:current',          // TTL: 1 hour
  departmentList: 'departments:all',            // TTL: 1 hour  
  facultyList: 'faculties:all',                 // TTL: 1 day
  courseList: (deptId: number) => `courses:dept:${deptId}`,  // TTL: 30 min
  dashboardStats: (semId: number) => `stats:semester:${semId}`,  // TTL: 5 min
};

// What NOT to cache in Redis:
// - Grades (frequently updated, approval workflow changes them)
// - Individual student records (privacy, PII)
// - Transcripts (generated fresh — too many edge cases)

// Cache invalidation:
// When grade is approved → invalidate dashboardStats for that semester
// When student is created → invalidate departmentList stats
// When semester changes → invalidate currentSemester

// Implementation:
import { createClient } from 'redis';
const redis = createClient({ url: env.REDIS_URL });

async function withCache<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const result = await fn();
  await redis.setEx(key, ttlSeconds, JSON.stringify(result));
  return result;
}
```

**Redis is optional for initial deployment** — the system works without it, just slower on cold cache. Add Redis when monitoring shows > 500ms response on repeated queries.

### 3.5 Background Jobs (node-cron)

```typescript
// jobs/index.ts — all scheduled jobs
import cron from 'node-cron';

// Run at 3am every night: auto-backup
cron.schedule('0 3 * * *', () => BackupJob.run());

// Run every 5 minutes: recompute GPA for students with pending changes
cron.schedule('*/5 * * * *', () => GPAJob.processQueue());

// Run at 4am every Monday: retention cleanup (delete old backups)
cron.schedule('0 4 * * 1', () => BackupJob.applyRetention());

// Run at midnight every night: lock results from 7+ days ago
cron.schedule('0 0 * * *', () => GPAJob.lockOldResults());
```

**GPA Recomputation Queue:**
When a grade is approved, instead of recomputing immediately (which could cascade):
1. Push `student_id` to a Redis queue (or a `gpa_recompute_queue` DB table)
2. Background job processes the queue every 5 minutes
3. Bulk-recomputes all queued students in one pass
4. This prevents the "thunderous herd" during exam result season when 200 grades get approved simultaneously

```sql
-- GPA recompute queue table (if Redis not available)
CREATE TABLE gpa_recompute_queue (
  student_id    VARCHAR(15) PRIMARY KEY,
  queued_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason        TEXT        -- 'GRADE_APPROVED' | 'ENROLLMENT_CHANGED'
);
```

### 3.6 Long-Running Operation Patterns (SSE / WebSocket)

Some operations take time: bulk grade import, migration, backup, bulk GPA recompute.

**Pattern: Server-Sent Events (SSE) for progress reporting**

```typescript
// routes/migration.ts
router.post('/migration/import', requireRole(['A']), async (req, res) => {
  const jobId = uuid();
  
  // Return job ID immediately
  res.status(202).json({ success: true, data: { jobId } });
  
  // Start async work
  MigrationService.processAsync(jobId, req.body);
});

// GET /migration/status/:jobId — SSE stream
router.get('/migration/status/:jobId', requireRole(['A']), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  MigrationService.subscribe(req.params.jobId, send);
  req.on('close', () => MigrationService.unsubscribe(req.params.jobId));
});
```

### 3.7 Request Infrastructure

```typescript
// middleware/requestId.ts
// Adds X-Request-ID to every request — ties logs together
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] as string || randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// middleware/requestLogger.ts
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      requestId: req.id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
      userId: req.user?.userId,
    });
  });
  next();
});

// middleware/timeout.ts
import timeout from 'connect-timeout';
app.use(timeout('30s'));           // global 30-second timeout
app.use('/api/v1/reports', timeout('120s'));  // reports can take longer
```

### 3.8 GPA Bulk Recompute (Exam Season)

During exam season, coordinators approve hundreds of grades simultaneously.
The GPA engine must handle this without locking the DB or timing out.

```typescript
// services/gpa.service.ts
async recomputeForSemester(semesterId: number) {
  // Step 1: Get all enrolled students for this semester
  const students = await db('enrollments')
    .join('course_offerings', 'enrollments.offering_id', 'course_offerings.offering_id')
    .where('course_offerings.semester_id', semesterId)
    .distinct('enrollments.student_id')
    .pluck('student_id');

  // Step 2: Process in batches of 100 (avoid memory spikes)
  const BATCH_SIZE = 100;
  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(sid => this.recomputeForStudent(sid, semesterId)));
    // Small delay between batches to yield to other requests
    await new Promise(r => setTimeout(r, 50));
  }
}
```

### 3.9 Transcript PDF at Scale

Generating PDF transcripts for 30k students during graduation:

```typescript
// Lazy generation: PDFs are generated on-demand, not pre-built
// For bulk export during graduation: background job + S3 storage

// For individual student request:
GET /student/me/transcript/pdf
→ Server renders HTML → Puppeteer converts to PDF → streams to client
→ Cached in Redis for 1 hour (same student requesting repeatedly)
→ Cache key: `transcript:${studentId}:${lastGradeApprovedAt}`
```

### 3.10 Health Check & Monitoring

```typescript
// GET /health  (public — used by load balancer)
router.get('/health', async (req, res) => {
  const dbOk = await pool.query('SELECT 1').then(() => true).catch(() => false);
  const redisOk = await redis.ping().then(r => r === 'PONG').catch(() => false);
  
  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbOk ? 'connected' : 'error',
      redis: redisOk ? 'connected' : 'unavailable',
      jobs: BackupJob.isRunning ? 'running' : 'idle',
    },
    version: env.APP_VERSION,
  });
});

// GET /api/v1/metrics  (admin only — internal metrics)
// Returns: active connections, query times, cache hit rates, queue depth
```

### 3.11 Security Headers (Complete)

```typescript
// In addition to Helmet:
app.use((req, res, next) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Referrer policy (don't leak student URLs)  
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
});
```

### 3.12 Account Security

```typescript
// users table additions for security:
ALTER TABLE users
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN password_changed_at  TIMESTAMPTZ,
  ADD COLUMN failed_logins        SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN locked_until         TIMESTAMPTZ;

// Login logic:
// 1. Find user by username
// 2. If locked_until > NOW() → return 423 ACCOUNT_LOCKED (not 401 — reveals user exists intentionally)
// 3. Verify password
// 4. If wrong: increment failed_logins, if >= 10 → set locked_until = NOW() + 15min
// 5. If correct: reset failed_logins, update last_login_at, issue tokens
// 6. If must_change_password: issue limited token with scope='password_change_only'
```

---
---

## UPDATED ROLE SUMMARY (Complete)

| Code | Name | Arabic | Notes |
|------|------|--------|-------|
| A | Admin | مشرف | All system access |
| R | Registrar | أمين سجلات | Student records, enrollment, academic calendar |
| C | Coordinator | منسق أكاديمي | Curriculum, grade approval, academic standing |
| I | Instructor | أستاذ | Grade entry for assigned courses |
| U | User | مستخدم | Receipt management (legacy) |
| **S** | **Student** | **طالب** | **Read-only access to own records** |

## UPDATED FRONTEND ROUTING

```
# Staff (existing in spec)
/login
/dashboard
...all staff routes...

# Student Portal (new)  
/portal/login              ← separate login page, same backend
/portal/dashboard
/portal/courses
/portal/grades
/portal/grades/history
/portal/transcript
/portal/gpa
/portal/curriculum
/portal/receipts
/portal/profile
```

The student portal can be the **same React app** with route-level guards:
```typescript
// router.tsx
<Route path="/portal" element={<StudentLayout />}>
  <Route element={<RequireRole role="S" />}>
    <Route path="dashboard" element={<StudentDashboard />} />
    <Route path="transcript" element={<StudentTranscript />} />
    ...
  </Route>
</Route>
```

---

## UPDATED DATABASE: `users` TABLE (Final)

```sql
-- Final users table shape
CREATE TABLE users (
  user_id              SERIAL       PRIMARY KEY,
  username             VARCHAR(50)  NOT NULL UNIQUE,   -- student_id for students
  password_hash        VARCHAR(255) NOT NULL,
  role                 VARCHAR(5)   NOT NULL CHECK (role IN ('A','R','C','I','U','S')),
  
  -- Profile
  display_name         VARCHAR(100),
  
  -- Academic scope (for I and C roles — limits what they see)
  faculty_id           SMALLINT     REFERENCES faculties(faculty_id),
  department_id        INTEGER      REFERENCES departments(department_id),
  
  -- Student link (for S role only)
  student_id           VARCHAR(15)  REFERENCES students(student_id),
  
  -- Security
  must_change_password BOOLEAN      NOT NULL DEFAULT FALSE,
  password_changed_at  TIMESTAMPTZ,
  failed_logins        SMALLINT     NOT NULL DEFAULT 0,
  locked_until         TIMESTAMPTZ,
  
  -- Activity
  last_login_at        TIMESTAMPTZ,
  login_count          INTEGER      NOT NULL DEFAULT 0,
  
  -- Lifecycle
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

