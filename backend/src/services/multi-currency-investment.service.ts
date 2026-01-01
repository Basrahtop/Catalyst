/**
 * Multi-Currency Investment Service
 * 
 * Handles investment operations across NGN, ADA, and USDM currencies
 * - NGN: Direct wallet deduction (platform-managed)
 * - ADA/USDM: Lock funds in smart contract escrow
 */

import { PrismaClient, Currency, FundingStatus } from '@prisma/client';
import { walletBalanceService } from './wallet-balance.service';
import { exchangeRateService } from './exchange-rate.service';

const prisma = new PrismaClient();

interface InvestmentRequest {
  investorId: string;
  fundingRequestId: string;
  amount: bigint;  // Amount in smallest unit (kobo/lovelace/microUSDM)
  currency: Currency;
}

interface InvestmentResult {
  investmentId: string;
  txHash?: string;  // For ADA/USDM blockchain transactions
  escrowUtxo?: string;  // For ADA/USDM escrow UTXO reference
  amountInNGN: number;  // Converted amount for tracking
}

class MultiCurrencyInvestmentService {
  
  /**
   * Process an investment in any supported currency
   */
  async processInvestment(params: InvestmentRequest): Promise<InvestmentResult> {
    const { investorId, fundingRequestId, amount, currency } = params;

    // 1. Get current exchange rate
    const exchangeRate = await exchangeRateService.getRate(currency);
    
    // 2. Calculate NGN equivalent
    const amountInNGN = await this.calculateNGNEquivalent(amount, currency);

    // 3. Get funding request details
    const fundingRequest = await prisma.fundingRequest.findUnique({
      where: { id: fundingRequestId },
      include: { sme: { include: { user: true } } },
    });

    if (!fundingRequest) {
      throw new Error('Funding request not found');
    }

    // 4. CRITICAL: Check if funding request is already fully funded
    if (fundingRequest.amountFunded >= fundingRequest.amount) {
      throw new Error('This funding request is already fully funded and cannot accept more investments');
    }

    // 5. Check if investment would exceed remaining amount
    const remainingAmount = fundingRequest.amount - fundingRequest.amountFunded;
    if (amountInNGN > remainingAmount) {
      throw new Error(`Investment amount (₦${(amountInNGN / 100).toLocaleString()}) exceeds remaining amount needed (₦${(remainingAmount / 100).toLocaleString()})`);
    }

    // 5.5. Validate minimum investment amount (₦1 = 100 kobo)
    const MINIMUM_INVESTMENT_NGN = 100;
    if (currency === Currency.NGN && amountInNGN < MINIMUM_INVESTMENT_NGN) {
      throw new Error(`Minimum investment is ₦1.00. Remaining amount (₦${(remainingAmount / 100).toFixed(2)}) is too small.`);
    }

    // 6. Validate funding request accepts this currency
    if (!fundingRequest.acceptedCurrencies.includes(currency)) {
      throw new Error(`This funding request does not accept ${currency}`);
    }

    // 7. Check investor has sufficient balance
    const hasSufficient = await walletBalanceService.hasSufficientBalance(
      investorId,
      amount,
      currency
    );

    if (!hasSufficient) {
      throw new Error(`Insufficient ${currency} balance`);
    }

    // 8. Process investment based on currency type
    if (currency === Currency.NGN) {
      return await this.processNGNInvestment(params, amountInNGN, exchangeRate);
    } else {
      // For ADA/USDM, return error - client should use two-step flow
      throw new Error(`For ${currency} investments, please use the /api/cardano-investment/prepare endpoint for client-side wallet signing.`);
    }
  }

  /**
   * Process NGN investment (platform-managed)
   */
  private async processNGNInvestment(
    params: InvestmentRequest,
    amountInNGN: number,
    exchangeRate: number
  ): Promise<InvestmentResult> {
    const { investorId, fundingRequestId, amount } = params;

    return await prisma.$transaction(async (tx) => {
      // Deduct from investor's NGN wallet
      await walletBalanceService.deductNGN(investorId, amount);

      // Get SME details
      const fundingRequest = await tx.fundingRequest.findUnique({
        where: { id: fundingRequestId },
        include: { sme: { include: { user: true } } },
      });

      if (!fundingRequest) throw new Error('Funding request not found');

      // Add to SME's NGN wallet
      await walletBalanceService.addNGN(fundingRequest.sme.userId, amount);

      // Create investment record
      const investment = await tx.investment.create({
        data: {
          investorId,
          fundingRequestId,
          amount,
          currency: Currency.NGN,
          exchangeRateToNGN: exchangeRate,
          amountInNGN,
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          senderId: investorId,
          recipientId: fundingRequest.sme.userId,
          amount,
          currency: Currency.NGN,
          exchangeRateToNGN: exchangeRate,
          type: 'TRANSFER',
          status: 'COMPLETED',
          notes: `Investment in ${fundingRequest.sme.businessName}`,
        },
      });

      // Update funding request amount and status if fully funded
      const newAmountFunded = fundingRequest.amountFunded + amountInNGN;
      const isFullyFunded = newAmountFunded >= fundingRequest.amount;

      await tx.fundingRequest.update({
        where: { id: fundingRequestId },
        data: {
          amountFunded: {
            increment: amountInNGN,
          },
          // Auto-update status to APPROVED when fully funded
          status: isFullyFunded ? FundingStatus.APPROVED : fundingRequest.status,
        },
      });

      return {
        investmentId: investment.id,
        amountInNGN,
      };
    });
  }

