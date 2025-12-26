-- CreateEnum
CREATE TYPE "VouchStatus" AS ENUM ('ACTIVE', 'DEFAULTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Vouch" (
    "id" TEXT NOT NULL,
    "amountStaked" INTEGER NOT NULL,
    "status" "VouchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Vouch_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vouch" ADD CONSTRAINT "Vouch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
