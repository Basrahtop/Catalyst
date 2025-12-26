/*
  Warnings:

  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProfitReport` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "InstallmentType" AS ENUM ('PROFIT_SHARE', 'FINAL_PAYMENT');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'UPCOMING', 'LATE', 'PAID');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PROFIT_SHARE', 'AGENT_FEE', 'PLATFORM_FEE', 'ORDER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_fundingRequestId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_profitReportId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProfitReport" DROP CONSTRAINT "ProfitReport_requestId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProfitReport" DROP CONSTRAINT "ProfitReport_smeId_fkey";

-- DropTable
DROP TABLE "public"."Payment";

-- DropTable
DROP TABLE "public"."ProfitReport";

-- DropEnum
DROP TYPE "public"."PaymentType";

-- DropEnum
DROP TYPE "public"."ProfitReportStatus";

-- CreateTable
CREATE TABLE "PaymentInstallment" (
    "id" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "type" "InstallmentType" NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "reportedProfit" INTEGER,
    "lenderGrossShare" INTEGER,
    "smeGrossShare" INTEGER,
    "platformFeeFromLender" INTEGER,
    "platformFeeFromSME" INTEGER,
    "agentCommission" INTEGER,
    "totalDueFromSME" INTEGER,
    "totalDueToLender" INTEGER,
    "paidAt" TIMESTAMP(3),
    "amountPaid" INTEGER,
    "smeId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "installmentId" TEXT,
    "orderId" TEXT,
    "productId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentInstallment_requestId_installmentNumber_key" ON "PaymentInstallment"("requestId", "installmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_installmentId_key" ON "Transaction"("installmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_orderId_key" ON "Transaction"("orderId");

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_smeId_fkey" FOREIGN KEY ("smeId") REFERENCES "SME"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FundingRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "PaymentInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
