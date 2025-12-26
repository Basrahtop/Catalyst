Catalyst Project: Technical Blueprint & Changelog

V1.0 - "Real Product" Backend (COMPLETED)

This document is our "single source of truth." It tracks our technical architecture, database schema, and all completed features.

1. Core Architecture (The Stack)

This project is a "monorepo" containing multiple, separate applications.

backend (The API Server)

Language: TypeScript

Framework: Node.js / Express.js

Database: PostgreSQL

ORM: Prisma (for type-safe database access)

Security: bcryptjs (for password hashing), jsonwebtoken (for user sessions)

bank-dashboard (The Bank Portal)

Framework: React.js (using create-react-app)

Language: JavaScript

Status: [V1 Complete - Note: Requires refactor to use new V2 API]

sme-app (The Mobile App)

Framework: React Native (using expo-router)

Language: TypeScript

Status: [V1 Complete - Note: Requires refactor to use new V2 API]

sme-web-dashboard (The SME Portal)

(Planned)

Framework: React.js

2. Database Schema (prisma/schema.prisma)

This is the final, V2.2 "Sponsorship Model" schema. It includes the complete E-commerce, Funding, and 4-Way Split Revenue Engine.

// This is our FINAL, V2.2 schema (Agent "Sponsorship" Model)

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
  payments Payment[]

  // --- THIS IS THE "SPONSORSHIP" LINK ---
  sponsoringAgent   Agent?  @relation("SponsoredUsers", fields: [sponsoringAgentId], references: [id])
  sponsoringAgentId String?
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
  profitReports ProfitReport[]
}

