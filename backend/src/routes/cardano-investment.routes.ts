/**
 * Cardano Investment Routes
 * 
 * Two-step investment flow for ADA/USDM
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { prepareCardanoInvestment, confirmCardanoInvestment } from '../controllers/cardano-investment.controller';

const router = Router();

// Prepare transaction parameters (returns data for client-side signing)
router.post('/prepare', authMiddleware, prepareCardanoInvestment);

// Confirm investment after transaction is signed
router.post('/confirm', authMiddleware, confirmCardanoInvestment);

export default router;
