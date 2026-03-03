"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const errors_1 = require("../lib/errors");
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new errors_1.ForbiddenError('NO_USER_CONTEXT');
        }
        if (!allowedRoles.includes(req.user.role)) {
            throw new errors_1.ForbiddenError('INSUFFICIENT_PERMISSIONS', 'ليس لديك إذن لأداء هذا الإجراء', `Role ${req.user.role} is not permitted`);
        }
        next();
    };
};
exports.requireRole = requireRole;
