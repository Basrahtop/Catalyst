/**
 * Manually try to create payment schedule for the broken requests
 */

import { PrismaClient } from '@prisma/client';
import { createPaymentSchedule } from '../src/utils/payment-schedule';

const prisma = new PrismaClient();

async function testScheduleCreation() {
  console.log('=== TESTING SCHEDULE CREATION ===\n');

  // Get the Podcast Studio request (the one with ADA + NGN)
  const requestId = 'cmjve2c9w000h03ic7fgc2h1d'; // From earlier investigation

  const request = await prisma.fundingRequest.findUnique({
    where: { id: requestId },
    include: {
      sme: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  if (!request) {
    console.log('Request not found');
    return;
  }

  console.log(`Found request: ${request.purpose}`);
  console.log(`SME: ${request.sme.businessName}`);
  console.log(`Amount: ₦${(request.amount / 100).toLocaleString()}`);
  console.log(`Funded: ₦${(request.amountFunded / 100).toLocaleString()}`);
  console.log(`Term: ${request.termInMonths} months`);
  console.log(`Repayment: ${request.repaymentFrequency}`);

  // Try to create schedule
  console.log('\n📝 Attempting to create payment schedule...\n');

  try {
    await prisma.$transaction(async (tx) => {
      await createPaymentSchedule(request, tx);
    });

    console.log('\n✅ SUCCESS! Schedule created.');

    // Verify
    const installments = await prisma.paymentInstallment.findMany({
      where: { requestId },
    });

    console.log(`\nVerification: Found ${installments.length} installments`);

    const shares = await prisma.installmentShare.count({
      where: {
        installment: {
          requestId,
        },
      },
    });

    console.log(`Verification: Found ${shares} investor shares`);

  } catch (error: any) {
    console.log('\n❌ FAILED TO CREATE SCHEDULE');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }

  await prisma.$disconnect();
}

testScheduleCreation().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
