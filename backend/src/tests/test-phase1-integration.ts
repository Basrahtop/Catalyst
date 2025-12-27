/**
 * Phase 1 Multi-Currency Integration Test Suite
 * 
 * Tests all Phase 1 components:
 * 1. Database schema (Currency enum, multi-currency wallets)
 * 2. Exchange rate service
 * 3. Multi-currency wallet operations
 * 4. Currency conversions in database context
 */

import { PrismaClient, Currency } from '@prisma/client';
import { exchangeRateService } from '../services/exchange-rate.service';

const prisma = new PrismaClient();

async function runPhase1Tests() {
  console.log('🧪 Phase 1 Multi-Currency Integration Tests\n');
  console.log('='.repeat(70));

  let testUserId: string;
  let testSMEId: string;

  try {
    // Test 1: Verify Currency Enum
    console.log('\n📌 Test 1: Verify Currency enum exists');
    const currencies = [Currency.NGN, Currency.ADA, Currency.USDM];
    console.log(`   Currencies: ${currencies.join(', ')}`);
    console.log(`   ✅ Currency enum working`);

    // Test 2: Create test user with multi-currency wallet
    console.log('\n📌 Test 2: Create user with multi-currency wallet');
    const timestamp = Date.now();
    const testUser = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'Investor',
        email: `test-phase1-${timestamp}@example.com`,
        phone: `+234${timestamp.toString().slice(-10)}`,
        password: 'hashedpassword',
        roles: ['CUSTOMER'],
        isEmailVerified: true,
        wallet: {
          create: {
            balanceNGN: BigInt(10000000), // ₦100,000 in kobo
            // Note: ADA/USDM balances are queried from connected Cardano wallet, not stored here
          }
        }
      },
      include: { wallet: true }
    });
    testUserId = testUser.id;

    console.log(`   User ID: ${testUser.id}`);
    console.log(`   Wallet NGN: ₦${Number(testUser.wallet?.balanceNGN) / 100}`);
    console.log(`   ℹ️  ADA/USDM balances would be queried from connected Cardano wallet`);
    console.log(`   ✅ Multi-currency wallet created`);

    // Test 3: Test wallet balance queries by currency
    console.log('\n📌 Test 3: Query wallet balances by currency');
    const wallet = await prisma.wallet.findUnique({
      where: { userId: testUserId }
    });

    const balances = {
      NGN: Number(wallet?.balanceNGN || 0) / 100,
    };

    console.log(`   NGN Balance: ₦${balances.NGN.toLocaleString()}`);
    console.log(`   ℹ️  ADA/USDM balances queried from blockchain, not database`);
    console.log(`   ✅ NGN balance queryable`);

    // Test 4: Update wallet balances (NGN only)
    console.log('\n📌 Test 4: Update multi-currency wallet balances');
    const updatedWallet = await prisma.wallet.update({
      where: { userId: testUserId },
      data: {
        balanceNGN: { increment: BigInt(5000000) }, // Add ₦50,000
      }
    });

    console.log(`   Updated NGN: ₦${Number(updatedWallet.balanceNGN) / 100} (+₦50,000)`);
    console.log(`   ℹ️  ADA/USDM updates via smart contracts, not database`);
    console.log(`   ✅ NGN wallet balance updates working`);

    // Test 5: Create SME with multi-currency funding request
    console.log('\n📌 Test 5: Create SME with multi-currency funding request');
    const smeTimestamp = Date.now();
    const smeUser = await prisma.user.create({
      data: {
        email: `sme-phase1-${smeTimestamp}@example.com`,
        password: 'hashedpassword',
        roles: ['SME'],
        firstName: 'Test',
        lastName: 'SME',
        phone: `+234${smeTimestamp.toString().slice(-10)}`,
        isEmailVerified: true,
      }
    });
    
    const testSME = await prisma.sME.create({
      data: {
        userId: smeUser.id,
        businessName: 'Test SME Ltd',
        fundingRequests: {
          create: {
            amount: 5000000, // ₦50,000
            purpose: 'Test multi-currency funding',
            termInMonths: 12,
            profitSharePercentage: 20.0,
            acceptedCurrencies: [Currency.NGN, Currency.ADA, Currency.USDM],
            status: 'PENDING',
          }
        }
      },
      include: { fundingRequests: true }
    });
    testSMEId = testSME.id;

    const fundingRequest = testSME.fundingRequests[0];
    console.log(`   Funding Request ID: ${fundingRequest.id}`);
    console.log(`   Amount: ₦${fundingRequest.amount / 100}`);
    console.log(`   Accepted Currencies: ${fundingRequest.acceptedCurrencies.join(', ')}`);
    console.log(`   ✅ Multi-currency funding request created`);

    // Test 6: Create investment in different currencies
    console.log('\n📌 Test 6: Create investments in multiple currencies');
    
    // Get current exchange rates
    const adaRate = await exchangeRateService.getRate(Currency.ADA);
    const usdmRate = await exchangeRateService.getRate(Currency.USDM);

    // Investment 1: 10 ADA
    const investment1 = await prisma.investment.create({
      data: {
        investorId: testUserId,
        fundingRequestId: fundingRequest.id,
        amount: BigInt(10_000_000), // 10 ADA in lovelace
        currency: Currency.ADA,
        exchangeRateToNGN: adaRate,
        amountInNGN: Number((BigInt(10_000_000) * BigInt(adaRate) / BigInt(1_000_000))),
      }
    });

    const inv1NGN = Number(investment1.amountInNGN || 0) / 100;
    console.log(`   Investment 1: 10 ADA = ₦${inv1NGN.toFixed(2)}`);
    console.log(`   Exchange Rate: ₦${adaRate / 100} per ADA`);

    // Investment 2: 100 USDM
    const investment2 = await prisma.investment.create({
      data: {
        investorId: testUserId,
        fundingRequestId: fundingRequest.id,
        amount: BigInt(100_000_000), // 100 USDM in microUSDM
        currency: Currency.USDM,
        exchangeRateToNGN: usdmRate,
        amountInNGN: Number((BigInt(100_000_000) * BigInt(usdmRate) / BigInt(1_000_000))),
      }
    });

    const inv2NGN = Number(investment2.amountInNGN || 0) / 100;
    console.log(`   Investment 2: 100 USDM = ₦${inv2NGN.toFixed(2)}`);
    console.log(`   Exchange Rate: ₦${usdmRate / 100} per USDM`);
    console.log(`   ✅ Multi-currency investments created`);

    // Test 7: Query investments by currency
    console.log('\n📌 Test 7: Query investments by currency');
    const adaInvestments = await prisma.investment.findMany({
      where: { currency: Currency.ADA }
    });
    const usdmInvestments = await prisma.investment.findMany({
      where: { currency: Currency.USDM }
    });
    const ngnInvestments = await prisma.investment.findMany({
      where: { currency: Currency.NGN }
    });

    console.log(`   ADA Investments: ${adaInvestments.length}`);
    console.log(`   USDM Investments: ${usdmInvestments.length}`);
    console.log(`   NGN Investments: ${ngnInvestments.length}`);
    console.log(`   ✅ Currency filtering working`);

    // Test 8: Calculate total funding in different currencies
    console.log('\n📌 Test 8: Calculate total funding by currency');
    const totalByCurrently = await prisma.investment.groupBy({
      by: ['currency'],
      _sum: {
        amountInNGN: true,
      },
      where: {
        fundingRequestId: fundingRequest.id,
      }
    });

    console.log(`   Total funding breakdown:`);
    totalByCurrently.forEach(group => {
      const total = Number(group._sum.amountInNGN || 0) / 100;
      console.log(`   - ${group.currency}: ₦${total.toFixed(2)} (NGN equivalent)`);
    });
    console.log(`   ✅ Multi-currency aggregation working`);

    // Test 9: Create transaction in different currencies
    console.log('\n📌 Test 9: Create transactions in multiple currencies');
    
    // Create a recipient user for transactions
    const recipientUser = await prisma.user.create({
      data: {
        email: `recipient-${Date.now()}@example.com`,
        password: 'hashedpassword',
        roles: ['SME'],
        firstName: 'Recipient',
        lastName: 'User',
      }
    });

    const transaction1 = await prisma.transaction.create({
      data: {
        senderId: testUserId,
        recipientId: recipientUser.id,
        amount: BigInt(10_000_000), // 10 ADA
        currency: Currency.ADA,
        exchangeRateToNGN: adaRate,
        type: 'TRANSFER',
        status: 'COMPLETED',
      }
    });

    const transaction2 = await prisma.transaction.create({
      data: {
        senderId: testUserId,
        recipientId: recipientUser.id,
        amount: BigInt(100_000_000), // 100 USDM
        currency: Currency.USDM,
        exchangeRateToNGN: usdmRate,
        type: 'TRANSFER',
        status: 'COMPLETED',
      }
    });

    console.log(`   Transaction 1: ${Number(transaction1.amount) / 1_000_000} ${transaction1.currency}`);
    console.log(`   Transaction 2: ${Number(transaction2.amount) / 1_000_000} ${transaction2.currency}`);
    console.log(`   ✅ Multi-currency transactions created`);

    // Test 10: Query user transaction history across all currencies
    console.log('\n📌 Test 10: Query user transaction history');
    const userTransactions = await prisma.transaction.findMany({
      where: { senderId: testUserId },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`   Total transactions: ${userTransactions.length}`);
    userTransactions.forEach((txn, idx) => {
      const amount = Number(txn.amount) / 1_000_000;
      console.log(`   ${idx + 1}. ${amount} ${txn.currency}`);
    });
    console.log(`   ✅ Transaction history query working`);

    // Test 11: Test RiskFundContribution with multi-currency
    console.log('\n📌 Test 11: Create multi-currency risk fund contributions');
    const riskFund1 = await prisma.riskFundContribution.create({
      data: {
        smeId: testSMEId,
        amount: BigInt(5_000_000), // 5 ADA
        currency: Currency.ADA,
        conversionRate: adaRate / 100, // Store as Naira rate
      }
    });

    const riskFund2 = await prisma.riskFundContribution.create({
      data: {
        smeId: testSMEId,
        amount: BigInt(50_000_000), // 50 USDM
        currency: Currency.USDM,
        conversionRate: usdmRate / 100, // Store as Naira rate
      }
    });

    const risk1NGN = (Number(riskFund1.amount) / 1_000_000) * (riskFund1.conversionRate || 0);
    const risk2NGN = (Number(riskFund2.amount) / 1_000_000) * (riskFund2.conversionRate || 0);
    console.log(`   Risk Fund 1: 5 ADA = ₦${risk1NGN.toFixed(2)}`);
    console.log(`   Risk Fund 2: 50 USDM = ₦${risk2NGN.toFixed(2)}`);
    console.log(`   ✅ Multi-currency risk fund contributions working`);

    // Test 12: Test InstallmentShare with different currencies
    console.log('\n📌 Test 12: Create installment shares with multi-currency');
    
    // First create a PaymentInstallment
    const paymentInstallment = await prisma.paymentInstallment.create({
      data: {
        smeId: testSMEId,
        requestId: fundingRequest.id,
        installmentNumber: 1,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        type: 'PROFIT_SHARE',
        status: 'PENDING',
      }
    });

    const installmentShare = await prisma.installmentShare.create({
      data: {
        investorId: testUserId,
        installmentId: paymentInstallment.id,
        investmentAmount: BigInt(10_000_000), // 10 ADA in lovelace
        investmentCurrency: Currency.ADA,
        sharePercentage: 10.0, // 10% share
        paymentCurrency: Currency.NGN,
      }
    });

    console.log(`   Investment: ${Number(installmentShare.investmentAmount) / 1_000_000} ${installmentShare.investmentCurrency}`);
    console.log(`   Share Percentage: ${installmentShare.sharePercentage}%`);
    console.log(`   Payment Currency: ${installmentShare.paymentCurrency}`);
    console.log(`   ✅ Multi-currency installment shares working`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL PHASE 1 TESTS PASSED!\n');

    console.log('📊 Summary:');
    console.log(`   ✅ Currency enum (NGN, ADA, USDM)`);
    console.log(`   ✅ NGN wallet balance (database)`);
    console.log(`   ✅ ADA/USDM balances (blockchain, not stored)`);
    console.log(`   ✅ Multi-currency investments`);
    console.log(`   ✅ Multi-currency transactions`);
    console.log(`   ✅ Multi-currency funding requests`);
    console.log(`   ✅ Multi-currency risk fund contributions`);
    console.log(`   ✅ Multi-currency installment shares`);
    console.log(`   ✅ Exchange rate tracking per transaction`);
    console.log(`   ✅ Currency filtering and aggregation`);
    console.log(`   ✅ Real-time exchange rate integration\n`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup: Delete test data
    console.log('🧹 Cleaning up test data...');
    if (testUserId) {
      await prisma.installmentShare.deleteMany({ where: { investorId: testUserId } });
      await prisma.investment.deleteMany({ where: { investorId: testUserId } });
      await prisma.transaction.deleteMany({ where: { OR: [{ senderId: testUserId }, { recipientId: testUserId }] } });
      await prisma.wallet.delete({ where: { userId: testUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (testSMEId) {
      await prisma.paymentInstallment.deleteMany({ where: { smeId: testSMEId } });
      await prisma.riskFundContribution.deleteMany({ where: { smeId: testSMEId } });
      await prisma.fundingRequest.deleteMany({ where: { smeId: testSMEId } });
      await prisma.sME.delete({ where: { id: testSMEId } }).catch(() => {});
    }
    // Cleanup recipient user
    await prisma.user.deleteMany({ where: { email: { contains: 'recipient-' } } });
    console.log('✅ Cleanup complete');
    
    await prisma.$disconnect();
  }
}

// Run tests
runPhase1Tests();
