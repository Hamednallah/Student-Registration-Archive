// Spec ref: docs/02_QUALITY_STANDARDS.md §5 — API envelope shape
// All API responses must match one of these shapes.

// ── Success envelope ──────────────────────────────────────────────────────────
export interface ApiSuccess<T> {
    success: true;
    data: T;
    message?: string;
}

// ── Paginated success envelope ────────────────────────────────────────────────
export interface ApiPaginated<T> {
    success: true;
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        nextCursor?: string | number | null; // for keyset pagination
    };
}

// ── Error envelope ────────────────────────────────────────────────────────────
// Both message (EN) and message_ar (AR) are required — see COMPLETE_SPEC_FINAL.md §4
export interface ApiError {
    success: false;
    error: {
        code: string;   // e.g. 'GRADE_ALREADY_APPROVED'
        message: string;   // English
        message_ar: string;   // Arabic
        statusCode: number;
        details?: Record<string, unknown>;
    };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Pagination input (keyset preferred, OFFSET forbidden on large tables) ──────
// Spec ref: MEMORY.md decision #1 — keyset pagination over OFFSET
export interface KeysetPaginationInput {
    limit: number;          // max 100
    cursor?: string | number; // last seen id or composite key
}

export interface OffsetPaginationInput {
    page: number;
    limit: number;
}
