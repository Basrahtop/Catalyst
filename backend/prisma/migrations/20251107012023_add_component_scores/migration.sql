/*
  Warnings:

  - You are about to drop the column `reputationScore` on the `SME` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SME" DROP COLUMN "reputationScore",
ADD COLUMN     "feedbackScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "marketplaceScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "financialScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformTrustScore" INTEGER NOT NULL DEFAULT 100;
