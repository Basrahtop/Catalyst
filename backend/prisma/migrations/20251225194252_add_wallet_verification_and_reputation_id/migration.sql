-- CreateTable
CREATE TABLE "InstallmentShare" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "installmentId" TEXT NOT NULL,
    "investmentAmount" INTEGER NOT NULL,
    "sharePercentage" DOUBLE PRECISION NOT NULL,
    "expectedShare" INTEGER,
    "paidAmount" INTEGER,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstallmentShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardanoWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "stakingAddress" TEXT,
    "walletType" TEXT NOT NULL,
    "reputationId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "signature" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "previousAddresses" TEXT[],
    "isReplacement" BOOLEAN NOT NULL DEFAULT false,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsed" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardanoWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationHistory" (
    "id" TEXT NOT NULL,
    "smeId" TEXT NOT NULL,
    "marketplaceScore" INTEGER NOT NULL,
    "feedbackScore" INTEGER NOT NULL,
    "platformTrustScore" INTEGER NOT NULL,
    "financialScore" INTEGER NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "cardanoTxHash" TEXT,
    "cardanoUTxORef" TEXT,
    "reputationId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "calculationHash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskFundContribution" (
    "id" TEXT NOT NULL,
    "smeId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "cardanoTxHash" TEXT,
    "conversionRate" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskFundContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstallmentShare_investorId_idx" ON "InstallmentShare"("investorId");

-- CreateIndex
CREATE INDEX "InstallmentShare_installmentId_idx" ON "InstallmentShare"("installmentId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallmentShare_installmentId_investorId_key" ON "InstallmentShare"("installmentId", "investorId");

-- CreateIndex
CREATE UNIQUE INDEX "CardanoWallet_userId_key" ON "CardanoWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CardanoWallet_address_key" ON "CardanoWallet"("address");

-- CreateIndex
CREATE UNIQUE INDEX "CardanoWallet_reputationId_key" ON "CardanoWallet"("reputationId");

-- CreateIndex
CREATE INDEX "CardanoWallet_userId_idx" ON "CardanoWallet"("userId");

-- CreateIndex
CREATE INDEX "CardanoWallet_address_idx" ON "CardanoWallet"("address");

-- CreateIndex
CREATE INDEX "CardanoWallet_reputationId_idx" ON "CardanoWallet"("reputationId");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationHistory_cardanoTxHash_key" ON "ReputationHistory"("cardanoTxHash");

-- CreateIndex
CREATE INDEX "ReputationHistory_smeId_idx" ON "ReputationHistory"("smeId");

-- CreateIndex
CREATE INDEX "ReputationHistory_cardanoTxHash_idx" ON "ReputationHistory"("cardanoTxHash");

-- CreateIndex
CREATE INDEX "ReputationHistory_reputationId_idx" ON "ReputationHistory"("reputationId");

-- CreateIndex
CREATE INDEX "ReputationHistory_timestamp_idx" ON "ReputationHistory"("timestamp");

-- CreateIndex
CREATE INDEX "RiskFundContribution_smeId_idx" ON "RiskFundContribution"("smeId");

-- CreateIndex
CREATE INDEX "RiskFundContribution_cardanoTxHash_idx" ON "RiskFundContribution"("cardanoTxHash");

-- CreateIndex
CREATE INDEX "RiskFundContribution_timestamp_idx" ON "RiskFundContribution"("timestamp");

-- AddForeignKey
ALTER TABLE "InstallmentShare" ADD CONSTRAINT "InstallmentShare_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallmentShare" ADD CONSTRAINT "InstallmentShare_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "PaymentInstallment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardanoWallet" ADD CONSTRAINT "CardanoWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationHistory" ADD CONSTRAINT "ReputationHistory_smeId_fkey" FOREIGN KEY ("smeId") REFERENCES "SME"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskFundContribution" ADD CONSTRAINT "RiskFundContribution_smeId_fkey" FOREIGN KEY ("smeId") REFERENCES "SME"("id") ON DELETE CASCADE ON UPDATE CASCADE;
