import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../lib/errors';

export interface AuthContext {
    userId: number;
    role: string;
    facultyId?: number;
    departmentId?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthContext;
        }
    }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('MISSING_TOKEN');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as AuthContext;
        req.user = decoded;
        next();
    } catch (error) {
        throw new UnauthorizedError('INVALID_TOKEN');
    }
};
