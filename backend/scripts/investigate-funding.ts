/**
 * Investigation Script: Check database state for funded request
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigate() {
  console.log('=== INVESTIGATION: Funded Request Issue ===\n');

  // 1. Find the recently funded request (₦500,000 - "Basrahtop IT")
  console.log('1. Searching for Basrahtop IT funding request...');
  const fundingRequests = await prisma.fundingRequest.findMany({
    where: {
      sme: {
        businessName: {
          contains: 'Basrahtop',
          mode: 'insensitive',
        },
      },
    },
    include: {
      sme: {
        select: {
          businessName: true,
          userId: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (fundingRequests.length === 0) {
    console.log('❌ No Basrahtop requests found. Checking all recent requests...');
    
    const allRecent = await prisma.fundingRequest.findMany({
      where: {
        amountFunded: { gte: 499900 * 100 }, // At least ₦499,900
      },
      include: {
        sme: { select: { businessName: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });
    
    console.log('\nRecent nearly-funded or fully-funded requests:');
    allRecent.forEach((req, i) => {
      console.log(`\n${i + 1}. ${req.sme.businessName}`);
      console.log(`   Request ID: ${req.id}`);
      console.log(`   Goal: ₦${(req.amount / 100).toLocaleString()}`);
      console.log(`   Funded: ₦${(req.amountFunded / 100).toLocaleString()}`);
      console.log(`   Progress: ${((req.amountFunded / req.amount) * 100).toFixed(2)}%`);
      console.log(`   Status: ${req.status}`);
    });
    
    if (allRecent.length === 0) {
      console.log('❌ No nearly-funded requests found.');
      await prisma.$disconnect();
      return;
    }
    
    fundingRequests.push(allRecent[0]);
  }

  const targetRequest = fundingRequests[0];
  console.log(`\n✅ Found: ${targetRequest.sme.businessName}`);
  console.log(`   Request ID: ${targetRequest.id}`);
  console.log(`   Goal: ₦${(targetRequest.amount / 100).toLocaleString()}`);
  console.log(`   Funded: ₦${(targetRequest.amountFunded / 100).toLocaleString()}`);
  console.log(`   Progress: ${((targetRequest.amountFunded / targetRequest.amount) * 100).toFixed(4)}%`);
  console.log(`   Status: ${targetRequest.status}`);
  console.log(`   Term: ${targetRequest.termInMonths} months`);
  console.log(`   Repayment: ${targetRequest.repaymentFrequency}`);

  // 2. Check all investments for this request
  console.log('\n2. Checking investments for this request...');
  const investments = await prisma.investment.findMany({
    where: { fundingRequestId: targetRequest.id },
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

  console.log(`\n   Total investments: ${investments.length}`);
  let totalInvestedNGN = 0;
  investments.forEach((inv, i) => {
    const amountDisplay = inv.currency === 'NGN' 
      ? `₦${(Number(inv.amount) / 100).toFixed(2)}`
      : inv.currency === 'ADA'
      ? `${(Number(inv.amount) / 1_000_000).toFixed(2)} ADA`
      : `${(Number(inv.amount) / 1_000_000).toFixed(2)} USDM`;
    
    const ngnEquiv = inv.amountInNGN || 0;
    totalInvestedNGN += ngnEquiv;
    
    console.log(`\n   ${i + 1}. ${inv.investor.firstName} ${inv.investor.lastName}`);
    console.log(`      Amount: ${amountDisplay} (₦${(ngnEquiv / 100).toFixed(2)} NGN equiv)`);
    console.log(`      Currency: ${inv.currency}`);
    console.log(`      Exchange Rate: ${inv.exchangeRateToNGN}`);
    console.log(`      Date: ${inv.createdAt.toISOString()}`);
    console.log(`      TX Hash: ${inv.blockchainTxHash || 'N/A'}`);
  });

  console.log(`\n   📊 Sum of all amountInNGN: ₦${(totalInvestedNGN / 100).toFixed(2)}`);
  console.log(`   📊 Request amountFunded: ₦${(targetRequest.amountFunded / 100).toFixed(2)}`);
  console.log(`   📊 Difference: ₦${((totalInvestedNGN - targetRequest.amountFunded) / 100).toFixed(2)}`);

  // 3. Check if PaymentInstallment records exist
  console.log('\n3. Checking for payment installments...');
  const installments = await prisma.paymentInstallment.findMany({
    where: { requestId: targetRequest.id },
    orderBy: { installmentNumber: 'asc' },
  });

  if (installments.length === 0) {
    console.log('   ❌ NO PAYMENT INSTALLMENTS FOUND!');
    console.log('   This confirms: Schedule was never created.');
  } else {
    console.log(`   ✅ Found ${installments.length} installments`);
    installments.forEach((inst) => {
      console.log(`\n   Installment #${inst.installmentNumber}`);
      console.log(`      Due Date: ${inst.dueDate.toISOString().split('T')[0]}`);
      console.log(`      Type: ${inst.type}`);
      console.log(`      Status: ${inst.status}`);
    });
  }

  // 4. Check InstallmentShare records
  console.log('\n4. Checking for installment shares...');
  const shares = await prisma.installmentShare.findMany({
    where: {
      installment: {
        requestId: targetRequest.id,
      },
    },
    include: {
      investor: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      installment: {
        select: {
          installmentNumber: true,
        },
      },
    },
  });

  if (shares.length === 0) {
    console.log('   ❌ NO INSTALLMENT SHARES FOUND!');
  } else {
    console.log(`   ✅ Found ${shares.length} shares`);
    shares.slice(0, 5).forEach((share) => {
      console.log(`\n   ${share.investor.firstName} ${share.investor.lastName} - Installment #${share.installment.installmentNumber}`);
      console.log(`      Share: ${share.sharePercentage.toFixed(2)}%`);
      console.log(`      Amount: ₦${(Number(share.investmentAmount) / 100).toFixed(2)}`);
      console.log(`      Currency: ${share.investmentCurrency}`);
    });
  }

  // 5. Check SME details for the my-reports query
  console.log('\n5. Checking SME profile...');
  const sme = await prisma.sME.findUnique({
    where: { userId: targetRequest.sme.userId },
    select: {
      id: true,
      businessName: true,
      userId: true,
    },
  });

  if (!sme) {
    console.log('   ❌ SME profile not found!');
  } else {
    console.log(`   ✅ SME ID: ${sme.id}`);
    console.log(`   Business: ${sme.businessName}`);
    
    // Simulate the my-reports query
    console.log('\n6. Simulating GET /api/profit-reports/my-reports query...');
    const reports = await prisma.paymentInstallment.findMany({
      where: { smeId: sme.id },
      include: {
        request: {
          select: {
            id: true,
            purpose: true,
            amount: true,
            profitSharePercentage: true,
            termInMonths: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    console.log(`   Query returned: ${reports.length} installments`);
    if (reports.length === 0) {
      console.log('   ❌ This explains why SME sees no payment schedule!');
    } else {
      const grouped = reports.reduce((acc: any, inst) => {
        if (!acc[inst.requestId]) {
          acc[inst.requestId] = {
            purpose: inst.request.purpose,
            installments: [],
          };
        }
        acc[inst.requestId].installments.push(inst);
        return acc;
      }, {});

      console.log(`   ✅ Would show ${Object.keys(grouped).length} funded requests with schedules`);
    }
  }

  // 7. Final diagnosis
  console.log('\n=== DIAGNOSIS ===');
  const isFullyFunded = targetRequest.amountFunded >= targetRequest.amount;
  const hasApprovedStatus = targetRequest.status === 'APPROVED';
  const hasInstallments = installments.length > 0;

  console.log(`✓ Request is fully funded: ${isFullyFunded ? '✅ YES' : '❌ NO'}`);
  console.log(`✓ Request status is APPROVED: ${hasApprovedStatus ? '✅ YES' : '❌ NO'}`);
  console.log(`✓ Payment installments created: ${hasInstallments ? '✅ YES' : '❌ NO'}`);

  if (isFullyFunded && hasApprovedStatus && !hasInstallments) {
    console.log('\n🔍 ROOT CAUSE: Request marked as funded but schedule creation failed!');
    console.log('   Possible reasons:');
    console.log('   1. Error occurred during schedule creation (check backend logs)');
    console.log('   2. Transaction was partially committed');
    console.log('   3. Schedule creation was skipped due to logic error');
  }

  await prisma.$disconnect();
}

investigate().catch((error) => {
  console.error('Investigation failed:', error);
  process.exit(1);
});
