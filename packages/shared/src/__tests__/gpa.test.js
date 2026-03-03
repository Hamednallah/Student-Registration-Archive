"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const gpa_1 = require("../lib/gpa");
(0, vitest_1.describe)('SUST Advising Guide GPA Calculations', () => {
    // Page 33 Example
    (0, vitest_1.describe)('Formula A: New Courses', () => {
        (0, vitest_1.it)('calculates Grade Point correctly (sgp = round(X/25, 1))', () => {
            // 75 / 25 = 3.0
            (0, vitest_1.expect)((0, gpa_1.calculateGradePoint)(75, 'NEW')).toBe(3.0);
            // 82 / 25 = 3.28 -> 3.3
            (0, vitest_1.expect)((0, gpa_1.calculateGradePoint)(82, 'NEW')).toBe(3.3);
            // 50 / 25 = 2.0 (Pass Mark)
            (0, vitest_1.expect)((0, gpa_1.calculateGradePoint)(50, 'NEW')).toBe(2.0);
            // Below 50 is F (0.0)
            (0, vitest_1.expect)((0, gpa_1.calculateGradePoint)(49, 'NEW')).toBe(0.0);
        });
    });
    (0, vitest_1.describe)('Formula B: Resit / Repeat Courses', () => {
        (0, vitest_1.it)('calculates Grade Point correctly (sgp = round((2/3) * (X/25 + 1), 1))', () => {
            // 75 -> 2/3 * (3 + 1) = 2.66 -> 2.7
            (0, vitest_1.expect)((0, gpa_1.calculateGradePoint)(75, 'RESIT')).toBe(2.7);
            (0, vitest_1.expect)((0, gpa_1.calculateGradePoint)(75, 'REPEAT')).toBe(2.7);
            // 50 -> 2/3 * (2 + 1) = 2.0
            (0, vitest_1.expect)((0, gpa_1.calculateGradePoint)(50, 'RESIT')).toBe(2.0);
            (0, vitest_1.expect)((0, gpa_1.calculateGradePoint)(50, 'REPEAT')).toBe(2.0);
            // Below 50 is F (0.0)
            (0, vitest_1.expect)((0, gpa_1.calculateGradePoint)(49, 'RESIT')).toBe(0.0);
        });
    });
    (0, vitest_1.describe)('SGPA Calculation', () => {
        (0, vitest_1.it)('calculates SGPA excluding ALTERNATE courses', () => {
            const courses = [
                { score: 75, creditHours: 3, type: 'NEW' }, // SGP: 3.0, Points: 9.0
                { score: 82, creditHours: 2, type: 'NEW' }, // SGP: 3.3, Points: 6.6
                { score: 60, creditHours: 3, type: 'RESIT' }, // SGP: 2/3*(2.4+1) = 2.3, Points: 6.9
                { score: 75, creditHours: 2, type: 'ALTERNATE' }, // Should be excluded from divisor
            ];
            // Expected Total Points: 9.0 + 6.6 + 6.9 = 22.5
            // Expected Divisor (excluding ALTERNATE): 3 + 2 + 3 = 8
            // Expected SGPA: 22.5 / 8 = 2.8125 -> 2.81
            const result = (0, gpa_1.calculateSGPA)(courses);
            (0, vitest_1.expect)(result).toBeCloseTo(2.81);
        });
    });
    (0, vitest_1.describe)('CGPA Calculation', () => {
        (0, vitest_1.it)('calculates CGPA across multiple semesters using first-attempt divisor logic', () => {
            const semesters = [
                {
                    coursePoints: 30, // Semester 1 total points
                    creditHours: 10, // Semester 1 credit hours
                    isFirstAttemptTotal: 10,
                },
                {
                    coursePoints: 22.5, // Semester 2 total points
                    creditHours: 8, // Semester 2 credit hours (with resits)
                    isFirstAttemptTotal: 5, // Only 5 credits were first attempt this semester
                }
            ];
            // Formula: Sum(Points) / Sum(FirstAttemptCredits)
            // Total Points: 52.5
            // Divisor: 15
            // CGPA: 52.5 / 15 = 3.50
            (0, vitest_1.expect)((0, gpa_1.calculateCGPA)(semesters)).toBe(3.50);
        });
    });
    (0, vitest_1.describe)('Letter Grades', () => {
        (0, vitest_1.it)('returns the correct letter grade for a given grade point', () => {
            (0, vitest_1.expect)((0, gpa_1.getLetterGrade)(4.0)).toBe('A+');
            (0, vitest_1.expect)((0, gpa_1.getLetterGrade)(3.7)).toBe('A');
            (0, vitest_1.expect)((0, gpa_1.getLetterGrade)(3.3)).toBe('B+');
            (0, vitest_1.expect)((0, gpa_1.getLetterGrade)(3.0)).toBe('B');
            (0, vitest_1.expect)((0, gpa_1.getLetterGrade)(2.7)).toBe('C+');
            (0, vitest_1.expect)((0, gpa_1.getLetterGrade)(2.3)).toBe('C');
            (0, vitest_1.expect)((0, gpa_1.getLetterGrade)(2.0)).toBe('D');
            (0, vitest_1.expect)((0, gpa_1.getLetterGrade)(1.0)).toBe('F');
            (0, vitest_1.expect)((0, gpa_1.getLetterGrade)(0.0)).toBe('F');
        });
    });
    (0, vitest_1.describe)('Academic Status', () => {
        (0, vitest_1.it)('evaluates status correctly based on CGPA', () => {
            (0, vitest_1.expect)((0, gpa_1.getAcademicStatus)(2.0, 1)).toBe('GOOD');
            (0, vitest_1.expect)((0, gpa_1.getAcademicStatus)(1.9, 0)).toBe('WARNING_1');
            (0, vitest_1.expect)((0, gpa_1.getAcademicStatus)(1.9, 1)).toBe('WARNING_2');
            (0, vitest_1.expect)((0, gpa_1.getAcademicStatus)(1.9, 2)).toBe('DISMISSED');
        });
    });
});
