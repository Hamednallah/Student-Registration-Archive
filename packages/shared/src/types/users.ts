// Spec ref: COMPLETE_SPEC_FINAL.md §4 — User roles and auth types

// Role codes (single character per spec)
// A=Admin, R=Registrar, C=Coordinator, I=Instructor, U=Staff, S=Student
export const ROLE = {
    ADMIN: 'A',
    REGISTRAR: 'R',
    COORDINATOR: 'C',
    INSTRUCTOR: 'I',
    STAFF: 'U',
    STUDENT: 'S',
} as const;

export type Role = typeof ROLE[keyof typeof ROLE];

// All staff roles (non-student)
export const STAFF_ROLES: Role[] = ['A', 'R', 'C', 'I', 'U'];

// JWT payload — what is encoded in the access token
export interface JwtPayload {
    userId: number;
    role: Role;
    studentId: string | null; // Only set when role === 'S'
    iat?: number;
    exp?: number;
}

// The req.user object after authentication middleware
export interface AuthUser {
    userId: number;
    role: Role;
    studentId: string | null;
}

// User record from DB (never expose passwordHash in responses)
export interface UserRecord {
    userId: number;
    username: string;
    role: Role;
    studentId: string | null;
    isActive: boolean;
    createdAt: string;
    lastLoginAt: string | null;
}
