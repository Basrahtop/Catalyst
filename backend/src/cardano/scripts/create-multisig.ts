import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

interface AdminKey {
  paymentKey: string;
  verificationKey: string;
  address: string;
}

interface MultiSigConfig {
  admin1: AdminKey;
  admin2: AdminKey;
  admin3: AdminKey;
  multiSigScript: any;
  multiSigAddress: string;
  createdAt: string;
}

/**
 * Create a 3-of-3 multi-signature wallet for the platform risk fund
 * 
 * This script:
 * 1. Generates 3 admin key pairs
 * 2. Creates a native multi-sig script requiring all 3 signatures
 * 3. Derives the multi-sig address
 * 4. Saves configuration to config/multisig-wallet.json
 * 
 * SECURITY WARNING:
 * - Store each admin key securely (different locations)
 * - Never commit keys to version control
 * - Use hardware wallets in production
 * - Distribute keys to 3 different trusted administrators
 */
async function createMultiSigWallet() {
  console.log('🔐 Creating 3-of-3 Multi-Signature Wallet...\n');

  try {
    // Dynamic import for ESM module
    const { Lucid, Blockfrost } = await import("lucid-cardano");
    
    // Initialize Lucid (network doesn't matter for key generation)
    const lucid = await Lucid.new(
      new Blockfrost(
        process.env.BLOCKFROST_URL || 'https://cardano-preprod.blockfrost.io/api/v0',
        process.env.BLOCKFROST_API_KEY || 'preprodxxxxxxxxxxxxxxxxxxxxxxxx'
      ),
      process.env.CARDANO_NETWORK as "Mainnet" | "Preprod" || "Preprod"
    );

    console.log('📝 Generating admin key pairs...');
    
    // Generate 3 admin key pairs
    const admin1PrivateKey = lucid.utils.generatePrivateKey();
    const admin2PrivateKey = lucid.utils.generatePrivateKey();
    const admin3PrivateKey = lucid.utils.generatePrivateKey();

    lucid.selectWalletFromPrivateKey(admin1PrivateKey);
    const admin1Address = await lucid.wallet.address();
    const admin1VerificationKey = lucid.utils.getAddressDetails(admin1Address).paymentCredential?.hash || '';

    lucid.selectWalletFromPrivateKey(admin2PrivateKey);
    const admin2Address = await lucid.wallet.address();
    const admin2VerificationKey = lucid.utils.getAddressDetails(admin2Address).paymentCredential?.hash || '';

    lucid.selectWalletFromPrivateKey(admin3PrivateKey);
    const admin3Address = await lucid.wallet.address();
    const admin3VerificationKey = lucid.utils.getAddressDetails(admin3Address).paymentCredential?.hash || '';

    console.log('✅ Admin keys generated');
    console.log(`   Admin 1: ${admin1Address}`);
    console.log(`   Admin 2: ${admin2Address}`);
    console.log(`   Admin 3: ${admin3Address}\n`);

    // Create 3-of-3 multi-sig native script
    const multiSigScript = {
      type: "all",
      scripts: [
        {
          type: "sig",
          keyHash: admin1VerificationKey
        },
        {
          type: "sig",
          keyHash: admin2VerificationKey
        },
        {
          type: "sig",
          keyHash: admin3VerificationKey
        }
      ]
    };

    // Derive multi-sig address
    const multiSigAddress = lucid.utils.validatorToAddress({
      type: "Native",
      script: JSON.stringify(multiSigScript)
    });

    console.log('🏦 Multi-Signature Address Created:');
    console.log(`   ${multiSigAddress}\n`);

    // Prepare configuration
    const config: MultiSigConfig = {
      admin1: {
        paymentKey: admin1PrivateKey,
        verificationKey: admin1VerificationKey,
        address: admin1Address
      },
      admin2: {
        paymentKey: admin2PrivateKey,
        verificationKey: admin2VerificationKey,
        address: admin2Address
      },
      admin3: {
        paymentKey: admin3PrivateKey,
        verificationKey: admin3VerificationKey,
        address: admin3Address
      },
      multiSigScript,
      multiSigAddress,
      createdAt: new Date().toISOString()
    };

    // Save to config file
    const configDir = path.join(__dirname, '../../config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const configPath = path.join(configDir, 'multisig-wallet.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log('✅ Configuration saved to:', configPath);

    // Create separate key files for each admin
    const keysDir = path.join(__dirname, '../../keys');
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(keysDir, 'admin1.json'),
      JSON.stringify({
        paymentKey: admin1PrivateKey,
        verificationKey: admin1VerificationKey,
        address: admin1Address,
        role: 'Admin 1 - Risk Fund Manager'
      }, null, 2)
    );

    fs.writeFileSync(
      path.join(keysDir, 'admin2.json'),
      JSON.stringify({
        paymentKey: admin2PrivateKey,
        verificationKey: admin2VerificationKey,
        address: admin2Address,
        role: 'Admin 2 - Platform Operations'
      }, null, 2)
    );

    fs.writeFileSync(
      path.join(keysDir, 'admin3.json'),
      JSON.stringify({
        paymentKey: admin3PrivateKey,
        verificationKey: admin3VerificationKey,
        address: admin3Address,
        role: 'Admin 3 - Security Officer'
      }, null, 2)
    );

    console.log('✅ Individual admin keys saved to:', keysDir);

    // Create .env.example with required variables
    const envExample = `
# Cardano Configuration
CARDANO_ENABLED=false
CARDANO_NETWORK=Preprod
BLOCKFROST_URL=https://cardano-preprod.blockfrost.io/api/v0
BLOCKFROST_API_KEY=your_blockfrost_api_key_here

# Multi-Sig Wallet
MULTISIG_ADDRESS=${multiSigAddress}

# Admin Keys (STORE SECURELY - DO NOT COMMIT TO GIT)
ADMIN1_PAYMENT_KEY=see_keys/admin1.json
ADMIN2_PAYMENT_KEY=see_keys/admin2.json
ADMIN3_PAYMENT_KEY=see_keys/admin3.json
`;

    fs.writeFileSync(
      path.join(__dirname, '../../.env.cardano.example'),
      envExample.trim()
    );

    console.log('\n✅ .env.cardano.example created\n');

    console.log('🔒 SECURITY REMINDERS:');
    console.log('   1. Distribute admin keys to 3 different trusted individuals');
    console.log('   2. Store each key in a secure location (password manager, hardware wallet)');
    console.log('   3. Never commit keys to version control');
    console.log('   4. Add backend/keys/ to .gitignore');
    console.log('   5. For production, use hardware wallets instead of software keys');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Fund the multi-sig address with test ADA (preprod faucet)');
    console.log('   2. Add BLOCKFROST_API_KEY to .env');
    console.log('   3. Set CARDANO_ENABLED=true in .env');
    console.log('   4. Test risk fund contributions');

  } catch (error) {
    console.error('❌ Failed to create multi-sig wallet:', error);
    process.exit(1);
  }
}

// Run the script
createMultiSigWallet();
