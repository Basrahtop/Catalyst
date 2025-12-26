import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { cardanoOracle } from '../cardano/services/oracle.service';

const prisma = new PrismaClient();

/**
 * POST /api/reputation/submit-onchain
 * Submit current reputation to Cardano blockchain
 */
export const submitReputationOnChain = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    // Check if user is an SME
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sme: true,
        cardanoWallet: true
      }
    });

    if (!user || !user.sme) {
      return res.status(403).json({ 
        error: 'Only SME accounts can submit reputation to blockchain.' 
      });
    }

    // Check if wallet is verified
    if (!user.cardanoWallet || !user.cardanoWallet.verified) {
      return res.status(400).json({ 
        error: 'You must have a verified Cardano wallet to submit reputation on-chain.',
        hint: 'Go to Wallet Management page to connect and verify your wallet.'
      });
    }

    // Check if Cardano integration is enabled
    if (!cardanoOracle.isReady()) {
      return res.status(503).json({ 
        error: 'Blockchain integration is currently unavailable.',
        hint: 'Your reputation is being tracked off-chain. Contact support if this persists.'
      });
    }

    console.log(`📤 Submitting reputation to blockchain for ${user.sme.businessName}...`);

    // Submit to blockchain
    const result = await cardanoOracle.submitReputationToBlockchain(user.sme.id);

    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to submit reputation to blockchain.',
        details: result.error
      });
    }

    res.json({
      success: true,
      message: 'Reputation successfully recorded on Cardano blockchain!',
      txHash: result.txHash,
      utxoRef: result.utxoRef,
      reputationId: user.cardanoWallet.reputationId,
      explorerUrl: `https://preprod.cardanoscan.io/transaction/${result.txHash}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Failed to submit reputation on-chain:', error);
    res.status(500).json({ 
      error: 'Failed to submit reputation to blockchain.',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * GET /api/reputation/onchain-history
 * Get on-chain reputation submission history for current user
 */
export const getOnChainHistory = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { sme: true }
    });

    if (!user || !user.sme) {
      return res.status(403).json({ error: 'Only SME accounts can view on-chain history.' });
    }

    // Get reputation history with on-chain submissions
    const history = await prisma.reputationHistory.findMany({
      where: { 
        smeId: user.sme.id,
        cardanoTxHash: { not: null } // Only on-chain submissions
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    });

    const formatted = history.map(entry => ({
      timestamp: entry.timestamp,
      overallScore: entry.overallScore,
      marketplaceScore: entry.marketplaceScore,
      feedbackScore: entry.feedbackScore,
      platformTrustScore: entry.platformTrustScore,
      financialScore: entry.financialScore,
      txHash: entry.cardanoTxHash,
      utxoRef: entry.cardanoUTxORef,
      explorerUrl: `https://preprod.cardanoscan.io/transaction/${entry.cardanoTxHash}`
    }));

    res.json({
      history: formatted,
      total: history.length
    });

  } catch (error) {
    console.error('Failed to get on-chain history:', error);
    res.status(500).json({ error: 'Failed to retrieve on-chain history.' });
  }
};

/**
 * GET /api/reputation/verify/:reputationId
 * Verify reputation from blockchain (public endpoint)
 */
