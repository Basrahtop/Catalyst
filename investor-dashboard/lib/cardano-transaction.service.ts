/**
 * Cardano Transaction Service
 * 
 * Handles client-side transaction building and signing for ADA/USDM investments
 * Uses Lucid-Cardano library with user's connected wallet
 */

import { Lucid, Blockfrost, Data, fromText, toUnit, UTxO } from 'lucid-cardano';

// USDM Token Policy (Mehen Stablecoin on Preprod)
const USDM_POLICY_ID = 'f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b69880';
const USDM_ASSET_NAME = 'USDM';

// Investment Datum structure (matches Aiken contract)
const InvestmentDatumSchema = Data.Object({
  investor_pkh: Data.Bytes(),
  sme_pkh: Data.Bytes(),
  oracle_pkh: Data.Bytes(),
  amount: Data.Integer(),
  currency: Data.Bytes(),
  funding_request_id: Data.Bytes(),
  created_at: Data.Integer(),
  expiry_time: Data.Integer(),
});

type InvestmentDatum = Data.Static<typeof InvestmentDatumSchema>;

export interface CardanoInvestmentParams {
  investorAddress: string;
  smeAddress: string;
  escrowAddress: string;
  oracleAddress: string;
  amount: string; // bigint as string
  currency: 'ADA' | 'USDM';
  fundingRequestId: string;
  createdAt: number;
  expiryTime: number;
}

export class CardanoTransactionService {
  private lucid: Lucid | null = null;

  /**
   * Initialize Lucid with Blockfrost and user's wallet
   */
  async initLucid(walletApi: any): Promise<Lucid> {
    if (this.lucid) return this.lucid;

    const blockfrostUrl = process.env.NEXT_PUBLIC_BLOCKFROST_URL || 
      'https://cardano-preprod.blockfrost.io/api/v0';
    const blockfrostApiKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY;

    console.log('[CardanoTx] Blockfrost URL:', blockfrostUrl);
    console.log('[CardanoTx] API Key exists:', !!blockfrostApiKey);

    if (!blockfrostApiKey) {
      throw new Error('Blockfrost API key not configured. Please add NEXT_PUBLIC_BLOCKFROST_API_KEY to .env.local file and restart the dev server.');
    }

    this.lucid = await Lucid.new(
      new Blockfrost(blockfrostUrl, blockfrostApiKey),
      'Preprod'
    );

    // Select user's wallet (from Nami, Eternl, etc.)
    this.lucid.selectWallet(walletApi);

    return this.lucid;
  }

  /**
   * Build and sign escrow lock transaction
   * 
   * @returns Transaction hash after signing and submission
   */
  async lockFundsInEscrow(
    walletApi: any,
    params: CardanoInvestmentParams
  ): Promise<string> {
    const lucid = await this.initLucid(walletApi);

    // Extract public key hashes from addresses
    const investorPkh = lucid.utils.getAddressDetails(params.investorAddress).paymentCredential?.hash;
    const smePkh = lucid.utils.getAddressDetails(params.smeAddress).paymentCredential?.hash;
    const oraclePkh = lucid.utils.getAddressDetails(params.oracleAddress).paymentCredential?.hash;

    if (!investorPkh || !smePkh || !oraclePkh) {
      throw new Error('Failed to extract public key hashes from addresses');
    }

    // Create datum for escrow contract
    const datum: InvestmentDatum = {
      investor_pkh: investorPkh,
      sme_pkh: smePkh,
      oracle_pkh: oraclePkh,
      amount: BigInt(params.amount),
      currency: fromText(params.currency),
      funding_request_id: fromText(params.fundingRequestId),
      created_at: BigInt(params.createdAt),
      expiry_time: BigInt(params.expiryTime),
    };

    const datumCbor = Data.to(datum, InvestmentDatumSchema);

    // Build transaction
    let tx = lucid.newTx();

    if (params.currency === 'ADA') {
      // Lock ADA in escrow
      tx = tx.payToContract(
        params.escrowAddress,
        { inline: datumCbor },
        { lovelace: BigInt(params.amount) }
      );
    } else {
      // Lock USDM in escrow
      const usdmUnit = toUnit(USDM_POLICY_ID, USDM_ASSET_NAME);
      tx = tx.payToContract(
        params.escrowAddress,
        { inline: datumCbor },
        { [usdmUnit]: BigInt(params.amount) }
      );
    }

    // Complete and sign transaction
    const completeTx = await tx.complete();
    const signedTx = await completeTx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[CardanoInvestment] Transaction submitted: ${txHash}`);

    return txHash;
  }

  /**
   * Wait for transaction confirmation on blockchain
   */
  async awaitConfirmation(txHash: string, timeoutMs: number = 120000): Promise<boolean> {
    if (!this.lucid) {
      throw new Error('Lucid not initialized');
    }

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        await this.lucid.awaitTx(txHash);
        return true;
      } catch (error) {
        // Transaction not yet confirmed, wait and retry
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    throw new Error('Transaction confirmation timeout');
  }

  /**
   * Get user's wallet balance
   */
  async getWalletBalance(walletApi: any, currency: 'ADA' | 'USDM'): Promise<bigint> {
    const lucid = await this.initLucid(walletApi);
    const utxos = await lucid.wallet.getUtxos();

    if (currency === 'ADA') {
      return utxos.reduce((total, utxo) => total + utxo.assets.lovelace, 0n);
    } else {
      const usdmUnit = toUnit(USDM_POLICY_ID, USDM_ASSET_NAME);
      return utxos.reduce((total, utxo) => {
        return total + (utxo.assets[usdmUnit] || 0n);
      }, 0n);
    }
  }
}

export const cardanoTransactionService = new CardanoTransactionService();
