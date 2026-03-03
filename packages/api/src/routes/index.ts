import { Router } from 'express';
import authRoutes from './v1/auth.routes';

const router = Router();

// Mount all v1 routes
router.use('/auth', authRoutes);

// Additional routes will be added here:
// router.use('/students', studentRoutes);
// router.use('/enrollments', enrollmentRoutes);
// router.use('/grades', gradeRoutes);

export default router;
