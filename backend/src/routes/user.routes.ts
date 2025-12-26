import { Router } from 'express';
// Import the new function
import { getMe, updateProfile, submitKYC, changePassword } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// GET /api/users/me
router.get('/me', authMiddleware, getMe);

// PATCH /api/users/me or /api/users/profile
router.patch('/me', authMiddleware, updateProfile); // Keep for backward compatibility
router.patch('/profile', authMiddleware, updateProfile);

// POST /api/users/change-password (NEW)
router.post('/change-password', authMiddleware, changePassword);

// POST /api/users/verify-kyc
router.post('/verify-kyc', authMiddleware, submitKYC);

export default router;