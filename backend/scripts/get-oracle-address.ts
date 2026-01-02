/**
 * Derive Oracle Wallet Address from Seed Phrase
 */

import { Lucid, Blockfrost } from 'lucid-cardano';

async function getOracleAddress() {
  const seedPhrase = process.env.ORACLE_WALLET_SEED_PHRASE;
  
  if (!seedPhrase) {
    console.error('ORACLE_WALLET_SEED_PHRASE not found in environment');
    process.exit(1);
  }

  const lucid = await Lucid.new(
    new Blockfrost(
      'https://cardano-preprod.blockfrost.io/api/v0',
      'preprodSDhqnSGef08RSBOd2pgw8BjMaSn5uXVw'
    ),
    'Preprod'
  );

  lucid.selectWalletFromSeed(seedPhrase);
  const address = await lucid.wallet.address();

  console.log('\n=================================================');
  console.log('🔑 Oracle Wallet Address');
  console.log('=================================================');
  console.log('Address:', address);
  console.log('=================================================\n');
  console.log('Add this to backend/.env:');
  console.log(`ORACLE_ADDRESS=${address}`);
  console.log('=================================================\n');
}

getOracleAddress().catch(console.error);
