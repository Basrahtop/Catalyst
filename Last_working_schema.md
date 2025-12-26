// This is our FINAL, V3.1 schema (The "Smart Ledger" + "Transaction Ledger")

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// --- 1. The "User World" ---
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  roles     Role[]   @default([CUSTOMER])
  profileImage String?

  platformTrustScore Int @default(100)
  financialScore     Int @default(0)

  firstName            String?
  lastName             String?
  phone                String? @unique
  
  isEmailVerified      Boolean @default(false)
  emailVerificationToken String? @unique
  verification         Verification?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  sme      SME?
  orders   Order[]  @relation("CustomerOrders")
  funderOf FundingRequest[] @relation("P2PLender")
  agent    Agent?
  orgUser  OrgUser?
  reviews  Review[] @relation("UserReviews")
  wallet   Wallet?
  
  sponsoringAgent   Agent?  @relation("SponsoredUsers", fields: [sponsoringAgentId], references: [id])
  sponsoringAgentId String?
  
  // --- THIS IS THE NEW "LEDGER" LINK ---
  sentTransactions     Transaction[] @relation("Sender")
  receivedTransactions Transaction[] @relation("Recipient")
}

enum Role {
  CUSTOMER
  SME
  AGENT
  P2P_LENDER
  ADMIN
}

model SME {
  id           String @id @default(cuid())
  businessName String
  
  marketplaceScore Int @default(0)
  feedbackScore    Int @default(0)

  user   User   @relation(fields: [userId], references: [id])
  userId String @unique

  products Product[]
  orders   Order[]   @relation("SMEOrders")
  fundingRequests FundingRequest[]
  paymentInstallments PaymentInstallment[]
}

model Agent {
  id    String @id @default(cuid())
  agentReputation Int @default(300)
  
  user   User   @relation(fields: [userId], references: [id])
  userId String @unique
  
  sponsoredUsers User[] @relation("SponsoredUsers")
  fundingRequests FundingRequest[] @relation("AgentRequests")
}

// --- 2. The "E-Commerce" World ---
model Product {
  id          String      @id @default(cuid())
  name        String
  description String
  price       Int // In kobo
  imageUrl    String
  sme         SME         @relation(fields: [smeId], references: [id])
  smeId       String
  orderItems  OrderItem[]
  reviews     Review[]
  
  transactions Transaction[] @relation("ProductPurchase")
}

model Order {
  id         String      @id @default(cuid())
  total      Int
  status     OrderStatus @default(PENDING)
  createdAt  DateTime    @default(now())
  
  customer   User     @relation("CustomerOrders", fields: [customerId], references: [id])
  customerId String
  sme        SME      @relation("SMEOrders", fields: [smeId], references: [id])
  smeId      String
  items      OrderItem[]
  
  transaction Transaction?
}

enum OrderStatus { 
  PENDING
  COMPLETED
  SHIPPED
  CANCELLED 
}

model OrderItem {
  id       String @id @default(cuid())
  quantity Int    @default(1)
  price    Int
  order    Order  @relation(fields: [orderId], references: [id])
  orderId  String
  product   Product @relation(fields: [productId], references: [id])
  productId String
}

// --- 3. The "Funding" World ---
model FundingRequest {
  id        String        @id @default(cuid())
  amount    Int
  profitSharePercentage Float
  termInMonths          Int
  repaymentFrequency    RepaymentFrequency @default(MONTHLY_PROFIT_SHARE)

  purpose   String
  status    FundingStatus @default(PENDING)
  declineReason String?
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  
  sme    SME    @relation(fields: [smeId], references: [id])
  smeId  String
  
  p2pFunder   User?   @relation("P2PLender", fields: [p2pFunderId], references: [id])
  p2pFunderId String?
  orgFunder    Organization? @relation("OrgFunder", fields: [orgFunderId], references: [id])
  orgFunderId  String?
  
  agent   Agent?   @relation("AgentRequests", fields: [agentId], references: [id])
  agentId String?
  
  paymentInstallments PaymentInstallment[]
}

enum RepaymentFrequency { 
  MONTHLY_PROFIT_SHARE
  END_OF_TERM_LUMP_SUM 
}

