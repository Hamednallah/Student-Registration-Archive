// Spec ref: COMPLETE_SPEC_FINAL.md §1 — Grade scale and credit hour system
// SUST Credit Hour System 2019 / 2020 Amendment

import { EnrollmentType } from '../types/academic.js';

// ── Grade scale ───────────────────────────────────────────────────────────────
// Letter grades derived from SGP (semester grade point)
export const GRADE_SCALE = [
    { letter: 'A+', minSgp: 3.9, maxSgp: 4.0 },
    { letter: 'A', minSgp: 3.7, maxSgp: 3.89 },
    { letter: 'B+', minSgp: 3.5, maxSgp: 3.69 },
    { letter: 'B', minSgp: 3.3, maxSgp: 3.49 },
    { letter: 'C+', minSgp: 3.0, maxSgp: 3.29 },
    { letter: 'C', minSgp: 2.7, maxSgp: 2.99 },
    { letter: 'D+', minSgp: 2.3, maxSgp: 2.69 },
    { letter: 'D', minSgp: 2.0, maxSgp: 2.29 },
    { letter: 'F', minSgp: 0.0, maxSgp: 1.99 },
] as const;

// Pass boundary: score ≥ 50 and SGP ≥ 2.0
// CRITICAL: pass mark is 50, NOT 60 — see COMPLETE_SPEC_FINAL.md §1
export const PASS_SCORE = 50;
export const PASS_SGP = 2.0;

// ── Attendance deprivation rule ───────────────────────────────────────────────
// If attendancePct < 75, enrollment_type → DEPRIVED, total_score → 0
export const DEPRIVATION_THRESHOLD = 75; // percent

// ── Formula A/B enrollment types ──────────────────────────────────────────────
// Formula A: NEW only
// Formula B: RESIT, REPEAT
export const FORMULA_B_TYPES: EnrollmentType[] = ['RESIT', 'REPEAT'];

// ── Maximum scores ────────────────────────────────────────────────────────────
export const MAX_MIDTERM = 40;
export const MAX_FINAL = 60;
export const MAX_TOTAL = 100;
export const MAX_SGP = 4.0;

// ── Academic standing thresholds ──────────────────────────────────────────────
// See COMPLETE_SPEC_FINAL.md §1.10
export const ACADEMIC_STANDING = {
    GOOD_CGPA_MIN: 2.0,   // CGPA must be ≥ 2.0 to stay in GOOD standing
    WARNING_CGPA: 1.75,  // CGPA < 2.0 → WARNING_1 on first occurrence
    DISMISSED_CGPA: 1.5,   // CGPA < 1.75 after second warning → DISMISSED
} as const;
