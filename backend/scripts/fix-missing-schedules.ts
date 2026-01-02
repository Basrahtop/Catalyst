/**
 * Create missing schedules for both requests
 */

import { PrismaClient } from '@prisma/client';
import { createPaymentSchedule } from '../src/utils/payment-schedule';

const prisma = new PrismaClient();

async function fixMissingSchedules() {
  console.log('=== FIXING MISSING SCHEDULES ===\n');

  // Both requests from investigation
  const requestIds = [
    'cmjve2c9w000h03ic7fgc2h1d', // Fabric business ₦200k
    'cmjlxamxd000203b0oymzxmrw', // Podcast studio ₦500k (needs to be found)
  ];

  // Find all APPROVED requests without schedules
  const brokenRequests = await prisma.fundingRequest.findMany({
    where: {
      status: 'APPROVED',
      amountFunded: { gte: prisma.fundingRequest.fields.amount },
    },
    include: {
      sme: {
        select: {
          id: true,
          businessName: true,
        },
      },
      _count: {
        select: {
          paymentInstallments: true,
        },
      },
    },
  });

  console.log(`Found ${brokenRequests.length} APPROVED requests`);

  const needsSchedule = brokenRequests.filter(r => r._count.paymentInstallments === 0);
  
  console.log(`${needsSchedule.length} need schedules created\n`);

  for (const request of needsSchedule) {
    console.log(`\n📋 ${request.sme.businessName} - ${request.purpose}`);
    console.log(`   Goal: ₦${(request.amount / 100).toLocaleString()}`);
    console.log(`   Funded: ₦${(request.amountFunded / 100).toLocaleString()}`);

    try {
      await prisma.$transaction(async (tx) => {
        await createPaymentSchedule(request, tx);
      });

      console.log(`   ✅ Schedule created successfully`);

      // Verify
      const count = await prisma.paymentInstallment.count({
        where: { requestId: request.id },
      });
      console.log(`   Verified: ${count} installments created`);

    } catch (error: any) {
      console.log(`   ❌ FAILED: ${error.message}`);
    }
  }

  console.log('\n\n=== FINAL STATUS ===\n');

  const allApproved = await prisma.fundingRequest.findMany({
    where: { status: 'APPROVED' },
    include: {
      _count: {
        select: {
          paymentInstallments: true,
        },
      },
    },
  });

  console.log(`Total APPROVED requests: ${allApproved.length}`);
  console.log(`With schedules: ${allApproved.filter(r => r._count.paymentInstallments > 0).length}`);
  console.log(`Without schedules: ${allApproved.filter(r => r._count.paymentInstallments === 0).length}`);

  await prisma.$disconnect();
}

fixMissingSchedules().catch(error => {
  console.error('Fix failed:', error);
  process.exit(1);
});
