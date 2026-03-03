/**
 * GPA Formulas — Port Sudan Ahlia University Academic System
 * Source: SUST Credit Hour System Advising Guide 2019/2020 (pages 33–43)
 *
 * CRITICAL: These formulas are academic law. Do NOT modify without a formal
 * update to the Advising Guide and explicit re-approval. See ADR-001.
 *
 * Formula A (NEW): sgp = round(X / 25, 1)
 * Formula B (RESIT/REPEAT): sgp = round((2/3) * (X/25 + 1), 1)
 * Pass mark: 50 (NOT 60)
 * Max SGP: 4.0 (capped)
 *
 * Spec ref: COMPLETE_SPEC_FINAL.md §1, ADR-001
 */

// ── Types ─────────────────────────────────────────────────────────────────────
// Note: canonical types live in packages/shared/src/types/academic.ts
// These local types keep gpa.ts self-contained for easier testing.
export type EnrollmentType =
    | 'NEW'       // First attempt — Formula A
    | 'RESIT'     // Same semester repeat — Formula B
    | 'REPEAT'    // Next semester repeat — Formula B
    | 'ALTERNATE' // Substitution course — EXCLUDED from SGPA divisor
    | 'DEFERRED'  // Medical/admin deferral — EXCLUDED from SGPA entirely
    | 'DEPRIVED'; // Attendance < 75% — counts as 0 SGP (F) in SGPA

export type AcademicStatus =
    | 'GOOD'
    | 'WARNING_1'
    | 'WARNING_2'
    | 'REPEAT_YEAR'
    | 'DISMISSED'
    | 'GRADUATED';

export interface CourseScore {
    score: number;
    creditHours: number;
    type: EnrollmentType;
}

export interface SemesterRecord {
    coursePoints: number; // Sum of (sgp × creditHours) for all courses
    creditHours: number; // Total credit hours attempted
    isFirstAttemptTotal: number; // Credit hours of first-attempt courses only (CGPA divisor)
}

export interface SubstitutionContext {
    replacedPoints: number; // Points from the replaced course
    replacedCredits: number; // Credit hours of replaced course
    substitutePoints: number; // Points from the substitute course
    substituteCredits: number; // Credit hours of substitute course
}

// ── Formula A / B — Grade Point Calculation ───────────────────────────────────
/**
 * Calculate Semester Grade Point (SGP) for a single course.
 *
 * Formula A (NEW):         sgp = round(X / 25, 1)         — Advising Guide p.33
 * Formula B (RESIT/REPEAT): sgp = round((2/3)*(X/25+1),1) — Advising Guide p.36
 *
 * If score < 50 → automatic F (0.0) regardless of formula.
 * SGP is capped at 4.0.
 * DEPRIVED enrollment type always returns 0.0 (F) regardless of score.
 */
export function calculateGradePoint(score: number, type: EnrollmentType): number {
    // DEPRIVED: attendance < 75%, automatically F
    if (type === 'DEPRIVED') return 0.0;

    // Below pass mark → F
    if (score < 50) return 0.0;

    let sgp: number;

    if (type === 'NEW' || type === 'ALTERNATE') {
        // Formula A: sgp = round(X / 25, 1)
        sgp = Math.round((score / 25) * 10) / 10;
    } else {
        // Formula B (RESIT / REPEAT): sgp = round((2/3) * (X/25 + 1), 1)
        sgp = Math.round(((2 / 3) * (score / 25 + 1)) * 10) / 10;
    }

    // Cap at 4.0
    return Math.min(sgp, 4.0);
}

// ── SGPA ──────────────────────────────────────────────────────────────────────
/**
 * Calculate Semester GPA (SGPA).
 *
 * SGPA = Sum(SGP × creditHours) / Sum(creditHours)
 *
 * Exclusion rules:
 * - ALTERNATE: excluded from SGPA divisor (per Advising Guide substitution rules)
 * - DEFERRED:  excluded from SGPA entirely (medical/admin deferral)
 * - DEPRIVED:  included with SGP = 0 (counts against the student)
 *
 * Rounded to 2 decimal places.
 */
