// @psau/shared — Public API
// All shared code used by both @psau/api and @psau/web must be exported here.

// GPA formula functions (academic law — do not modify without Advising Guide update)
// Note: gpa.ts also defines local types for self-containment; the canonical types
// come from types/academic.ts below (exported once to avoid conflicts).
export {
    calculateGradePoint,
    calculateSGPA,
    calculateCGPA,
    getLetterGrade,
    getAcademicStatus,
    calculateSubstitutionCGPA,
} from './lib/gpa.js';

// Canonical shared types (single source of truth)
export * from './types/academic.js';
export * from './types/users.js';
export * from './types/api.js';

// Constants
export * from './constants/grades.js';
