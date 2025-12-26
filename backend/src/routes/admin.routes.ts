// src/routes/admin.routes.ts
import { Router } from 'express';
import { getPendingAgents, approveAgent } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware'; // "Are you logged in?"
import { isAdmin } from '../middleware/admin.middleware'; // "Are you an Admin?"

const router = Router();

// --- Define Admin Routes ---
// All routes in this file are protected by TWO layers of security.
// 1. 'authMiddleware' runs to see if they are logged in.
// 2. 'isAdmin' runs to see if they have the 'ADMIN' role.

// GET /api/admin/agent-applications
router.get('/agent-applications', [authMiddleware, isAdmin], getPendingAgents);

// PATCH /api/admin/agents/:agentId/approve
router.patch('/agents/:agentId/approve', [authMiddleware, isAdmin], approveAgent);

// We can add a "reject" route here later
// router.patch('/agents/:agentId/reject', [authMiddleware, isAdmin], rejectAgent);

export default router;