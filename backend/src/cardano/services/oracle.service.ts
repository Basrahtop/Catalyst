import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// Types will be loaded dynamically
type Lucid = any;
type Blockfrost = any;
type Data = any;

// Datum schema will be defined with Data.Object after import
let ReputationDatumSchema: any;

type ReputationDatum = any;

export class CardanoOracleService {
  private lucid: Lucid | null = null;
  private prisma: PrismaClient;
  private scriptAddress: string = '';
  private isInitialized: boolean = false;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Initialize Lucid and load smart contract
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Cardano Oracle Service...');

      // Check if Cardano integration is enabled
      if (!process.env.CARDANO_ENABLED || process.env.CARDANO_ENABLED !== 'true') {
        console.log('⚠️  Cardano integration is disabled in environment');
        return false;
      }

      // Validate required environment variables
      if (!process.env.BLOCKFROST_URL || !process.env.BLOCKFROST_API_KEY) {
        console.error('❌ Missing Blockfrost configuration');
        return false;
      }

      // Dynamic import for ESM module
      const { Lucid, Blockfrost, Data } = await import("lucid-cardano");
      
      // Define schema after Data is imported
      ReputationDatumSchema = Data.Object({
        sme_id: Data.Bytes(),
        marketplace_score: Data.Integer(),
        feedback_score: Data.Integer(),
        platform_trust_score: Data.Integer(),
        financial_score: Data.Integer(),
        overall_score: Data.Integer(),
        last_updated: Data.Integer(),
        update_count: Data.Integer(),
        calculation_hash: Data.Bytes()
      });

      // Initialize Lucid with Blockfrost
      this.lucid = await Lucid.new(
        new Blockfrost(
          process.env.BLOCKFROST_URL,
          process.env.BLOCKFROST_API_KEY
        ),
        process.env.CARDANO_NETWORK as "Mainnet" | "Preprod" || "Preprod"
      );