export function calculateSGPA(courses: CourseScore[]): number {
    let totalPoints = 0;
    let divisor = 0;

    for (const course of courses) {
        for (const course of courses) {
            // DEFERRED: fully excluded from SGPA (medical/admin deferral)
            if (course.type === 'DEFERRED') continue;

            // ALTERNATE (بديل): FULLY excluded from GPA calculation
            // Spec ref: COMPLETE_SPEC_FINAL.md §1.3: "ALTERNATE: excluded entirely from GPA"
            // Spec ref: §1.7 table: ALTERNATE = Excluded, Formula = —
            if (course.type === 'ALTERNATE') continue;

            // DEPRIVED: attendance < 75% → SGP = 0, INCLUDED in divisor (counts as F)
            // Spec ref: COMPLETE_SPEC_FINAL §1.3: "DEPRIVED: counts as F=0"
            // Spec ref: §1.7 table: DEPRIVED = Zero/Fail, Formula = A (score=0)
            const sgp = calculateGradePoint(course.score, course.type);
            totalPoints += sgp * course.creditHours;  // 0 for DEPRIVED
            divisor += course.creditHours;         // still in denominator
        }
    }

    if (divisor === 0) return 0.0;
    return Math.round((totalPoints / divisor) * 100) / 100;
}

// ── CGPA ──────────────────────────────────────────────────────────────────────
/**
 * Calculate Cumulative GPA (CGPA) across all semesters.
 *
 * CGPA = Sum(all course points) / Sum(first-attempt credit hours)
 *
 * The divisor uses ONLY first-attempt credit hours — repeat attempts add points
 * (earned via Formula B) but do NOT add to the divisor.
 * This is the key difference from a standard GPA system.
 *
 * Rounded to 2 decimal places.
 */
export function calculateCGPA(semesters: SemesterRecord[]): number {
    let totalPoints = 0;
    let divisor = 0;

    for (const sem of semesters) {
        totalPoints += sem.coursePoints;
        divisor += sem.isFirstAttemptTotal;
    }

    if (divisor === 0) return 0.0;
    return Math.round((totalPoints / divisor) * 100) / 100;
}

// ── Letter Grade ──────────────────────────────────────────────────────────────
/**
 * Map SGP (0.0–4.0) to a letter grade.
 * Thresholds from COMPLETE_SPEC_FINAL.md §1.
 */
export function getLetterGrade(sgp: number): string {
    // SUST grade scale per COMPLETE_SPEC_FINAL.md §1.2
    // This is NOT the standard 4.0 system
    if (sgp >= 3.6) return 'A+';
    if (sgp >= 3.2) return 'A';
    if (sgp >= 2.8) return 'B+';
    if (sgp >= 2.6) return 'B';
    if (sgp >= 2.4) return 'C+';
    if (sgp >= 2.0) return 'C';
    return 'F'; // sgp < 2.0
}

// ── Academic Standing ─────────────────────────────────────────────────────────
/**
 * Determine academic standing based on CGPA and prior warning count.
 * Spec ref: COMPLETE_SPEC_FINAL.md §1.10
 *
 * @param cgpa                Current cumulative GPA
 * @param priorWarningCount   Number of prior academic warnings (0, 1, or 2+)
 */
export function getAcademicStatus(
    cgpa: number,
    priorWarningCount: number
): AcademicStatus {
    if (cgpa >= 2.0) return 'GOOD';
    if (priorWarningCount === 0) return 'WARNING_1';
    if (priorWarningCount === 1) return 'WARNING_2';
    return 'DISMISSED';
}

// ── Substitution CGPA ─────────────────────────────────────────────────────────
/**
 * Recalculate CGPA after an ALTERNATE (substitution) course is applied.
 *
 * When a student substitutes course A for course B:
 *   - Course A (replaced) is REMOVED from CGPA calculation
 *   - Course B (substitute) is ADDED to CGPA calculation
 *   - The divisor adjusts accordingly
 *
 * Spec ref: COMPLETE_SPEC_FINAL.md §1 (substitution system)
 */
export function calculateSubstitutionCGPA(
    semesters: SemesterRecord[],
    replaced: { replacedPoints: number; replacedCredits: number },
    substitute: { substitutePoints: number; substituteCredits: number }
): number {
    let totalPoints = 0;
    let divisor = 0;

    for (const sem of semesters) {
        totalPoints += sem.coursePoints;
        divisor += sem.isFirstAttemptTotal;
    }

    // Remove replaced course contribution
    totalPoints -= replaced.replacedPoints;
    divisor -= replaced.replacedCredits;

    // Add substitute course contribution
    totalPoints += substitute.substitutePoints;
    divisor += substitute.substituteCredits;

    if (divisor === 0) return 0.0;
    return Math.round((totalPoints / divisor) * 100) / 100;
}
