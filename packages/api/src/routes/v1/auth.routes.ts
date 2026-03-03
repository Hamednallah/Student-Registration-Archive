import { Router } from 'express';
import { loginHandler, logoutHandler, meHandler } from '../../controllers/auth.controller';
import { requireAuth } from '../../middleware/auth';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', loginHandler);

// POST /api/v1/auth/logout
router.post('/logout', requireAuth, logoutHandler);

// GET /api/v1/auth/me
router.get('/me', requireAuth, meHandler);

export default router;
