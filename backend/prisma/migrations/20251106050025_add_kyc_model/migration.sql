-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED');

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "ninStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "bvnStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "passportStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "addressStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAddress" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Verification_userId_key" ON "Verification"("userId");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
