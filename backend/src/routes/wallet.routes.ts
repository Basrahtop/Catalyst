import { Router } from 'express';
import { 
  getMyBalance, 
  depositFunds,
  transferFunds,
  withdrawFunds,
  getTransactions // <-- 1. IMPORT THE NEW FUNCTION
} from '../controllers/wallet.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// --- Define Wallet Routes (All are protected) ---

// GET /api/wallet/balance
router.get('/balance', authMiddleware, getMyBalance);

// --- 2. ADD THIS NEW ROUTE ---
// GET /api/wallet/transactions
router.get('/transactions', authMiddleware, getTransactions);

// POST /api/wallet/deposit
router.post('/deposit', authMiddleware, depositFunds);

// POST /api/wallet/transfer
router.post('/transfer', authMiddleware, transferFunds);

// POST /api/wallet/withdraw
router.post('/withdraw', authMiddleware, withdrawFunds);

export default router;