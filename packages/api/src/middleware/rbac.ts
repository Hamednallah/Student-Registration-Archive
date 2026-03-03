import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../lib/errors';

export const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            throw new ForbiddenError('NO_USER_CONTEXT');
        }

        if (!allowedRoles.includes(req.user.role)) {
            throw new ForbiddenError(
                'INSUFFICIENT_PERMISSIONS',
                'ليس لديك إذن لأداء هذا الإجراء',
                `Role ${req.user.role} is not permitted`
            );
        }

        next();
    };
};