      // Load compiled validator if available
      const plutusPath = path.join(__dirname, '../plutus/reputation_registry.json');
      if (fs.existsSync(plutusPath)) {
        try {
          const blueprint = JSON.parse(fs.readFileSync(plutusPath, 'utf-8'));
          // Extract the validator from the blueprint  
          const validator = {
            type: "PlutusV2",
            script: blueprint.validators[0].compiledCode
          };
          this.scriptAddress = this.lucid.utils.validatorToAddress(validator);
          console.log(`✅ Script address: ${this.scriptAddress}`);
        } catch (error) {
          console.log('⚠️  Could not load Plutus contract. Continuing in off-chain mode.');
          console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      } else {
        console.log('⚠️  Plutus contract not found. Oracle will work in off-chain mode only.');
        console.log('   To enable on-chain submissions: cd aiken-contracts && aiken build');
        // Allow initialization without contract for off-chain operations
      }

      this.isInitialized = true;
      console.log('✅ Cardano Oracle Service initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize Cardano Oracle Service:', error);
      return false;
    }
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.lucid !== null;
  }

  /**
   * Update reputation scores for all SMEs (runs every 12 hours)
   */
  async updateAllReputationScores() {
    if (!this.isReady()) {
      console.log('⚠️  Oracle service not initialized, skipping update');
      return;
    }

    console.log('🔄 Starting reputation score update cycle...');
    
    try {
      // Fetch all SMEs with calculated scores
      const smes = await this.prisma.sME.findMany({
        include: {
          user: {
            select: {
              id: true,
              platformTrustScore: true,
              financialScore: true
            }
          }
        }
      });

      console.log(`📊 Found ${smes.length} SMEs to process`);

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (const sme of smes) {
        try {
          // Check if scores have changed since last update
          const hasChanges = await this.hasScoreChanges(sme);
          if (!hasChanges) {
            skipCount++;
            continue;
          }

          await this.logReputationHistory(sme);
          successCount++;
          
          // Small delay between updates
          await this.delay(1000);
        } catch (error) {
          console.error(`❌ Failed to update SME ${sme.id}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ Update cycle completed: ${successCount} updated, ${skipCount} skipped, ${errorCount} errors`);
    } catch (error) {
      console.error('❌ Reputation update cycle failed:', error);
      throw error;
    }
  }

  /**
   * Check if SME scores have changed since last update
   */
  private async hasScoreChanges(sme: any): Promise<boolean> {
    const lastHistory = await this.prisma.reputationHistory.findFirst({
      where: { smeId: sme.id },
      orderBy: { timestamp: 'desc' }
    });

    if (!lastHistory) return true; // First time

    return (
      lastHistory.marketplaceScore !== sme.marketplaceScore ||
      lastHistory.feedbackScore !== sme.feedbackScore ||
      lastHistory.platformTrustScore !== sme.user.platformTrustScore ||
      lastHistory.financialScore !== sme.user.financialScore
    );
  }

  /**
   * Log reputation history to database (off-chain for now)
   * On-chain updates will be enabled when admin keys are configured
   */
  private async logReputationHistory(sme: any) {
    const marketplaceScore = sme.marketplaceScore || 0;
    const feedbackScore = sme.feedbackScore || 0;
    const trustScore = sme.user.platformTrustScore || 0;
    const financialScore = sme.user.financialScore || 0;
    // Overall score is sum of all components (max: 300+350+150+200 = 1000)
    const overallScore = marketplaceScore + feedbackScore + trustScore + financialScore;

    // Create calculation hash for verification
    const calculationData = `${sme.id}-${marketplaceScore}-${feedbackScore}-${trustScore}-${financialScore}-${Date.now()}`;
    const calculationHash = crypto.createHash('sha256')
      .update(calculationData)
      .digest('hex');

    // Check if SME has a verified Cardano wallet
    const cardanoWallet = await this.prisma.cardanoWallet.findUnique({
      where: { userId: sme.userId }
    });

    const canSubmitOnChain = cardanoWallet && cardanoWallet.verified;
    const reputationId = cardanoWallet?.reputationId || null;

    if (!canSubmitOnChain) {
      console.log(`⚠️  ${sme.businessName} has no verified wallet - storing off-chain only`);
    }

    // Store in database
    await this.prisma.reputationHistory.create({
      data: {
        smeId: sme.id,
        marketplaceScore,
        feedbackScore,
        platformTrustScore: trustScore,
        financialScore,
        overallScore,
        calculationHash,
        reputationId, // Privacy-preserving identifier (not wallet address)
        verified: canSubmitOnChain, // Was wallet verified when submitted?
        cardanoTxHash: null, // Will be populated when on-chain updates are enabled
        cardanoUTxORef: null
      }
    });

    console.log(`✅ Logged reputation for ${sme.businessName}: ${overallScore}/1000${canSubmitOnChain ? ' (Verified Wallet)' : ' (No Wallet)'}`);
  }

  /**
   * Get latest reputation score from history
   */
  async getLatestReputation(smeId: string) {
    return await this.prisma.reputationHistory.findFirst({
      where: { smeId },
      orderBy: { timestamp: 'desc' }
    });
  }

  /**
   * Get reputation history for an SME
   */
  async getReputationHistory(smeId: string, limit: number = 10) {
    return await this.prisma.reputationHistory.findMany({
      where: { smeId },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }

  /**
   * Submit reputation to Cardano blockchain
   * This creates a transaction that locks reputation data in a smart contract
   */
  async submitReputationToBlockchain(smeId: string): Promise<{
    success: boolean;
    txHash?: string;
    utxoRef?: string;
    error?: string;
  }> {
    try {
      if (!this.isReady() || !this.lucid || !this.scriptAddress) {
        return {
          success: false,
          error: 'Cardano service not initialized or script address not available'
        };
      }

      // Get SME data
      const sme = await this.prisma.sME.findUnique({
        where: { id: smeId },
        include: {
          user: {
            select: {
              id: true,
              platformTrustScore: true,
              financialScore: true,
              cardanoWallet: true
            }
          }
        }
      });

      if (!sme || !sme.user.cardanoWallet) {
        return {
          success: false,
          error: 'SME not found or no Cardano wallet connected'
        };
      }

      const wallet = sme.user.cardanoWallet;
      if (!wallet.verified) {
        return {
          success: false,
          error: 'Cardano wallet not verified'
        };
      }

      // Calculate scores
      const marketplaceScore = sme.marketplaceScore || 0;
      const feedbackScore = sme.feedbackScore || 0;
      const trustScore = sme.user.platformTrustScore || 0;
      const financialScore = sme.user.financialScore || 0;
      const overallScore = marketplaceScore + feedbackScore + trustScore + financialScore;

      // Create calculation hash
      const timestamp = Date.now();
      const calculationData = `${smeId}-${marketplaceScore}-${feedbackScore}-${trustScore}-${financialScore}-${timestamp}`;
      const calculationHash = crypto.createHash('sha256').update(calculationData).digest('hex');

      // Get update count
      const previousCount = await this.prisma.reputationHistory.count({
        where: { smeId }
      });

      console.log(`📝 Preparing on-chain submission for ${sme.businessName}:`, {
        reputationId: wallet.reputationId,
        overallScore,
        updateCount: previousCount + 1
      });

      // Get and validate seed phrase
      const seedPhrase = process.env.ORACLE_WALLET_SEED_PHRASE;
      
      if (!seedPhrase) {
        return {
          success: false,
          error: 'ORACLE_WALLET_SEED_PHRASE not configured in environment variables'
        };
      }

      // Clean and validate seed phrase
      const cleanedSeedPhrase = seedPhrase.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ' ');
      const wordCount = cleanedSeedPhrase.split(' ').length;

      console.log(`🔐 Seed phrase has ${wordCount} words`);

      if (wordCount !== 24) {
        return {
          success: false,
          error: `Invalid seed phrase: expected 24 words, got ${wordCount}. Please use a Shelley-era wallet (Eternl, Nami) with 24-word recovery phrase.`
        };
      }

      // Select wallet for signing transactions
      try {
        this.lucid.selectWalletFromSeed(cleanedSeedPhrase);
        console.log('✅ Wallet loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load wallet from seed phrase:', error);
        return {
          success: false,
          error: `Invalid seed phrase: ${error instanceof Error ? error.message : 'Unknown error'}. Please verify your ORACLE_WALLET_SEED_PHRASE in .env file.`
        };
      }
      
      // Create datum with proper Lucid schema (use hex strings for bytes)
      const { Data } = await import("lucid-cardano");
      const datum = Data.to({
        sme_id: wallet.reputationId || '',
        marketplace_score: BigInt(marketplaceScore),
        feedback_score: BigInt(feedbackScore),
        platform_trust_score: BigInt(trustScore),
        financial_score: BigInt(financialScore),
        overall_score: BigInt(overallScore),
        last_updated: BigInt(timestamp),
        update_count: BigInt(previousCount + 1),
        calculation_hash: calculationHash
      }, ReputationDatumSchema);

      // Build and submit transaction
      const tx = await this.lucid
        .newTx()
        .payToContract(this.scriptAddress, { inline: datum }, { lovelace: BigInt(2000000) }) // 2 ADA
        .complete();

      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();

      console.log(`✅ Transaction submitted: ${txHash}`);

      // Wait for confirmation
      await this.lucid.awaitTx(txHash);
      console.log(`✅ Transaction confirmed on-chain`);

      // Store in database with transaction reference
      await this.prisma.reputationHistory.create({
        data: {
          smeId,
          marketplaceScore,
          feedbackScore,
          platformTrustScore: trustScore,
          financialScore,
          overallScore,
          calculationHash,
          reputationId: wallet.reputationId,
          verified: true,
          cardanoTxHash: txHash,
          cardanoUTxORef: `${txHash}#0` // First output is to script address
        }
      });

      console.log(`✅ Reputation recorded on-chain for ${sme.businessName}`);

      return {
        success: true,
        txHash,
        utxoRef: `${txHash}#0`
      };

    } catch (error) {
      console.error('❌ Failed to submit reputation to blockchain:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fetch and decode reputation data directly from the blockchain
   * This proves the data is actually stored on-chain
   */
  async fetchReputationFromBlockchain(utxoRef: string): Promise<{
    success: boolean;
    data?: {
      smeId: string;
      marketplaceScore: number;
      feedbackScore: number;
      platformTrustScore: number;
      financialScore: number;
      overallScore: number;
      lastUpdated: number;
      updateCount: number;
      calculationHash: string;
    };
    error?: string;
  }> {
    try {
      if (!this.isReady() || !this.lucid) {
        return {
          success: false,
          error: 'Cardano service not initialized'
        };
      }

      console.log(`🔍 Fetching reputation data from blockchain: ${utxoRef}`);

      // Parse UTxO reference (format: txHash#index)
      const [txHash, outputIndex] = utxoRef.split('#');
      
      // Fetch the UTxO from blockchain
      const utxos = await this.lucid.utxosByOutRef([{
        txHash,
        outputIndex: parseInt(outputIndex)
      }]);

      if (utxos.length === 0) {
        return {
          success: false,
          error: 'UTxO not found on blockchain. Transaction may not be confirmed yet.'
        };
      }

      const utxo = utxos[0];
      
      // Check if datum exists
      if (!utxo.datum) {
        return {
          success: false,
          error: 'No datum found in UTxO'
        };
      }

      // Decode the datum
      const { Data } = await import("lucid-cardano");
      const decodedDatum = Data.from(utxo.datum, ReputationDatumSchema);

      console.log('✅ Successfully decoded reputation data from blockchain:', decodedDatum);

      return {
        success: true,
        data: {
          smeId: decodedDatum.sme_id,
          marketplaceScore: Number(decodedDatum.marketplace_score),
          feedbackScore: Number(decodedDatum.feedback_score),
          platformTrustScore: Number(decodedDatum.platform_trust_score),
          financialScore: Number(decodedDatum.financial_score),
          overallScore: Number(decodedDatum.overall_score),
          lastUpdated: Number(decodedDatum.last_updated),
          updateCount: Number(decodedDatum.update_count),
          calculationHash: decodedDatum.calculation_hash
        }
      };

    } catch (error) {
      console.error('❌ Failed to fetch reputation from blockchain:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const cardanoOracle = new CardanoOracleService();
