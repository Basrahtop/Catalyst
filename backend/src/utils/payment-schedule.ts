/**
 * Payment Schedule Generator
 * 
 * Creates payment installment schedules for fully funded requests
 */

import { 
  RepaymentFrequency, 
  InstallmentType,
  InstallmentStatus,
  Currency,
} from '@prisma/client';

/**
 * Creates payment schedule for a funding request
 * This generates installment stubs based on term and frequency
 */
export const createPaymentSchedule = async (
  request: { 
    id: string;
    smeId: string;
    termInMonths: number;
    repaymentFrequency: RepaymentFrequency;
    amount: number;
  },
  tx: any // Prisma Transaction Client
) => {
  
  const approvalDate = new Date();
  const installmentsToCreate = [];

  if (request.repaymentFrequency === RepaymentFrequency.END_OF_TERM_LUMP_SUM) {
    // Lump Sum: Single payment at end of term
    const dueDate = new Date(approvalDate.getTime() + (30 * request.termInMonths * 24 * 60 * 60 * 1000));
    
    installmentsToCreate.push({
      requestId: request.id,
      smeId: request.smeId,
      installmentNumber: 1,
      dueDate: dueDate,
      type: InstallmentType.FINAL_PAYMENT,
      status: InstallmentStatus.PENDING,
    });

  } else {
    // Monthly: Create installment for each month
    for (let i = 1; i <= request.termInMonths; i++) {
      const dueDate = new Date(approvalDate.getTime() + (30 * i * 24 * 60 * 60 * 1000));
      
      const isFinalPayment = (i === request.termInMonths);
      const installmentType = isFinalPayment 
        ? InstallmentType.FINAL_PAYMENT 
        : InstallmentType.PROFIT_SHARE;

      installmentsToCreate.push({
        requestId: request.id,
        smeId: request.smeId,
        installmentNumber: i,
        dueDate: dueDate,
        type: installmentType,
        status: InstallmentStatus.PENDING,
      });
    }
  }

  // Create all installment stubs in database
  await tx.paymentInstallment.createMany({
    data: installmentsToCreate,
  });

  console.log(`✅ Created ${installmentsToCreate.length} installment stubs for request ${request.id}`);

  // Fetch all investments for this request to calculate investor shares
  const investments = await tx.investment.findMany({
    where: { fundingRequestId: request.id },
    select: {
      investorId: true,
      amountInNGN: true, // Use NGN equivalent for share calculation
    },
  });

  // Calculate total funded amount in NGN
  const totalFundedInNGN = investments.reduce((sum: number, inv: { amountInNGN: number }) => sum + inv.amountInNGN, 0);

  // GROUP BY investorId and SUM their contributions (handles multiple investments from same investor)
  const investorContributions = new Map<string, number>();
  investments.forEach((inv: { investorId: string; amountInNGN: number }) => {
    const current = investorContributions.get(inv.investorId) || 0;
    investorContributions.set(inv.investorId, current + inv.amountInNGN);
  });

  // Calculate each investor's share based on their TOTAL contribution
  const investorShares = Array.from(investorContributions.entries()).map(([investorId, totalContribution]) => ({
    investorId,
    sharePercentage: (totalContribution / totalFundedInNGN) * 100,
    totalContribution,
  }));

  console.log(`📊 Investor shares:`, investorShares.map(s => `${s.investorId.slice(0,8)}: ${s.sharePercentage.toFixed(2)}%`));

  // Get all created installments
  const createdInstallments = await tx.paymentInstallment.findMany({
    where: { requestId: request.id },
    select: { id: true },
  });

  // Create investor shares for each installment (ONE record per investor per installment)
  const installmentSharesToCreate = [];
  for (const installment of createdInstallments) {
    for (const { investorId, sharePercentage, totalContribution } of investorShares) {
      installmentSharesToCreate.push({
        installmentId: installment.id,
        investorId: investorId,
        investmentAmount: BigInt(Math.floor(totalContribution)), // Their total investment
        investmentCurrency: Currency.NGN, // For now, storing in NGN equivalent
        sharePercentage: sharePercentage,
      });
    }
  }

  await tx.installmentShare.createMany({
    data: installmentSharesToCreate,
  });

  console.log(`✅ Created ${installmentSharesToCreate.length} investor installment records for request ${request.id}`);
};
