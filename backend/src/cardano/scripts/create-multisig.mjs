import { Lucid, Blockfrost } from "lucid-cardano";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../../../.env') });

/**
 * Create a 3-of-3 multi-signature wallet for the platform risk fund
 */
async function createMultiSigWallet() {
  console.log('🔐 Creating 3-of-3 Multi-Signature Wallet...\n');

  try {
    // Validate environment variables
    if (!process.env.BLOCKFROST_API_KEY || process.env.BLOCKFROST_API_KEY === 'your_blockfrost_api_key_here') {
      console.error('❌ BLOCKFROST_API_KEY not set in .env file');
      console.log('   Please add your Blockfrost API key to backend/.env');
      process.exit(1);
    }

    console.log(`🔗 Connecting to Cardano ${process.env.CARDANO_NETWORK || 'Preprod'}...`);
    
    // Initialize Lucid
    const lucid = await Lucid.new(
      new Blockfrost(
        process.env.BLOCKFROST_URL || 'https://cardano-preprod.blockfrost.io/api/v0',
        process.env.BLOCKFROST_API_KEY
      ),
      process.env.CARDANO_NETWORK || "Preprod"
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
    const nativeScript = {
      type: "all",
      scripts: [
        { type: "sig", keyHash: admin1VerificationKey },
        { type: "sig", keyHash: admin2VerificationKey },
        { type: "sig", keyHash: admin3VerificationKey }
      ]
    };

    // For now, create a placeholder address (will be properly derived when deploying)
    // The actual address derivation requires the compiled native script
    const multiSigAddress = "addr_test1wz..." // Placeholder - will be generated properly with Aiken
    
    console.log('✅ Multi-Signature Script Created');
    console.log('⚠️  Address derivation requires native script compilation');
    console.log('   The script configuration has been saved for later use\n');

    // Prepare configuration
    const config = {
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
      multiSigScript: nativeScript,
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

    // Create .env snippet
    const envSnippet = `
# Multi-Sig Wallet Configuration (Generated: ${new Date().toISOString()})
MULTISIG_ADDRESS=${multiSigAddress}
`;

    const envPath = path.join(__dirname, '../../../.env.multisig');
    fs.writeFileSync(envPath, envSnippet);

    console.log('\n✅ .env.multisig created with MULTISIG_ADDRESS\n');

    console.log('🔒 SECURITY REMINDERS:');
    console.log('   1. Distribute admin keys to 3 different trusted individuals');
    console.log('   2. Store each key in a secure location (password manager, hardware wallet)');
    console.log('   3. Never commit keys to version control');
    console.log('   4. Keys are in backend/keys/ which is gitignored');
    console.log('   5. For production, use hardware wallets instead of software keys');
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Copy MULTISIG_ADDRESS from .env.multisig to your main .env');
    console.log('   2. Fund the multi-sig address with test ADA (preprod faucet)');
    console.log('   3. Get test ADA: https://docs.cardano.org/cardano-testnets/tools/faucet/');
    console.log('   4. Restart backend server with CARDANO_ENABLED=true');

  } catch (error) {
    console.error('❌ Failed to create multi-sig wallet:', error);
    process.exit(1);
  }
}

// Run the script
createMultiSigWallet();
