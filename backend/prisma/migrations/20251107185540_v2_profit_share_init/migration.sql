/*
  Warnings:

  - You are about to drop the `Repayment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `termInMonths` to the `FundingRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RepaymentFrequency" AS ENUM ('MONTHLY_PROFIT_SHARE', 'END_OF_TERM_LUMP_SUM');

-- CreateEnum
CREATE TYPE "ProfitReportStatus" AS ENUM ('PENDING', 'PAID', 'LATE');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PROFIT_SHARE', 'CAPITAL_RETURN');

-- DropForeignKey
ALTER TABLE "public"."Repayment" DROP CONSTRAINT "Repayment_requestId_fkey";

-- AlterTable
ALTER TABLE "FundingRequest" ADD COLUMN     "repaymentFrequency" "RepaymentFrequency" NOT NULL DEFAULT 'MONTHLY_PROFIT_SHARE',
ADD COLUMN     "termInMonths" INTEGER NOT NULL,
ALTER COLUMN "profitSharePercentage" DROP DEFAULT;

-- DropTable
DROP TABLE "public"."Repayment";

-- DropEnum
DROP TYPE "public"."RepaymentStatus";

-- CreateTable
CREATE TABLE "ProfitReport" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "reportedProfit" INTEGER NOT NULL,
    "lenderGrossShare" INTEGER NOT NULL,
    "smeGrossShare" INTEGER NOT NULL,
    "platformFeeFromLender" INTEGER NOT NULL,
    "platformFeeFromSME" INTEGER NOT NULL,
    "totalDueFromSME" INTEGER NOT NULL,
    "totalDueToLender" INTEGER NOT NULL,
    "status" "ProfitReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "smeId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "ProfitReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "PaymentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "profitReportId" TEXT,
    "fundingRequestId" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfitReport_requestId_month_year_key" ON "ProfitReport"("requestId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_profitReportId_key" ON "Payment"("profitReportId");

-- AddForeignKey
ALTER TABLE "ProfitReport" ADD CONSTRAINT "ProfitReport_smeId_fkey" FOREIGN KEY ("smeId") REFERENCES "SME"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfitReport" ADD CONSTRAINT "ProfitReport_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FundingRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_profitReportId_fkey" FOREIGN KEY ("profitReportId") REFERENCES "ProfitReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_fundingRequestId_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "FundingRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
