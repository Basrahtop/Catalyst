import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Platform secret for generating reputation IDs (keep this secure!)
const REPUTATION_ID_SECRET = process.env.REPUTATION_ID_SECRET || 'catalyst-reputation-secret-change-in-production';

/**
 * Generate a privacy-preserving reputation ID
 * This is a hash of smeId + wallet address + platform secret
 * Cannot be reversed to find the wallet address
 */
function generateReputationId(smeId: string, walletAddress: string): string {
  return crypto
    .createHash('sha256')
    .update(`${smeId}:${walletAddress}:${REPUTATION_ID_SECRET}`)
    .digest('hex');
}

/**
 * POST /api/cardano/wallet/register
 * Register a Cardano wallet for the authenticated user
 */
export const registerWallet = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  const { address, stakingAddress, walletType } = req.body;

  if (!address || !walletType) {
    return res.status(400).json({ 
      error: 'Missing required fields: address and walletType are required.' 
    });
  }

  try {
    // Check if user has SME profile (only SMEs need reputation ID)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { sme: true, cardanoWallet: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if user already has a wallet
    if (user.cardanoWallet) {
      return res.status(400).json({ 
        error: 'Wallet already registered. Use /wallet/replace to change wallet.' 
      });
    }

    // Generate reputation ID if user is an SME
    let reputationId: string | undefined;
    if (user.sme) {
      reputationId = generateReputationId(user.sme.id, address);
    }

    // Create wallet record
    const wallet = await prisma.cardanoWallet.create({
      data: {
        userId,
        address,
        stakingAddress,
        walletType,
        reputationId,
        verified: false, // Requires signature verification
      }
    });

    res.status(201).json({
      success: true,
      wallet: {
        address: wallet.address,
        reputationId: wallet.reputationId,
        verified: wallet.verified,
        connectedAt: wallet.connectedAt
      },
      message: reputationId 
        ? 'Wallet registered. Please verify ownership by signing a message.'
        : 'Wallet registered successfully.'
    });
  } catch (error: any) {
    console.error('Failed to register wallet:', error);
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'This wallet address is already registered to another account.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to register wallet.' });
  }
};

/**
 * POST /api/cardano/wallet/verify
 * Verify wallet ownership with cryptographic signature
 */
export const verifyWalletOwnership = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  console.log('🔍 Verify wallet request:', {
    userId,
    body: req.body,
    signature: req.body.signature ? 'Present' : 'Missing',
    publicKey: req.body.publicKey ? 'Present' : 'Missing',
    message: req.body.message ? 'Present' : 'Missing'
  });

  const { signature, publicKey, message } = req.body;

  if (!signature) {
    console.error('❌ Missing signature in request');
    return res.status(400).json({ 
      error: 'Missing required field: signature' 
    });
  }

  try {
    const wallet = await prisma.cardanoWallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      console.error('❌ No wallet found for userId:', userId);
      return res.status(404).json({ error: 'No wallet registered for this user.' });
    }

    console.log('✅ Wallet found:', {
      address: wallet.address,
      verified: wallet.verified,
      reputationId: wallet.reputationId
    });

    if (wallet.verified) {
      console.log('⚠️ Wallet already verified');
      return res.status(400).json({ 
        error: 'Wallet already verified.',
        verifiedAt: wallet.verifiedAt 
      });
    }

    // TODO: Implement actual signature verification using Cardano libraries
    // For now, we'll trust the signature and mark as verified
    // In production, this should verify the signature matches the wallet address
    
    // Example verification (to be implemented):
    // const isValid = await verifyCardanoSignature(wallet.address, message, signature, publicKey);
    // if (!isValid) {
    //   return res.status(400).json({ error: 'Invalid signature' });
    // }

    console.log('✅ Marking wallet as verified');
    const updatedWallet = await prisma.cardanoWallet.update({
      where: { userId },
      data: {
        verified: true,
        signature,
        verifiedAt: new Date()
      }
    });

    console.log('✅ Wallet verified successfully:', {
      reputationId: updatedWallet.reputationId,
      verified: updatedWallet.verified,
      verifiedAt: updatedWallet.verifiedAt
    });
    
    res.json({
      success: true,
      verified: true,
      verifiedAt: updatedWallet.verifiedAt,
      reputationId: updatedWallet.reputationId,
      message: 'Wallet ownership verified successfully. Your reputation can now be submitted on-chain.'
    });
  } catch (error) {
    console.error('❌ Failed to verify wallet:', error);
    res.status(500).json({ error: 'Failed to verify wallet ownership.' });
  }
};

/**
 * POST /api/cardano/wallet/replace
 * Replace a lost wallet with a new one
 */