  /**
   * Process ADA/USDM investment (smart contract escrow)
   */
  private async processCardanoInvestment(
    params: InvestmentRequest,
    amountInNGN: number,
    exchangeRate: number,
    fundingRequest: any
  ): Promise<InvestmentResult> {
    const { investorId, fundingRequestId, amount, currency } = params;

    // 1. Get investor's Cardano wallet address
    const cardanoWallet = await prisma.cardanoWallet.findUnique({
      where: { userId: investorId },
    });

    if (!cardanoWallet) {
      throw new Error('Please connect your Cardano wallet first');
    }

    // 2. Get SME's Cardano wallet address from database
    // Note: SME doesn't need active wallet connection to RECEIVE funds
    // They only need connection when SPENDING funds
    const smeCardanoWallet = await prisma.cardanoWallet.findUnique({
      where: { userId: fundingRequest.sme.userId },
    });

    if (!smeCardanoWallet || !smeCardanoWallet.address) {
      throw new Error('SME needs to register their Cardano wallet address first. Please contact SME to complete wallet setup.');
    }

    console.log(`[CardanoInvestment] Using SME's registered wallet: ${smeCardanoWallet.address.slice(0, 20)}...`);

    // 3. Lock funds in smart contract escrow
    const { investmentEscrowService } = await import('../cardano/services/investment-escrow.service');
    const txHash = await investmentEscrowService.lockFunds(
      cardanoWallet.address,
      smeCardanoWallet.address,
      amount,
      currency as 'ADA' | 'USDM',
      fundingRequestId
    );

    // 4. Create database records
    return await prisma.$transaction(async (tx) => {
      // Create investment record with blockchain reference
      const investment = await tx.investment.create({
        data: {
          investorId,
          fundingRequestId,
          amount,
          currency,
          exchangeRateToNGN: exchangeRate,
          amountInNGN,
          blockchainTxHash: txHash,
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          senderId: investorId,
          recipientId: fundingRequest.sme.userId,
          amount,
          currency,
          exchangeRateToNGN: exchangeRate,
          type: 'TRANSFER',
          status: 'COMPLETED',
          blockchainTxHash: txHash,
          notes: `Investment in ${fundingRequest.sme.businessName} (locked in escrow)`,
        },
      });

      // Update funding request amount
      await tx.fundingRequest.update({
        where: { id: fundingRequestId },
        data: {
          amountFunded: {
            increment: amountInNGN,
          },
        },
      });

      return {
        investmentId: investment.id,
        txHash,
        amountInNGN,
      };
    });
  }

  /**
   * Release escrow funds to SME (when funding request is approved/fully funded)
   */
  async releaseEscrowFunds(fundingRequestId: string): Promise<string[]> {
    // Get all ADA/USDM investments for this request
    const cardanoInvestments = await prisma.investment.findMany({
      where: {
        fundingRequestId,
        currency: { in: [Currency.ADA, Currency.USDM] },
      },
    });

    if (cardanoInvestments.length === 0) {
      return []; // No Cardano investments to release
    }

    // Release funds from escrow (oracle-authorized)
    const { investmentEscrowService } = await import('../cardano/services/investment-escrow.service');
    const txHash = await investmentEscrowService.releaseFunds(fundingRequestId);

    // Update investment records with release transaction
    await prisma.investment.updateMany({
      where: {
        fundingRequestId,
        currency: { in: [Currency.ADA, Currency.USDM] },
      },
      data: {
        releaseTxHash: txHash,
      },
    });

    return [txHash];
  }

  /**
   * Calculate NGN equivalent for any currency
   */
  private async calculateNGNEquivalent(amount: bigint, currency: Currency): Promise<number> {
    if (currency === Currency.NGN) {
      return Number(amount);
    }

    const amountInNGN = await exchangeRateService.convertToNGN(amount, currency);
    return Number(amountInNGN);
  }

  /**
   * Get investor's investment summary for a funding request
   */
  async getInvestorSummary(investorId: string, fundingRequestId: string) {
    const investments = await prisma.investment.findMany({
      where: {
        investorId,
        fundingRequestId,
      },
      include: {
        fundingRequest: {
          include: {
            sme: {
              include: { user: true },
            },
          },
        },
      },
    });

    const totalByCurrency = investments.reduce((acc, inv) => {
      const curr = inv.currency;
      acc[curr] = (acc[curr] || BigInt(0)) + BigInt(inv.amount);
      return acc;
    }, {} as Record<string, bigint>);

    const totalInNGN = investments.reduce((sum, inv) => sum + (inv.amountInNGN || 0), 0);

    return {
      investments,
      totalByCurrency,
      totalInNGN,
      investmentCount: investments.length,
    };
  }
}

export const multiCurrencyInvestmentService = new MultiCurrencyInvestmentService();
