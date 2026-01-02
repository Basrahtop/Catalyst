/**
 * Check all APPROVED requests to see which have schedules and which don't
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAll() {
  console.log('=== CHECKING ALL APPROVED REQUESTS ===\n');

  const approvedRequests = await prisma.fundingRequest.findMany({
    where: {
      status: 'APPROVED',
    },
    include: {
      sme: {
        select: {
          businessName: true,
        },
      },
      _count: {
        select: {
          paymentInstallments: true,
          investments: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  console.log(`Found ${approvedRequests.length} APPROVED requests\n`);

  const withSchedule = [];
  const withoutSchedule = [];

  for (const req of approvedRequests) {
    const info = {
      id: req.id,
      business: req.sme.businessName,
      purpose: req.purpose,
      amount: req.amount,
      funded: req.amountFunded,
      investments: req._count.investments,
      installments: req._count.paymentInstallments,
      updatedAt: req.updatedAt,
    };

    if (req._count.paymentInstallments > 0) {
      withSchedule.push(info);
    } else {
      withoutSchedule.push(info);
    }
  }

  console.log(`✅ WITH SCHEDULE: ${withSchedule.length} requests`);
  withSchedule.forEach((req, i) => {
    console.log(`\n${i + 1}. ${req.business} - ${req.purpose}`);
    console.log(`   Goal: ₦${(req.amount / 100).toLocaleString()}`);
    console.log(`   Funded: ₦${(req.funded / 100).toLocaleString()}`);
    console.log(`   Investments: ${req.investments}`);
    console.log(`   Installments: ${req.installments}`);
    console.log(`   Updated: ${req.updatedAt.toISOString()}`);
  });

  console.log(`\n\n❌ WITHOUT SCHEDULE: ${withoutSchedule.length} requests`);
  withoutSchedule.forEach((req, i) => {
    console.log(`\n${i + 1}. ${req.business} - ${req.purpose}`);
    console.log(`   Goal: ₦${(req.amount / 100).toLocaleString()}`);
    console.log(`   Funded: ₦${(req.funded / 100).toLocaleString()}`);
    console.log(`   Investments: ${req.investments}`);
    console.log(`   Installments: ${req.installments} ❌`);
    console.log(`   Updated: ${req.updatedAt.toISOString()}`);
  });

  // Check when each investment was made
  if (withoutSchedule.length > 0) {
    console.log('\n\n=== DETAILED INVESTMENT TIMELINE FOR BROKEN REQUESTS ===');
    
    for (const req of withoutSchedule) {
      console.log(`\n📋 ${req.business} - ${req.purpose}`);
      
      const investments = await prisma.investment.findMany({
        where: { fundingRequestId: req.id },
        include: {
          investor: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      investments.forEach((inv, i) => {
        const amountDisplay = inv.currency === 'NGN' 
          ? `₦${(Number(inv.amount) / 100).toFixed(2)}`
          : inv.currency === 'ADA'
          ? `${(Number(inv.amount) / 1_000_000).toFixed(2)} ADA`
          : `${(Number(inv.amount) / 1_000_000).toFixed(2)} USDM`;
        
        console.log(`\n   ${i + 1}. ${inv.investor.firstName} ${inv.investor.lastName}`);
        console.log(`      ${amountDisplay} (₦${((inv.amountInNGN || 0) / 100).toFixed(2)} equiv)`);
        console.log(`      ${inv.currency} @ ${inv.createdAt.toISOString()}`);
      });
    }
  }

  await prisma.$disconnect();
}

checkAll().catch((error) => {
  console.error('Check failed:', error);
  process.exit(1);
});
