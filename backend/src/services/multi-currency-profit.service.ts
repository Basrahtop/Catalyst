/**
 * Multi-Currency Profit Distribution Service
 * 
 * Handles profit share payments to investors in their preferred currency
 */

import { PrismaClient, Currency, InstallmentStatus, TransactionType } from '@prisma/client';
import { exchangeRateService } from './exchange-rate.service';
import { walletBalanceService } from './wallet-balance.service';
import { cardanoPaymentService } from '../cardano/services/cardano-payment.service';

const prisma = new PrismaClient();

interface ProfitSharePayment {
  investorId: string;
  shareId: string;
  amount: bigint;
  currency: Currency;
  installmentId: string;
}

interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

class MultiCurrencyProfitService {
  
  /**
   * Distribute profit shares for an installment in multiple currencies
   */
  async distributeInstallmentShares(installmentId: string): Promise<void> {
    const installment = await prisma.paymentInstallment.findUnique({
      where: { id: installmentId },
      include: {
        shares: {
          include: {
            investor: {
              include: {
                cardanoWallet: true,
              },
            },
            investment: true,
          },
        },
        request: {
          include: {
            sme: {
              include: {
                user: {
                  include: {
                    cardanoWallet: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!installment) {
      throw new Error('Installment not found');
    }

    if (installment.status !== InstallmentStatus.PAID) {
      throw new Error('Installment must be marked as paid before distributing shares');
    }

    if (!installment.reportedProfit) {
      throw new Error('No profit amount reported for this installment');
    }

    // Group shares by currency preference
    const sharesByCurrency = this.groupSharesByCurrency(installment.shares);

    // Process payments for each currency
    for (const [currency, shares] of Object.entries(sharesByCurrency)) {
      await this.processPaymentsForCurrency(
        currency as Currency,
        shares,
        installment.reportedProfit,
        installment.request.sme.userId
      );
    }

    // Update installment status to distributed
    await prisma.paymentInstallment.update({
      where: { id: installmentId },
      data: { status: InstallmentStatus.DISTRIBUTED },
    });
  }

  /**
   * Group shares by investor's preferred currency
   */
  private groupSharesByCurrency(shares: any[]) {
    const grouped: Record<Currency, any[]> = {
      [Currency.NGN]: [],
      [Currency.ADA]: [],
      [Currency.USDM]: [],
    };

    shares.forEach((share) => {
      // Use investment currency as preferred currency
      const currency = share.investment.currency || Currency.NGN;
      grouped[currency].push(share);
    });

    return grouped;
  }

  /**
   * Process all payments for a specific currency
   */
  private async processPaymentsForCurrency(
    currency: Currency,
    shares: any[],
    totalProfit: number,
    smeUserId: string
  ): Promise<void> {
    if (shares.length === 0) return;

    // Calculate total shares
    const totalShareAmount = shares.reduce(
      (sum, share) => sum + (share.shareAmount || 0),
      0
    );

    if (currency === Currency.NGN) {
      // NGN payments - platform managed
      await this.processNGNPayments(shares, smeUserId);
    } else {
      // ADA/USDM payments - blockchain
      await this.processCardanoPayments(currency, shares, smeUserId);
    }
  }

  /**
   * Process NGN profit share payments
   */
  private async processNGNPayments(shares: any[], smeUserId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const share of shares) {
        if (!share.shareAmount || share.shareAmount <= 0) continue;

        // Deduct from SME wallet
        await walletBalanceService.deductNGN(
          smeUserId,
          BigInt(share.shareAmount)
        );

        // Add to investor wallet
        await walletBalanceService.addNGN(
          share.investorId,
          BigInt(share.shareAmount)
        );

        // Create transaction record
        await tx.transaction.create({
          data: {
            senderId: smeUserId,
            recipientId: share.investorId,
            amount: BigInt(share.shareAmount),
            currency: Currency.NGN,
            type: TransactionType.PROFIT_SHARE,
            status: 'COMPLETED',
            installmentId: share.installmentId,
            notes: `Profit share payment`,
          },
        });

        // Update share status
        await tx.installmentShare.update({
          where: { id: share.id },
          data: {
            paidAt: new Date(),
            status: InstallmentStatus.PAID,
          },
        });
      }
    });
  }

  /**
   * Process ADA/USDM profit share payments via blockchain
   */
  private async processCardanoPayments(
    currency: Currency,
    shares: any[],
    smeUserId: string
  ): Promise<void> {
    // Get SME's Cardano wallet
    const smeWallet = await prisma.cardanoWallet.findUnique({
      where: { userId: smeUserId },
    });

    if (!smeWallet) {
      throw new Error('SME does not have a connected Cardano wallet');
    }

    // Prepare batch payment
    const payments: Array<{ address: string; amount: bigint }> = [];
    const shareMap = new Map<string, any>();

    for (const share of shares) {
      if (!share.shareAmount || share.shareAmount <= 0) continue;

      const investorWallet = share.investor.cardanoWallet;
      if (!investorWallet) {
        console.error(`Investor ${share.investorId} does not have a Cardano wallet`);
        continue;
      }

      // Convert NGN share amount to ADA/USDM
      const amountInCurrency = await exchangeRateService.convertFromNGN(
        BigInt(share.shareAmount),
        currency
      );

      payments.push({
        address: investorWallet.address,
        amount: amountInCurrency,
      });

      shareMap.set(investorWallet.address, share);
    }

    if (payments.length === 0) {
      console.log('No valid payments to process');
      return;
    }

    // Send batch payment on blockchain
    const txHash = await cardanoPaymentService.sendBatchPayment(
      smeWallet.address,
      payments,
      currency as 'ADA' | 'USDM'
    );

    // Record transactions in database
    await prisma.$transaction(async (tx) => {
      for (const payment of payments) {
        const share = shareMap.get(payment.address);
        if (!share) continue;

        // Create transaction record
        await tx.transaction.create({
          data: {
            senderId: smeUserId,
            recipientId: share.investorId,
            amount: payment.amount,
            currency,
            type: TransactionType.PROFIT_SHARE,
            status: 'COMPLETED',
            blockchainTxHash: txHash,
            installmentId: share.installmentId,
            notes: `Profit share payment (${currency})`,
          },
        });

        // Update share status
        await tx.installmentShare.update({
          where: { id: share.id },
          data: {
            paidAt: new Date(),
            status: InstallmentStatus.PAID,
          },
        });
      }
    });
  }

  /**
   * Get investor's profit history
   */
  async getInvestorProfitHistory(investorId: string) {
    const shares = await prisma.installmentShare.findMany({
      where: { investorId },
      include: {
        installment: {
          include: {
            request: {
              include: {
                sme: {
                  include: { user: true },
                },
              },
            },
          },
        },
        investment: true,
      },
      orderBy: {
        paidAt: 'desc',
      },
    });

    const totalsByCurrency = shares.reduce(
      (acc, share) => {
        const currency = share.investment.currency || Currency.NGN;
        const amount = share.shareAmount || 0;
        
        if (!acc[currency]) acc[currency] = 0;
        acc[currency] += amount;
        
        return acc;
      },
      {} as Record<Currency, number>
    );

    return {
      shares,
      totalsByCurrency,
      totalShares: shares.length,
      paidShares: shares.filter((s) => s.paidAt).length,
      unpaidShares: shares.filter((s) => !s.paidAt).length,
    };
  }

  /**
   * Calculate investor's expected profit share for an installment
   */
  async calculateInvestorShare(
    investorId: string,
    installmentId: string
  ): Promise<number> {
    const share = await prisma.installmentShare.findFirst({
      where: {
        investorId,
        installmentId,
      },
    });

    return share?.shareAmount || 0;
  }
}

export const multiCurrencyProfitService = new MultiCurrencyProfitService();
