# Catalyst Technical Implementation Roadmap

**Date:** December 31, 2025  
**Purpose:** Document technical gaps between current implementation and the Catalyst Project Charter

---

## Executive Summary

Based on the Project Charter, Catalyst is a **decentralized trust and investment ecosystem** with a "Two-Path Trust System" (Performance Trust for SMEs, Human Trust for Individuals) and a "4-Way Split" revenue model (Lender, SME, Agent, Platform).

This document identifies what's **already working** and what **needs to be implemented** to fully realize the Charter vision.

---

## Current Implementation Status

### ✅ **What's Working**

#### 1. Multi-Currency Investment System
- **NGN Investments**: Off-chain, platform-managed wallet system
- **ADA Investments**: On-chain, Cardano smart contract escrow (Aiken validators)
- **USDM Support**: Infrastructure ready (stablecoin on Cardano)
- **Exchange Rate Integration**: Live rates from CoinGecko/ExchangeRate-API
- **Two-Step Cardano Flow**: Prepare → Client-side wallet signing → Confirm

#### 2. Profit-Sharing System
- SMEs can report profit/revenue
- Payment schedule generation (monthly/quarterly/lump-sum)
- Profit distribution to investors based on investment shares
- Installment tracking (PENDING, UPCOMING, LATE, PAID)

#### 3. User Management & Verification
- User registration (SME, Investor, Admin roles)
- KYC verification (NIN, BVN, Passport, Address)
- Email verification
- Platform trust scoring (partial)

#### 4. Wallet System
- NGN wallet (platform-managed, database-backed)
- Cardano wallet connection (Nami, Eternl, Flint)
- Wallet balance tracking (NGN + live ADA/USDM from blockchain)
- Deposit/withdrawal for NGN

#### 5. Investment Flow
- Funding request creation
- Investment approval (NGN and Cardano)
- Overfunding prevention (security fix implemented)
- Status auto-update (PENDING → APPROVED when fully funded)
- Payment schedule auto-generation on full funding

#### 6. Basic Reputation System
- `platformTrustScore` (max 300)
- `financialScore` (max 200)
- `marketplaceScore` (for SMEs, max 350)
- `feedbackScore` (for SMEs, max 150)

**Note:** Scores exist in database but calculation logic is incomplete.

#### 7. Blockchain Integration
- Aiken smart contract for investment escrow
- On-chain fund locking with datum (investor PKH, SME PKH, oracle PKH)
- Transaction verification via Blockfrost
- Preprod testnet deployment

---

## Critical Missing Features (From Charter)

### 🔴 **Priority 1: Sponsorship System (Human Collateral)**

**Charter Requirement:**
> "An individual with no business or capital connects with an Agent in their community. The Agent 'sponsors' this user, creating a permanent (but transferable) link."

**Current Status:** ❌ Not implemented

**What's Needed:**

#### A. Database Schema Changes
```prisma
model User {
  // ... existing fields
  
  // Sponsorship (Human Collateral)
  sponsoringAgentId String?
  sponsoringAgent   User?   @relation("AgentSponsorship", fields: [sponsoringAgentId], references: [id])
  sponsoredUsers    User[]  @relation("AgentSponsorship")
  
  // Track sponsorship history for transferability
  sponsorshipHistory SponsorshipHistory[]
}

model SponsorshipHistory {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  agentId     String
  agent       User     @relation("AgentHistory", fields: [agentId], references: [id])
  startDate   DateTime @default(now())
  endDate     DateTime?
  reason      String?  // Why sponsorship ended (if transferred)
  createdAt   DateTime @default(now())
}
```

#### B. Backend Endpoints
- `POST /api/sponsorship/create` - Agent sponsors a user
- `POST /api/sponsorship/transfer` - User switches to new Agent
- `GET /api/sponsorship/my-sponsored-users` - Agent views their portfolio
- `GET /api/sponsorship/income-report` - Agent's generational income tracking

#### C. Business Logic
- Agent eligibility check (verified users only can sponsor)
- Sponsorship link creation
- Sponsorship transfer workflow:
  1. User requests transfer to new Agent
  2. Old Agent receives notification
  3. `sponsoringAgentId` updates
  4. `SponsorshipHistory` records old link with `endDate`
  5. Future commissions flow to new Agent

