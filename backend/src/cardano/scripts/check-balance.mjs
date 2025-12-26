import { Lucid, Blockfrost } from "lucid-cardano";
import * as dotenv from "dotenv";

dotenv.config();

async function checkBalance() {
  try {
    console.log('🔍 Checking wallet balance...\n');

    const lucid = await Lucid.new(
      new Blockfrost(
        process.env.BLOCKFROST_URL,
        process.env.BLOCKFROST_API_KEY
      ),
      "Preprod"
    );

    // Admin 1 address
    const address = "addr_test1vpnc2plevg68aa4nqxku6gf72tnu3nae7fdcdqvhxyl68wck3a300";
    
    const utxos = await lucid.utxosAt(address);
    
    if (utxos.length === 0) {
      console.log('❌ No UTxOs found. Wallet has no funds.');
      console.log('\n📝 Request test ADA from: https://docs.cardano.org/cardano-testnets/tools/faucet/');
      console.log(`   Address: ${address}`);
      return;
    }

    let totalLovelace = 0n;
    utxos.forEach(utxo => {
      totalLovelace += utxo.assets.lovelace;
    });

    const ada = Number(totalLovelace) / 1_000_000;
    
    console.log(`✅ Address: ${address}`);
    console.log(`💰 Balance: ${ada.toFixed(6)} ADA (${totalLovelace} lovelace)`);
    console.log(`📦 UTxOs: ${utxos.length}`);
    console.log('\n🎉 Wallet is funded and ready for on-chain transactions!');

  } catch (error) {
    console.error('❌ Error checking balance:', error.message);
  }
}

checkBalance();