enum FundingStatus { 
  PENDING
  APPROVED
  DECLINED
  COMPLETED 
}

// --- 4. THE "SMART LEDGER" & "TRANSACTION LEDGER" ---

// This is our "Schedule"
model PaymentInstallment {
  id        String   @id @default(cuid())
  
  installmentNumber Int
  dueDate             DateTime
  type                InstallmentType
  status              InstallmentStatus @default(PENDING)
  month     Int?
  year      Int?
  
  reportedProfit        Int?
  lenderGrossShare      Int?
  smeGrossShare         Int?
  platformFeeFromLender Int?
  platformFeeFromSME    Int?
  agentCommission       Int?
  totalDueFromSME       Int?
  totalDueToLender      Int?
  totalDueToAgent       Int? 
  

  platformTotalRevenue   Int?
  platformNetRevenue     Int?
  riskWalletContribution Int?
  platformFinalProfit    Int?

  paidAt                DateTime?
  amountPaid            Int?
  
  sme       SME            @relation(fields: [smeId], references: [id])
  smeId     String
  request   FundingRequest @relation(fields: [requestId], references: [id])
  requestId String
  
  transaction Transaction?
  
  @@unique([requestId, installmentNumber])
}

enum InstallmentType { 
  PROFIT_SHARE
  FINAL_PAYMENT 
}

enum InstallmentStatus { 
  PENDING
  UPCOMING
  LATE
  PAID 
}

// This is our "Global Transaction Ledger"
model Transaction {
  id        String   @id @default(cuid())
  amount    Int // in Kobo
  
  type      TransactionType
  status    TransactionStatus @default(COMPLETED)
  
  notes     String?
  createdAt DateTime @default(now())
  
  sender    User     @relation("Sender", fields: [senderId], references: [id])
  senderId  String
  recipient User     @relation("Recipient", fields: [recipientId], references: [id])
  recipientId String
  
  installment   PaymentInstallment? @relation(fields: [installmentId], references: [id])
  installmentId String?             @unique
  
  order   Order? @relation(fields: [orderId], references: [id])
  orderId String? @unique
  
  product   Product? @relation("ProductPurchase", fields: [productId], references: [id])
  productId String?
}

enum TransactionType {
  DEPOSIT
  WITHDRAWAL
  TRANSFER
  PROFIT_SHARE
  AGENT_FEE
  PLATFORM_FEE
  ORDER
}

enum TransactionStatus {
  PENDING
  COMPLETED
  FAILED
}

// --- 5. The "Partner" World ---
model Organization {
  id   String @id @default(cuid())
  name String
  type OrgType
  users OrgUser[]
  fundedRequests FundingRequest[] @relation("OrgFunder")
}

enum OrgType { 
  BANK
  AGENCY 
}

model OrgUser {
  id    String @id @default(cuid())
  role  String @default("officer")
  user   User   @relation(fields: [userId], references: [id])
  userId String @unique
  organization   Organization @relation(fields: [organizationId], references: [id])
  organizationId String
}

// --- 6. The "Review" World ---
model Review {
  id        String   @id @default(cuid())
  rating    Int
  comment   String?
  createdAt DateTime @default(now())
  user   User   @relation("UserReviews", fields: [userId], references: [id])
  userId String
  product   Product @relation(fields: [productId], references: [id])
  productId String
}

// --- 7. The "Wallet" World ---
model Wallet {
  id      String @id @default(cuid())
  balance Int    @default(0) // Balance in kobo
  user   User   @relation(fields: [userId], references: [id])
  userId String @unique
}

// --- 8. The "Verification" World ---
model Verification {
  id        String   @id @default(cuid())
  ninStatus     VerificationStatus @default(UNVERIFIED)
  bvnStatus     VerificationStatus @default(UNVERIFIED)
  passportStatus VerificationStatus @default(UNVERIFIED)
  addressStatus  VerificationStatus @default(UNVERIFIED)
  verifiedAddress String?
  user   User   @relation(fields: [userId], references: [id])
  userId String @unique
}

enum VerificationStatus { 
  UNVERIFIED
  PENDING
  VERIFIED
  FAILED 
}