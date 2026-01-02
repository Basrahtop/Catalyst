/**
 * Check if ADA investment has amountInNGN set
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkADA() {
  console.log('=== CHECKING ADA INVESTMENT ===\n');

  const adaInvestment = await prisma.investment.findFirst({
    where: {
      currency: 'ADA',
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!adaInvestment) {
    console.log('No ADA investment found');
    return;
  }

  console.log('ADA Investment Details:');
  console.log(`ID: ${adaInvestment.id}`);
  console.log(`Amount: ${adaInvestment.amount} lovelace (${Number(adaInvestment.amount) / 1_000_000} ADA)`);
  console.log(`Currency: ${adaInvestment.currency}`);
  console.log(`Exchange Rate: ${adaInvestment.exchangeRateToNGN}`);
  console.log(`amountInNGN: ${adaInvestment.amountInNGN}`);
  console.log(`amountInNGN typeof: ${typeof adaInvestment.amountInNGN}`);
  console.log(`amountInNGN is null: ${adaInvestment.amountInNGN === null}`);
  
  if (adaInvestment.amountInNGN) {
    console.log(`\n✅ amountInNGN is set: ₦${(adaInvestment.amountInNGN / 100).toFixed(2)}`);
  } else {
    console.log(`\n❌ amountInNGN is NULL or undefined!`);
    console.log('This would cause NaN in schedule calculation!');
  }

  // Check what happens in reduce
  const testInvestments = [
    { investorId: 'test1', amountInNGN: adaInvestment.amountInNGN },
    { investorId: 'test2', amountInNGN: 1 },
  ];

  const total = testInvestments.reduce((sum: number, inv: { amountInNGN: number | null }) => {
    console.log(`\nReduce step: sum=${sum}, inv.amountInNGN=${inv.amountInNGN}`);
    const result = sum + (inv.amountInNGN || 0);
    console.log(`Result: ${result}, isNaN: ${isNaN(result)}`);
    return result;
  }, 0);

  console.log(`\nFinal total: ${total}`);
  console.log(`isNaN: ${isNaN(total)}`);

  await prisma.$disconnect();
}

checkADA().catch(error => {
  console.error('Check failed:', error);
  process.exit(1);
});
