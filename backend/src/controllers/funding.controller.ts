import { Request, Response } from 'express';
import { 
  PrismaClient, 
  RepaymentFrequency, 
  FundingStatus,
  InstallmentType,
  InstallmentStatus
} from '@prisma/client';

const prisma = new PrismaClient();

// --- THIS IS OUR "SMART LEDGER" GENERATOR ---
const createPaymentSchedule = async (
  request: { id: string, smeId: string, termInMonths: number, repaymentFrequency: RepaymentFrequency, amount: number },
  tx: any // This is the Prisma Transaction Client
) => {
  
  const approvalDate = new Date(); // Today's date
  const installmentsToCreate = [];

  if (request.repaymentFrequency === RepaymentFrequency.END_OF_TERM_LUMP_SUM) {
    // --- 1. Your "Lump Sum" (Farmer) Logic ---
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
    // --- 2. Your "Monthly" Logic ---
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

  // 3. Create all the "stubs" in the database
  await tx.paymentInstallment.createMany({
    data: installmentsToCreate,
  });

  console.log(`Created ${installmentsToCreate.length} installment stubs for request ${request.id}.`);

  // 4. Fetch all investments for this request and calculate investor shares
  const investments = await tx.investment.findMany({
    where: { fundingRequestId: request.id },
    select: {
      investorId: true,
      amount: true,
    },
  });

  // 5. Group by investor and sum their total contributions
  const investorTotals = new Map<string, number>();
  investments.forEach((inv: { investorId: string; amount: number }) => {
    const currentTotal = investorTotals.get(inv.investorId) || 0;
    investorTotals.set(inv.investorId, currentTotal + inv.amount);
  });

  // 6. Calculate each investor's percentage
  const totalFunded = request.amount;
  const investorShares = Array.from(investorTotals.entries()).map(([investorId, amount]) => ({
    investorId,
    investmentAmount: amount,
    sharePercentage: (amount / totalFunded) * 100,
  }));

  // 7. For each installment created, create InstallmentShare records for each investor
  const createdInstallments = await tx.paymentInstallment.findMany({
    where: { requestId: request.id },
    select: { id: true },
  });

  const installmentSharesToCreate = [];
  for (const installment of createdInstallments) {
    for (const share of investorShares) {
      installmentSharesToCreate.push({
        installmentId: installment.id,
        investorId: share.investorId,
        investmentAmount: share.investmentAmount,
        sharePercentage: share.sharePercentage,
      });
    }
  }

  if (installmentSharesToCreate.length > 0) {
    await tx.installmentShare.createMany({
      data: installmentSharesToCreate,
    });
    console.log(`Created ${installmentSharesToCreate.length} installment shares for ${investorShares.length} unique investors.`);
  }
};
// --- END OF "SMART LEDGER" GENERATOR ---


// --- POST /api/funding-requests ---
export const createFundingRequest = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  const { 
    amount, 
    purpose, 
    profitSharePercentage, 
    termInMonths,
    repaymentFrequency 
  } = req.body;

  if (!amount || !purpose || !profitSharePercentage || !termInMonths || !repaymentFrequency) {
    return res.status(400).json({ error: 'All investment terms are required.' });
  }
  if (!Object.values(RepaymentFrequency).includes(repaymentFrequency as any)) {
    return res.status(400).json({ error: 'Invalid repaymentFrequency.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        sme: true,
        sponsoringAgentId: true
      }
    });

    if (!user || !user.sme) {
      return res.status(403).json({ error: 'No SME profile found for this user.' });
    }
    
    let agentId: string | null = null;
    if (user.sponsoringAgentId) {
      agentId = user.sponsoringAgentId;
    }

    const newRequest = await prisma.fundingRequest.create({
      data: {
        amount: amount, 
        purpose: purpose,
        profitSharePercentage: profitSharePercentage,
        termInMonths: termInMonths,
        repaymentFrequency: repaymentFrequency,
        smeId: user.sme.id,
        agentId: agentId,
      },
    });

    res.status(201).json(newRequest);

  } catch (error) {
    console.error("Error creating funding request:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- GET /api/funding-requests ---
export const getAllRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.fundingRequest.findMany({
      where: {
        status: {
          in: [FundingStatus.PENDING, FundingStatus.PARTIALLY_FUNDED],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        sme: {
          select: {
            id: true,
            businessName: true,
            marketplaceScore: true,
            feedbackScore: true,
            userId: true,
            user: {
              select: {
                platformTrustScore: true,
                financialScore: true,
                cardanoWallet: {
                  select: {
                    reputationId: true,
                    verified: true,
                    address: true
                  }
                }
              }
            },
            reputationHistory: {
              where: {
                cardanoTxHash: { not: null }
              },
              orderBy: {
                timestamp: 'desc'
              },
              take: 1,
              select: {
                cardanoTxHash: true,
                cardanoUTxORef: true,
                overallScore: true,
                marketplaceScore: true,
                feedbackScore: true,
                platformTrustScore: true,
                financialScore: true,
                timestamp: true
              }
            }
          },
        },
        investments: {
          select: {
            amount: true,
            investorId: true,
            createdAt: true,
          },
        },
      },
    });

    // Transform the data to include blockchain verification status
    const enhancedRequests = requests.map(request => ({
      ...request,
      sme: {
        ...request.sme,
        blockchainReputation: request.sme.reputationHistory.length > 0 
          ? {
              verified: true,
              txHash: request.sme.reputationHistory[0].cardanoTxHash,
              utxoRef: request.sme.reputationHistory[0].cardanoUTxORef,
              timestamp: request.sme.reputationHistory[0].timestamp,
              scores: {
                overall: request.sme.reputationHistory[0].overallScore,
                marketplace: request.sme.reputationHistory[0].marketplaceScore,
                feedback: request.sme.reputationHistory[0].feedbackScore,
                trust: request.sme.reputationHistory[0].platformTrustScore,
                financial: request.sme.reputationHistory[0].financialScore
              }
            }
          : {
              verified: false,
              message: 'SME has not recorded reputation on blockchain yet'
            },
        reputationHistory: undefined // Remove from response to keep it clean
      }
    }));

    res.status(200).json(enhancedRequests);
  } catch (error) {
    console.error("Error fetching all requests:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- GET /api/funding-requests/my-requests ---
// --- THIS IS THE MISSING FUNCTION ---
export const getMyRequests = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    const sme = await prisma.sME.findUnique({
      where: { userId: userId },
    });

    if (!sme) {
      return res.status(403).json({ error: 'No SME profile found for this user.' });
    }

    const myRequests = await prisma.fundingRequest.findMany({
      where: {
        smeId: sme.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json(myRequests);

  } catch (error) {
    console.error("Error fetching SME's requests:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};
// --- END OF MISSING FUNCTION ---

// --- GET /api/funding-requests/my-investments ---
export const getMyInvestments = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  try {
    // Get all investments by this investor
    const investments = await prisma.investment.findMany({
      where: {
        investorId: userId,
      },
      include: {
        fundingRequest: {
          include: {
            sme: {
              select: {
                businessName: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate stats
    const totalInvestedHistorical = investments.reduce((sum, inv) => sum + inv.amount, 0);
    
    // Currently invested (exclude completed investments)
    const currentlyInvested = investments
      .filter(inv => inv.fundingRequest.status !== 'COMPLETED')
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    // Active investments (APPROVED or PARTIALLY_FUNDED)
    const activeInvestments = investments.filter(inv => 
      inv.fundingRequest.status === 'APPROVED' || inv.fundingRequest.status === 'PARTIALLY_FUNDED'
    ).length;
    
    // Completed investments
    const completedInvestments = investments.filter(inv => 
      inv.fundingRequest.status === 'COMPLETED'
    ).length;
    
    // Calculate actual profit received (from paid installment shares)
    const paidShares = await prisma.installmentShare.findMany({
      where: {
        investorId: userId,
        paidAmount: { not: null },
      },
      select: {
        expectedShare: true, // This is the profit portion only
        paidAmount: true,
        investmentAmount: true,
      },
    });

    const actualProfitReceived = paidShares.reduce((sum, share) => 
      sum + (share.expectedShare || 0), 0
    );
    
    // Calculate capital returned (from completed investments)
    // For each completed investment, find their shares and sum up (paidAmount - expectedShare)
    const completedInvestmentIds = investments
      .filter(inv => inv.fundingRequest.status === 'COMPLETED')
      .map(inv => inv.fundingRequestId);
    
    const completedShares = await prisma.installmentShare.findMany({
      where: {
        investorId: userId,
        installment: {
          requestId: { in: completedInvestmentIds },
          type: 'FINAL_PAYMENT',
        },
        paidAmount: { not: null },
      },
      select: {
        paidAmount: true,
        expectedShare: true,
      },
    });
    
    const capitalReturned = completedShares.reduce((sum, share) => 
      sum + ((share.paidAmount || 0) - (share.expectedShare || 0)), 0
    );

    res.status(200).json({
      investments,
      stats: {
        totalInvestedHistorical,
        currentlyInvested,
        activeInvestments,
        completedInvestments,
        actualProfitReceived,
        capitalReturned,
        totalInvestments: investments.length,
      }
    });

  } catch (error) {
    console.error("Error fetching investor's investments:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- GET /api/investments/:id/installments ---
export const getInvestmentInstallments = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id: investmentId } = req.params;
  const { requestId } = req.query;

  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  if (!requestId) {
    return res.status(400).json({ error: 'requestId query parameter is required.' });
  }

  try {
    // Verify the investment belongs to this user
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: {
        fundingRequest: true,
      },
    });

    if (!investment) {
      return res.status(404).json({ error: 'Investment not found.' });
    }

    if (investment.investorId !== userId) {
      return res.status(403).json({ error: 'Unauthorized access to this investment.' });
    }

    // Fetch all installment shares for this investor and funding request
    const installmentShares = await prisma.installmentShare.findMany({
      where: {
        investorId: userId,
        installment: {
          requestId: requestId as string,
        },
      },
      include: {
        installment: {
          select: {
            id: true,
            month: true,
            year: true,
            status: true,
            type: true,
            totalDueFromSME: true,
            reportedProfit: true,
          },
        },
      },
      orderBy: {
        installment: {
          month: 'asc',
        },
      },
    });

    res.status(200).json({
      installmentShares,
    });

  } catch (error) {
    console.error('Error fetching installment shares:', error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};



// --- PATCH /api/funding-requests/:id/approve ---
export const approveRequest = async (req: Request, res: Response) => {
  const { id: requestId } = req.params;
  const { fundingAmount } = req.body; // Amount in kobo
  const userId = req.userId; 

  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }

  if (!fundingAmount || fundingAmount <= 0) {
    return res.status(400).json({ error: 'Valid funding amount is required.' });
  }

  try {
    const approvedRequest = await prisma.$transaction(async (tx) => {
      
      const request = await tx.fundingRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error('Request not found.');
      }
      if (request.status !== FundingStatus.PENDING && request.status !== FundingStatus.PARTIALLY_FUNDED) {
        throw new Error('This request is not available for funding.');
      }

      // Calculate remaining amount needed
      const remainingAmount = request.amount - request.amountFunded;
      
      // Validate funding amount doesn't exceed remaining amount
      if (fundingAmount > remainingAmount) {
        throw new Error(`Funding amount cannot exceed remaining amount of ${remainingAmount / 100} NGN.`);
      }

      // Check investor's wallet balance
      const investorWallet = await tx.wallet.findUnique({
        where: { userId: userId },
      });

      if (!investorWallet || investorWallet.balance < fundingAmount) {
        throw new Error('Insufficient wallet balance.');
      }

      // Deduct from investor's wallet
      await tx.wallet.update({
        where: { userId: userId },
        data: {
          balance: {
            decrement: fundingAmount,
          },
        },
      });

      // Add to SME's wallet
      const sme = await tx.sME.findUnique({
        where: { id: request.smeId },
        include: { user: true },
      });

      if (!sme) {
        throw new Error('SME not found.');
      }

      const smeWallet = await tx.wallet.findUnique({
        where: { userId: sme.userId },
      });

      if (smeWallet) {
        await tx.wallet.update({
          where: { userId: sme.userId },
          data: {
            balance: {
              increment: fundingAmount,
            },
          },
        });
      } else {
        // Create wallet if doesn't exist
        await tx.wallet.create({
          data: {
            userId: sme.userId,
            balance: fundingAmount,
          },
        });
      }

      // Create investment record for this investor
      await tx.investment.create({
        data: {
          amount: fundingAmount,
          investorId: userId,
          fundingRequestId: requestId,
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          amount: fundingAmount,
          type: 'TRANSFER',
          status: 'COMPLETED',
          senderId: userId,
          recipientId: sme.userId,
          notes: `Investment funding for ${sme.businessName}`,
        },
      });

      // Calculate new total funded amount
      const newAmountFunded = request.amountFunded + fundingAmount;
      const isFullyFunded = newAmountFunded >= request.amount;

      const orgUser = await tx.orgUser.findUnique({
        where: { userId: userId },
      });

      let dataToUpdate: any = {
        amountFunded: newAmountFunded,
        status: isFullyFunded ? FundingStatus.APPROVED : FundingStatus.PARTIALLY_FUNDED,
      };

      // Only set funder if this is the first funding (for backwards compatibility)
      if (request.amountFunded === 0) {
        if (orgUser) {
          dataToUpdate.orgFunderId = orgUser.organizationId;
        } else {
          dataToUpdate.p2pFunderId = userId;
        }
      }
      
      const updatedRequest = await tx.fundingRequest.update({
        where: { id: requestId },
        data: dataToUpdate,
      });

      // --- ONLY CREATE PAYMENT SCHEDULE IF FULLY FUNDED ---
      if (isFullyFunded) {
        await createPaymentSchedule(updatedRequest, tx);
      }
      // --- END OF "SMART LEDGER" ---

      return updatedRequest; 
    });

    res.status(200).json(approvedRequest);

  } catch (error: any) {
    console.error("Error approving request:", error);
    if (error.message === 'Request not found.') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('not available for funding')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('cannot exceed remaining amount')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Insufficient wallet balance.') {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'SME not found.') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Something went wrong.' });
  }
};

// --- (declineRequest is 100% correct) ---
export const declineRequest = async (req: Request, res: Response) => {
  const { id: requestId } = req.params;
  const { reason } = req.body;
  const userId = req.userId;
  if (!userId) {
    return res.status(403).json({ error: 'Authorization failed.' });
  }
  if (!reason) {
    return res.status(400).json({ error: 'A reason for decline is required.' });
  }
  try {
    const request = await prisma.fundingRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    if (request.status !== FundingStatus.PENDING) {
      return res.status(400).json({ error: 'This request is not pending.' });
    }
    const orgUser = await prisma.orgUser.findUnique({
      where: { userId: userId },
    });
    let dataToUpdate: any = {
      status: FundingStatus.DECLINED,
      declineReason: reason,
    };
    if (orgUser) {
      dataToUpdate.orgFunderId = orgUser.organizationId;
    } else {
      dataToUpdate.p2pFunderId = userId;
    }
    const updatedRequest = await prisma.fundingRequest.update({
      where: { id: requestId },
      data: dataToUpdate,
    });
    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error("Error declining request:", error);
    res.status(500).json({ error: 'Something went wrong.' });
  }
};