#### D. Frontend Components
- Agent Dashboard: View sponsored users
- User Profile: Show current sponsor (if any)
- Sponsorship Request Form (for users seeking capital)
- Agent Search/Discovery (for users choosing sponsors)

---

### 🔴 **Priority 2: 4-Way Split Revenue Model**

**Charter Requirement:**
> "The SME pays ₦47,500 to our platform wallet. We instantly distribute: Lender ₦27,000, Agent ₦3,500, Platform ₦17,000."

**Current Status:** ⚠️ Partially implemented (3-way split only: SME → Lender → Platform)

**What's Missing:**

#### A. Agent Commission (5% of SME's Share)
**Location:** `backend/src/controllers/profit.controller.ts`

**Current Flow:**
```typescript
// SME reports ₦100,000 profit (70/30 split)
const lenderShare = 30,000; // 30%
const smeShare = 70,000; // 70%
const platformFee = lenderShare * 0.10; // 10% of lender share = ₦3,000

// Distribution:
// - Lender receives: ₦27,000 (30k - 3k fee)
// - Platform receives: ₦3,000
```

**Needed Update:**
```typescript
// SME reports ₦100,000 profit (70/30 split)
const lenderShare = 30,000; // 30%
const smeShare = 70,000; // 70%

// Fees
const platformFeeFromLender = lenderShare * 0.10; // ₦3,000
const platformFeeFromSME = smeShare * 0.20; // ₦14,000
const agentCommission = sme.sponsoringAgentId ? smeShare * 0.05 : 0; // ₦3,500 (if sponsored)

// Total SME must pay
const smePayment = lenderShare + platformFeeFromSME + agentCommission; // ₦47,500

// Distribution:
// 1. Lender receives: ₦27,000
// 2. Agent receives: ₦3,500 (if exists)
// 3. Platform receives: ₦17,000 (₦3k + ₦14k)
```

#### B. Risk Mitigation Wallet (10% of Platform Revenue)
**Charter Requirement:**
> "Our platform then internally moves 10% of our revenue into a separate 'Risk Mitigation Wallet' to cover potential defaults."

**Implementation:**
```typescript
// After profit distribution
const totalPlatformRevenue = platformFeeFromLender + platformFeeFromSME; // ₦17,000
const riskAllocation = Math.floor(totalPlatformRevenue * 0.10); // ₦1,700
const platformWalletAllocation = totalPlatformRevenue - riskAllocation; // ₦15,300

// Create separate wallet accounts
await walletBalanceService.addNGN('PLATFORM_REVENUE_WALLET', platformWalletAllocation);
await walletBalanceService.addNGN('RISK_MITIGATION_WALLET', riskAllocation);
```

#### C. Database Changes
```prisma
model PlatformWallet {
  id          String   @id @default(cuid())
  type        WalletType // REVENUE, RISK_MITIGATION
  balanceNGN  BigInt   @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum WalletType {
  REVENUE
  RISK_MITIGATION
}
```

---

### 🟡 **Priority 3: Full Reputation Engine (1,000-Point Component Model)**

**Charter Requirement:**
> "Our 1,000-point score is a Component Model. An SME's total score is the sum of four sub-scores."

**Current Status:** ⚠️ Database fields exist, but calculation logic incomplete

**Component Breakdown:**

#### 1. Platform Trust (Max: 300 points)
```typescript
// backend/src/services/reputation.service.ts (NEW FILE)

calculatePlatformTrust(user: User): number {
  let score = 0;
  
  // Sign-up: +100 pts
  score += 100;
  
  // Email verification: +50 pts
  if (user.emailVerified) score += 50;
  
  // KYC verification: +150 pts
  if (user.verification?.ninStatus === 'VERIFIED' || 
      user.verification?.bvnStatus === 'VERIFIED') {
    score += 150;
  }
  
  return Math.min(score, 300); // Cap at 300
}
```

#### 2. Marketplace Performance (Max: 350 points)
**Formula:** `(Successful Fulfillments / Total Orders) * 350`

**Requirements:**
- Track order fulfillment status (PENDING, FULFILLED, FAILED)
- Calculate success rate
- Update score after each order

