export class AppError extends Error {
    public code: string;
    public statusCode: number;
    public messageAr: string;

    constructor(code: string, statusCode: number, messageAr: string, messageEn: string) {
        super(messageEn);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.messageAr = messageAr;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(code: string, messageAr: string, messageEn: string) {
        super(code, 404, messageAr, messageEn);
    }
}

export class ConflictError extends AppError {
    constructor(code: string, messageAr: string, messageEn: string) {
        super(code, 409, messageAr, messageEn);
    }
}

export class UnauthorizedError extends AppError {
    constructor(code = 'UNAUTHORIZED', messageAr = 'المصادقة مطلوبة', messageEn = 'Authentication required') {
        super(code, 401, messageAr, messageEn);
    }
}

export class ForbiddenError extends AppError {
    constructor(code = 'FORBIDDEN', messageAr = 'ليس لديك إذن لأداء هذا الإجراء', messageEn = 'You do not have permission to perform this action') {
        super(code, 403, messageAr, messageEn);
    }
}

export class ValidationError extends AppError {
    constructor(messageAr = 'البيانات المقدمة غير صالحة', messageEn = 'The provided data is invalid') {
        super('VALIDATION_ERROR', 422, messageAr, messageEn);
    }
}
