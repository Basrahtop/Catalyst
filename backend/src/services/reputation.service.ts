import { PrismaClient, VerificationStatus, OrderStatus, InstallmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

// --- COMPONENT SCORE CONSTANTS ---
// Total: 1000 points (Marketplace 300 + Feedback 350 + Platform Trust 150 + Financial 200)
const MAX_MARKETPLACE_SCORE = 300;  // Order fulfillment rate
const MAX_FEEDBACK_SCORE = 350;     // Customer review ratings
const MAX_PLATFORM_SCORE = 150;     // Email + KYC verification
const MAX_FINANCIAL_SCORE = 200;    // On-time payment rate
const BASE_PLATFORM_SCORE = 50;     // Base starting score (adjusted for 150 max)

/**
 * Recalculates the Platform Trust score for a user.
 * This is triggered by:
 * 1. Email Verification
 * 2. KYC (NIN) Verification
 */
export const recalculatePlatformTrust = async (userId: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { verification: true },
    });

    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      return;
    }

    console.log(`\n🔍 Recalculating Platform Trust for User ${userId}:`);
    console.log(`  - Email Verified: ${user.isEmailVerified}`);
    console.log(`  - Verification Record Exists: ${!!user.verification}`);
    console.log(`  - NIN Status: ${user.verification?.ninStatus || 'N/A'}`);

    let score = BASE_PLATFORM_SCORE; // Start with the base score (50)
    console.log(`  - Base Score: ${score}`);

    // Add points for email verification (25 points)
    if (user.isEmailVerified) {
      score += 25;
      console.log(`  - Email Verified Bonus: +25 → ${score}`);
    }

    // Add points for KYC verification (NIN) (75 points)
    if (user.verification?.ninStatus === VerificationStatus.VERIFIED) {
      score += 75;
      console.log(`  - KYC Verified Bonus: +75 → ${score}`);
    }
    
    // (In V2, we can add points for BVN, Address, etc.)

    // Ensure score doesn't exceed the max
    const finalScore = Math.min(score, MAX_PLATFORM_SCORE);

    await prisma.user.update({
      where: { id: userId },
      data: { platformTrustScore: finalScore },
    });

    console.log(`✅ Final Platform Trust Score: ${finalScore}/${MAX_PLATFORM_SCORE}\n`);
    
  } catch (error) {
    console.error(`Error recalculating platform trust for ${userId}:`, error);
  }
};


/**
 * Recalculates the Marketplace & Feedback scores for an SME.
 * This is triggered by:
 * 1. An Order being marked "COMPLETED" or "CANCELLED"
 * 2. A Review being created, updated, or deleted
 */
export const recalculateSMEPerformance = async (smeId: string) => {
  try {
    // --- 1. Calculate Marketplace Score (Reliability) ---
    const totalFinishedOrders = await prisma.order.count({
      where: { 
        smeId: smeId,
        status: { in: [OrderStatus.COMPLETED, OrderStatus.CANCELLED] }
      },
    });

    const completedOrders = await prisma.order.count({
      where: {
        smeId: smeId,
        status: OrderStatus.COMPLETED
      }
    });

    let marketplaceScore = 0;
    if (totalFinishedOrders > 0) {
      // The score is (Completed / Total) * MaxScore
      const fulfillmentRate = completedOrders / totalFinishedOrders;
      marketplaceScore = Math.floor(fulfillmentRate * MAX_MARKETPLACE_SCORE);
    }

    // --- 2. Calculate Feedback Score (Quality) ---
    const reviewStats = await prisma.review.aggregate({
      where: {
        product: {
          smeId: smeId,
        },
      },
      _avg: {
        rating: true,
      },
    });

    let feedbackScore = 0;
    const avgRating = reviewStats._avg.rating || 0;

    if (avgRating > 0) {
      // The score is (Average Rating / 5) * MaxScore
      feedbackScore = Math.floor((avgRating / 5.0) * MAX_FEEDBACK_SCORE);
    }

    // --- 3. Update the SME record ---
    await prisma.sME.update({
      where: { id: smeId },
      data: {
        marketplaceScore: marketplaceScore,
        feedbackScore: feedbackScore,
      },
    });

    console.log(`Updated SME Scores for ${smeId}: Marketplace=${marketplaceScore}, Feedback=${feedbackScore}`);

  } catch (error) {
    console.error(`Error recalculating SME performance for ${smeId}:`, error);
  }
};


/**
 * Recalculates the Financial Score for a user.
 * (This function is 100% fixed, using the "Fetch and Filter" method)
 */
export const recalculateFinancialScore = async (userId: string) => {
  try {
    const sme = await prisma.sME.findUnique({
      where: { userId: userId },
    });
    if (!sme) return; // This user is not an SME

    // --- THIS IS THE "FETCH AND FILTER" FIX ---

    // 1. "Fetch": Get *all* finished installments for this SME
    const allFinishedInstallments = await prisma.paymentInstallment.findMany({
      where: {
        smeId: sme.id,
        // We only score installments that are PAID or LATE
        status: { in: [InstallmentStatus.PAID, InstallmentStatus.LATE] }, 
        paidAt: { not: null }, // Must have a payment date
      },
      select: {
        paidAt: true,
        dueDate: true,
        status: true,
      }
    });

    if (allFinishedInstallments.length === 0) {
      // No payments yet, so score is 0.
      await prisma.user.update({
        where: { id: userId },
        data: { financialScore: 0 },
      });
      console.log(`No financial data for ${userId}, score set to 0`);
      return;
    }

    // 2. "Filter": Use JavaScript to find the on-time ones
    // An "on-time" payment is one that is 'PAID' (not 'LATE')
    // AND was paid on or before its due date.
    const onTimePayments = allFinishedInstallments.filter(installment => {
      return installment.status === InstallmentStatus.PAID && 
             installment.paidAt! <= installment.dueDate!;
    });
    // --- END OF FIX ---

    // 3. Calculate the score
    let financialScore = 0;
    const totalFinishedInstallments = allFinishedInstallments.length;
    const totalOnTimePayments = onTimePayments.length;

    if (totalFinishedInstallments > 0) {
      // The score is (OnTime / Total) * MaxScore
      financialScore = Math.floor((totalOnTimePayments / totalFinishedInstallments) * MAX_FINANCIAL_SCORE);
    }

    // 4. Update the User record
    await prisma.user.update({
      where: { id: userId },
      data: {
        financialScore: financialScore,
      },
    });
    
    console.log(`Updated Financial Score for ${userId}: ${financialScore} (${totalOnTimePayments}/${totalFinishedInstallments} on time)`);

  } catch (error) {
    console.error(`Error recalculating financial score for ${userId}:`, error);
  }
};