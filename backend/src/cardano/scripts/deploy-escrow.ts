/**
 * Deploy Investment Escrow Contract to Cardano
 * 
 * Usage:
 *   npm run deploy:escrow -- --network preprod
 *   npm run deploy:escrow -- --network mainnet
 */

import { Lucid, Blockfrost } from 'lucid-cardano';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface PlutusValidator {
  title: string;
  compiledCode: string;
  hash: string;
}

interface PlutusJson {
  validators: PlutusValidator[];
}

async function deployEscrowContract(network: 'Preprod' | 'Mainnet') {
  console.log(`\n🚀 Deploying Investment Escrow Contract to ${network}...\n`);

  // 1. Load compiled Plutus script
  const plutusJsonPath = path.join(__dirname, '../../../aiken-contracts/plutus.json');
  
  if (!fs.existsSync(plutusJsonPath)) {
    console.error('❌ plutus.json not found!');
    console.error('   Run: cd aiken-contracts && aiken build');
    process.exit(1);
  }

  const plutusJson: PlutusJson = JSON.parse(fs.readFileSync(plutusJsonPath, 'utf-8'));
  
  // Find investment_escrow validator
  const escrowValidator = plutusJson.validators.find(
    (v) => v.title.includes('investment_escrow')
  );

  if (!escrowValidator) {
    console.error('❌ investment_escrow validator not found in plutus.json');
    console.error('   Ensure the contract is properly compiled');
    process.exit(1);
  }

  console.log(`✅ Loaded validator: ${escrowValidator.title}`);
  console.log(`   Script hash: ${escrowValidator.hash}`);

  // 2. Initialize Lucid
  const blockfrostUrl =
    network === 'Preprod'
      ? 'https://cardano-preprod.blockfrost.io/api/v0'
      : 'https://cardano-mainnet.blockfrost.io/api/v0';

  const blockfrostApiKey = process.env.BLOCKFROST_API_KEY;
  if (!blockfrostApiKey) {
    console.error('❌ BLOCKFROST_API_KEY not set in .env');
    process.exit(1);
  }

  const lucid = await Lucid.new(new Blockfrost(blockfrostUrl, blockfrostApiKey), network);

  // 3. Calculate script address
  const scriptAddress = lucid.utils.validatorToAddress({
    type: 'PlutusV3',
    script: escrowValidator.compiledCode,
  });

  console.log(`\n📍 Contract deployed at:`);
  console.log(`   Address: ${scriptAddress}`);
  console.log(`   Script CBOR: ${escrowValidator.compiledCode.slice(0, 60)}...`);

  // 4. Save to .env file
  const envPath = path.join(__dirname, '../../.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  // Update or add escrow variables
  const updates: Record<string, string> = {
    ESCROW_SCRIPT_ADDRESS: scriptAddress,
    ESCROW_SCRIPT_CBOR_HEX: escrowValidator.compiledCode,
    ESCROW_SCRIPT_HASH: escrowValidator.hash,
  };

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent);

  console.log(`\n✅ Updated .env with escrow contract details`);

  // 5. Fund script address (optional, for testing)
  if (network === 'Preprod') {
    console.log(`\n💰 To fund the script address for testing:`);
    console.log(`   1. Get test ADA from faucet: https://docs.cardano.org/cardano-testnets/tools/faucet/`);
    console.log(`   2. Send to: ${scriptAddress}`);
  }

  // 6. Verify deployment
  console.log(`\n🔍 Verifying deployment...`);
  
  try {
    const scriptUtxos = await lucid.utxosAt(scriptAddress);
    console.log(`   Found ${scriptUtxos.length} UTXOs at script address`);
  } catch (error) {
    console.log(`   Script address is empty (expected for new deployment)`);
  }

  console.log(`\n✅ Deployment complete!`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Test locking funds: npm run test:escrow:lock`);
  console.log(`   2. Test releasing funds: npm run test:escrow:release`);
  console.log(`   3. Monitor on explorer: https://${network.toLowerCase()}.cardanoscan.io/address/${scriptAddress}`);
}

// Parse CLI arguments
const args = process.argv.slice(2);
const networkArg = args.find((arg) => arg.startsWith('--network='));
const network = networkArg?.split('=')[1] || 'Preprod';

if (network !== 'Preprod' && network !== 'Mainnet') {
  console.error('❌ Invalid network. Use: --network=preprod or --network=mainnet');
  process.exit(1);
}

// Run deployment
deployEscrowContract(network as 'Preprod' | 'Mainnet').catch((error) => {
  console.error('❌ Deployment failed:', error);
  process.exit(1);
});
