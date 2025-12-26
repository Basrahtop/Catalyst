import * as cron from 'node-cron';
import { cardanoOracle } from './oracle.service';

// Run on application startup
async function startOracleService() {
  console.log('🚀 Starting Cardano Oracle Service...');
  
  // Initialize Lucid and load smart contract
  const initialized = await cardanoOracle.initialize();
  
  if (!initialized) {
    console.log('⚠️  Oracle service initialization skipped (Cardano disabled or missing config)');
    return;
  }

  // Run initial reputation update
  console.log('🔄 Running initial reputation update...');
  await cardanoOracle.updateAllReputationScores();

  // Schedule updates every 12 hours (at 00:00 and 12:00)
  cron.schedule('0 0,12 * * *', async () => {
    console.log('⏰ Scheduled reputation update triggered');
    try {
      await cardanoOracle.updateAllReputationScores();
    } catch (error) {
      console.error('❌ Scheduled update failed:', error);
    }
  });

  console.log('✅ Oracle service started - updates scheduled every 12 hours');
}

// Start the service
startOracleService().catch((error) => {
  console.error('❌ Oracle service failed to start:', error);
  process.exit(1);
});