model Agent {
  id    String @id @default(cuid())
  agentReputation Int @default(300)
  
  user   User   @relation(fields: [userId], references: [id])
  userId String @unique
  
  // --- THIS IS THE "SPONSORSHIP" LINK ---
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
  
  // A request is *optionally* "tagged" with the Agent who sponsored the user
  agent   Agent?   @relation("AgentRequests", fields: [agentId], references: [id])
  agentId String?
  
  profitReports ProfitReport[]
  payments      Payment[]
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

// --- 4. The "Profit & Revenue" World (REFACTORED) ---

model ProfitReport {
  id        String   @id @default(cuid())
  
  month         Int
  year          Int
  
  reportedProfit        Int
  lenderGrossShare      Int
  smeGrossShare         Int
  
  platformFeeFromLender Int
  platformFeeFromSME    Int
  
  agentCommission       Int @default(0)
  
  totalDueFromSME       Int
  totalDueToLender      Int
  totalDueToAgent       Int @default(0)
  
  platformTotalRevenue   Int
  platformNetRevenue     Int
  riskWalletContribution Int
  platformFinalProfit    Int
  
  status        ProfitReportStatus @default(PENDING)
  createdAt     DateTime @default(now())
  
  sme       SME            @relation(fields: [smeId], references: [id])
  smeId     String
  request   FundingRequest @relation(fields: [requestId], references: [id])
  requestId String
  
  payment   Payment?
  
  @@unique([requestId, month, year])
}

model Payment {
  id      String   @id @default(cuid())
  amount  Int
  type    PaymentType
  createdAt DateTime @default(now())
  
  user   User   @relation(fields: [userId], references: [id])
  userId String

  profitReport   ProfitReport? @relation(fields: [profitReportId], references: [id])
  profitReportId String?       @unique

  fundingRequest   FundingRequest? @relation(fields: [fundingRequestId], references: [id])
  fundingRequestId String?
}

enum ProfitReportStatus {
  PENDING
  PAID
  LATE
}

enum PaymentType {
  PROFIT_SHARE
  CAPITAL_RETURN
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


// --- 6. The Review Model ---
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


// --- 8. The "Verification" (KYC) World ---

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


3. API Feature Changelog (V1 COMPLETED)

This is the complete list of all backend features we have successfully built, debugged, and tested.

/api/auth (Authentication)

POST /api/auth/register: [COMPLETED]

Creates a User, SME, Wallet, and Verification record in one transaction.

Generates emailVerificationToken and dispatches a real (Gmail-powered) verification email.

POST /api/auth/login: [COMPLETED]

Checks email and bcrypt password.

Returns a 7-day JWT.

Includes wallet, verification, and full profile data.

POST /api/auth/change-password: [COMPLETED]

Protected: Yes.

Securely checks oldPassword before setting a new one.

GET /api/auth/verify-email: [COMPLETED]

Protected: No (uses token in URL).

Verifies email, sets isEmailVerified = true, and triggers the Reputation Engine.

POST /api/auth/send-verification: [COMPLETED]

Protected: Yes.

Allows a user to request a new verification email.

/api/users (User Profile)

GET /api/users/me: [COMPLETED]

Protected: Yes.

Gets the logged-in user's complete, safe profile (including all scores, wallet, and verification statuses).

PATCH /api/users/me: [COMPLETED]

Protected: Yes.

Updates the logged-in user's firstName, lastName, and phone.

/api/products (E-Commerce Products)

POST /api/products: [COMPLETED]

Protected: Yes.

Creates a new Product linked to the logged-in user's SME profile.

GET /api/products: [COMPLETED]

Protected: No (Public).

Returns a list of all products. Supports ?search= query.

GET /api/products/my-products: [COMPLETED]

Protected: Yes.

Returns products for the logged-in SME. Supports ?search= query.

POST /api/products/:productId/reviews: [COMPLETED]

Protected: Yes.

Smart: Verifies user has a COMPLETED order for this product before allowing a review.

Hook: Triggers the Reputation Engine (recalculateSMEPerformance).

/api/orders (E-Commerce Orders)

POST /api/orders: [COMPLETED]

Protected: Yes.

Creates a new Order and OrderItems from a cart array (transactional).

PATCH /api/orders/:id/status: [COMPLETED]

Protected: Yes (SME only).

Allows the SME who owns the order to update its status.

Hook: Triggers the Reputation Engine (recalculateSMEPerformance) on "COMPLETED" or "CANCELLED".

/api/reviews (E-Commerce Reviews)

PATCH /api/reviews/:id: [COMPLETED]

Protected: Yes.

Allows a user to edit only their own review.

DELETE /api/reviews/:id: [COMPLETED]

Protected: Yes.

Allows a user to delete only their own review.

/api/funding-requests (Funding)

POST /: [COMPLETED]

Protected: Yes.

Agent-Aware: Checks if the user has a sponsoringAgentId and "tags" the new request.

GET /: [COMPLETED]

Protected: Yes.

Gets all PENDING requests for the Bank/Agent Dashboard, including all new component scores.

PATCH /:id/approve: [COMPLETED]

Protected: Yes.

Approves a request, linking it to the p2pFunderId or orgFunderId.

PATCH /:id/decline: [COMPLETED]

Protected: Yes.

Declines a request, saves the declineReason, and links the decliner.

/api/wallet (User Wallet)

GET /api/wallet/balance: [COMPLETED]

Protected: Yes.

Gets the logged-in user's wallet balance.

POST /api/wallet/deposit: [COMPLETED]

Protected: Yes.

Simulation to add funds (kobo) to a user's wallet.

/api/verification (KYC)

POST /api/verification/submit-nin: [COMPLETED]

Protected: Yes.

Simulation of an asynchronous 3rd-party KYC check.

Hook: Triggers the Reputation Engine (recalculatePlatformTrust) on success.

/api/agents (Agent "Sponsorship")

POST /api/agents/apply: [COMPLETED]

Protected: Yes.

Smart: Checks if user's KYC is VERIFIED.

POST /api/agents/vouch: [COMPLETED]

Protected: Yes (Agent only).

Performs the "Sponsorship Transfer," linking a user to the agent (sponsoringAgentId).

/api/admin (Admin Back-Office)

GET /api/admin/agent-applications: [COMPLETED]

Protected: Yes (Admin only).

Gets all pending agent applications.

PATCH /api/admin/agents/:agentId/approve: [COMPLETED]

Protected: Yes (Admin only).

Approves an agent and adds the AGENT role to their User record.

/api/profit-reports & /api/payments (Revenue Engine)

POST /api/profit-reports: [COMPLETED]

Protected: Yes.

Calculates the full 4-Way Split (SME, Lender, Agent, Platform) and creates a "PENDING" invoice.

POST /api/payments/report/:reportId: [COMPLETED]

Protected: Yes.

Executes the full, transactional "Seamless Escrow" (debiting SME, crediting Lender, Agent, Platform Revenue, and Risk Wallets).

Hook: Triggers the Reputation Engine (recalculateFinancialScore).

System Services (The "Brains")

prisma/seed.ts: [COMPLETED]

Creates the three critical system wallets: platform-admin, platform-revenue, and platform-risk.

src/services/reputation.service.ts: [COMPLETED]

Contains all the "V2" logic for our Component-Based Reputation Model, with functions to recalculate all four score categories.