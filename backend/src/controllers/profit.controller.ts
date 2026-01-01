import { Request, Response } from 'express';
import { 
  PrismaClient, 
  InstallmentStatus, 
  InstallmentType, 
  TransactionType,
  TransactionStatus,
  FundingStatus
} from '@prisma/client';
import { recalculateFinancialScore } from '../services/reputation.service';

const prisma = new PrismaClient();

const PLATFORM_REVENUE_EMAIL = 'platform-revenue@catalyst.com';
const PLATFORM_RISK_EMAIL = 'platform-risk@catalyst.com';
const PLATFORM_FEE_FROM_SME_SHARE = 0.20; 
const PLATFORM_FEE_FROM_LENDER_SHARE = 0.10; 
const AGENT_COMMISSION_RATE = 0.05; 
const PLATFORM_RISK_WALLET_FEE = 0.10; 

const getMonthName = (month: number) => {
  const date = new Date(2000, month - 1, 1);
  return date.toLocaleString('en-US', { month: 'long' });
};

// --- POST /api/profit-reports ---
export const submitInstallmentReport = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });

  const { installmentId, reportedProfit, month, year } = req.body;
  if (!installmentId || reportedProfit === undefined || !month || !year) {
    return res.status(400).json({ error: 'Required fields missing.' });
  }

  try {
    const sme = await prisma.sME.findUnique({ where: { userId } });
    if (!sme) return res.status(403).json({ error: 'No SME profile found.' });

    const installment = await prisma.paymentInstallment.findUnique({
      where: { id: installmentId },
      include: { request: true } 
    });

    if (!installment) return res.status(404).json({ error: 'Installment not found.' });
    if (installment.smeId !== sme.id) return res.status(403).json({ error: 'Unauthorized.' });
    if (installment.status !== InstallmentStatus.PENDING) {
      return res.status(400).json({ error: 'Not pending a report.' });
    }

    const request = installment.request;
    const profitSharePercentage = request.profitSharePercentage / 100.0;
    
    const lenderGrossShare = Math.floor(reportedProfit * profitSharePercentage);
    const smeGrossShare = reportedProfit - lenderGrossShare;

    const platformFeeFromLender = Math.floor(lenderGrossShare * PLATFORM_FEE_FROM_LENDER_SHARE);
    const platformFeeFromSME = Math.floor(smeGrossShare * PLATFORM_FEE_FROM_SME_SHARE);
    const platformTotalRevenue = platformFeeFromLender + platformFeeFromSME;
    
    let agentCommission = 0;
    if (request.agentId) agentCommission = Math.floor(smeGrossShare * AGENT_COMMISSION_RATE);

    // Agent commission is paid by SME, NOT deducted from platform revenue
    const platformNetRevenue = platformTotalRevenue;
    const riskWalletContribution = Math.floor(platformNetRevenue * PLATFORM_RISK_WALLET_FEE);
    const platformFinalProfit = platformNetRevenue - riskWalletContribution;
    const totalDueToAgent = agentCommission;
    const totalDueToLender = lenderGrossShare - platformFeeFromLender;

    let totalDueFromSME = lenderGrossShare + platformFeeFromSME + agentCommission;
    if (installment.type === InstallmentType.FINAL_PAYMENT) {
      totalDueFromSME += request.amount; 
    }
    
    const updatedInstallment = await prisma.paymentInstallment.update({
      where: { id: installmentId },
      data: {
        month, year, reportedProfit, lenderGrossShare, smeGrossShare,
        platformFeeFromLender, platformFeeFromSME, agentCommission,
        totalDueFromSME, totalDueToLender, totalDueToAgent,
        platformTotalRevenue, platformNetRevenue, riskWalletContribution, platformFinalProfit
      },
    });

    res.status(200).json({ message: 'Report submitted.', installment: updatedInstallment });
  } catch (error) {
    console.error("Error submitting report:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- POST /api/payments/report/:reportId ---
export const payInstallment = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { reportId: installmentId } = req.params; 
  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const installment = await tx.paymentInstallment.findUnique({
        where: { id: installmentId },
        include: {
          request: { 
            include: { p2pFunder: true, orgFunder: true, agent: { include: { user: true } } }
          },
          investorShares: {
            include: {
              investor: {
                include: {
                  wallet: true
                }
              }
            }
          }
        }
      });

      if (!installment) throw new Error('Installment not found.');
      if (installment.status === InstallmentStatus.PAID) throw new Error('Already paid.');
      if (installment.totalDueFromSME === null) throw new Error('Report profit first.');

      const smeWallet = await tx.wallet.findUnique({ where: { userId } });
      if (!smeWallet || smeWallet.balanceNGN < BigInt(installment.totalDueFromSME)) throw new Error('Insufficient funds.');

      // Check if we have investor shares (multi-investor) or legacy single investor
      const hasInvestorShares = installment.investorShares && installment.investorShares.length > 0;

      if (!hasInvestorShares) {
        // Legacy single investor logic
        let lenderUserId: string | undefined;
        if (installment.request.p2pFunder) lenderUserId = installment.request.p2pFunder.id; 
        else if (installment.request.orgFunder) {
          const orgUser = await tx.orgUser.findFirst({ where: { organizationId: installment.request.orgFunder.id }});
          lenderUserId = orgUser?.userId;
        }
        if (!lenderUserId) throw new Error('Lender not found.');
        
        const lenderWallet = await tx.wallet.findUnique({ where: { userId: lenderUserId } });
        if (!lenderWallet) throw new Error('Lender wallet not found.');

        // Pay single lender
        await tx.wallet.update({ where: { id: smeWallet.id }, data: { balanceNGN: { decrement: BigInt(installment.totalDueFromSME) } } });
        await tx.wallet.update({ where: { id: lenderWallet.id }, data: { balanceNGN: { increment: BigInt(installment.totalDueToLender!) } } });
        
        if (installment.type === InstallmentType.FINAL_PAYMENT) {
          await tx.wallet.update({ where: { id: lenderWallet.id }, data: { balanceNGN: { increment: BigInt(installment.request.amount) } } });
        }
      } else {
        // Multi-investor profit distribution
        const totalProfitToDistribute = installment.totalDueToLender!;
        const principalToReturn = installment.type === InstallmentType.FINAL_PAYMENT ? installment.request.amount : 0;

        // Deduct total from SME
        await tx.wallet.update({ where: { id: smeWallet.id }, data: { balanceNGN: { decrement: BigInt(installment.totalDueFromSME) } } });

        // Distribute to each investor proportionally
        for (const share of installment.investorShares) {
          // Calculate this investor's profit share
          const investorProfitShare = Math.floor(totalProfitToDistribute * (share.sharePercentage / 100));
          
          // Calculate this investor's principal return (if final payment)
          const investorPrincipalReturn = Math.floor(principalToReturn * (share.sharePercentage / 100));
          
          const totalToInvestor = investorProfitShare + investorPrincipalReturn;

          if (!share.investor.wallet) throw new Error(`Wallet not found for investor ${share.investorId}`);

          // Credit investor wallet
          await tx.wallet.update({
            where: { id: share.investor.wallet.id },
            data: { balanceNGN: { increment: BigInt(totalToInvestor) } }
          });

          // Update InstallmentShare with payment details
          await tx.installmentShare.update({
            where: { id: share.id },
            data: {
              expectedShare: investorProfitShare,
              paidAmount: totalToInvestor,
              paidAt: new Date()
            }
          });

          // Create transaction record for this investor
          await tx.transaction.create({
            data: {
              amount: totalToInvestor,
              type: TransactionType.PROFIT_SHARE,
              status: TransactionStatus.COMPLETED,
              notes: `Profit share (${share.sharePercentage.toFixed(2)}%) for ${getMonthName(installment.month!)} ${installment.year!}`,
              senderId: userId,
              recipientId: share.investorId,
            }
          });
        }
      }

      // Handle agent commission
      let agentWallet;
      if (installment.request.agent && installment.totalDueToAgent && installment.totalDueToAgent > 0) { 
        agentWallet = await tx.wallet.findUnique({ where: { userId: installment.request.agent.user.id } });
        if (!agentWallet) throw new Error('Agent wallet not found.');
        await tx.wallet.update({ where: { id: agentWallet.id }, data: { balanceNGN: { increment: BigInt(installment.totalDueToAgent) } } });
      }

      // Handle platform revenue
      const revenueWallet = await tx.wallet.findFirstOrThrow({ where: { user: { email: PLATFORM_REVENUE_EMAIL } } });
      const riskWallet = await tx.wallet.findFirstOrThrow({ where: { user: { email: PLATFORM_RISK_EMAIL } } });
      
      await tx.wallet.update({ where: { id: revenueWallet.id }, data: { balanceNGN: { increment: BigInt(installment.platformFinalProfit!) } } });
      await tx.wallet.update({ where: { id: riskWallet.id }, data: { balanceNGN: { increment: BigInt(installment.riskWalletContribution!) } } });
      
      await tx.paymentInstallment.update({
        where: { id: installmentId },
        data: { status: InstallmentStatus.PAID, paidAt: new Date(), amountPaid: installment.totalDueFromSME }
      });
      
      const pending = await tx.paymentInstallment.count({
        where: { requestId: installment.requestId, status: { not: InstallmentStatus.PAID } }
      });
      if (pending === 0) {
        await tx.fundingRequest.update({ where: { id: installment.requestId }, data: { status: FundingStatus.COMPLETED } });
      }

      return { newBalance: Number(smeWallet.balanceNGN) - installment.totalDueFromSME };
    });

    await recalculateFinancialScore(userId);
    res.status(200).json({ message: 'Payment successful.', ...result });
  } catch (error: any) {
    console.error("Error paying:", error);
    res.status(400).json({ error: error.message || 'Payment failed.' });
  }
};