**Database Tracking:**
```prisma
model Order {
  id              String      @id @default(cuid())
  smeId           String
  customerId      String
  status          OrderStatus // PENDING, FULFILLED, FAILED, CANCELLED
  fulfillmentDate DateTime?
  // ... other fields
}

enum OrderStatus {
  PENDING
  FULFILLED
  FAILED
  CANCELLED
}
```

**Calculation:**
```typescript
calculateMarketplacePerformance(sme: SME): number {
  const totalOrders = sme.orders.length;
  if (totalOrders === 0) return 0;
  
  const successfulOrders = sme.orders.filter(o => 
    o.status === 'FULFILLED'
  ).length;
  
  const successRate = successfulOrders / totalOrders;
  return Math.floor(successRate * 350); // Max 350 pts
}
```

#### 3. Customer Feedback (Max: 150 points)
**Formula:** `(Average Star Rating / 5) * 150`

**Requirements:**
- Customer review system
- Star ratings (1-5)
- Verified purchases only

**Database:**
```prisma
model Review {
  id         String   @id @default(cuid())
  orderId    String   @unique
  order      Order    @relation(fields: [orderId], references: [id])
  customerId String
  customer   User     @relation(fields: [customerId], references: [id])
  smeId      String
  sme        SME      @relation(fields: [smeId], references: [id])
  rating     Int      // 1-5 stars
  comment    String?
  createdAt  DateTime @default(now())
}
```

**Calculation:**
```typescript
calculateCustomerFeedback(sme: SME): number {
  const reviews = sme.reviews;
  if (reviews.length === 0) return 0;
  
  const totalStars = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = totalStars / reviews.length;
  
  return Math.floor((avgRating / 5) * 150); // Max 150 pts
}
```

#### 4. Financial History (Max: 200 points) - **MOST CRITICAL**
**Formula:** `(On-Time Repayments / Total Repayments) * 200`

**Current Status:** Field exists but calculation incomplete

**Database Tracking:**
```prisma
model PaymentInstallment {
  // ... existing fields
  paidDate      DateTime? // When payment was actually made
  dueDate       DateTime  // When payment was due
  status        InstallmentStatus
}
```

**Calculation:**
```typescript
calculateFinancialHistory(sme: SME): number {
  const allInstallments = sme.paymentInstallments.filter(i => 
    i.status === 'PAID'
  );
  
  if (allInstallments.length === 0) return 0;
  
  const onTimePayments = allInstallments.filter(i => 
    i.paidDate <= i.dueDate
  ).length;
  
  const onTimeRate = onTimePayments / allInstallments.length;
  return Math.floor(onTimeRate * 200); // Max 200 pts
}
```

#### Master Reputation Service
```typescript
// backend/src/services/reputation.service.ts

class ReputationService {
  async calculateTotalScore(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { sme: true, investments: true, paymentInstallments: true }
    });
    
    const platformTrust = this.calculatePlatformTrust(user);
    const marketplacePerf = user.sme ? this.calculateMarketplacePerformance(user.sme) : 0;
    const customerFeedback = user.sme ? this.calculateCustomerFeedback(user.sme) : 0;
    const financialHistory = this.calculateFinancialHistory(user);
    
    const totalScore = platformTrust + marketplacePerf + customerFeedback + financialHistory;
    
    // Update user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        platformTrustScore: platformTrust,
        financialScore: financialHistory
      }
    });
    
    if (user.sme) {
      await prisma.sME.update({
        where: { userId },
        data: {
          marketplaceScore: marketplacePerf,
          feedbackScore: customerFeedback
        }
      });
    }
    
    return Math.min(totalScore, 1000); // Cap at 1,000
  }
  
  // Trigger score recalculation after key events
  async updateScoreAfterEvent(userId: string, event: 'KYC' | 'ORDER_FULFILLMENT' | 'REVIEW' | 'REPAYMENT') {
    await this.calculateTotalScore(userId);
  }
}
```

---

### 🟡 **Priority 4: Agent Dashboard & Generational Income Tracking**

**Charter Requirement:**
> "As long as this link exists, the Agent receives a 5% commission on the SME's share of profits from every investment that user takes."

**What's Needed:**

#### A. Agent Dashboard Components
- **Sponsored Users Portfolio**: List of all users the Agent has sponsored
- **Income Stream Tracking**: Real-time view of commissions from each sponsored user
- **Performance Metrics**: How many sponsored users are active/defaulted
- **Sponsorship Requests**: Queue of users seeking sponsorship

