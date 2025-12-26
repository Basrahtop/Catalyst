import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  submitReputationOnChain,
  getOnChainHistory,
  verifyReputationFromBlockchain,
  verifyByTransactionHash,
  getBlockfrostData
} from '../controllers/reputation-onchain.controller';

const router = Router();

// Protected routes (require authentication)
router.post('/submit-onchain', authMiddleware, submitReputationOnChain);
router.get('/onchain-history', authMiddleware, getOnChainHistory);

// Public verification routes (no authentication required)
router.get('/verify/:reputationId', verifyReputationFromBlockchain);
router.get('/verify-tx/:txHash', verifyByTransactionHash);
router.get('/blockfrost/:utxoRef', getBlockfrostData);

export default router;
