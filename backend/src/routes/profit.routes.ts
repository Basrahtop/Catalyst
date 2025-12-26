import { Router } from 'express';
import { 
  submitInstallmentReport, 
  payInstallment,
  getMyInstallments,
  getInstallmentById 
} from '../controllers/profit.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// --- Define Profit & Payment Routes ---

// GET /api/profit-reports/my-reports
router.get('/my-reports', authMiddleware, getMyInstallments);

// POST /api/profit-reports
router.post('/', authMiddleware, submitInstallmentReport);

// --- THIS IS THE FIX ---
// We change the path to just '/report/:reportId'
// Because in index.ts, this router is mounted at '/api/payments'
// So the full URL becomes: /api/payments/report/:reportId (CORRECT)
router.post('/report/:reportId', authMiddleware, payInstallment);
// --- END OF FIX ---

// GET /api/profit-reports/:id 
router.get('/:id', authMiddleware, getInstallmentById);

export default router;