#### B. Database Tracking
```prisma
model AgentCommission {
  id                String   @id @default(cuid())
  agentId           String
  agent             User     @relation("AgentEarnings", fields: [agentId], references: [id])
  smeId             String
  sme               SME      @relation(fields: [smeId], references: [id])
  installmentId     String
  installment       PaymentInstallment @relation(fields: [installmentId], references: [id])
  amountNGN         Int      // Commission amount in kobo
  paidDate          DateTime @default(now())
  fundingRequestId  String
  fundingRequest    FundingRequest @relation(fields: [fundingRequestId], references: [id])
}
```

#### C. Backend Endpoints
- `GET /api/agent/dashboard` - Overview stats
- `GET /api/agent/sponsored-users` - List of sponsored users with status
- `GET /api/agent/income-history` - Commission earnings history
- `GET /api/agent/pending-requests` - Users requesting sponsorship

#### D. Calculation Logic
When SME reports profit:
```typescript
// In profit distribution
if (sme.sponsoringAgentId) {
  const agentCommission = Math.floor(smeShare * 0.05); // 5% of SME's share
  
  // Pay agent
  await walletBalanceService.addNGN(sme.sponsoringAgentId, agentCommission);
  
  // Record commission
  await prisma.agentCommission.create({
    data: {
      agentId: sme.sponsoringAgentId,
      smeId: sme.id,
      installmentId: installment.id,
      amountNGN: agentCommission,
      fundingRequestId: installment.requestId
    }
  });
}
```

---

### 🟢 **Priority 5: Marketplace Integration (E-Commerce)**

**Charter Requirement:**
> "An SME signs up and starts selling products on our e-commerce marketplace."

**Current Status:** ❌ Not implemented

**What's Needed:**

#### A. Product Management
```prisma
model Product {
  id          String   @id @default(cuid())
  smeId       String
  sme         SME      @relation(fields: [smeId], references: [id])
  name        String
  description String
  price       BigInt   // In kobo
  currency    Currency @default(NGN)
  stock       Int
  category    String
  images      String[] // Array of image URLs
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  orders      Order[]
}
```

#### B. Order Management
```prisma
model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique
  customerId      String
  customer        User        @relation("CustomerOrders", fields: [customerId], references: [id])
  smeId           String
  sme             SME         @relation(fields: [smeId], references: [id])
  productId       String
  product         Product     @relation(fields: [productId], references: [id])
  quantity        Int
  totalAmount     BigInt      // In kobo
  status          OrderStatus @default(PENDING)
  paymentMethod   Currency    @default(NGN)
  shippingAddress String
  trackingNumber  String?
  placedDate      DateTime    @default(now())
  fulfillmentDate DateTime?
  deliveredDate   DateTime?
  
  review          Review?
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  FULFILLED
  CANCELLED
  FAILED
}
```

#### C. Customer Review System
```prisma
model Review {
  id         String   @id @default(cuid())
  orderId    String   @unique
  order      Order    @relation(fields: [orderId], references: [id])
  customerId String
  customer   User     @relation("CustomerReviews", fields: [customerId], references: [id])
  smeId      String
  sme        SME      @relation(fields: [smeId], references: [id])
  rating     Int      // 1-5 stars
  comment    String?
  isVerified Boolean  @default(true) // Verified purchase
  createdAt  DateTime @default(now())
  
  @@index([smeId])
}
```

#### D. Frontend Components
- **SME Portal**:
  - Product listing management
  - Order fulfillment dashboard
  - Inventory management
  
- **Marketplace Portal** (NEW APP):
  - Product browsing/search
  - Shopping cart
  - Checkout (NGN/ADA/USDM)
  - Order tracking
  - Review submission

#### E. Backend Services
- Product CRUD operations
- Order processing pipeline
- Payment gateway integration
- Shipping/fulfillment tracking
- Review moderation

---

## Additional Technical Requirements

### 🔵 **6. AI "Lens of Truth" Integration**

**Charter Reference:**
> "By implementing a blockchain-anchored reputation engine and an AI-driven 'lens of truth,' Catalyst eliminates investment fraud."

**Planned Features (To Be Designed):**

#### A. Profit Verification
- Cross-reference reported profits with marketplace transaction data
- Flag discrepancies (e.g., SME reports ₦100k profit but only ₦20k in sales)
- Automatic alerts for platform review

