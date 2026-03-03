"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.ForbiddenError = exports.UnauthorizedError = exports.ConflictError = exports.NotFoundError = exports.AppError = void 0;
class AppError extends Error {
    code;
    statusCode;
    messageAr;
    constructor(code, statusCode, messageAr, messageEn) {
        super(messageEn);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.messageAr = messageAr;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(code, messageAr, messageEn) {
        super(code, 404, messageAr, messageEn);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(code, messageAr, messageEn) {
        super(code, 409, messageAr, messageEn);
    }
}
exports.ConflictError = ConflictError;
class UnauthorizedError extends AppError {
    constructor(code = 'UNAUTHORIZED', messageAr = 'المصادقة مطلوبة', messageEn = 'Authentication required') {
        super(code, 401, messageAr, messageEn);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(code = 'FORBIDDEN', messageAr = 'ليس لديك إذن لأداء هذا الإجراء', messageEn = 'You do not have permission to perform this action') {
        super(code, 403, messageAr, messageEn);
    }
}
exports.ForbiddenError = ForbiddenError;
class ValidationError extends AppError {
    constructor(messageAr = 'البيانات المقدمة غير صالحة', messageEn = 'The provided data is invalid') {
        super('VALIDATION_ERROR', 422, messageAr, messageEn);
    }
}
exports.ValidationError = ValidationError;
