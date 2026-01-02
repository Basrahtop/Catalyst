/**
 * Get Oracle Wallet Address from Seed Phrase
 */

// Mock - just show what needs to be done
console.log('\n=================================================');
console.log('🔑 Oracle Wallet Setup');
console.log('=================================================');
console.log('\nTo get your oracle wallet address:');
console.log('\n1. Open your wallet (Eternl/Nami) that has the seed phrase');
console.log('2. Go to "Receive" tab');
console.log('3. Copy the payment address (starts with addr_test...)');
console.log('4. Add it to backend/.env as:');
console.log('   ORACLE_ADDRESS=addr_test1...');
console.log('\nOR use cardano-cli:');
console.log('   cardano-cli address key-gen --verification-key-file payment.vkey --signing-key-file payment.skey');
console.log('   cardano-cli address build --payment-verification-key-file payment.vkey --testnet-magic 1');
console.log('=================================================\n');
