-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "blockchainTxHash" TEXT,
ADD COLUMN     "refundTxHash" TEXT,
ADD COLUMN     "releaseTxHash" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "blockchainTxHash" TEXT;

-- CreateIndex
CREATE INDEX "Investment_blockchainTxHash_idx" ON "Investment"("blockchainTxHash");

-- CreateIndex
CREATE INDEX "Transaction_blockchainTxHash_idx" ON "Transaction"("blockchainTxHash");