// --- GET /api/profit-reports/my-reports ---
export const getMyInstallments = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });

  try {
    const sme = await prisma.sME.findUnique({ where: { userId } });
    if (!sme) return res.status(403).json({ error: 'No SME profile found.' });

    // --- FIX: We MUST include the Request ID and details for grouping ---
    const reports = await prisma.paymentInstallment.findMany({
      where: { smeId: sme.id },
      include: {
        request: {
          select: {
            id: true, // Needed for grouping
            purpose: true,
            amount: true, // Needed for header
            profitSharePercentage: true,
            termInMonths: true
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.status(200).json(reports);

  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- GET /api/profit-reports/:id ---
export const getInstallmentById = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params; 
  if (!userId) return res.status(403).json({ error: 'Authorization failed.' });

  try {
    const sme = await prisma.sME.findUnique({ where: { userId } });
    if (!sme) return res.status(403).json({ error: 'No SME profile found.' });

    const report = await prisma.paymentInstallment.findUnique({
      where: { id },
      include: {
        request: { 
          select: { purpose: true, profitSharePercentage: true, amount: true },
        },
      },
    });

    if (!report) return res.status(404).json({ error: 'Report not found.' });
    if (report.smeId !== sme.id) return res.status(403).json({ error: 'Unauthorized.' });

    res.status(200).json(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};