/**
 * Cardano Payment Service
 * 
 * Handles sending ADA and USDM payments to investors for profit distribution.
 */

import { Lucid, Blockfrost, TxHash, fromText, toUnit } from 'lucid-cardano';
import { Currency } from '@prisma/client';

// USDM Token Policy (Mehen Stablecoin)
const USDM_POLICY_ID = process.env.USDM_POLICY_ID || 'f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b69880';
const USDM_ASSET_NAME = 'USDM';

export class CardanoPaymentService {
  private lucid: Lucid | null = null;

  /**
   * Initialize Lucid instance with Blockfrost provider
   */
  async initLucid(): Promise<Lucid> {
    if (this.lucid) return this.lucid;

    const blockfrostUrl = process.env.BLOCKFROST_URL || 'https://cardano-preprod.blockfrost.io/api/v0';
    const blockfrostApiKey = process.env.BLOCKFROST_API_KEY;

    if (!blockfrostApiKey) {
      throw new Error('BLOCKFROST_API_KEY not configured');
    }

    this.lucid = await Lucid.new(
      new Blockfrost(blockfrostUrl, blockfrostApiKey),
      'Preprod'
    );

    // Load platform wallet for sending payments
    const platformSeedPhrase = process.env.ORACLE_WALLET_SEED_PHRASE; // Reuse oracle wallet for now
    if (platformSeedPhrase) {
      this.lucid.selectWalletFromSeed(platformSeedPhrase);
    }

    return this.lucid;
  }

  /**
   * Send ADA or USDM payment to investor
   * 
   * @param recipientAddress - Investor's Cardano wallet address
   * @param amount - Amount in smallest unit (lovelace for ADA, microUSDM for USDM)
   * @param currency - "ADA" or "USDM"
   * @param memo - Optional transaction memo/note
   * @returns Transaction hash
   */
  async sendPayment(
    recipientAddress: string,
    amount: bigint,
    currency: 'ADA' | 'USDM',
    memo?: string
  ): Promise<TxHash> {
    const lucid = await this.initLucid();

    // Validate recipient address
    try {
      lucid.utils.getAddressDetails(recipientAddress);
    } catch (error) {
      throw new Error(`Invalid recipient address: ${recipientAddress}`);
    }

    let tx = lucid.newTx();

    if (currency === 'ADA') {
      // Send native ADA
      tx = tx.payToAddress(recipientAddress, { lovelace: amount });
    } else if (currency === 'USDM') {
      // Send USDM token
      const usdmUnit = toUnit(USDM_POLICY_ID, fromText(USDM_ASSET_NAME));
      tx = tx.payToAddress(recipientAddress, {
        lovelace: BigInt(2000000), // Min ADA required with tokens
        [usdmUnit]: amount,
      });
    } else {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    // Add memo as metadata if provided
    if (memo) {
      tx = tx.attachMetadata(674, { msg: [memo] });
    }

    const completedTx = await tx.complete();
    const signedTx = await completedTx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[Payment] Sent ${amount} ${currency} to ${recipientAddress}`);
    console.log(`[Payment] TxHash: ${txHash}`);

    return txHash;
  }

  /**
   * Send batch payments to multiple investors (more efficient)
   * 
   * @param payments - Array of payment details
   * @returns Transaction hash
   */
  async sendBatchPayments(
    payments: Array<{
      address: string;
      amount: bigint;
      currency: 'ADA' | 'USDM';
      memo?: string;
    }>
  ): Promise<TxHash> {
    const lucid = await this.initLucid();

    let tx = lucid.newTx();

    // Add all outputs to single transaction
    for (const payment of payments) {
      if (payment.currency === 'ADA') {
        tx = tx.payToAddress(payment.address, { lovelace: payment.amount });
      } else if (payment.currency === 'USDM') {
        const usdmUnit = toUnit(USDM_POLICY_ID, fromText(USDM_ASSET_NAME));
        tx = tx.payToAddress(payment.address, {
          lovelace: BigInt(2000000),
          [usdmUnit]: payment.amount,
        });
      }
    }

    // Add batch metadata
    const memos = payments
      .filter((p) => p.memo)
      .map((p) => `${p.address.slice(0, 10)}...: ${p.memo}`);
    
    if (memos.length > 0) {
      tx = tx.attachMetadata(674, { msg: memos });
    }

    const completedTx = await tx.complete();
    const signedTx = await completedTx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[Payment] Batch payment sent to ${payments.length} recipients`);
    console.log(`[Payment] TxHash: ${txHash}`);

    return txHash;
  }

  /**
   * Get platform wallet balance
   */
  async getWalletBalance(): Promise<{
    ada: bigint;
    usdm: bigint;
    address: string;
  }> {
    const lucid = await this.initLucid();
    const utxos = await lucid.wallet.getUtxos();
    const address = await lucid.wallet.address();

    let totalAda = BigInt(0);
    let totalUsdm = BigInt(0);

    for (const utxo of utxos) {
      totalAda += utxo.assets.lovelace || BigInt(0);

      const usdmUnit = toUnit(USDM_POLICY_ID, fromText(USDM_ASSET_NAME));
      totalUsdm += utxo.assets[usdmUnit] || BigInt(0);
    }

    return { ada: totalAda, usdm: totalUsdm, address };
  }

  /**
   * Get balance for any Cardano address (not just platform wallet)
   * Used to query user's connected wallet balance
   */
  async getAddressBalance(walletAddress: string): Promise<{
    ada: bigint;
    usdm: bigint;
  }> {
    const lucid = await this.initLucid();
    const utxos = await lucid.provider.getUtxos(walletAddress);

    let totalAda = BigInt(0);
    let totalUsdm = BigInt(0);

    for (const utxo of utxos) {
      totalAda += utxo.assets.lovelace || BigInt(0);

      const usdmUnit = toUnit(USDM_POLICY_ID, fromText(USDM_ASSET_NAME));
      totalUsdm += utxo.assets[usdmUnit] || BigInt(0);
    }

    return { ada: totalAda, usdm: totalUsdm };
  }

  /**
   * Check if address has sufficient balance
   */
  async checkBalance(
    requiredAmount: bigint,
    currency: 'ADA' | 'USDM'
  ): Promise<boolean> {
    const balance = await this.getWalletBalance();

    if (currency === 'ADA') {
      return balance.ada >= requiredAmount;
    } else {
      return balance.usdm >= requiredAmount;
    }
  }

  /**
   * Get transaction details from blockchain
   */
  async getTransactionDetails(txHash: string): Promise<any> {
    const lucid = await this.initLucid();
    const provider = lucid.provider as Blockfrost;
    
    try {
      const txDetails = await provider.getTransaction(txHash);
      return txDetails;
    } catch (error) {
      console.error(`[Payment] Failed to fetch tx ${txHash}:`, error);
      throw error;
    }
  }
}

export const cardanoPaymentService = new CardanoPaymentService();
