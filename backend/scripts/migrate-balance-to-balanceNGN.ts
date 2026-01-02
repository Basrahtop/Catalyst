/**
 * Migration Script: Copy deprecated 'balance' field to 'balanceNGN'
 * 
 * This script:
 * 1. Finds all wallets with balance > 0
 * 2. Adds that balance to balanceNGN (doesn't replace, adds to existing)
 * 3. Logs all changes
 * 4. After running this, you can safely remove 'balance' field from schema
 * 
 * Usage: npx ts-node scripts/migrate-balance-to-balanceNGN.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Starting balance migration...\n');

  try {
    // Get all wallets
    const wallets = await prisma.wallet.findMany({
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log(`Found ${wallets.length} wallets in database\n`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const wallet of wallets) {
      const oldBalance = wallet.balance;
      const currentBalanceNGN = wallet.balanceNGN;

      // Only migrate if old balance > 0
      if (oldBalance > 0) {
        const newBalanceNGN = currentBalanceNGN + BigInt(oldBalance);

        await prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            balanceNGN: newBalanceNGN
          }
        });

        console.log(`✅ Migrated ${wallet.user.email}:`);
        console.log(`   Old balance: ${oldBalance / 100} NGN`);
        console.log(`   Previous balanceNGN: ${Number(currentBalanceNGN) / 100} NGN`);
        console.log(`   New balanceNGN: ${Number(newBalanceNGN) / 100} NGN`);
        console.log('');

        migratedCount++;
      } else {
        console.log(`⏭️  Skipped ${wallet.user.email}: balance is 0`);
        skippedCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total wallets: ${wallets.length}`);
    console.log(`   Migrated: ${migratedCount}`);
    console.log(`   Skipped (balance = 0): ${skippedCount}`);
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify the balances in your app');
    console.log('   2. Update Prisma schema to remove "balance" field');
    console.log('   3. Run: npx prisma migrate dev --name remove_deprecated_balance');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
