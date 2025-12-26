import { Router } from 'express';
// 1. Import the new function and the new middleware
import { 
  applyToBecomeAgent, 
  vouchForUser 
} from '../controllers/agent.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { isAgent } from '../middleware/agent.middleware'; // <-- NEW GUARD

const router = Router();

// --- Define Agent Routes ---

// POST /api/agents/apply
// Protected by "auth" (must be logged in)
router.post('/apply', authMiddleware, applyToBecomeAgent);

// --- 2. ADD THIS NEW ROUTE ---

// POST /api/agents/vouch
// Protected by "auth" (must be logged in) AND "isAgent" (must be an Agent)
router.post('/vouch', [authMiddleware, isAgent], vouchForUser);

// We'll add the other Agent endpoints here later
// router.get('/my-community', [authMiddleware, isAgent], getMyCommunity);

export default router;