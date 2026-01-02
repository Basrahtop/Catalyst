/**
 * Quick script to add NGN funds to investor wallet
 * Usage: npx ts-node scripts/add-ngn-funds.ts <userId> <amount>
 * Example: npx ts-node scripts/add-ngn-funds.ts cmjlxd8i5000a03b0zjrfom0f 10000000
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addFunds(userId: string, amountNGN: number) {
  try {
    // Convert to kobo (smallest unit)
    const amountKobo = BigInt(Math.floor(amountNGN * 100));

    // Check if wallet exists
    const wallet = await prisma.wallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      console.error(`❌ No wallet found for user ${userId}`);
      console.log('Creating wallet...');
      
      await prisma.wallet.create({
        data: {
          userId,
          balanceNGN: amountKobo,
          currency: 'NGN'
        }
      });
      
      console.log(`✅ Wallet created with ₦${amountNGN.toLocaleString()}`);
    } else {
      // Update existing wallet
      const updated = await prisma.wallet.update({
        where: { userId },
        data: {
          balanceNGN: {
            increment: amountKobo
          }
        }
      });

      const newBalanceNGN = Number(updated.balanceNGN) / 100;
      console.log(`✅ Added ₦${amountNGN.toLocaleString()}`);
      console.log(`New balance: ₦${newBalanceNGN.toLocaleString()}`);
    }

  } catch (error) {
    console.error('Error adding funds:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const userId = process.argv[2];
const amount = parseFloat(process.argv[3]);

if (!userId || !amount || isNaN(amount)) {
  console.log('Usage: npx ts-node scripts/add-ngn-funds.ts <userId> <amountNGN>');
  console.log('Example: npx ts-node scripts/add-ngn-funds.ts cmjlxd8i5000a03b0zjrfom0f 10000000');
  process.exit(1);
}

addFunds(userId, amount);