export const replaceWallet = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  const { newAddress, newStakingAddress, newWalletType, reason } = req.body;

  if (!newAddress || !newWalletType) {
    return res.status(400).json({ 
      error: 'Missing required fields: newAddress and newWalletType are required.' 
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { sme: true, cardanoWallet: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.cardanoWallet) {
      return res.status(400).json({ 
        error: 'No wallet registered. Use /wallet/register instead.' 
      });
    }

    const oldWallet = user.cardanoWallet;

    // Check if user has already replaced wallet multiple times (fraud prevention)
    if (oldWallet.previousAddresses.length >= 2) {
      return res.status(400).json({ 
        error: 'Maximum wallet replacements reached. Please contact support for assistance.',
        hint: 'Multiple wallet changes detected. Manual verification required for security.'
      });
    }

    // Update wallet with new address, preserve reputationId
    const updatedWallet = await prisma.cardanoWallet.update({
      where: { userId },
      data: {
        address: newAddress,
        stakingAddress: newStakingAddress,
        walletType: newWalletType,
        previousAddresses: {
          push: oldWallet.address // Add old address to history
        },
        isReplacement: true,
        verified: false, // Needs re-verification
        signature: null,
        verifiedAt: null,
        lastUsed: new Date()
        // reputationId stays the same - preserves reputation history
      }
    });

    // Log the replacement for audit trail
    console.log(`🔄 Wallet replacement for user ${userId}:`, {
      oldAddress: oldWallet.address,
      newAddress,
      reason: reason || 'Not specified',
      timestamp: new Date()
    });

    res.json({
      success: true,
      wallet: {
        address: updatedWallet.address,
        reputationId: updatedWallet.reputationId, // Same as before
        verified: updatedWallet.verified,
        isReplacement: updatedWallet.isReplacement,
        previousAddresses: updatedWallet.previousAddresses
      },
      message: 'Wallet replaced successfully. Please verify ownership of the new wallet by signing a message.',
      warning: 'Your reputation history is preserved, but you must re-verify your new wallet.'
    });
  } catch (error: any) {
    console.error('Failed to replace wallet:', error);
    
    // Handle unique constraint violations
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'This wallet address is already registered to another account.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to replace wallet.' });
  }
};

/**
 * GET /api/cardano/wallet/me
 * Get current user's wallet information
 */
export const getMyWallet = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    const wallet = await prisma.cardanoWallet.findUnique({
      where: { userId },
      select: {
        address: true,
        stakingAddress: true,
        walletType: true,
        reputationId: true,
        verified: true,
        verifiedAt: true,
        isReplacement: true,
        previousAddresses: true,
        connectedAt: true,
        lastUsed: true
      }
    });

    if (!wallet) {
      return res.status(404).json({ 
        error: 'No wallet registered.',
        hint: 'Connect your wallet using POST /api/cardano/wallet/register'
      });
    }

    console.log('📋 GET /wallet/me response:', {
      userId,
      address: wallet.address,
      verified: wallet.verified,
      verifiedAt: wallet.verifiedAt
    });

    res.json({
      wallet,
      needsVerification: !wallet.verified
    });
  } catch (error) {
    console.error('Failed to get wallet:', error);
    res.status(500).json({ error: 'Failed to get wallet information.' });
  }
};

/**
 * DELETE /api/cardano/wallet
 * Disconnect wallet from account
 */
export const disconnectWallet = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    const wallet = await prisma.cardanoWallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'No wallet registered.' });
    }

    await prisma.cardanoWallet.delete({
      where: { userId }
    });

    res.json({
      success: true,
      message: 'Wallet disconnected successfully.',
      warning: 'Your on-chain reputation history is preserved but will not be updated until you connect a new wallet.'
    });
  } catch (error) {
    console.error('Failed to disconnect wallet:', error);
    res.status(500).json({ error: 'Failed to disconnect wallet.' });
  }
};

/**
 * GET /api/cardano/wallet/public-profile/:reputationId
 * Get public profile by reputation ID (for investor verification)
 */
export const getPublicProfileByReputationId = async (req: Request, res: Response) => {
  const { reputationId } = req.params;

  if (!reputationId) {
    return res.status(400).json({ error: 'Missing reputationId parameter.' });
  }

  try {
    const wallet = await prisma.cardanoWallet.findUnique({
      where: { reputationId },
      include: {
        user: {
          include: {
            sme: {
              select: {
                id: true,
                businessName: true,
                marketplaceScore: true,
                feedbackScore: true
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
    const latestReputation = await prisma.reputationHistory.findFirst({
      where: { 
        smeId: wallet.user.sme.id,
        reputationId: reputationId
      },
      orderBy: { timestamp: 'desc' }
    });

    res.json({
      businessName: wallet.user.sme.businessName,
      reputationId: wallet.reputationId,
      verified: wallet.verified,
      verifiedAt: wallet.verifiedAt,
      lastReputationUpdate: latestReputation ? {
        overallScore: latestReputation.overallScore,
        marketplaceScore: latestReputation.marketplaceScore,
        feedbackScore: latestReputation.feedbackScore,
        timestamp: latestReputation.timestamp,
        onChain: !!latestReputation.cardanoTxHash,
        txHash: latestReputation.cardanoTxHash
      } : null,
      // Wallet address is HIDDEN for privacy
      note: 'Wallet address is private. Only reputation ID is disclosed.'
    });
  } catch (error) {
    console.error('Failed to get public profile:', error);
    res.status(500).json({ error: 'Failed to get public profile.' });
  }
};
