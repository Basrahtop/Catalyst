import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  registerWallet, 
  verifyWalletOwnership, 
  replaceWallet, 
  getMyWallet, 
  disconnectWallet,
  getPublicProfileByReputationId 
} from '../controllers/cardano-wallet.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// Lazy-load Cardano services to avoid import errors when disabled
let cardanoOracle: any = null;
let riskFundService: any = null;

async function loadCardanoServices() {
  if (!cardanoOracle && process.env.CARDANO_ENABLED === 'true') {
    try {
      const oracleModule = await import('../cardano/services/oracle.service');
      const riskModule = await import('../cardano/services/risk-fund.service');
      cardanoOracle = oracleModule.cardanoOracle;
      riskFundService = riskModule.riskFundService;
    } catch (error) {
      console.error('Failed to load Cardano services:', error);
    }
  }
}

/**
 * GET /api/cardano/status
 * Check Cardano integration status
 */
router.get('/status', async (req, res) => {
  try {
    await loadCardanoServices();
    
    const isEnabled = process.env.CARDANO_ENABLED === 'true';
    const network = process.env.CARDANO_NETWORK || 'Preprod';
    
    // Get latest reputation update
    const latestReputation = await prisma.reputationHistory.findFirst({
      orderBy: { timestamp: 'desc' },
      include: {
        sme: {
          select: {
            businessName: true
          }
        }
      }
    });

    res.json({
      enabled: isEnabled,
      network,
      oracleInitialized: cardanoOracle ? cardanoOracle.isReady() : false,
      riskFundInitialized: riskFundService ? riskFundService.isReady() : false,
      lastReputationUpdate: latestReputation ? {
        smeBusinessName: latestReputation.sme.businessName,
        overallScore: latestReputation.overallScore,
        timestamp: latestReputation.timestamp,
        onChain: !!latestReputation.cardanoTxHash
      } : null
    });
  } catch (error) {
    console.error('Failed to get Cardano status:', error);
    res.status(500).json({ 
      error: 'Failed to get Cardano status',
      enabled: false 
    });
  }
});

/**
 * GET /api/cardano/reputation/:smeId
 * Get reputation history for an SME
 */
router.get('/reputation/:smeId', async (req, res) => {
  try {
    await loadCardanoServices();
    
    const { smeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!cardanoOracle) {
      return res.status(503).json({ error: 'Cardano integration disabled' });
    }

    const history = await cardanoOracle.getReputationHistory(smeId, limit);
    
    res.json({
      smeId,
      history: history.map((h: any) => ({
        overallScore: h.overallScore,
        marketplaceScore: h.marketplaceScore,
        feedbackScore: h.feedbackScore,
        platformTrustScore: h.platformTrustScore,
        financialScore: h.financialScore,
        timestamp: h.timestamp,
        onChain: !!h.cardanoTxHash,
        txHash: h.cardanoTxHash
      }))
    });
  } catch (error) {
    console.error('Failed to get reputation history:', error);
    res.status(500).json({ error: 'Failed to get reputation history' });
  }
});

/**
 * GET /api/cardano/risk-fund/balance
 * Get risk fund balance (requires Cardano enabled)
 */
router.get('/risk-fund/balance', async (req, res) => {
  try {
    if (process.env.CARDANO_ENABLED !== 'true') {
      return res.status(503).json({ 
        error: 'Cardano integration is disabled',
        enabled: false 
      });
    }

    await loadCardanoServices();

    if (!riskFundService) {
      return res.status(503).json({ error: 'Risk fund service not available' });
    }

    await riskFundService.initialize();
    const balance = await riskFundService.getBalance();
    
    res.json({
      balance,
      address: process.env.MULTISIG_ADDRESS
    });
  } catch (error) {
    console.error('Failed to get risk fund balance:', error);
    res.status(500).json({ error: 'Failed to get risk fund balance' });
  }
});

/**
 * GET /api/cardano/risk-fund/contributions/:smeId
 * Get risk fund contributions by SME
 */
router.get('/risk-fund/contributions/:smeId', async (req, res) => {
  try {
    await loadCardanoServices();
    
    const { smeId } = req.params;
    
    if (!riskFundService) {
      return res.status(503).json({ error: 'Cardano integration disabled' });
    }

    const contributions = await riskFundService.getSMEContributions(smeId);
    
    res.json({
      smeId,
      contributions: contributions.map((c: any) => ({
        amount: c.amount,
        currency: c.currency,
        conversionRate: c.conversionRate,
        timestamp: c.timestamp,
        onChain: !!c.cardanoTxHash,
        txHash: c.cardanoTxHash
      }))
    });
  } catch (error) {
    console.error('Failed to get SME contributions:', error);
    res.status(500).json({ error: 'Failed to get SME contributions' });
  }
});

/**
 * POST /api/cardano/oracle/trigger
 * Manually trigger reputation update (admin only)
 */
router.post('/oracle/trigger', async (req, res) => {
  try {
    await loadCardanoServices();
    
    // TODO: Add admin authentication middleware
    
    if (!cardanoOracle || !cardanoOracle.isReady()) {
      return res.status(503).json({ 
        error: 'Oracle service not initialized',
        hint: 'Check CARDANO_ENABLED and BLOCKFROST_API_KEY in .env'
      });
    }

    await cardanoOracle.updateAllReputationScores();
    
    res.json({ 
      success: true,
      message: 'Reputation update triggered successfully'
    });
  } catch (error) {
    console.error('Failed to trigger reputation update:', error);
    res.status(500).json({ error: 'Failed to trigger reputation update' });
  }
});

// --- WALLET MANAGEMENT ROUTES (Authentication Required) ---

/**
 * POST /api/cardano/wallet/register
 * Register a Cardano wallet for the authenticated user
 */
router.post('/wallet/register', authMiddleware, registerWallet);

/**
 * POST /api/cardano/wallet/verify
 * Verify wallet ownership with cryptographic signature
 */
router.post('/wallet/verify', authMiddleware, verifyWalletOwnership);

/**
 * POST /api/cardano/wallet/replace
 * Replace a lost wallet with a new one
 */
router.post('/wallet/replace', authMiddleware, replaceWallet);

/**
 * GET /api/cardano/wallet/me
 * Get current user's wallet information
 */
router.get('/wallet/me', authMiddleware, getMyWallet);

/**
 * DELETE /api/cardano/wallet
 * Disconnect wallet from account
 */
router.delete('/wallet', authMiddleware, disconnectWallet);

// --- PUBLIC ROUTES (No Authentication Required) ---

/**
 * GET /api/cardano/wallet/public-profile/:reputationId
 * Get public profile by reputation ID (for investor verification)
 */
router.get('/wallet/public-profile/:reputationId', getPublicProfileByReputationId);

export default router;
