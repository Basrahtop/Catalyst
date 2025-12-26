// src/routes/verification.routes.ts
import { Router } from 'express';
import { submitNIN } from '../controllers/verification.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// --- Define Verification Routes (All are protected) ---

// POST /api/verification/submit-nin
router.post('/submit-nin', authMiddleware, submitNIN);

// POST /api/verification/submit-bvn
// router.post('/submit-bvn', authMiddleware, submitBVN);

export default router;