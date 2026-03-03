-- Seed data for local development
-- Run after 001_initial_schema.sql

-- Admin user (password: admin123)
INSERT INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$12$3/q5VVrNPJaQ3EAtEAfNZOyCgq.4Mc0gHdFzA3m.Uk8gLa7LXH4bO', 'ADMIN'),
  ('registrar', '$2b$12$3/q5VVrNPJaQ3EAtEAfNZOyCgq.4Mc0gHdFzA3m.Uk8gLa7LXH4bO', 'REGISTRAR'),
  ('instructor', '$2b$12$3/q5VVrNPJaQ3EAtEAfNZOyCgq.4Mc0gHdFzA3m.Uk8gLa7LXH4bO', 'INSTRUCTOR')
ON CONFLICT DO NOTHING;

-- Faculties
INSERT INTO faculties (name_ar, name_en, code) VALUES
  ('كلية الحاسوب', 'Faculty of Computer Science', 'CS'),
  ('كلية الهندسة', 'Faculty of Engineering', 'ENG')
ON CONFLICT DO NOTHING;

-- Departments
INSERT INTO departments (faculty_id, name_ar, name_en, code) VALUES
  (1, 'قسم علوم الحاسوب', 'Computer Science Dept.', 'CS-DEPT'),
  (1, 'قسم نظم المعلومات', 'Information Systems Dept.', 'IS-DEPT'),
  (2, 'قسم الهندسة الكهربائية', 'Electrical Engineering', 'EE-DEPT')
ON CONFLICT DO NOTHING;

-- Courses
INSERT INTO courses (department_id, code, name_ar, name_en, credit_hours) VALUES
  (1, 'CS101', 'مقدمة في علوم الحاسوب', 'Introduction to CS', 3),
  (1, 'CS201', 'هياكل البيانات', 'Data Structures', 3),
  (1, 'CS301', 'قواعد البيانات', 'Database Systems', 3),
  (2, 'IS101', 'أنظمة المعلومات الإدارية', 'Management Information Systems', 3)
ON CONFLICT DO NOTHING;

-- Semester
INSERT INTO semesters (academic_year, semester_type, is_current) VALUES
  ('2024/2025', 'FIRST', 1)
ON CONFLICT DO NOTHING;

-- Students
INSERT INTO users (username, password_hash, role) VALUES
  ('student1', '$2b$12$3/q5VVrNPJaQ3EAtEAfNZOyCgq.4Mc0gHdFzA3m.Uk8gLa7LXH4bO', 'STUDENT'),
  ('student2', '$2b$12$3/q5VVrNPJaQ3EAtEAfNZOyCgq.4Mc0gHdFzA3m.Uk8gLa7LXH4bO', 'STUDENT')
ON CONFLICT DO NOTHING;

INSERT INTO students (user_id, student_number, name_ar, name_en, department_id, current_level, enrollment_year) VALUES
  (4, 'S2024001', 'أحمد محمد', 'Ahmed Mohammed', 1, 2, 2024),
  (5, 'S2024002', 'فاطمة علي', 'Fatima Ali', 1, 1, 2024)
ON CONFLICT DO NOTHING;
