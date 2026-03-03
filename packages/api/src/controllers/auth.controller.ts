import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { db } from '../config/database';
import { UnauthorizedError, NotFoundError } from '../lib/errors';
import { AuthContext } from '../middleware/auth';

export const loginHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            throw new UnauthorizedError('MISSING_CREDENTIALS', 'اسم المستخدم وكلمة المرور مطلوبان', 'Username and password are required');
        }

        const [user] = await db.query(
            `SELECT id, username, password_hash, role FROM users WHERE username = ? AND is_active = 1`,
            [username]
        );

        if (!user) {
            // Constant-time response to prevent username enumeration
            await bcrypt.hash('dummy', 12);
            throw new UnauthorizedError('INVALID_CREDENTIALS', 'بيانات الاعتماد غير صالحة', 'Invalid credentials');
        }

        const passwordValid = await bcrypt.compare(password, user.password_hash);
        if (!passwordValid) {
            throw new UnauthorizedError('INVALID_CREDENTIALS', 'بيانات الاعتماد غير صالحة', 'Invalid credentials');
        }

        const payload: AuthContext = {
            userId: user.id,
            role: user.role,
        };

        // Fetch role-specific context (facultyId, departmentId for instructors/coordinators)
        if (user.role === 'INSTRUCTOR' || user.role === 'COORDINATOR') {
            // Placeholder: fetch department association when instructor/coordinator tables are added
        }

        const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });

        res.status(200).json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                }
            }
        });
    } catch (err) {
        next(err);
    }
};

export const logoutHandler = async (req: Request, res: Response, next: NextFunction) => {
    // In a stateless JWT setup, logout is client-side.
    // In production with Redis, the token would be added to a blocklist here.
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const meHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new UnauthorizedError();
        }

        const [user] = await db.query(
            `SELECT id, username, role, created_at FROM users WHERE id = ?`,
            [req.user.userId]
        );

        if (!user) {
            throw new NotFoundError('USER_NOT_FOUND', 'المستخدم غير موجود', 'User not found');
        }

        res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};