#### B. Fraud Detection
- Pattern recognition for suspicious behavior:
  - Fake profit reports
  - Inflated revenue claims
  - Coordinated fake reviews
  - Suspicious withdrawal patterns

#### C. Performance Validation
- Compare on-chain blockchain data with off-chain reports
- Verify transaction authenticity
- Track behavioral anomalies

**Implementation Approach:**
- Machine learning model training on historical transaction data
- Real-time anomaly detection
- Integration with blockchain verification layer
- Admin dashboard for flagged accounts

**Status:** ⏳ Design phase - full specifications to be provided later

---

### 🔵 **7. Blockchain Reputation Registry**

**Current Status:** Aiken contract exists for escrow but not for reputation

**Charter Alignment:**
> "Transform 'invisible' informal trade into a globally recognized asset class"

**What's Needed:**

#### A. On-Chain Reputation Anchoring
- Store reputation milestone hashes on-chain (KYC verified, first investment, etc.)
- Immutable proof of reputation history
- Cross-platform portability (reputation follows user across apps)

#### B. Smart Contract for Reputation Verification
```aiken
// Reputation registry validator
validator reputation_registry {
  fn record_milestone(
    user_pkh: PubKeyHash,
    milestone_type: MilestoneType,
    reputation_score: Int,
    datum: ReputationDatum
  ) -> Bool {
    // Verify milestone authenticity
    // Record on-chain
  }
}
```

#### C. Integration Points
- Update on-chain registry when:
  - User completes KYC
  - First investment funded
  - First profit payment made
  - Reputation score milestones (250, 500, 750, 1000)

---

### 🔵 **8. Risk Mitigation & Default Handling**

**Charter Requirement:**
> "Our platform then internally moves 10% of our revenue into a separate 'Risk Mitigation Wallet' to cover potential defaults."

**What's Needed:**

#### A. Default Detection
- Automatically flag late payments (status → LATE)
- Grace period management (7 days, 14 days, 30 days)
- Escalation workflow

#### B. Default Resolution
```typescript
// When SME defaults on payment
async handleDefault(installmentId: string) {
  const installment = await prisma.paymentInstallment.findUnique({
    where: { id: installmentId },
    include: { request: true, investorInstallments: true }
  });
  
  // 1. Calculate total owed to investors
  const totalOwed = installment.totalDueFromSME;
  
  // 2. Check risk wallet balance
  const riskWallet = await prisma.platformWallet.findFirst({
    where: { type: 'RISK_MITIGATION' }
  });
  
  // 3. Partial or full coverage?
  const coverage = Math.min(riskWallet.balanceNGN, totalOwed);
  
  // 4. Distribute to affected investors proportionally
  for (const investorShare of installment.investorInstallments) {
    const investorCoverage = Math.floor(
      (investorShare.sharePercentage / 100) * coverage
    );
    
    await walletBalanceService.addNGN(
      investorShare.investorId, 
      investorCoverage
    );
  }
  
  // 5. Update SME reputation (major penalty)
  await reputationService.penalizeForDefault(installment.request.smeId);
  
  // 6. Block SME from future investments until resolved
  await prisma.sME.update({
    where: { id: installment.request.smeId },
    data: { isBlocked: true, blockReason: 'Payment default' }
  });
}
```

#### C. Database Changes
```prisma
model SME {
  // ... existing fields
  isBlocked    Boolean  @default(false)
  blockReason  String?
  unblockDate  DateTime?
}
```

---

### 🔵 **9. Path Differentiation Logic**

**Charter Requirement:**
> "Our platform provides two distinct paths to access capital"

**Implementation:**

#### A. Investment Application Decision Tree
```typescript
async evaluateInvestmentEligibility(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { sme: true }
  });
  
  // Check if user has SME profile
  if (!user.sme) {
    // Individual without business - REQUIRES SPONSORSHIP
    if (!user.sponsoringAgentId) {
      throw new Error('You need an Agent sponsor to access capital. Please find an Agent in your community.');
    }
    return { path: 'SPONSORED', eligibility: 'PENDING_AGENT_APPROVAL' };
  }
  
  // Check SME reputation score
  const reputationScore = await reputationService.calculateTotalScore(userId);
  
  if (reputationScore >= 500) {
    // Path 1: Performance Trust (High-reputation SME)
    return { path: 'PERFORMANCE_TRUST', eligibility: 'AUTO_APPROVED' };
  } else if (user.sponsoringAgentId) {
    // Path 2: Has sponsor - can proceed with lower score
    return { path: 'SPONSORED', eligibility: 'APPROVED' };
  } else {
    // Low score, no sponsor
    throw new Error('Your reputation score is below 500. Please either build your marketplace history or find an Agent sponsor.');
  }
}
```

