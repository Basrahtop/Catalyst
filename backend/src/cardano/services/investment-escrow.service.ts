// @ts-nocheck
/**
 * Investment Escrow Service
 * 
 * Manages ADA/USDM escrow for international investments using Cardano smart contracts.
 * Funds are locked on-chain until the funding request is fully funded or expires.
 */

import { Lucid, Blockfrost, UTxO, TxHash, Data, fromText, toUnit } from 'lucid-cardano';
import { Currency } from '@prisma/client';

// USDM Token Policy (Mehen Stablecoin)
const USDM_POLICY_ID = process.env.USDM_POLICY_ID || 'f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b69880';
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

// Redeemer types
const EscrowRedeemerSchema = Data.Enum([
  Data.Literal('Release'),
  Data.Literal('Refund'),
]);

type EscrowRedeemer = Data.Static<typeof EscrowRedeemerSchema>;

export class InvestmentEscrowService {
  private lucid: Lucid | null = null;
  private scriptAddress: string | null = null;
  private scriptCborHex: string | null = null;

  constructor() {
    // Script will be loaded from compiled plutus.json
  }

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

    return this.lucid;
  }

  /**
   * Load escrow script and get its address
   */
  async loadScript(): Promise<string> {
    if (this.scriptAddress) return this.scriptAddress;

    // TODO: Load from compiled plutus.json after Aiken build
    // For now, using placeholder - will be replaced after compilation
    
    // const plutusJson = await import('../../../aiken-contracts/plutus.json');
    // const escrowValidator = plutusJson.validators.find(
    //   (v) => v.title === 'investment_escrow.spend'
    // );
    
    // this.scriptCborHex = escrowValidator.compiledCode;
    // this.scriptAddress = this.lucid!.utils.validatorToAddress({
    //   type: 'PlutusV3',
    //   script: this.scriptCborHex,
    // });

    throw new Error('Escrow script not yet compiled. Run: cd aiken-contracts && aiken build');
  }

  /**
   * Lock ADA or USDM in escrow contract
   * 
   * @param investorAddress - Investor's Cardano wallet address
   * @param smeAddress - SME's Cardano wallet address
   * @param amount - Amount to lock (in lovelace for ADA, microUSDM for USDM)
   * @param currency - "ADA" or "USDM"
   * @param fundingRequestId - UUID of the funding request
   * @returns Transaction hash
   */
  async lockFunds(
    investorAddress: string,
    smeAddress: string,
    amount: bigint,
    currency: 'ADA' | 'USDM',
    fundingRequestId: string
  ): Promise<TxHash> {
    const lucid = await this.initLucid();
    await this.loadScript();

    // Get public key hashes
    const investorPkh = lucid.utils.getAddressDetails(investorAddress).paymentCredential?.hash;
    const smePkh = lucid.utils.getAddressDetails(smeAddress).paymentCredential?.hash;
    
    // Get oracle key hash from env
    const oracleSeedPhrase = process.env.ORACLE_WALLET_SEED_PHRASE;
    if (!oracleSeedPhrase) {
      throw new Error('ORACLE_WALLET_SEED_PHRASE not configured');
    }
    
    lucid.selectWalletFromSeed(oracleSeedPhrase);
    const oracleAddress = await lucid.wallet.address();
    const oraclePkh = lucid.utils.getAddressDetails(oracleAddress).paymentCredential?.hash;

    if (!investorPkh || !smePkh || !oraclePkh) {
      throw new Error('Failed to extract public key hashes');
    }

    // Create datum
    const currentTime = Date.now();
    const expiryTime = currentTime + (30 * 24 * 60 * 60 * 1000); // 30 days

    const datum: InvestmentDatum = {
      investor_pkh: investorPkh,
      sme_pkh: smePkh,
      oracle_pkh: oraclePkh,
      amount: BigInt(amount.toString()),
      currency: fromText(currency),
      funding_request_id: fromText(fundingRequestId),
      created_at: BigInt(currentTime),
      expiry_time: BigInt(expiryTime),
    };

    // Build transaction
    lucid.selectWalletFromSeed(oracleSeedPhrase); // Temp: use oracle for testing
    
    let tx = lucid.newTx();

    if (currency === 'ADA') {
      // Lock ADA
      tx = tx.payToContract(
        this.scriptAddress!,
        { inline: Data.to(datum, InvestmentDatumSchema) },
        { lovelace: amount }
      );
    } else {
      // Lock USDM tokens
      const usdmUnit = toUnit(USDM_POLICY_ID, fromText(USDM_ASSET_NAME));
      tx = tx.payToContract(
        this.scriptAddress!,
        { inline: Data.to(datum, InvestmentDatumSchema) },
        { [usdmUnit]: amount }
      );
    }

    const completedTx = await tx.complete();
    const signedTx = await completedTx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[Escrow] Locked ${amount} ${currency} for request ${fundingRequestId}`);
    console.log(`[Escrow] TxHash: ${txHash}`);

    return txHash;
  }

  /**
   * Release locked funds to SME (oracle only)
   * 
   * @param fundingRequestId - UUID of the funding request
   * @returns Transaction hash
   */
  async releaseFunds(fundingRequestId: string): Promise<TxHash> {
    const lucid = await this.initLucid();
    await this.loadScript();

    // Load oracle wallet
    const oracleSeedPhrase = process.env.ORACLE_WALLET_SEED_PHRASE;
    if (!oracleSeedPhrase) {
      throw new Error('ORACLE_WALLET_SEED_PHRASE not configured');
    }
    lucid.selectWalletFromSeed(oracleSeedPhrase);

    // Find all UTXOs locked for this funding request
    const scriptUtxos = await lucid.utxosAt(this.scriptAddress!);
    
    const relevantUtxos = scriptUtxos.filter((utxo) => {
      if (!utxo.datum) return false;
      
      try {
        const datum = Data.from(utxo.datum, InvestmentDatumSchema) as InvestmentDatum;
        const requestId = Buffer.from(datum.funding_request_id).toString('utf-8');
        return requestId === fundingRequestId;
      } catch {
        return false;
      }
    });

    if (relevantUtxos.length === 0) {
      throw new Error(`No locked funds found for request: ${fundingRequestId}`);
    }

    console.log(`[Escrow] Found ${relevantUtxos.length} UTXOs to release`);

    // Build transaction to spend all UTXOs
    let tx = lucid.newTx();

    for (const utxo of relevantUtxos) {
      const datum = Data.from(utxo.datum!, InvestmentDatumSchema) as InvestmentDatum;
      const smeAddress = lucid.utils.credentialToAddress(
        { type: 'Key', hash: datum.sme_pkh },
        undefined
      );

      // Add script UTXO as input with Release redeemer
      tx = tx
        .collectFrom([utxo], Data.to('Release', EscrowRedeemerSchema))
        .attachSpendingValidator({
          type: 'PlutusV3',
          script: this.scriptCborHex!,
        });
    }

    // Oracle must sign
    tx = tx.addSigner(await lucid.wallet.address());

    const completedTx = await tx.complete();
    const signedTx = await completedTx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[Escrow] Released funds for request ${fundingRequestId}`);
    console.log(`[Escrow] TxHash: ${txHash}`);

    return txHash;
  }

  /**
   * Refund locked funds to investor (after expiry)
   * 
   * @param fundingRequestId - UUID of the funding request
   * @param investorSeedPhrase - Investor's wallet seed phrase
   * @returns Transaction hash
   */
  async refundInvestor(
    fundingRequestId: string,
    investorSeedPhrase: string
  ): Promise<TxHash> {
    const lucid = await this.initLucid();
    await this.loadScript();

    // Load investor wallet
    lucid.selectWalletFromSeed(investorSeedPhrase);
    const investorAddress = await lucid.wallet.address();

    // Find investor's locked UTXOs for this request
    const scriptUtxos = await lucid.utxosAt(this.scriptAddress!);
    
    const investorUtxos = scriptUtxos.filter((utxo) => {
      if (!utxo.datum) return false;
      
      try {
        const datum = Data.from(utxo.datum, InvestmentDatumSchema) as InvestmentDatum;
        const requestId = Buffer.from(datum.funding_request_id).toString('utf-8');
        
        const investorPkh = lucid.utils.getAddressDetails(investorAddress).paymentCredential?.hash;
        return requestId === fundingRequestId && datum.investor_pkh === investorPkh;
      } catch {
        return false;
      }
    });

    if (investorUtxos.length === 0) {
      throw new Error(`No locked funds found for investor in request: ${fundingRequestId}`);
    }

    // Check if expired
    const datum = Data.from(investorUtxos[0].datum!, InvestmentDatumSchema) as InvestmentDatum;
    const expiryTime = Number(datum.expiry_time);
    
    if (Date.now() < expiryTime) {
      throw new Error(`Request not yet expired. Expiry: ${new Date(expiryTime).toISOString()}`);
    }

    console.log(`[Escrow] Refunding ${investorUtxos.length} UTXOs to investor`);

    // Build refund transaction
    let tx = lucid.newTx();

    for (const utxo of investorUtxos) {
      tx = tx
        .collectFrom([utxo], Data.to('Refund', EscrowRedeemerSchema))
        .attachSpendingValidator({
          type: 'PlutusV3',
          script: this.scriptCborHex!,
        });
    }

    // Set validity interval (must be after expiry)
    tx = tx
      .validFrom(expiryTime)
      .addSigner(investorAddress);

    const completedTx = await tx.complete();
    const signedTx = await completedTx.sign().complete();
    const txHash = await signedTx.submit();

    console.log(`[Escrow] Refunded funds for request ${fundingRequestId}`);
    console.log(`[Escrow] TxHash: ${txHash}`);

    return txHash;
  }

  /**
   * Get all locked UTXOs for a funding request
   */
  async getLockedUTXOs(fundingRequestId: string): Promise<UTxO[]> {
    const lucid = await this.initLucid();
    await this.loadScript();

    const scriptUtxos = await lucid.utxosAt(this.scriptAddress!);
    
    return scriptUtxos.filter((utxo) => {
      if (!utxo.datum) return false;
      
      try {
        const datum = Data.from(utxo.datum, InvestmentDatumSchema) as InvestmentDatum;
        const requestId = Buffer.from(datum.funding_request_id).toString('utf-8');
        return requestId === fundingRequestId;
      } catch {
        return false;
      }
    });
  }

  /**
   * Get total locked amount for a funding request
   */
  async getLockedAmount(fundingRequestId: string): Promise<{ ada: bigint; usdm: bigint }> {
    const utxos = await this.getLockedUTXOs(fundingRequestId);
    
    let totalAda = BigInt(0);
    let totalUsdm = BigInt(0);

    for (const utxo of utxos) {
      const datum = Data.from(utxo.datum!, InvestmentDatumSchema) as InvestmentDatum;
      const currency = Buffer.from(datum.currency).toString('utf-8');

      if (currency === 'ADA') {
        totalAda += utxo.assets.lovelace || BigInt(0);
      } else if (currency === 'USDM') {
        const usdmUnit = toUnit(USDM_POLICY_ID, fromText(USDM_ASSET_NAME));
        totalUsdm += utxo.assets[usdmUnit] || BigInt(0);
      }
    }

    return { ada: totalAda, usdm: totalUsdm };
  }
}

export const investmentEscrowService = new InvestmentEscrowService();
