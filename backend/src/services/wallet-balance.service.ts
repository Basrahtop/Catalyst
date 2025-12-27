/**
 * Wallet Balance Service
 * 
 * Provides unified view of user balances across:
 * - NGN: Queried from database (platform-managed)
 * - ADA/USDM: Queried from connected Cardano wallet (blockchain-live)
 */

import { PrismaClient, Currency } from '@prisma/client';

const prisma = new PrismaClient();

interface WalletBalance {
  NGN: bigint;    // Platform balance in kobo
  ADA: bigint;    // Live blockchain balance in lovelace
  USDM: bigint;   // Live blockchain balance in microUSDM
}

interface WalletBalanceDisplay {
  NGN: string;    // e.g., "₦1,234.56"
  ADA: string;    // e.g., "123.45 ADA"
  USDM: string;   // e.g., "1,234.56 USDM"
}

class WalletBalanceService {
  private readonly USDM_POLICY_ID = process.env.USDM_POLICY_ID || 'c48cbb3d5e57ed56e276bc45f99ab39abe94e6cd7ac39fb402da47ad';
  private readonly USDM_ASSET_NAME = process.env.USDM_ASSET_NAME || '0014df105553444d';

  /**
   * Get user's complete wallet balance (NGN from DB + ADA/USDM from blockchain)
   */
  async getUserBalance(userId: string): Promise<WalletBalance> {
    // Get NGN balance from database
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    const balanceNGN = wallet?.balanceNGN || BigInt(0);

    // Get Cardano wallet address
    const cardanoWallet = await prisma.cardanoWallet.findUnique({
      where: { userId },
    });

    if (!cardanoWallet) {
      // User hasn't connected Cardano wallet yet
      return {
        NGN: balanceNGN,
        ADA: BigInt(0),
        USDM: BigInt(0),
      };
    }

    // Query live blockchain balance
    const { ADA, USDM } = await this.getCardanoBalance(cardanoWallet.address);

    return {
      NGN: balanceNGN,
      ADA,
      USDM,
    };
  }

  /**
   * Get live ADA and USDM balance from Cardano blockchain
   * Uses the existing cardano-payment.service.ts for blockchain queries
   */
  async getCardanoBalance(walletAddress: string): Promise<{ ADA: bigint; USDM: bigint }> {
    try {
      // Import dynamically to avoid initialization issues
      const { cardanoPaymentService } = await import('../cardano/services/cardano-payment.service');
      
      // Use the existing service to query blockchain balance
      const balance = await cardanoPaymentService.getAddressBalance(walletAddress);
      
      return {
        ADA: balance.ada,
        USDM: balance.usdm,
      };
    } catch (error: any) {
      console.error(`[WalletBalance] Error fetching Cardano balance for ${walletAddress}:`, error.message);
      return { ADA: BigInt(0), USDM: BigInt(0) };
    }
  }

  /**
   * Get balance for display (formatted strings)
   */
  async getUserBalanceDisplay(userId: string): Promise<WalletBalanceDisplay> {
    const balance = await this.getUserBalance(userId);

    return {
      NGN: this.formatNGN(balance.NGN),
      ADA: this.formatADA(balance.ADA),
      USDM: this.formatUSDM(balance.USDM),
    };
  }

  /**
   * Check if user has sufficient balance in a specific currency
   */
  async hasSufficientBalance(
    userId: string,
    amount: bigint,
    currency: Currency
  ): Promise<boolean> {
    const balance = await this.getUserBalance(userId);

    switch (currency) {
      case Currency.NGN:
        return balance.NGN >= amount;
      case Currency.ADA:
        return balance.ADA >= amount;
      case Currency.USDM:
        return balance.USDM >= amount;
      default:
        return false;
    }
  }

  /**
   * Deduct NGN balance (platform-managed)
   * NOTE: ADA/USDM are handled via smart contracts, not database updates
   */
  async deductNGN(userId: string, amount: bigint): Promise<void> {
    await prisma.wallet.update({
      where: { userId },
      data: {
        balanceNGN: {
          decrement: amount,
        },
      },
    });
  }

  /**
   * Add NGN balance (platform-managed)
   */
  async addNGN(userId: string, amount: bigint): Promise<void> {
    await prisma.wallet.update({
      where: { userId },
      data: {
        balanceNGN: {
          increment: amount,
        },
      },
    });
  }

  /**
   * Format NGN for display
   */
  private formatNGN(kobo: bigint): string {
    const naira = Number(kobo) / 100;
    return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Format ADA for display
   */
  private formatADA(lovelace: bigint): string {
    const ada = Number(lovelace) / 1_000_000;
    return `${ada.toFixed(6)} ADA`;
  }

  /**
   * Format USDM for display
   */
  private formatUSDM(microUSDM: bigint): string {
    const usdm = Number(microUSDM) / 1_000_000;
    return `${usdm.toFixed(2)} USDM`;
  }

  /**
   * Refresh Cardano wallet connection (for when user reconnects wallet)
   */
  async refreshCardanoWallet(userId: string, walletAddress: string, walletType: string): Promise<void> {
    await prisma.cardanoWallet.upsert({
      where: { userId },
      create: {
        userId,
        address: walletAddress,
        walletType,
        connectedAt: new Date(),
        lastUsed: new Date(),
      },
      update: {
        address: walletAddress,
        walletType,
        lastUsed: new Date(),
      },
    });
  }
}

export const walletBalanceService = new WalletBalanceService();