#### B. Frontend UI Differentiation
- **High-reputation SMEs**: See "Apply for Investment" button directly
- **Low-reputation users**: See "Find a Sponsor" button
- **Sponsored users**: See "Apply for Investment (Sponsored by [Agent Name])"

---

## Implementation Priority Matrix

### **Phase 1: Foundation (Weeks 1-2)**
Critical for MVP functionality

1. ✅ Fix existing bugs (payment schedule creation, status updates) - **COMPLETED**
2. 🔴 Implement Sponsorship System (database + basic endpoints)
3. 🔴 Update Profit Distribution to 4-Way Split (add Agent commission)
4. 🔴 Create Risk Mitigation Wallet

### **Phase 2: Trust Infrastructure (Weeks 3-4)**
Enable reputation-based capital access

5. 🟡 Complete Reputation Engine calculation logic
6. 🟡 Build Agent Dashboard (view sponsored users, income tracking)
7. 🟡 Implement Path Differentiation (Performance vs Sponsored)

### **Phase 3: Marketplace (Weeks 5-8)**
Enable "Performance Trust" path for SMEs

8. 🟢 Build E-Commerce Marketplace (products, orders, reviews)
9. 🟢 Integrate Marketplace data into Reputation Engine
10. 🟢 Customer-facing marketplace portal

### **Phase 4: Advanced Features (Weeks 9-12)**
Scale and sophistication

11. 🔵 AI "Lens of Truth" integration (fraud detection, profit verification)
12. 🔵 On-Chain Reputation Registry (Cardano smart contract)
13. 🔵 Default handling & risk mitigation automation

---

## Database Migration Summary

### **New Tables Required:**

1. `SponsorshipHistory` - Track Agent-User sponsorship links over time
2. `AgentCommission` - Record 5% commissions paid to Agents
3. `PlatformWallet` - Separate REVENUE and RISK_MITIGATION wallets
4. `Product` - Marketplace product listings
5. `Order` - E-commerce orders for SMEs
6. `Review` - Customer reviews and ratings

### **Schema Updates Required:**

1. **User Table:**
   - Add `sponsoringAgentId` (nullable)
   - Add sponsorship relations

2. **SME Table:**
   - Add `isBlocked` (boolean)
   - Add `blockReason` (string)
   - Add `unblockDate` (datetime)

3. **PaymentInstallment Table:**
   - Add `paidDate` (datetime, nullable)
   - Needed for financial history score calculation

---

## API Endpoints to Build

### **Sponsorship:**
- `POST /api/sponsorship/request` - User requests sponsorship from Agent
- `POST /api/sponsorship/approve` - Agent approves sponsorship
- `POST /api/sponsorship/transfer` - User switches Agent
- `GET /api/sponsorship/my-agent` - Get current sponsor info
- `GET /api/sponsorship/my-sponsored-users` - Agent portfolio

### **Agent Dashboard:**
- `GET /api/agent/dashboard` - Stats overview
- `GET /api/agent/income-history` - Commission earnings
- `GET /api/agent/sponsored-users/:userId/performance` - Individual user metrics

### **Reputation:**
- `GET /api/reputation/:userId` - Get full reputation breakdown
- `POST /api/reputation/recalculate` - Trigger score update (admin)
- `GET /api/reputation/leaderboard` - Top-scored SMEs

### **Marketplace:**
- `POST /api/products` - Create product
- `GET /api/products` - Browse products (public)
- `POST /api/orders` - Place order
- `PATCH /api/orders/:id/fulfill` - SME marks order fulfilled
- `POST /api/reviews` - Customer submits review

### **Risk Management:**
- `GET /api/risk/wallet-balance` - Check risk fund balance
- `POST /api/risk/handle-default/:installmentId` - Process default (admin)
- `GET /api/risk/defaults-report` - Dashboard of defaults

