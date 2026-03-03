// Spec ref: COMPLETE_SPEC_FINAL.md §1 — Academic types shared between API and Web
// All enrollmentType values used in GPA calculation must match this union exactly.

// ── Enrollment types ──────────────────────────────────────────────────────────
// Used by Formula A vs Formula B selection in gpa.ts
export const ENROLLMENT_TYPE = {
    NEW: 'NEW',       // First attempt — Formula A
    RESIT: 'RESIT',     // Same semester repeat — Formula B
    REPEAT: 'REPEAT',    // Next semester repeat — Formula B
    ALTERNATE: 'ALTERNATE', // Substitution course — tracked separately
    DEPRIVED: 'DEPRIVED',  // Attendance < 75% — counts as F (0 SGP)
    DEFERRED: 'DEFERRED',  // Medical/admin deferral — excluded from SGPA
} as const;

export type EnrollmentType = typeof ENROLLMENT_TYPE[keyof typeof ENROLLMENT_TYPE];

// ── Academic status ───────────────────────────────────────────────────────────
// COMPLETE_SPEC_FINAL.md §1.10
export const ACADEMIC_STATUS = {
    GOOD: 'GOOD',        // CGPA ≥ 2.0 and no repeated failures
    WARNING_1: 'WARNING_1',   // First academic warning
    WARNING_2: 'WARNING_2',   // Second academic warning
    REPEAT_YEAR: 'REPEAT_YEAR', // Must repeat the academic year
    DISMISSED: 'DISMISSED',   // Academically dismissed
    GRADUATED: 'GRADUATED',   // Successfully completed all requirements
} as const;

export type AcademicStatus = typeof ACADEMIC_STATUS[keyof typeof ACADEMIC_STATUS];

// ── Grade entry status (workflow state machine) ───────────────────────────────
// COMPLETE_SPEC_FINAL.md §5.6 — Transitions: DRAFT → SUBMITTED → APPROVED
// APPROVED is immutable — any attempt to modify throws ConflictError('GRADE_ALREADY_APPROVED')
export const GRADE_STATUS = {
    DRAFT: 'DRAFT',     // Instructor is entering grades
    SUBMITTED: 'SUBMITTED', // Submitted to coordinator for review
    APPROVED: 'APPROVED',  // Approved — immutable academic record
} as const;

export type GradeStatus = typeof GRADE_STATUS[keyof typeof GRADE_STATUS];

// ── Core domain types ─────────────────────────────────────────────────────────

export interface GradeEntry {
    enrollmentId: number;
    studentId: string;
    courseId: number;
    semesterId: number;
    enrollmentType: EnrollmentType;
    midtermScore: number | null;  // 0–40 (or null if not entered)
    finalScore: number | null;  // 0–60 (or null if not entered)
    attendancePct: number | null;  // 0–100, < 75 → DEPRIVED
    totalScore: number | null;  // Computed: midterm + final
    sgp: number | null;  // Semester grade points (computed by gpa.ts)
    sp: number | null;  // sgp × credit hours
    letterGrade: string | null;  // A+, A, B+, B, C+, C, D+, D, F
    entryStatus: GradeStatus;
    enteredBy: number;         // user_id of instructor
    approvedBy: number | null;  // user_id of coordinator
    approvedAt: string | null;  // ISO timestamp
}

export interface Enrollment {
    enrollmentId: number;
    studentId: string;
    courseId: number;
    semesterId: number;
    enrollmentType: EnrollmentType;
    creditHours: number;
}

export interface SemesterRecord {
    studentId: string;
    semesterId: number;
    sgpa: number;   // Semester GPA (computed, cached)
    cgpa: number;   // Cumulative GPA (computed, cached)
    totalCreditsAttempted: number;
    totalCreditsEarned: number;
    totalPoints: number;  // Sum of (sgp × creditHours) for all passed courses
}

export interface CourseGrade {
    courseId: number;
    courseCode: string;
    courseName: string;
    creditHours: number;
    enrollmentType: EnrollmentType;
    totalScore: number | null;
    sgp: number | null;
    letterGrade: string | null;
    entryStatus: GradeStatus;
}

export interface StudentTranscript {
    studentId: string;
    nameAr: string;
    nameEn: string;
    semesters: {
        semesterId: number;
        name: string;
        sgpa: number;
        cgpa: number;
        courses: CourseGrade[];
    }[];
    currentCgpa: number;
    academicStatus: AcademicStatus;
}
