/**
 * GPA Formula Tests — PSAU Academic Management System
 * Based on: SUST Credit Hour System Advising Guide 2019/2020 (pages 33–43)
 *
 * THESE ARE NOT UNIT TESTS — THEY ARE LEGAL REQUIREMENTS.
 * Every example in the Advising Guide must produce the exact same result.
 * Any deviation is a critical academic defect, not a normal bug.
 *
 * Spec ref: COMPLETE_SPEC_FINAL.md §1, ADR-001
 */

import { describe, it, expect } from 'vitest';
import {
    calculateGradePoint,
    calculateSGPA,
    calculateCGPA,
    getLetterGrade,
    getAcademicStatus,
    calculateSubstitutionCGPA,
} from '../lib/gpa';

// ─────────────────────────────────────────────────────────────────────────────
// §1 — Formula A: New Enrollment  (sgp = round(X / 25, 1))
// Guide p.33 — 5 course examples
// ─────────────────────────────────────────────────────────────────────────────
describe('Formula A — calculateGradePoint (NEW enrollment)', () => {
    it('Guide p.33 Course 1: score 55 → sgp 2.2', () => {
        expect(calculateGradePoint(55, 'NEW')).toBe(2.2);
    });
    it('Guide p.33 Course 2: score 59 → sgp 2.4', () => {
        expect(calculateGradePoint(59, 'NEW')).toBe(2.4);
    });
    it('Guide p.33 Course 3: score 52 → sgp 2.1', () => {
        expect(calculateGradePoint(52, 'NEW')).toBe(2.1);
    });
    it('Guide p.33 Course 4: score 68 → sgp 2.7', () => {
        expect(calculateGradePoint(68, 'NEW')).toBe(2.7);
    });
    it('Guide p.33 Course 5: score 57 → sgp 2.3', () => {
        expect(calculateGradePoint(57, 'NEW')).toBe(2.3);
    });

    // Boundary values
    it('Pass boundary: score 50 → sgp 2.0', () => {
        expect(calculateGradePoint(50, 'NEW')).toBe(2.0);
    });
    it('Fail boundary: score 49 → sgp 0.0 (F)', () => {
        // 49/25=1.96 → rounds to 2.0 mathematically but is below pass mark 50
        expect(calculateGradePoint(49, 'NEW')).toBe(0.0);
    });
    it('Perfect score: 100 → sgp 4.0 (capped)', () => {
        expect(calculateGradePoint(100, 'NEW')).toBe(4.0);
    });
    it('score 75 → sgp 3.0 (clean divisor)', () => {
        expect(calculateGradePoint(75, 'NEW')).toBe(3.0);
    });
    it('score 82 → sgp 3.3 (rounding)', () => {
        expect(calculateGradePoint(82, 'NEW')).toBe(3.3);
    });
    it('score 0 → sgp 0.0 (zero score)', () => {
        expect(calculateGradePoint(0, 'NEW')).toBe(0.0);
    });
    it('score 65 → sgp 2.6', () => {
        expect(calculateGradePoint(65, 'NEW')).toBe(2.6);
    });
    it('score 90 → sgp 3.6', () => {
        expect(calculateGradePoint(90, 'NEW')).toBe(3.6);
    });
    it('score 95 → sgp 3.8', () => {
        expect(calculateGradePoint(95, 'NEW')).toBe(3.8);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// §1 — Formula B: Resit/Repeat  (sgp = round((2/3) * (X/25 + 1), 1))
// Guide p.36
// ─────────────────────────────────────────────────────────────────────────────
describe('Formula B — calculateGradePoint (RESIT enrollment)', () => {
    it('Guide p.36: score 75 → sgp 2.7  (2/3*(3+1)=2.67→2.7)', () => {
        expect(calculateGradePoint(75, 'RESIT')).toBe(2.7);
    });
    it('Pass boundary: score 50 → sgp 2.0  (2/3*(2+1)=2.0)', () => {
        expect(calculateGradePoint(50, 'RESIT')).toBe(2.0);
    });
    it('Fail boundary: score 49 → sgp 0.0  (below pass mark)', () => {
        expect(calculateGradePoint(49, 'RESIT')).toBe(0.0);
    });
    it('score 80 → Formula B sgp (2/3*(3.2+1)=2.8)', () => {
        expect(calculateGradePoint(80, 'RESIT')).toBe(2.8);
    });
    it('score 100 → capped at 4.0 for RESIT', () => {
        // (2/3)*(4+1)=3.33 — not capped because < 4.0
        expect(calculateGradePoint(100, 'RESIT')).toBeCloseTo(3.3, 1);
    });
    it('score 0 → sgp 0.0', () => {
        expect(calculateGradePoint(0, 'RESIT')).toBe(0.0);
    });
});

describe('Formula B — calculateGradePoint (REPEAT enrollment)', () => {
    it('score 75 → same Formula B as RESIT: sgp 2.7', () => {
        expect(calculateGradePoint(75, 'REPEAT')).toBe(2.7);
    });
    it('Pass boundary: score 50 → sgp 2.0', () => {
        expect(calculateGradePoint(50, 'REPEAT')).toBe(2.0);
    });
    it('Fail boundary: score 49 → sgp 0.0', () => {
        expect(calculateGradePoint(49, 'REPEAT')).toBe(0.0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// §1 — SGPA Calculation
// Guide p.33 — Example: 5 courses, exclude ALTERNATE from divisor
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateSGPA', () => {
    it('Guide p.33: 5 NEW courses match the Advising Guide example', () => {
        // Courses: 55,59,52,68,57 with credit hours 3,3,3,3,3
        // SGPs: 2.2, 2.4, 2.1, 2.7, 2.3
        // Points: 6.6, 7.2, 6.3, 8.1, 6.9  → total = 35.1
        // Credits: 15
        // SGPA = 35.1 / 15 = 2.34
        const courses = [
            { score: 55, creditHours: 3, type: 'NEW' as const },
            { score: 59, creditHours: 3, type: 'NEW' as const },
            { score: 52, creditHours: 3, type: 'NEW' as const },
            { score: 68, creditHours: 3, type: 'NEW' as const },
            { score: 57, creditHours: 3, type: 'NEW' as const },
        ];
        expect(calculateSGPA(courses)).toBeCloseTo(2.34, 2);
    });

    it('ALTERNATE course fully excluded from SGPA', () => {
        const courses = [
            { score: 75, creditHours: 3, type: 'NEW' as const },       // SGP 3.0, pts 9.0
            { score: 82, creditHours: 2, type: 'NEW' as const },       // SGP 3.3, pts 6.6
            { score: 60, creditHours: 3, type: 'RESIT' as const },     // Formula B: 2/3*(2.4+1)≈2.3, pts≈6.9
            { score: 75, creditHours: 2, type: 'ALTERNATE' as const }, // FULLY excluded from GPA
        ];
        // Spec §1.3: "ALTERNATE: excluded entirely from GPA"
        // Points: 9.0 + 6.6 + 6.9 = 22.5  (ALTERNATE excluded)
        // Divisor: 3 + 2 + 3 = 8           (ALTERNATE excluded)
        // SGPA = 22.5 / 8 = 2.8125 ≈ 2.81
        expect(calculateSGPA(courses)).toBeCloseTo(2.81, 2);
    });

    it('DEPRIVED course counts as 0 points in SGPA', () => {
        const courses = [
            { score: 75, creditHours: 3, type: 'NEW' as const },      // SGP 3.0, pts 9.0
            { score: 80, creditHours: 3, type: 'DEPRIVED' as const }, // SGP 0 (deprived), pts 0
        ];
        // Points: 9.0 + 0 = 9.0, Divisor: 6
        expect(calculateSGPA(courses)).toBeCloseTo(1.5, 1);
    });

    it('DEFERRED course excluded from SGPA entirely', () => {
        const courses = [
            { score: 75, creditHours: 3, type: 'NEW' as const },       // SGP 3.0
            { score: 75, creditHours: 3, type: 'DEFERRED' as const },  // excluded entirely
        ];
        // Only first course counts: 9.0/3 = 3.0
        expect(calculateSGPA(courses)).toBeCloseTo(3.0, 1);
    });


    it('Empty semester returns 0.0', () => {
        expect(calculateSGPA([])).toBe(0.0);
    });

    it('All failed courses → low SGPA', () => {
        const courses = [
            { score: 45, creditHours: 3, type: 'NEW' as const }, // 0.0 SGP
            { score: 30, creditHours: 3, type: 'NEW' as const }, // 0.0 SGP
        ];
        expect(calculateSGPA(courses)).toBe(0.0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// §1 — CGPA Calculation
// Guide p.39 — Cumulative across multiple semesters
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCGPA', () => {
    it('Single semester CGPA equals SGPA', () => {
        const semesters = [{ coursePoints: 22.5, creditHours: 8, isFirstAttemptTotal: 8 }];
        expect(calculateCGPA(semesters)).toBeCloseTo(2.81, 2);
    });

    it('Two semesters: Guide p.39 example', () => {
        const semesters = [
            { coursePoints: 30, creditHours: 10, isFirstAttemptTotal: 10 },
            { coursePoints: 22.5, creditHours: 8, isFirstAttemptTotal: 5 },
        ];
        // CGPA = (30+22.5)/(10+5) = 52.5/15 = 3.50
        expect(calculateCGPA(semesters)).toBe(3.50);
    });

    it('Empty history returns 0.0', () => {
        expect(calculateCGPA([])).toBe(0.0);
    });

    it('All zeros → CGPA 0.0', () => {
        const semesters = [
            { coursePoints: 0, creditHours: 6, isFirstAttemptTotal: 6 },
        ];
        expect(calculateCGPA(semesters)).toBe(0.0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// §1 — Letter Grade mapping
// ─────────────────────────────────────────────────────────────────────────────
// SUST Grade Scale per COMPLETE_SPEC_FINAL.md §1.2 (NOT standard 4.0)
// A+: 3.6-4.0 | A: 3.2-3.5 | B+: 2.8-3.1 | B: 2.6-2.7 | C+: 2.4-2.5 | C: 2.0-2.3 | F: <2.0
describe('getLetterGrade', () => {
    it('§1.2: 4.0 → A+', () => expect(getLetterGrade(4.0)).toBe('A+'));
    it('§1.2: 3.9 → A+', () => expect(getLetterGrade(3.9)).toBe('A+'));
    it('§1.2: 3.6 → A+ (boundary)', () => expect(getLetterGrade(3.6)).toBe('A+'));
    it('§1.2: 3.5 → A  (top of A range)', () => expect(getLetterGrade(3.5)).toBe('A'));
    it('§1.2: 3.2 → A  (bottom of A range)', () => expect(getLetterGrade(3.2)).toBe('A'));
    it('§1.2: 3.1 → B+ (top of B+ range)', () => expect(getLetterGrade(3.1)).toBe('B+'));
    it('§1.2: 2.8 → B+ (bottom of B+ range)', () => expect(getLetterGrade(2.8)).toBe('B+'));
    it('§1.2: 2.7 → B  (top of B range)', () => expect(getLetterGrade(2.7)).toBe('B'));
    it('§1.2: 2.6 → B  (bottom of B range)', () => expect(getLetterGrade(2.6)).toBe('B'));
    it('§1.2: 2.5 → C+ (top of C+ range)', () => expect(getLetterGrade(2.5)).toBe('C+'));
    it('§1.2: 2.4 → C+ (bottom of C+ range)', () => expect(getLetterGrade(2.4)).toBe('C+'));
    it('§1.2: 2.3 → C  (top of C range)', () => expect(getLetterGrade(2.3)).toBe('C'));
    it('§1.2: 2.0 → C  (pass boundary)', () => expect(getLetterGrade(2.0)).toBe('C'));
    it('§1.2: 1.9 → F  (below 2.0)', () => expect(getLetterGrade(1.9)).toBe('F'));
    it('§1.2: 0.0 → F  (zero SGP)', () => expect(getLetterGrade(0.0)).toBe('F'));
    // Note: SUST has no D grade — fail is anything below 2.0
});

// ─────────────────────────────────────────────────────────────────────────────
// §1.10 — Academic Standing
// ─────────────────────────────────────────────────────────────────────────────
describe('getAcademicStatus', () => {
    it('CGPA ≥ 2.0, 0 prior warnings → GOOD', () => {
        expect(getAcademicStatus(2.0, 0)).toBe('GOOD');
        expect(getAcademicStatus(3.5, 0)).toBe('GOOD');
    });
    it('CGPA < 2.0, 0 prior warnings → WARNING_1', () => {
        expect(getAcademicStatus(1.99, 0)).toBe('WARNING_1');
        expect(getAcademicStatus(1.5, 0)).toBe('WARNING_1');
    });
    it('CGPA < 2.0, 1 prior warning → WARNING_2', () => {
        expect(getAcademicStatus(1.9, 1)).toBe('WARNING_2');
    });
    it('CGPA < 2.0, 2 prior warnings → DISMISSED', () => {
        expect(getAcademicStatus(1.9, 2)).toBe('DISMISSED');
    });
    it('CGPA exactly 2.0 with 1 prior warning → GOOD (recovered)', () => {
        expect(getAcademicStatus(2.0, 1)).toBe('GOOD');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Substitution CGPA (ALTERNATE courses)
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateSubstitutionCGPA', () => {
    it('replaced course excluded, substitute included', () => {
        const result = calculateSubstitutionCGPA(
            [{ coursePoints: 22.5, creditHours: 8, isFirstAttemptTotal: 8 }],
            { replacedPoints: 6.0, replacedCredits: 3 },
            { substitutePoints: 9.0, substituteCredits: 3 }
        );
        // Remove replaced: (22.5-6.0), divisor: (8-3) → 16.5/5=3.3
        // Add substitute: (16.5+9.0), divisor: (5+3) → 25.5/8=3.19
        expect(result).toBeCloseTo(3.19, 2);
    });
});