---

## Frontend Components to Build

### **Agent Portal (New Section in SME/Investor Dashboards):**
- Agent Dashboard
- Sponsored Users List
- Income Tracking Chart
- Sponsorship Request Queue
- Sponsorship Performance Metrics

### **User Profile:**
- "Find a Sponsor" button (for unsponsored users)
- Current sponsor display
- "Switch Sponsor" functionality
- Sponsorship history timeline

### **Marketplace (Possibly New App):**
- Product browsing/search
- Product detail pages
- Shopping cart
- Checkout (multi-currency)
- Order tracking
- Review submission

### **SME Portal Additions:**
- Product management dashboard
- Order fulfillment interface
- Inventory tracking
- Customer reviews moderation

### **Admin Portal Additions:**
- Risk wallet monitoring
- Default handling interface
- Sponsorship oversight (fraud prevention)
- AI fraud alerts dashboard

---

## Testing Requirements

### **Unit Tests:**
- Reputation calculation logic (each component)
- 4-way split profit distribution
- Agent commission calculation
- Sponsorship transfer logic
- Default handling scenarios

### **Integration Tests:**
- End-to-end investment flow (both paths)
- Profit reporting → distribution → commission
- Marketplace order → fulfillment → review → score update
- Sponsorship request → approval → investment

### **Security Tests:**
- Overfunding prevention
- Agent commission manipulation attempts
- Reputation score gaming
- Default fund drainage attacks

---

## Performance Considerations

### **High-Traffic Endpoints:**
- Product browsing (marketplace)
- Reputation score calculation (cache scores, recalculate only on events)
- Agent dashboard (pre-aggregate commission totals)

### **Optimization Strategies:**
- **Redis Caching:** Cache reputation scores (invalidate on key events)
- **Database Indexing:** Add indexes on `sponsoringAgentId`, `smeId`, product searches
- **Pagination:** All list endpoints (products, orders, users)
- **Background Jobs:** Reputation recalculation, commission distribution

---

## Open Questions & Decisions Needed

1. **Agent Qualification:** What criteria must a user meet to become an Agent? (Reputation score threshold? Manual approval?)

2. **Sponsorship Limits:** Should Agents have a max number of sponsored users? (Prevent over-leveraging)

3. **Commission Cap:** Is there a max lifetime commission an Agent can earn from one user? (Prevent infinite dependency)

4. **Default Threshold:** At what point is a late payment considered a "default"? (30 days? 60 days?)

5. **Risk Fund Depletion:** What happens if risk fund runs out during a default? (Partial payouts? Insurance?)

6. **Marketplace Revenue:** Does the platform take a % of marketplace sales too, or only investment profits?

7. **Path Switching:** Can a high-reputation SME later get a sponsor if needed? (Flexibility)

8. **On-Chain vs Off-Chain:** Which reputation data goes on-chain vs stays in database? (Cost vs transparency trade-off)

---

## Success Metrics to Track

### **Platform Health:**
- Total reputation score distribution (how many users in each tier)
- Default rate (% of investments that default)
- Risk wallet balance over time
- Agent portfolio performance (avg success rate of sponsored users)

### **Business Metrics:**
- Total capital deployed (NGN + ADA + USDM equivalent)
- Platform revenue from fees
- Agent commission payouts (proof of generational income model)
- Marketplace GMV (Gross Merchandise Value)

### **Trust Metrics:**
- Average reputation score of funded SMEs
- % of investments using Performance Trust path vs Sponsored path
- Customer satisfaction (marketplace review averages)
- Investor return rates (profit received vs capital invested)

---

## Conclusion

The Charter describes an **ambitious, multi-layered trust infrastructure**. Current implementation covers ~40% of the vision (multi-currency, basic profit-sharing, reputation framework).

**Critical missing pieces:**
1. Sponsorship System (human collateral)
2. 4-Way Split (Agent commission)
3. Full Reputation Engine
4. Marketplace (performance trust)

**Next Steps:**
1. Review and approve this roadmap
2. Prioritize implementation phases
3. Begin Phase 1 development (Sponsorship + 4-Way Split)

---

**Document Status:** Draft for Review  
**Last Updated:** December 31, 2025  
**Prepared By:** GitHub Copilot (AI Development Assistant)
