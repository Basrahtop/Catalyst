-- AlterTable
ALTER TABLE "PaymentInstallment" ADD COLUMN     "platformFinalProfit" INTEGER,
ADD COLUMN     "platformNetRevenue" INTEGER,
ADD COLUMN     "platformTotalRevenue" INTEGER,
ADD COLUMN     "riskWalletContribution" INTEGER;
