/*
  Warnings:

  - Changed the type of `currency` on the `RiskFundContribution` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('NGN', 'ADA', 'USDM');

-- AlterTable
ALTER TABLE "FundingRequest" ADD COLUMN     "acceptedCurrencies" "Currency"[] DEFAULT ARRAY['NGN']::"Currency"[];

-- AlterTable
ALTER TABLE "InstallmentShare" ADD COLUMN     "investmentCurrency" "Currency" NOT NULL DEFAULT 'NGN',
ADD COLUMN     "paymentCurrency" "Currency",
ALTER COLUMN "investmentAmount" SET DATA TYPE BIGINT,
ALTER COLUMN "expectedShare" SET DATA TYPE BIGINT,
ALTER COLUMN "paidAmount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "amountInNGN" INTEGER,
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'NGN',
ADD COLUMN     "exchangeRateToNGN" DOUBLE PRECISION,
ALTER COLUMN "amount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "RiskFundContribution" ALTER COLUMN "amount" SET DATA TYPE BIGINT,
DROP COLUMN "currency",
ADD COLUMN     "currency" "Currency" NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'NGN',
ADD COLUMN     "exchangeRateToNGN" DOUBLE PRECISION,
ALTER COLUMN "amount" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "balanceADA" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "balanceNGN" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "balanceUSDM" BIGINT NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Investment_currency_idx" ON "Investment"("currency");
