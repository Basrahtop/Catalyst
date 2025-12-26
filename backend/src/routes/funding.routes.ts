import { Router } from 'express';
// 1. Import all our functions
import { 
  createFundingRequest,
  getAllRequests,
  approveRequest,
  declineRequest,
  getMyRequests,
  getMyInvestments,
  getInvestmentInstallments
} from '../controllers/funding.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// --- SME Routes ---

// POST /api/funding-requests
router.post('/', authMiddleware, createFundingRequest);

// --- 2. ADD THIS NEW ROUTE ---
// GET /api/funding-requests/my-requests
// (This must come *before* routes with /:id)
router.get('/my-requests', authMiddleware, getMyRequests);

// GET /api/funding-requests/my-investments
router.get('/my-investments', authMiddleware, getMyInvestments);

// GET /api/investments/:id/installments
router.get('/investments/:id/installments', authMiddleware, getInvestmentInstallments);


// --- Bank & Agent Routes (Protected) ---

// GET /api/funding-requests
router.get('/', authMiddleware, getAllRequests);

// PATCH /api/funding-requests/:id/approve
router.patch('/:id/approve', authMiddleware, approveRequest);

// PATCH /api/funding-requests/:id/decline
router.patch('/:id/decline', authMiddleware, declineRequest);

export default router;