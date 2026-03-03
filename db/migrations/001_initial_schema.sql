-- PSAU Academic Management System - Database Schema V2
-- Run order: This is migration 001 - must be applied first
-- Compatible with: PostgreSQL 15+ and SQLite (dev only)

-- ============================================================
-- USERS & AUTH
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role         TEXT NOT NULL CHECK(role IN ('ADMIN', 'REGISTRAR', 'INSTRUCTOR', 'COORDINATOR', 'STUDENT')),
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- ACADEMIC STRUCTURE
-- ============================================================
CREATE TABLE IF NOT EXISTS faculties (
  id           INTEGER PRIMARY KEY,
  name_ar      TEXT NOT NULL,
  name_en      TEXT NOT NULL,
  code         TEXT NOT NULL UNIQUE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS departments (
  id           INTEGER PRIMARY KEY,
  faculty_id   INTEGER NOT NULL REFERENCES faculties(id),
  name_ar      TEXT NOT NULL,
  name_en      TEXT NOT NULL,
  code         TEXT NOT NULL UNIQUE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id           INTEGER PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  code         TEXT NOT NULL UNIQUE,
  name_ar      TEXT NOT NULL,
  name_en      TEXT NOT NULL,
  credit_hours INTEGER NOT NULL CHECK(credit_hours BETWEEN 1 AND 6),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id                INTEGER PRIMARY KEY,
  user_id           INTEGER UNIQUE REFERENCES users(id),
  student_number    TEXT NOT NULL UNIQUE,
  name_ar           TEXT NOT NULL,
  name_en           TEXT NOT NULL,
  department_id     INTEGER NOT NULL REFERENCES departments(id),
  current_level     INTEGER NOT NULL DEFAULT 1 CHECK(current_level BETWEEN 1 AND 8),
  enrollment_year   INTEGER NOT NULL,
  academic_status   TEXT NOT NULL DEFAULT 'GOOD' CHECK(academic_status IN ('GOOD', 'WARNING_1', 'WARNING_2', 'DISMISSED', 'REPEAT_YEAR', 'GRADUATED')),
  cgpa              REAL NOT NULL DEFAULT 0.0,
  total_credit_hours INTEGER NOT NULL DEFAULT 0,
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- SEMESTERS & ENROLLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS semesters (
  id             INTEGER PRIMARY KEY,
  academic_year  TEXT NOT NULL,     -- e.g., '2024/2025'
  semester_type  TEXT NOT NULL CHECK(semester_type IN ('FIRST', 'SECOND', 'SUMMER')),
  is_current     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(academic_year, semester_type)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id              INTEGER PRIMARY KEY,
  student_id      INTEGER NOT NULL REFERENCES students(id),
  course_id       INTEGER NOT NULL REFERENCES courses(id),
  semester_id     INTEGER NOT NULL REFERENCES semesters(id),
  enrollment_type TEXT NOT NULL CHECK(enrollment_type IN ('NEW', 'RESIT', 'REPEAT', 'ALTERNATE', 'DEFERRED', 'DEPRIVED')),
  score           REAL,
  grade_point     REAL,
  letter_grade    TEXT,
  status          TEXT NOT NULL DEFAULT 'ENROLLED' CHECK(status IN ('ENROLLED', 'GRADED', 'WITHDRAWN', 'DEPRIVED', 'DEFERRED')),
  graded_by       INTEGER REFERENCES users(id),
  graded_at       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, course_id, semester_id)
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id           INTEGER PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id),
  action       TEXT NOT NULL,
  entity       TEXT NOT NULL,
  entity_id    INTEGER,
  old_value    TEXT,   -- JSON
  new_value    TEXT,   -- JSON
  ip_address   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(academic_status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_semester ON enrollments(semester_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);
