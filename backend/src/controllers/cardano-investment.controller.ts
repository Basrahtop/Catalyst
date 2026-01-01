/**
 * Cardano Investment Controller
 * 
 * Handles two-step investment flow for ADA/USDM:
 * 1. Prepare: Returns transaction parameters for client-side signing
 * 2. Confirm: Records investment after blockchain transaction is signed
 */

import { Request, Response } from 'express';
import { PrismaClient, Currency, FundingStatus } from '@prisma/client';
import { exchangeRateService } from '../services/exchange-rate.service';
import { createPaymentSchedule } from '../utils/payment-schedule';

const prisma = new PrismaClient();

// Escrow contract address (from deployed Aiken contract)
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS || 
  'addr_test1wph84dqvrlev2vztmeznfcfzrjcczg6z3j4n3x90cwn5xsg5rn5rh';

// Oracle wallet address for datum (use escrow address as placeholder)
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS || 
  'addr_test1wph84dqvrlev2vztmeznfcfzrjcczg6z3j4n3x90cwn5xsg5rn5rh';

/**
 * POST /api/cardano-investment/prepare
 * 
 * Returns transaction building parameters for client-side signing
 */
export const prepareCardanoInvestment = async (req: Request, res: Response) => {
  const userId = req.userId;
  
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  const { fundingRequestId, amount, currency } = req.body;

  if (!fundingRequestId || !amount || !currency) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  if (currency !== Currency.ADA && currency !== Currency.USDM) {
    return res.status(400).json({ error: 'Only ADA and USDM supported for Cardano investments.' });
  }

  try {
    // 1. Get funding request
    const fundingRequest = await prisma.fundingRequest.findUnique({
      where: { id: fundingRequestId },
      include: { sme: { include: { user: true } } },
    });

    if (!fundingRequest) {
      return res.status(404).json({ error: 'Funding request not found.' });
    }

    // 2. CRITICAL: Check if request is already fully funded
    if (fundingRequest.amountFunded >= fundingRequest.amount) {
      return res.status(400).json({ error: 'This funding request is already fully funded and cannot accept more investments.' });
    }

    if (!fundingRequest.acceptedCurrencies.includes(currency)) {
      return res.status(400).json({ 
        error: `This funding request does not accept ${currency}. Please choose from: ${fundingRequest.acceptedCurrencies.join(', ')}` 
      });
    }

    // 3. Check if request can accept more funding
    const remainingAmount = fundingRequest.amount - fundingRequest.amountFunded;
    if (remainingAmount <= 0) {
      return res.status(400).json({ error: 'Funding request is already fully funded.' });
    }

    // 4. Get exchange rate
    const exchangeRate = await exchangeRateService.getRate(currency);

    // 5. Calculate NGN equivalent
    let amountInNGN = currency === Currency.ADA
      ? Math.floor(Number(amount) * exchangeRate / 1_000_000) // lovelace to ADA to NGN
      : Math.floor(Number(amount) * exchangeRate / 1_000_000); // microUSDM to USDM to NGN

    // FIX: If very close to remaining (within ₦1), round up to match exactly
    // This prevents tiny remainder investments like ₦0.01 due to exchange rate rounding
    const difference = remainingAmount - amountInNGN;
    if (difference > 0 && difference <= 100) { // 100 kobo = ₦1
      console.log(`[CardanoInvestment] Rounding up from ₦${(amountInNGN/100).toFixed(2)} to ₦${(remainingAmount/100).toFixed(2)} to prevent tiny remainder`);
      amountInNGN = remainingAmount;
    }

    // 6. Validate minimum investment amount (₦1 = 100 kobo)
    const MINIMUM_INVESTMENT_NGN = 100; // ₦1
    if (amountInNGN < MINIMUM_INVESTMENT_NGN) {
      return res.status(400).json({ 
        error: `Minimum investment is ₦1.00. The remaining amount (₦${(remainingAmount / 100).toFixed(2)}) is too small. Please contact support.` 
      });
    }

    // 7. Validate amount doesn't exceed remaining
    if (amountInNGN > remainingAmount) {
      return res.status(400).json({ 
        error: `Investment amount (₦${(amountInNGN / 100).toLocaleString()}) exceeds remaining amount needed (₦${(remainingAmount / 100).toLocaleString()}).` 
      });
    }

    // 8. Get investor's Cardano wallet
    const investorWallet = await prisma.cardanoWallet.findUnique({
      where: { userId },
    });

    if (!investorWallet) {
      return res.status(400).json({ error: 'Please connect your Cardano wallet first.' });
    }

    // 8. Get SME's Cardano wallet
    const smeWallet = await prisma.cardanoWallet.findUnique({
      where: { userId: fundingRequest.sme.userId },
    });

    if (!smeWallet || !smeWallet.address) {
      return res.status(400).json({ 
        error: 'SME has not registered their Cardano wallet. Please contact SME.' 
      });
    }

    // 9. Return transaction parameters for client-side building
    res.status(200).json({
      // Wallet addresses
      investorAddress: investorWallet.address,
      smeAddress: smeWallet.address,
      escrowAddress: ESCROW_CONTRACT_ADDRESS,
      oracleAddress: ORACLE_ADDRESS,
      
      // Transaction details
      amount: amount.toString(), // bigint as string
      currency,
      fundingRequestId,
      
      // Exchange rate info
      exchangeRate,
      amountInNGN,
      
      // Datum parameters
      expiryTime: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: Date.now(),
      
      // Funding request info
      smeBusinessName: fundingRequest.sme.businessName,
      purpose: fundingRequest.purpose,
    });

  } catch (error: any) {
    console.error('Error preparing Cardano investment:', error);
    res.status(500).json({ error: error.message || 'Failed to prepare investment.' });
  }
};

