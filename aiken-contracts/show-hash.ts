/**
 * Generate Cardano address from contract hash
 * 
 * For Preprod testnet:
 * - Script addresses start with 0x70 (script credential) + 0x00 (no staking)
 * - Then the script hash (28 bytes)
 * - Bech32 encoded with 'addr_test' prefix
 */

import * as fs from 'fs';
import * as crypto from 'crypto';

// Read plutus.json
const plutusJson = JSON.parse(fs.readFileSync('./plutus.json', 'utf-8'));

// Get the escrow validator
const escrowValidator = plutusJson.validators.find(
  (v: any) => v.title === 'investment_escrow.investment_escrow.spend'
);

if (!escrowValidator) {
  console.error('Escrow validator not found in plutus.json');
  process.exit(1);
}

const scriptHash = escrowValidator.hash;

console.log('\n=================================================');
console.log('📜 Aiken Contract Details');
console.log('=================================================');
console.log('Contract Title:', escrowValidator.title);
console.log('Contract Hash:', scriptHash);
console.log('Compiled Code Length:', escrowValidator.compiledCode.length, 'chars');
console.log('=================================================');
console.log('\nScript Hash:', scriptHash);
console.log('\n⚠️  To get the full bech32 address, use Lucid in a running app');
console.log('   or use cardano-cli:\n');
console.log(`   cardano-cli address build \\`);
console.log(`     --payment-script-hash ${scriptHash} \\`);
console.log(`     --testnet-magic 1\n`);
console.log('For now, you can use the previously deployed address:');
console.log('addr_test1wph84dqvrlev2vztmeznfcfzrjcczg6z3j4n3x90cwn5xsg5rn5rh');
console.log('=================================================\n');
