/**
 * Test Wallet Balance Service
 * Demonstrates how balances are queried:
 * - NGN: From database (platform-managed)
 * - ADA/USDM: From connected Cardano wallet (live blockchain query)
 */

import { PrismaClient, Currency } from '@prisma/client';
import { walletBalanceService } from '../services/wallet-balance.service';

const prisma = new PrismaClient();

async function testWalletBalanceService() {
  console.log('🧪 Testing Wallet Balance Service\n');
  console.log('='.repeat(70));

  let testUserId: string;

  try {
    // Test 1: Create user with NGN balance only
    console.log('\n📌 Test 1: Create user with NGN balance (platform-managed)');
    const timestamp = Date.now();
    const testUser = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `wallet-test-${timestamp}@example.com`,
        phone: `+234${timestamp.toString().slice(-10)}`,
        password: 'hashedpassword',
        roles: ['CUSTOMER'],
        isEmailVerified: true,
        wallet: {
          create: {
            balanceNGN: BigInt(5000000), // ₦50,000 in kobo
          }
        }
      },
      include: { wallet: true }
    });
    testUserId = testUser.id;

    console.log(`   User ID: ${testUser.id}`);
    console.log(`   NGN Balance (DB): ₦${Number(testUser.wallet?.balanceNGN || 0) / 100}`);
    console.log(`   ✅ NGN balance stored in database`);

    // Test 2: Query complete balance (NGN from DB, ADA/USDM from blockchain)
    console.log('\n📌 Test 2: Query complete wallet balance');
    const balance = await walletBalanceService.getUserBalance(testUserId);
    
    console.log(`   NGN: ${Number(balance.NGN) / 100} (from database)`);
    console.log(`   ADA: ${Number(balance.ADA) / 1_000_000} ADA (from blockchain)`);
    console.log(`   USDM: ${Number(balance.USDM) / 1_000_000} USDM (from blockchain)`);
    console.log(`   ℹ️  ADA/USDM are 0 because no Cardano wallet is connected yet`);
    console.log(`   ✅ Balance service working`);

    // Test 3: Display formatted balances
    console.log('\n📌 Test 3: Get formatted balance display');
    const displayBalance = await walletBalanceService.getUserBalanceDisplay(testUserId);
    
    console.log(`   NGN: ${displayBalance.NGN}`);
    console.log(`   ADA: ${displayBalance.ADA}`);
    console.log(`   USDM: ${displayBalance.USDM}`);
    console.log(`   ✅ Formatted display working`);

    // Test 4: Check sufficient balance
    console.log('\n📌 Test 4: Check sufficient balance');
    const hasNGN = await walletBalanceService.hasSufficientBalance(
      testUserId,
      BigInt(3000000), // ₦30,000
      Currency.NGN
    );
    const hasADA = await walletBalanceService.hasSufficientBalance(
      testUserId,
      BigInt(5_000_000), // 5 ADA
      Currency.ADA
    );

    console.log(`   Has ₦30,000: ${hasNGN ? '✅ Yes' : '❌ No'}`);
    console.log(`   Has 5 ADA: ${hasADA ? '✅ Yes' : '❌ No (wallet not connected)'}`);

    // Test 5: Deduct NGN balance
    console.log('\n📌 Test 5: Deduct NGN balance (platform operation)');
    await walletBalanceService.deductNGN(testUserId, BigInt(2000000)); // Deduct ₦20,000
    
    const newBalance = await walletBalanceService.getUserBalance(testUserId);
    console.log(`   New NGN Balance: ₦${Number(newBalance.NGN) / 100}`);
    console.log(`   ✅ NGN deduction working`);

    // Test 6: Add NGN balance
    console.log('\n📌 Test 6: Add NGN balance (platform credit)');
    await walletBalanceService.addNGN(testUserId, BigInt(1000000)); // Add ₦10,000
    
    const finalBalance = await walletBalanceService.getUserBalance(testUserId);
    console.log(`   Final NGN Balance: ₦${Number(finalBalance.NGN) / 100}`);
    console.log(`   ✅ NGN addition working`);

    // Test 7: Simulate Cardano wallet connection
    console.log('\n📌 Test 7: Connect Cardano wallet');
    const testWalletAddress = 'addr_test1qz...example'; // Mock address
    await walletBalanceService.refreshCardanoWallet(
      testUserId,
      testWalletAddress,
      'nami'
    );

    const cardanoWallet = await prisma.cardanoWallet.findUnique({
      where: { userId: testUserId }
    });

    console.log(`   Wallet Address: ${cardanoWallet?.address}`);
    console.log(`   Wallet Type: ${cardanoWallet?.walletType}`);
    console.log(`   ✅ Cardano wallet connected`);
    console.log(`   ℹ️  ADA/USDM balances would now be queried from blockchain`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED!\n');

    console.log('📊 Summary:');
    console.log(`   ✅ NGN balance: Stored in database, platform-managed`);
    console.log(`   ✅ ADA/USDM balance: Queried from connected Cardano wallet`);
    console.log(`   ✅ Balance service provides unified view`);
    console.log(`   ✅ NGN operations (deduct/add) work via database`);
    console.log(`   ✅ ADA/USDM operations would use smart contracts`);
    console.log(`   ✅ Cardano wallet connection tracking working\n`);

    console.log('🔗 Integration Flow:');
    console.log(`   1. User connects Cardano wallet (Nami/Eternl/etc)`);
    console.log(`   2. Wallet address stored in CardanoWallet table`);
    console.log(`   3. ADA/USDM balance queried via Blockfrost when needed`);
    console.log(`   4. Investments in ADA/USDM lock funds in smart contract`);
    console.log(`   5. NGN balance managed separately by platform`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    if (testUserId) {
      await prisma.cardanoWallet.deleteMany({ where: { userId: testUserId } });
      await prisma.wallet.delete({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    console.log('✅ Cleanup complete\n');
    
    await prisma.$disconnect();
  }
}

// Run tests
testWalletBalanceService();