export const verifyReputationFromBlockchain = async (req: Request, res: Response) => {
  const { reputationId } = req.params;

  if (!reputationId) {
    return res.status(400).json({ error: 'Missing reputationId parameter.' });
  }

  try {
    // Find wallet by reputation ID
    const wallet = await prisma.cardanoWallet.findUnique({
      where: { reputationId },
      include: {
        user: {
          include: {
            sme: {
              select: {
                id: true,
                businessName: true
              }
            }
          }
        }
      }
    });

    if (!wallet || !wallet.user.sme) {
      return res.status(404).json({ 
        error: 'No business found with this reputation ID.',
        hint: 'This reputation ID may not be registered or may belong to a non-SME user.'
      });
    }

    // Get latest on-chain reputation
    const latestOnChain = await prisma.reputationHistory.findFirst({
      where: { 
        smeId: wallet.user.sme.id,
        cardanoTxHash: { not: null }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (!latestOnChain) {
      return res.status(404).json({ 
        error: 'No on-chain reputation found for this business.',
        hint: 'The business may not have submitted their reputation to the blockchain yet.'
      });
    }

    // Fetch actual data from blockchain to verify it's truly stored
    let blockchainData = null;
    if (latestOnChain.cardanoUTxORef) {
      const result = await cardanoOracle.fetchReputationFromBlockchain(latestOnChain.cardanoUTxORef);
      if (result.success && result.data) {
        blockchainData = result.data;
        console.log('✅ Verified reputation data directly from blockchain');
      } else {
        console.warn('⚠️ Could not fetch blockchain data:', result.error);
      }
    }

    res.json({
      businessName: wallet.user.sme.businessName,
      reputationId: wallet.reputationId,
      verified: wallet.verified,
      reputation: {
        overallScore: latestOnChain.overallScore,
        marketplaceScore: latestOnChain.marketplaceScore,
        feedbackScore: latestOnChain.feedbackScore,
        platformTrustScore: latestOnChain.platformTrustScore,
        financialScore: latestOnChain.financialScore,
        lastUpdated: latestOnChain.timestamp,
        txHash: latestOnChain.cardanoTxHash,
        utxoRef: latestOnChain.cardanoUTxORef,
        explorerUrl: `https://preprod.cardanoscan.io/transaction/${latestOnChain.cardanoTxHash}`
      },
      // Include actual blockchain data if successfully fetched
      blockchainVerification: blockchainData ? {
        verified: true,
        message: 'Data successfully verified directly from Cardano blockchain',
        onChainData: blockchainData
      } : {
        verified: false,
        message: 'Could not verify from blockchain (UTxO may be spent or not confirmed)'
      }
    });

  } catch (error) {
    console.error('Failed to verify reputation:', error);
    res.status(500).json({ error: 'Failed to verify reputation from blockchain.' });
  }
};

/**
 * Verify reputation by transaction hash (simpler - just copy from explorer)
 * GET /api/reputation/verify-tx/:txHash
 * Public endpoint - no authentication required
 */
export const verifyByTransactionHash = async (req: Request, res: Response) => {
  const { txHash } = req.params;

  if (!txHash) {
    return res.status(400).json({ error: 'Missing txHash parameter.' });
  }

  try {
    // Find the reputation record by transaction hash
    const reputationRecord = await prisma.reputationHistory.findFirst({
      where: { cardanoTxHash: txHash },
      include: {
        sme: {
          select: {
            id: true,
            businessName: true,
            user: {
              select: {
                cardanoWallet: {
                  select: {
                    reputationId: true,
                    verified: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!reputationRecord || !reputationRecord.sme.user.cardanoWallet) {
      return res.status(404).json({
        error: 'No reputation found for this transaction hash.',
        hint: 'This may not be a valid reputation transaction.'
      });
    }

    // Fetch actual data from blockchain
    let blockchainData = null;
    if (reputationRecord.cardanoUTxORef) {
      const result = await cardanoOracle.fetchReputationFromBlockchain(reputationRecord.cardanoUTxORef);
      if (result.success && result.data) {
        blockchainData = result.data;
        console.log('✅ Verified reputation data directly from blockchain');
      } else {
        console.warn('⚠️ Could not fetch blockchain data:', result.error);
      }
    }

    res.json({
      businessName: reputationRecord.sme.businessName,
      reputationId: reputationRecord.sme.user.cardanoWallet.reputationId,
      verified: reputationRecord.sme.user.cardanoWallet.verified,
      reputation: {
        overallScore: reputationRecord.overallScore,
        marketplaceScore: reputationRecord.marketplaceScore,
        feedbackScore: reputationRecord.feedbackScore,
        platformTrustScore: reputationRecord.platformTrustScore,
        financialScore: reputationRecord.financialScore,
        lastUpdated: reputationRecord.timestamp,
        txHash: reputationRecord.cardanoTxHash,
        utxoRef: reputationRecord.cardanoUTxORef,
        explorerUrl: `https://preprod.cardanoscan.io/transaction/${reputationRecord.cardanoTxHash}`
      },
      blockchainVerification: blockchainData ? {
        verified: true,
        message: 'Data successfully verified directly from Cardano blockchain',
        onChainData: blockchainData
      } : {
        verified: false,
        message: 'Could not verify from blockchain (UTxO may be spent or not confirmed)'
      }
    });

  } catch (error) {
    console.error('Failed to verify by transaction hash:', error);
    res.status(500).json({ error: 'Failed to verify reputation by transaction hash.' });
  }
};

/**
 * Get raw blockchain data using Blockfrost
 * GET /api/reputation/blockfrost/:utxoRef
 * Returns the raw UTxO data that anyone can independently verify
 */
export const getBlockfrostData = async (req: Request, res: Response) => {
  const { utxoRef } = req.params;

  if (!utxoRef) {
    return res.status(400).json({ error: 'Missing utxoRef parameter (format: txHash#index).' });
  }

  try {
    const [txHash, outputIndex] = utxoRef.split('#');
    
    const blockfrostUrl = process.env.BLOCKFROST_URL;
    const blockfrostKey = process.env.BLOCKFROST_API_KEY;

    if (!blockfrostUrl || !blockfrostKey) {
      return res.status(500).json({ error: 'Blockfrost not configured' });
    }

    // Fetch UTxO data from Blockfrost
    const response = await fetch(`${blockfrostUrl}/txs/${txHash}/utxos`, {
      headers: {
        'project_id': blockfrostKey
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: 'Failed to fetch from Blockfrost',
        details: await response.text()
      });
    }

    const data = await response.json();
    const output = data.outputs[parseInt(outputIndex)];

    if (!output) {
      return res.status(404).json({ error: 'UTxO not found' });
    }

    res.json({
      message: 'Raw blockchain data from Blockfrost API',
      utxoRef,
      txHash,
      outputIndex: parseInt(outputIndex),
      blockfrostUrl: `${blockfrostUrl}/txs/${txHash}/utxos`,
      data: output,
      explorerUrl: `https://preprod.cardanoscan.io/transaction/${txHash}`,
      instructions: {
        datum: 'The datum field contains the encoded reputation data',
        verification: 'Anyone can independently verify this data by querying Blockfrost directly'
      }
    });

  } catch (error) {
    console.error('Failed to fetch Blockfrost data:', error);
    res.status(500).json({ error: 'Failed to fetch blockchain data.' });
  }
};
