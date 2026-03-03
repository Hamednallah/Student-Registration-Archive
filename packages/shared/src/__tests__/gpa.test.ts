import { describe, it, expect } from 'vitest';
import {
    calculateGradePoint,
    calculateSGPA,
    calculateCGPA,
    getLetterGrade,
    getAcademicStatus,
    calculateSubstitutionCGPA,
} from '../lib/gpa';

describe('SUST Advising Guide GPA Calculations', () => {
    // Page 33 Example
    describe('Formula A: New Courses', () => {
        it('calculates Grade Point correctly (sgp = round(X/25, 1))', () => {
            // 75 / 25 = 3.0
            expect(calculateGradePoint(75, 'NEW')).toBe(3.0);
            // 82 / 25 = 3.28 -> 3.3
            expect(calculateGradePoint(82, 'NEW')).toBe(3.3);
            // 50 / 25 = 2.0 (Pass Mark)
            expect(calculateGradePoint(50, 'NEW')).toBe(2.0);
            // Below 50 is F (0.0)
            expect(calculateGradePoint(49, 'NEW')).toBe(0.0);
        });
    });

    describe('Formula B: Resit / Repeat Courses', () => {
        it('calculates Grade Point correctly (sgp = round((2/3) * (X/25 + 1), 1))', () => {
            // 75 -> 2/3 * (3 + 1) = 2.66 -> 2.7
            expect(calculateGradePoint(75, 'RESIT')).toBe(2.7);
            expect(calculateGradePoint(75, 'REPEAT')).toBe(2.7);

            // 50 -> 2/3 * (2 + 1) = 2.0
            expect(calculateGradePoint(50, 'RESIT')).toBe(2.0);
            expect(calculateGradePoint(50, 'REPEAT')).toBe(2.0);

            // Below 50 is F (0.0)
            expect(calculateGradePoint(49, 'RESIT')).toBe(0.0);
        });
    });

    describe('SGPA Calculation', () => {
        it('calculates SGPA excluding ALTERNATE courses', () => {
            const courses = [
                { score: 75, creditHours: 3, type: 'NEW' as const }, // SGP: 3.0, Points: 9.0
                { score: 82, creditHours: 2, type: 'NEW' as const }, // SGP: 3.3, Points: 6.6
                { score: 60, creditHours: 3, type: 'RESIT' as const }, // SGP: 2/3*(2.4+1) = 2.3, Points: 6.9
                { score: 75, creditHours: 2, type: 'ALTERNATE' as const }, // Should be excluded from divisor
            ];
            // Expected Total Points: 9.0 + 6.6 + 6.9 = 22.5
            // Expected Divisor (excluding ALTERNATE): 3 + 2 + 3 = 8
            // Expected SGPA: 22.5 / 8 = 2.8125 -> 2.81
            const result = calculateSGPA(courses);
            expect(result).toBeCloseTo(2.81);
        });
    });

    describe('CGPA Calculation', () => {
        it('calculates CGPA across multiple semesters using first-attempt divisor logic', () => {
            const semesters = [
                {
                    coursePoints: 30, // Semester 1 total points
                    creditHours: 10,   // Semester 1 credit hours
                    isFirstAttemptTotal: 10,
                },
                {
                    coursePoints: 22.5, // Semester 2 total points
                    creditHours: 8,     // Semester 2 credit hours (with resits)
                    isFirstAttemptTotal: 5, // Only 5 credits were first attempt this semester
                }
            ];
            // Formula: Sum(Points) / Sum(FirstAttemptCredits)
            // Total Points: 52.5
            // Divisor: 15
            // CGPA: 52.5 / 15 = 3.50
            expect(calculateCGPA(semesters)).toBe(3.50);
        });
    });

    describe('Letter Grades', () => {
        it('returns the correct letter grade for a given grade point', () => {
            expect(getLetterGrade(4.0)).toBe('A+');
            expect(getLetterGrade(3.7)).toBe('A');
            expect(getLetterGrade(3.3)).toBe('B+');
            expect(getLetterGrade(3.0)).toBe('B');
            expect(getLetterGrade(2.7)).toBe('C+');
            expect(getLetterGrade(2.3)).toBe('C');
            expect(getLetterGrade(2.0)).toBe('D');
            expect(getLetterGrade(1.0)).toBe('F');
            expect(getLetterGrade(0.0)).toBe('F');
        });
    });

    describe('Academic Status', () => {
        it('evaluates status correctly based on CGPA', () => {
            expect(getAcademicStatus(2.0, 1)).toBe('GOOD');
            expect(getAcademicStatus(1.9, 0)).toBe('WARNING_1');
            expect(getAcademicStatus(1.9, 1)).toBe('WARNING_2');
            expect(getAcademicStatus(1.9, 2)).toBe('DISMISSED');
        });
    });
});
