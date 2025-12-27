/*
  Warnings:

  - You are about to drop the column `balanceADA` on the `Wallet` table. All the data in the column will be lost.
  - You are about to drop the column `balanceUSDM` on the `Wallet` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Wallet" DROP COLUMN "balanceADA",
DROP COLUMN "balanceUSDM";
