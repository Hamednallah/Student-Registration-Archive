export type EnrollmentType = 'NEW' | 'RESIT' | 'REPEAT' | 'ALTERNATE' | 'DEFERRED' | 'DEPRIVED';
export type AcademicStatus = 'GOOD' | 'WARNING_1' | 'WARNING_2' | 'DISMISSED' | 'REPEAT_YEAR';

export interface CourseScore {
    score: number;
    creditHours: number;
    type: EnrollmentType;
}

export interface SemesterRecord {
    coursePoints: number;
    creditHours: number;
    isFirstAttemptTotal: number; // Important for CGPA divisor per Advising Guide
}

export interface ClassificationResult {
    internal: string;
    display: string;
}

/**
 * Formula A/B for GPA points derivation (SUST Advising Guide Pages 33-43)
 */
export function calculateGradePoint(score: number, type: EnrollmentType): number {
    if (score < 50) return 0.0; // Fail

    if (type === 'NEW' || type === 'ALTERNATE') {
        // Formula A: sgp = round(X/25, 1)
        return Math.round((score / 25) * 10) / 10;
    } else {
        // Formula B: sgp = round((2/3) * (X/25 + 1), 1)
        return Math.round(((2 / 3) * (score / 25 + 1)) * 10) / 10;
    }
}

/**
 * SGPA = Sum(Course Points) / Sum(Credit Hours excluding ALTERNATE)
 */
export function calculateSGPA(courses: CourseScore[]): number {
    let totalPoints = 0;
    let divisor = 0;

    for (const course of courses) {
        if (course.type === 'ALTERNATE') continue;

        const sgp = calculateGradePoint(course.score, course.type);
        totalPoints += sgp * course.creditHours;
        divisor += course.creditHours;
    }

    if (divisor === 0) return 0.0;
    return Math.round((totalPoints / divisor) * 100) / 100;
}

/**
 * CGPA = Sum(All Course Points) / Sum(First Attempt Credit Hours)
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

export function getLetterGrade(gradePoint: number): string {
    if (gradePoint >= 3.8) return 'A+';
    if (gradePoint >= 3.5) return 'A';
    if (gradePoint >= 3.1) return 'B+';
    if (gradePoint >= 2.8) return 'B';
    if (gradePoint >= 2.5) return 'C+';
    if (gradePoint >= 2.1) return 'C';
    if (gradePoint >= 2.0) return 'D';
    return 'F';
}

export function getAcademicStatus(cgpa: number, currentWarningLevel: number): AcademicStatus {
    if (cgpa >= 2.0) return 'GOOD';
    if (currentWarningLevel === 0) return 'WARNING_1';
    if (currentWarningLevel === 1) return 'WARNING_2';
    return 'DISMISSED'; // Assuming warning_level 2 transitions to DISMISSED here based on basic rules
}

export function calculateSubstitutionCGPA(): number {
    return 0.0; // Placeholder for comprehensive logic
}
