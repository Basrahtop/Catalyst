import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// Import our routes
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import orderRoutes from './routes/order.routes';
import reviewRoutes from './routes/review.routes';
import fundingRoutes from './routes/funding.routes';
import walletRoutes from './routes/wallet.routes';
import userRoutes from './routes/user.routes';
import verificationRoutes from './routes/verification.routes';
import agentRoutes from './routes/agent.routes';
import adminRoutes from './routes/admin.routes';
import profitRoutes from './routes/profit.routes'; // <-- 1. THIS WAS THE MISSING IMPORT
import uploadRoutes from './routes/upload.routes';
import cardanoRoutes from './routes/cardano.routes';
import reputationRoutes from './routes/reputation.routes';
import reputationOnChainRoutes from './routes/reputation-onchain.routes';

const app = express();
const PORT = 8000;
const prisma = new PrismaClient();

// --- Main Server Function ---
async function main() {
  // --- Middleware ---
  app.use(cors()); // Allow cross-origin requests
  app.use(express.json()); // Allow our app to read JSON

  // --- Routes ---
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/funding-requests', fundingRoutes);
  app.use('/api/wallet', walletRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/verification', verificationRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);    
  app.use('/api/profit-reports', profitRoutes); // Handles /my-reports, / (submit)
  app.use('/api/payments', profitRoutes);
  app.use('/api/cardano', cardanoRoutes);
  app.use('/api/reputation', reputationRoutes);
  app.use('/api/reputation', reputationOnChainRoutes); // On-chain endpoints
 
  // Initialize Cardano Oracle Service (if enabled)
  if (process.env.CARDANO_ENABLED === 'true') {
    console.log('🔄 Initializing Cardano Oracle Service...');
    try {
      const { cardanoOracle } = await import('./cardano/services/oracle.service');
      const initialized = await cardanoOracle.initialize();
      if (initialized) {
        console.log('✅ Oracle Service active');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Cardano Oracle:', error);
      console.log('⚠️  Continuing without Cardano integration');
    }

    // Initialize Risk Fund Service
    console.log('🔄 Initializing Risk Fund Service...');
    try {
      const { riskFundService } = await import('./cardano/services/risk-fund.service');
      const initialized = await riskFundService.initialize();
      if (initialized) {
        console.log('✅ Risk Fund Service active');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Risk Fund Service:', error);
      console.log('⚠️  Continuing without Risk Fund');
    }
  }

  // Start the server
  app.listen(PORT, () => {
    console.log(`✅ Catalyst Real API running at http://localhost:${PORT}`);
  });
}

// Run the server
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Disconnect from the database when the app shuts down
    await prisma.$disconnect();
  });