/**
 * POST /api/cardano-investment/confirm
 * 
 * Records investment after user signs transaction with their wallet
 */
export const confirmCardanoInvestment = async (req: Request, res: Response) => {
  const userId = req.userId;
  
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  const { 
    fundingRequestId, 
    amount, 
    currency, 
    txHash,
    exchangeRate,
    amountInNGN 
  } = req.body;

  if (!fundingRequestId || !amount || !currency || !txHash) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Create investment record in database
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get funding request
      const fundingRequest = await tx.fundingRequest.findUnique({
        where: { id: fundingRequestId },
        include: { sme: { include: { user: true } } },
      });

      if (!fundingRequest) {
        throw new Error('Funding request not found.');
      }

      // 2. CRITICAL: Double-check if request is already fully funded
      if (fundingRequest.amountFunded >= fundingRequest.amount) {
        throw new Error('This funding request is already fully funded and cannot accept more investments.');
      }

      // 3. Verify amount doesn't exceed remaining
      const remainingAmount = fundingRequest.amount - fundingRequest.amountFunded;
      if (amountInNGN > remainingAmount) {
        throw new Error(`Investment amount exceeds remaining amount needed.`);
      }

      // 4. Create investment record
      const investment = await tx.investment.create({
        data: {
          investorId: userId,
          fundingRequestId,
          amount: BigInt(amount),
          currency,
          exchangeRateToNGN: exchangeRate,
          amountInNGN,
          blockchainTxHash: txHash,
        },
      });

      // 5. Create transaction record
      await tx.transaction.create({
        data: {
          senderId: userId,
          recipientId: fundingRequest.sme.userId,
          amount: BigInt(amount),
          currency,
          exchangeRateToNGN: exchangeRate,
          type: 'TRANSFER',
          status: 'COMPLETED',
          blockchainTxHash: txHash,
          notes: `Investment in ${fundingRequest.sme.businessName} (locked in escrow)`,
        },
      });

      // 6. Update funding request and check if fully funded
      const newAmountFunded = fundingRequest.amountFunded + amountInNGN;
      const isFullyFunded = newAmountFunded >= fundingRequest.amount;

      const updatedRequest = await tx.fundingRequest.update({
        where: { id: fundingRequestId },
        data: {
          amountFunded: {
            increment: amountInNGN,
          },
          // Auto-update status to APPROVED when fully funded
          status: isFullyFunded ? FundingStatus.APPROVED : fundingRequest.status,
        },
      });

      return { investment, fundingRequest: updatedRequest };
    });

    console.log(`[CardanoInvestment] Investment confirmed: ${txHash.slice(0, 20)}...`);

    // If fully funded, create payment schedule
    if (result.fundingRequest.amountFunded >= result.fundingRequest.amount) {
      console.log(`[CardanoInvestment] Funding complete for request ${fundingRequestId}. Creating payment schedule...`);
      
      // Check if payment schedule already exists
      const existingSchedule = await prisma.paymentInstallment.findFirst({
        where: { requestId: fundingRequestId },
      });

      if (!existingSchedule) {
        // Get full request details for schedule creation
        const fullRequest = await prisma.fundingRequest.findUnique({
          where: { id: fundingRequestId },
        });

        if (fullRequest) {
          console.log(`[CardanoInvestment] Starting schedule creation...`);
          try {
            await prisma.$transaction(async (tx) => {
              await createPaymentSchedule(fullRequest, tx);
            });
            console.log(`[CardanoInvestment] ✅ Payment schedule created successfully for request ${fundingRequestId}`);
          } catch (scheduleError: any) {
            console.error(`[CardanoInvestment] ❌ Schedule creation FAILED:`, scheduleError.message);
            console.error(`[CardanoInvestment] Stack:`, scheduleError.stack);
            // Log but don't fail the investment - schedule can be created manually
            console.error(`[CardanoInvestment] ⚠️ Investment recorded but schedule creation failed. Manual intervention required.`);
          }
        }
      } else {
        console.log(`[CardanoInvestment] ⏭️ Payment schedule already exists for request ${fundingRequestId}`);
      }
    }

    res.status(200).json({
      message: 'Investment confirmed successfully!',
      investmentId: result.investment.id,
      txHash,
      fundingRequest: result.fundingRequest,
    });

  } catch (error: any) {
    console.error('Error confirming Cardano investment:', error);
    res.status(500).json({ error: error.message || 'Failed to confirm investment.' });
  }
};
