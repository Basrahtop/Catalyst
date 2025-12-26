-- AlterEnum
ALTER TYPE "FundingStatus" ADD VALUE 'PARTIALLY_FUNDED';

-- AlterTable
ALTER TABLE "FundingRequest" ADD COLUMN     "amountFunded" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "investorId" TEXT NOT NULL,
    "fundingRequestId" TEXT NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Investment_investorId_idx" ON "Investment"("investorId");

-- CreateIndex
CREATE INDEX "Investment_fundingRequestId_idx" ON "Investment"("fundingRequestId");

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_fundingRequestId_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "FundingRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
