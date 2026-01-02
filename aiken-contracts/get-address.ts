/**
 * Generate Cardano address from compiled Aiken contract
 * Usage: tsx get-address.ts
 */

import { Lucid, Blockfrost } from 'lucid-cardano';
import plutusJson from './plutus.json' assert { type: 'json' };

async function getContractAddress() {
  // Initialize Lucid with Preprod network
  const lucid = await Lucid.new(
    new Blockfrost(
      'https://cardano-preprod.blockfrost.io/api/v0',
      'preprodAPI_KEY_PLACEHOLDER' // Not needed for address generation
    ),
    'Preprod'
  );

  // Get the investment escrow validator
  const escrowValidator = plutusJson.validators.find(
    (v: any) => v.title === 'investment_escrow.investment_escrow.spend'
  );

  if (!escrowValidator) {
    console.error('Escrow validator not found in plutus.json');
    process.exit(1);
  }

  // Generate contract address
  const scriptCborHex = escrowValidator.compiledCode;
  const contractAddress = lucid.utils.validatorToAddress({
    type: 'PlutusV3',
    script: scriptCborHex,
  });

  console.log('\n=================================================');
  console.log('📜 Aiken Contract Details');
  console.log('=================================================');
  console.log('Contract Hash:', escrowValidator.hash);
  console.log('Contract Address:', contractAddress);
  console.log('=================================================\n');
  console.log('Add this to your backend .env file:');
  console.log(`ESCROW_CONTRACT_ADDRESS=${contractAddress}`);
  console.log('=================================================\n');
}

getContractAddress().catch(console.error);
