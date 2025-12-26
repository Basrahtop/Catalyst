import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { recalculatePlatformTrust, recalculateSMEPerformance, recalculateFinancialScore } from '../services/reputation.service';
import { cardanoOracle } from '../cardano/services/oracle.service';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/reputation/debug-smes
 * Debug endpoint to check SME data in database
 */
router.get('/debug-smes', async (req, res) => {
  try {
    const totalSMEs = await prisma.sME.count();
    const totalUsers = await prisma.user.count();
    const usersWithSME = await prisma.user.count({
      where: { sme: { isNot: null } }
    });
    
    const sampleSMEs = await prisma.sME.findMany({
      take: 5,
      select: {
        id: true,
        businessName: true,
        marketplaceScore: true,
        feedbackScore: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            platformTrustScore: true,
            financialScore: true
          }
        }
      }
    });

    res.json({
      totalSMEs,
      totalUsers,
      usersWithSME,
      sampleSMEs
    });
  } catch (error) {
    console.error('Debug SME query error:', error);
    res.status(500).json({
      error: 'Failed to query SME data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/reputation/update
 * Manually recalculate and update reputation scores for all SMEs
 * This will trigger a full recalculation using the correct score distribution
 */
router.post('/update', async (req, res) => {
  try {
    console.log('🔄 Starting reputation score recalculation...');
    
    // Fetch all SMEs with user data
    const smes = await prisma.sME.findMany({
      include: {
        user: {
          select: {
            id: true
          }
        }
      }
    });

    console.log(`📊 Found ${smes.length} SMEs to process`);

    let successCount = 0;
    const errors: string[] = [];

    for (const sme of smes) {
      try {
        // Recalculate all score components using the reputation service
        await recalculatePlatformTrust(sme.user.id);
        await recalculateSMEPerformance(sme.id);
        await recalculateFinancialScore(sme.user.id);
        
        console.log(`✅ Recalculated scores for ${sme.businessName}`);
        successCount++;
        
        // Small delay between updates
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        const errorMsg = `Failed to update ${sme.businessName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Now trigger the oracle to log the updated scores
    console.log('📝 Logging updated scores to reputation history...');
    await cardanoOracle.updateAllReputationScores();

    res.json({ 
      success: true,
      message: `Recalculated reputation scores for ${successCount}/${smes.length} SMEs`,
      successCount,
      totalSmes: smes.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Failed to update reputation:', error);
    res.status(500).json({ 
      error: 'Failed to update reputation scores',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/reputation/history/:smeId
 * Get reputation history for an SME
 */
router.get('/history/:smeId', async (req, res) => {
  try {
    const { smeId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const history = await prisma.reputationHistory.findMany({
      where: { smeId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        sme: {
          select: {
            businessName: true
          }
        }
      }
    });
    
    res.json({
      smeId,
      businessName: history[0]?.sme.businessName || 'Unknown',
      count: history.length,
      history: history.map(h => ({
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
 * GET /api/reputation/latest
 * Get latest reputation scores for all SMEs
 */
router.get('/latest', async (req, res) => {
  try {
    // Get latest reputation for each SME
    const latestScores = await prisma.reputationHistory.findMany({
      orderBy: { timestamp: 'desc' },
      distinct: ['smeId'],
      include: {
        sme: {
          select: {
            businessName: true
          }
        }
      }
    });
    
    res.json({
      count: latestScores.length,
      scores: latestScores.map((h: any) => ({
        smeId: h.smeId,
        businessName: h.sme.businessName,
        overallScore: h.overallScore,
        breakdown: {
          marketplace: h.marketplaceScore,
          feedback: h.feedbackScore,
          trust: h.platformTrustScore,
          financial: h.financialScore
        },
        timestamp: h.timestamp,
        onChain: !!h.cardanoTxHash
      }))
    });
  } catch (error) {
    console.error('Failed to get latest scores:', error);
    res.status(500).json({ error: 'Failed to get latest reputation scores' });
  }
});

export default router;
