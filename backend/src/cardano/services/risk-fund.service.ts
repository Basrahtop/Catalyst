import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Types will be loaded dynamically
type Lucid = any;
type Blockfrost = any;
type UTxO = any;
type Assets = any;
type Unit = any;

interface MultiSigConfig {
  admin1: { paymentKey: string; address: string };
  admin2: { paymentKey: string; address: string };
  admin3: { paymentKey: string; address: string };
  multiSigScript: any;
  multiSigAddress: string;
}

export class RiskFundService {
  private lucid: Lucid | null = null;
  private prisma: PrismaClient;
  private multiSigConfig: MultiSigConfig | null = null;
  private isInitialized: boolean = false;

  // $USDM (Mehen Stablecoin) policy ID
  // Preprod testnet policy ID - replace with mainnet when deploying to production
  private readonly USDM_POLICY_ID = "f66d78b4a3cb3d37afa0ec36461e51ecbde00f26c8f0a68f94b69880";
  private readonly USDM_ASSET_NAME = "USDM";

  constructor() {
    this.prisma = new PrismaClient();
  }

  async initialize() {
    try {
      console.log('🔄 Initializing Risk Fund Service...');

      if (!process.env.CARDANO_ENABLED || process.env.CARDANO_ENABLED !== 'true') {
        console.log('⚠️  Cardano integration is disabled');
        return false;
      }

      // Dynamic import for ESM module
      const { Lucid, Blockfrost } = await import("lucid-cardano");

      // Initialize Lucid
      this.lucid = await Lucid.new(
        new Blockfrost(
          process.env.BLOCKFROST_URL!,
          process.env.BLOCKFROST_API_KEY!
        ),
        process.env.CARDANO_NETWORK as "Mainnet" | "Preprod" || "Preprod"
      );

      // Load multi-sig configuration
      const configPath = path.join(__dirname, '../../config/multisig-wallet.json');
      if (!fs.existsSync(configPath)) {
        console.error('❌ Multi-sig configuration not found. Run: npm run cardano:setup-multisig');
        return false;
      }

      this.multiSigConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      console.log(`✅ Multi-sig address: ${this.multiSigConfig?.multiSigAddress}`);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Risk Fund Service initialization failed:', error);
      return false;
    }
  }

  /**
   * Get risk fund balance (ADA + $USDM)
   */
  async getBalance() {
    if (!this.isReady()) throw new Error('Service not initialized');

    const utxos = await this.lucid!.utxosAt(this.multiSigConfig!.multiSigAddress);
    
    let adaBalance = BigInt(0);
    let usdmBalance = BigInt(0);

    for (const utxo of utxos) {
      adaBalance += utxo.assets.lovelace || BigInt(0);
      
      // Check for $USDM tokens
      if (this.USDM_POLICY_ID) {
        const usdmUnit = `${this.USDM_POLICY_ID}${Buffer.from(this.USDM_ASSET_NAME).toString('hex')}`;
        usdmBalance += utxo.assets[usdmUnit] || BigInt(0);
      }
    }

    return {
      ada: Number(adaBalance) / 1_000_000, // Convert lovelace to ADA
      usdm: Number(usdmBalance) / 1_000_000, // $USDM has 6 decimals
      utxos: utxos.length
    };
  }

  /**
   * Record risk fund contribution (off-chain initially)
   */
  async recordContribution(
    smeId: string,
    amount: number,
    currency: 'NGN' | 'ADA' | 'USDM',
    txHash?: string
  ) {
    let conversionRate = 1.0;

    // If NGN, convert to ADA equivalent for tracking
    if (currency === 'NGN') {
      // Fetch current ADA/NGN rate (use external API in production)
      const adaPrice = 0.35; // Example: 1 ADA = 0.35 USD
      const ngnRate = 1600; // Example: 1 USD = 1600 NGN
      conversionRate = adaPrice * ngnRate; // 1 ADA = 560 NGN
    }

    await this.prisma.riskFundContribution.create({
      data: {
        smeId,
        amount,
        currency,
        cardanoTxHash: txHash || null,
        conversionRate
      }
    });

    console.log(`✅ Recorded contribution: ${amount} ${currency} from SME ${smeId}`);
  }

  /**
   * Get total contributions by SME
   */
  async getSMEContributions(smeId: string) {
    return await this.prisma.riskFundContribution.findMany({
      where: { smeId },
      orderBy: { timestamp: 'desc' }
    });
  }

  /**
   * Get total risk fund contributions (all SMEs)
   */
  async getTotalContributions() {
    const contributions = await this.prisma.riskFundContribution.groupBy({
      by: ['currency'],
      _sum: {
        amount: true
      }
    });

    return contributions.map(c => ({
      currency: c.currency,
      total: c._sum.amount || 0
    }));
  }

  /**
   * Create transaction to transfer from risk fund (requires 3 signatures)
   * This is a placeholder - actual implementation requires all 3 admin keys
   */
  async createTransferTransaction(
    recipientAddress: string,
    amountADA: number,
    reason: string
  ) {
    if (!this.isReady()) throw new Error('Service not initialized');

    console.log('📝 Creating risk fund transfer transaction...');
    console.log(`   To: ${recipientAddress}`);
    console.log(`   Amount: ${amountADA} ADA`);
    console.log(`   Reason: ${reason}`);

    // This requires coordination between 3 admins to sign
    // Each admin must independently sign the transaction
    
    console.log('⚠️  Manual coordination required:');
    console.log('   1. Admin 1 must sign with their key');
    console.log('   2. Admin 2 must sign with their key');
    console.log('   3. Admin 3 must sign with their key');
    console.log('   4. Once all 3 signatures collected, submit transaction');

    // Return unsigned transaction for manual signing
    const tx = await this.lucid!
      .newTx()
      .payToAddress(recipientAddress, { lovelace: BigInt(amountADA * 1_000_000) })
      .attachMetadata(674, { reason, timestamp: Date.now() })
      .complete();

    return {
      txCBOR: tx.toString(),
      txHash: tx.toHash(),
      signaturesRequired: 3,
      status: 'pending_signatures'
    };
  }

  private isReady(): boolean {
    return this.isInitialized && this.lucid !== null && this.multiSigConfig !== null;
  }
}

export const riskFundService = new RiskFundService();
