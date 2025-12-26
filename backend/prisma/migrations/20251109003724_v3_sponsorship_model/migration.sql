/*
  Warnings:

  - You are about to drop the `Vouch` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `platformFinalProfit` to the `ProfitReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformNetRevenue` to the `ProfitReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformTotalRevenue` to the `ProfitReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `riskWalletContribution` to the `ProfitReport` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Vouch" DROP CONSTRAINT "Vouch_agentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Vouch" DROP CONSTRAINT "Vouch_userId_fkey";

-- AlterTable
ALTER TABLE "FundingRequest" ADD COLUMN     "agentId" TEXT;

-- AlterTable
ALTER TABLE "ProfitReport" ADD COLUMN     "agentCommission" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformFinalProfit" INTEGER NOT NULL,
ADD COLUMN     "platformNetRevenue" INTEGER NOT NULL,
ADD COLUMN     "platformTotalRevenue" INTEGER NOT NULL,
ADD COLUMN     "riskWalletContribution" INTEGER NOT NULL,
ADD COLUMN     "totalDueToAgent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sponsoringAgentId" TEXT;

-- DropTable
DROP TABLE "public"."Vouch";

-- DropEnum
DROP TYPE "public"."VouchStatus";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sponsoringAgentId_fkey" FOREIGN KEY ("sponsoringAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingRequest" ADD CONSTRAINT "FundingRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
