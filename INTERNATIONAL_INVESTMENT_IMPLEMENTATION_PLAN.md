# 🌍 International Investment (ADA/USDM) Implementation Plan

## Executive Summary
After thoroughly reading the existing codebase, I've mapped out the complete Naira funding flow and identified all integration points for multi-currency support. This document outlines the implementation plan for **Option 4: International Investment with ADA/USDM**.

---

## Current System Analysis

### 📊 Existing Naira Flow (Fully Functional)

#### **Phase 1: Funding Request → Investment**
1. **SME Creates Request** (`funding.controller.ts` L115-169)
   - Amount, purpose, profitSharePercentage, termInMonths, repaymentFrequency
   - Links to sponsoring Agent (if any)
   
2. **Investor Approves Request** (`funding.controller.ts` L488-600)
   ```typescript
   // Step 1: Validate amount
   remainingAmount = request.amount - request.amountFunded
   
   // Step 2: Check Naira wallet balance
   investorWallet = await tx.wallet.findUnique({ where: { userId } })
   if (investorWallet.balance < fundingAmount) throw error
   
   // Step 3: Deduct from investor (Naira)
   await tx.wallet.update({ data: { balance: { decrement: fundingAmount } } })
   
   // Step 4: Credit SME (Naira)
   await tx.wallet.update({ data: { balance: { increment: fundingAmount } } })
   
   // Step 5: Create Investment record
   await tx.investment.create({ data: { amount, investorId, fundingRequestId } })
   
   // Step 6: Create Transaction record
   await tx.transaction.create({ data: { amount, type: 'TRANSFER' } })
   
   // Step 7: If fully funded, create payment schedule
   if (newAmountFunded >= request.amount) {
     await createPaymentSchedule(request, tx)
   }
   ```

3. **Payment Schedule Generation** (`funding.controller.ts` L11-109)
   - Creates installment stubs for repayment
   - Calculates investor share percentages: `(investmentAmount / totalFunded) * 100`
   - Creates InstallmentShare records for each investor

#### **Phase 2: Profit Reporting → Distribution**

4. **SME Reports Monthly Profit** (`profit.controller.ts` L27-89)
   ```typescript
   // Business Logic Constants:
   PLATFORM_FEE_FROM_SME_SHARE = 0.20 (20%)
   PLATFORM_FEE_FROM_LENDER_SHARE = 0.10 (10%)
   AGENT_COMMISSION_RATE = 0.05 (5%)
   PLATFORM_RISK_WALLET_FEE = 0.10 (10% of platform net revenue)
   
   // Profit Split Calculation:
   profitSharePercentage = request.profitSharePercentage / 100
   lenderGrossShare = reportedProfit × profitSharePercentage
   smeGrossShare = reportedProfit - lenderGrossShare
   
   // Platform Fees:
   platformFeeFromLender = lenderGrossShare × 0.10
   platformFeeFromSME = smeGrossShare × 0.20
   platformTotalRevenue = platformFeeFromLender + platformFeeFromSME
   
   // Agent Commission (paid by SME, NOT platform):
   agentCommission = smeGrossShare × 0.05 (if agent exists)
   
   // Risk Fund Contribution (from platform revenue):
   platformNetRevenue = platformTotalRevenue
   riskWalletContribution = platformNetRevenue × 0.10
   platformFinalProfit = platformNetRevenue - riskWalletContribution
   
   // Total Due Calculations:
   totalDueToLender = lenderGrossShare - platformFeeFromLender
   totalDueToAgent = agentCommission
   totalDueFromSME = lenderGrossShare + platformFeeFromSME + agentCommission
   
   // If final payment, add principal:
   if (installment.type === FINAL_PAYMENT) {
     totalDueFromSME += request.amount
   }
   ```

5. **SME Makes Payment** (`profit.controller.ts` L95-228)
   - Deducts totalDueFromSME from SME wallet
   - Distributes profit proportionally to each investor:
     ```typescript
     for (const share of installment.investorShares) {
       investorProfitShare = totalDueToLender × (share.sharePercentage / 100)
       investorPrincipalReturn = principalToReturn × (share.sharePercentage / 100)
       totalToInvestor = investorProfitShare + investorPrincipalReturn
       
       // Credit investor wallet
       await tx.wallet.update({ data: { balance: { increment: totalToInvestor } } })
       
       // Update InstallmentShare
       await tx.installmentShare.update({
         data: { expectedShare: investorProfitShare, paidAmount: totalToInvestor }
       })
     }
     ```
   - Credits agent commission (if applicable)
   - Credits platform revenue wallet
   - Credits risk fund wallet

### 🗄️ Current Database Schema (Relevant Models)

```prisma
model User {
  wallet Wallet?
  investments Investment[]
  installmentShares InstallmentShare[]
  cardanoWallet CardanoWallet?
}

model Wallet {
  balance Int @default(0) // In kobo (Naira only)
}

model FundingRequest {
  amount Int // In kobo
  amountFunded Int
  investments Investment[]
}

model Investment {
  amount Int // In kobo
  investorId String
  fundingRequestId String
}

model Transaction {
  amount Int // In kobo
  type TransactionType
  senderId String
  recipientId String
}

model InstallmentShare {
  investmentAmount Int // In kobo
  sharePercentage Float
  expectedShare Int?
  paidAmount Int?
}

model RiskFundContribution {
  amount Int // In kobo, lovelace, or microUSDM
  currency String // "NGN", "ADA", "USDM" ✅ Ready
  conversionRate Float? ✅ Ready
}
```

---

## 🎯 Multi-Currency Architecture Design

### Key Principles:
1. **Naira remains default** - Existing system untouched
2. **ADA/USDM runs parallel** - New currency options, not replacement
3. **Currency-agnostic core logic** - Business rules same across currencies
4. **Explicit currency tracking** - Every monetary value tagged with currency
5. **Smart contract escrow** - ADA/USDM held on-chain until distribution

### Currency Flow Options:

#### **Option A: Multi-Currency Wallets (Recommended)**
- Each user has 3 wallet balances: NGN, ADA, USDM
- Investment records store currency type
- Profit distribution happens in investor's original currency
- Exchange rate tracked at investment time

#### **Option B: Auto-Convert to Naira**
- International investors deposit ADA/USDM
- Immediately converted to Naira at market rate
- Existing Naira system handles everything
- Profits converted back to ADA/USDM when distributed
- **Downside:** Conversion fees, price volatility

**Decision: Use Option A (Multi-Currency Wallets)**

---

## 📋 Implementation Steps

### **Phase 1: Database Schema Extension** (1 day)

#### 1.1 Extend Wallet Model
```prisma
model Wallet {
  id      String @id @default(cuid())
  
  // Legacy Naira balance (keep for backward compatibility)
  balance Int @default(0) // In kobo
  
  // New multi-currency balances
  balanceNGN Int @default(0) // In kobo
  balanceADA BigInt @default(0) // In lovelace (1 ADA = 1,000,000 lovelace)
  balanceUSDM BigInt @default(0) // In microUSDM (1 USDM = 1,000,000 microUSDM)
  
  userId String @unique
  user   User   @relation(fields: [userId], references: [id])
}
```

#### 1.2 Add Currency to Investment
```prisma
model Investment {
  id        String   @id @default(cuid())
  amount    BigInt   // Amount in smallest unit
  currency  Currency @default(NGN) // NEW
  exchangeRateToNGN Float?  // NEW - Rate at investment time
  amountInNGN Int?    // NEW - Cached conversion for reporting
  
  investorId String
  fundingRequestId String
  createdAt DateTime @default(now())
}

enum Currency {
  NGN
  ADA
  USDM
}
```

#### 1.3 Add Currency to FundingRequest
```prisma
model FundingRequest {
  id        String @id @default(cuid())
  amount    Int // Keep in kobo for backward compatibility
  amountFunded Int
  acceptedCurrencies Currency[] @default([NGN]) // NEW - SME chooses accepted currencies
  
  // Rest of fields unchanged...
}
```

#### 1.4 Add Currency to Transaction
```prisma
model Transaction {
  id        String @id @default(cuid())
  amount    BigInt // Changed from Int to BigInt
  currency  Currency @default(NGN) // NEW
  exchangeRateToNGN Float? // NEW
  
  // Rest unchanged...
}
```

#### 1.5 Add Currency to InstallmentShare
```prisma
model InstallmentShare {
  id        String @id @default(cuid())
  
  investmentAmount BigInt // Changed from Int
  investmentCurrency Currency @default(NGN) // NEW
  sharePercentage Float
  
  expectedShare BigInt? // Changed from Int
  paidAmount BigInt? // Changed from Int
  paymentCurrency Currency? // NEW - Currency of payment
  
  // Rest unchanged...
}
```

#### 1.6 Create Migration
```bash
npx prisma migrate dev --name add_multi_currency_support
```

---

### **Phase 2: Exchange Rate Oracle** (1-2 days)

#### 2.1 Create Exchange Rate Service
```typescript
// backend/src/services/exchange-rate.service.ts

interface ExchangeRate {
  currency: Currency;
  rateToNGN: number; // How many kobo = 1 unit
  timestamp: Date;
}

class ExchangeRateService {
  private cache: Map<Currency, ExchangeRate> = new Map();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Get current exchange rate for currency to NGN
   * Examples:
   * - 1 ADA = 800,000 kobo (₦8,000 per ADA)
   * - 1 USDM = 160,000 kobo (₦1,600 per USDM)
   */
  async getRate(currency: Currency): Promise<number> {
    if (currency === Currency.NGN) return 1;

    const cached = this.cache.get(currency);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION_MS) {
      return cached.rateToNGN;
    }

    // Fetch from oracle (Charli3, Chainlink, or Binance API)
    const rate = await this.fetchFromOracle(currency);
    this.cache.set(currency, { currency, rateToNGN: rate, timestamp: new Date() });
    
    return rate;
  }

  /**
   * Convert amount from one currency to NGN
   * @param amount - Amount in smallest unit (kobo/lovelace/microUSDM)
   * @param fromCurrency - Source currency
   * @returns Amount in kobo
   */
  async convertToNGN(amount: bigint, fromCurrency: Currency): Promise<bigint> {
    if (fromCurrency === Currency.NGN) return amount;

    const rate = await this.getRate(fromCurrency);
    
    // Example: 5 ADA (5,000,000 lovelace) → NGN
    // rate = 800,000 kobo per ADA
    // result = 5,000,000 × 800,000 / 1,000,000 = 4,000,000,000 kobo (₦40,000,000)
    return (amount * BigInt(Math.floor(rate))) / 1000000n;
  }

  private async fetchFromOracle(currency: Currency): Promise<number> {
    // TODO: Integrate with Charli3 oracle on Cardano
    // For now, use Binance API as backup
    
    if (currency === Currency.ADA) {
      // Fetch ADA/NGN price from Binance
      // Example: 1 ADA = ₦8,000 = 800,000 kobo
      return 800000; // Placeholder
    }
    
    if (currency === Currency.USDM) {
      // USDM is 1:1 with USD, fetch USD/NGN
      // Example: 1 USD = ₦1,600 = 160,000 kobo
      return 160000; // Placeholder
    }
    
    throw new Error(`Unsupported currency: ${currency}`);
  }
}

export const exchangeRateService = new ExchangeRateService();
```

---

### **Phase 3: Smart Contract Escrow** (2 days)

#### 3.1 Design Escrow Contract (Aiken)
```aiken
// aiken-contracts/validators/investment_escrow.ak

use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{VerificationKey}

// Datum: Investment details
type InvestmentDatum {
  investor: Hash<Blake2b_224, VerificationKey>,  // Investor's pubkey hash
  sme: Hash<Blake2b_224, VerificationKey>,       // SME's pubkey hash
  amount: Int,                                    // Amount in lovelace/microUSDM
  currency: ByteArray,                            // "ADA" or "USDM"
  funding_request_id: ByteArray,                  // Off-chain reference
  created_at: Int,                                // POSIXTime
}

// Redeemer: Action to take
type Action {
  Release { to_sme: Bool }  // Release funds to SME when fully funded
  Refund                     // Refund investor if request expired
}

validator investment_escrow {
  fn spend(datum: InvestmentDatum, redeemer: Action, ctx: ScriptContext) -> Bool {
    when redeemer is {
      Release { to_sme } -> {
        // Only platform oracle can release
        // Verify oracle signature in transaction
        // Transfer funds to SME address
        verify_oracle_signature(ctx) && transfer_to(datum.sme, ctx)
      }
      
      Refund -> {
        // Only investor can refund after expiry
        // Check if funding request expired (30 days)
        let now = get_current_time(ctx)
        let expired = now - datum.created_at > 30 * 24 * 60 * 60 * 1000
        
        verify_investor_signature(datum.investor, ctx) && expired
      }
    }
  }
}
```

#### 3.2 Create Escrow Service
```typescript
// backend/src/cardano/services/investment-escrow.service.ts

class InvestmentEscrowService {
  /**
   * Lock ADA/USDM in smart contract escrow
   */
  async lockFunds(
    investorAddress: string,
    smeAddress: string,
    amount: bigint,
    currency: 'ADA' | 'USDM',
    fundingRequestId: string
  ): Promise<string> {
    // Build datum
    const datum = {
      investor: investorAddress,
      sme: smeAddress,
      amount: amount.toString(),
      currency,
      funding_request_id: fundingRequestId,
      created_at: Date.now()
    };

    // Build and submit transaction
    const tx = await this.buildLockTransaction(datum, amount, currency);
    const signed = await this.signWithInvestor(tx);
    const txHash = await this.submitTransaction(signed);

    return txHash;
  }

  /**
   * Release funds to SME when request fully funded
   */
  async releaseFunds(fundingRequestId: string): Promise<string[]> {
    // Get all locked UTXOs for this funding request
    const utxos = await this.getLockedUTXOs(fundingRequestId);

    // Build transaction to release all
    const tx = await this.buildReleaseTransaction(utxos);
    const signed = await this.signWithOracle(tx);
    const txHash = await this.submitTransaction(signed);

    return [txHash];
  }
}
```

---

### **Phase 4: Multi-Currency Investment Flow** (2-3 days)

#### 4.1 Update Funding Request Creation
```typescript
// Add currency selection to SME funding request form
// File: sme-portal/app/funding/new/page.tsx

const [acceptedCurrencies, setAcceptedCurrencies] = useState<Currency[]>([
  Currency.NGN
]);

// Checkbox options:
// [ ] Accept Naira (NGN) - Local investors
// [ ] Accept ADA - International investors (Cardano)
// [ ] Accept USDM - International investors (Stablecoin)
```

#### 4.2 Update Investment Approval Logic
```typescript
// backend/src/controllers/funding.controller.ts

export const approveRequest = async (req: Request, res: Response) => {
  const { fundingRequestId, fundingAmount, currency = Currency.NGN } = req.body;
  
  // Validate currency accepted
  if (!request.acceptedCurrencies.includes(currency)) {
    return res.status(400).json({ error: 'Currency not accepted' });
  }
  
  // Get exchange rate
  const exchangeRate = await exchangeRateService.getRate(currency);
  const amountInNGN = await exchangeRateService.convertToNGN(
    BigInt(fundingAmount), 
    currency
  );
  
  await prisma.$transaction(async (tx) => {
    // Step 1: Check currency-specific wallet balance
    const walletField = `balance${currency}` as keyof Wallet;
    const investorWallet = await tx.wallet.findUnique({ where: { userId } });
    
    if (currency === Currency.NGN) {
      // Naira: Direct wallet deduction (existing logic)
      if (investorWallet.balanceNGN < fundingAmount) {
        throw new Error('Insufficient NGN balance');
      }
      
      await tx.wallet.update({
        where: { userId },
        data: { balanceNGN: { decrement: fundingAmount } }
      });
      
      await tx.wallet.update({
        where: { userId: sme.userId },
        data: { balanceNGN: { increment: fundingAmount } }
      });
      
    } else {
      // ADA/USDM: Lock in smart contract escrow
      if ((currency === Currency.ADA && investorWallet.balanceADA < fundingAmount) ||
          (currency === Currency.USDM && investorWallet.balanceUSDM < fundingAmount)) {
        throw new Error(`Insufficient ${currency} balance`);
      }
      
      // Lock funds in escrow contract
      const txHash = await investmentEscrowService.lockFunds(
        investorCardanoAddress,
        smeCardanoAddress,
        BigInt(fundingAmount),
        currency,
        fundingRequestId
      );
      
      // Update off-chain wallet balance (locked funds)
      await tx.wallet.update({
        where: { userId },
        data: { [walletField]: { decrement: fundingAmount } }
      });
    }
    
    // Step 2: Create Investment record with currency
    await tx.investment.create({
      data: {
        amount: BigInt(fundingAmount),
        currency,
        exchangeRateToNGN: exchangeRate,
        amountInNGN: Number(amountInNGN),
        investorId: userId,
        fundingRequestId
      }
    });
    
    // Step 3: Create Transaction record
    await tx.transaction.create({
      data: {
        amount: BigInt(fundingAmount),
        currency,
        exchangeRateToNGN: exchangeRate,
        type: TransactionType.TRANSFER,
        senderId: userId,
        recipientId: sme.userId
      }
    });
    
    // Step 4: Check if fully funded (compare in NGN)
    const newAmountFundedNGN = request.amountFunded + Number(amountInNGN);
    
    if (newAmountFundedNGN >= request.amount) {
      // Fully funded! Release ADA/USDM escrow to SME
      if (currency !== Currency.NGN) {
        await investmentEscrowService.releaseFunds(fundingRequestId);
      }
      
      // Create payment schedule
      await createPaymentSchedule(request, tx);
    }
  });
};
```

#### 4.3 Update Payment Schedule Generation
```typescript
// backend/src/controllers/funding.controller.ts - createPaymentSchedule()

const createPaymentSchedule = async (request: FundingRequest, tx: any) => {
  // Get all investments with currency info
  const investments = await tx.investment.findMany({
    where: { fundingRequestId: request.id },
    include: { investor: true }
  });
  
  const totalFundedNGN = investments.reduce(
    (sum, inv) => sum + inv.amountInNGN, 
    0
  );
  
  // Create installments (unchanged)
  // ...
  
  // Create InstallmentShare for each investor (with currency)
  for (const investment of investments) {
    await tx.installmentShare.create({
      data: {
        investmentAmount: investment.amount,
        investmentCurrency: investment.currency,
        sharePercentage: (investment.amountInNGN / totalFundedNGN) * 100,
        investorId: investment.investorId,
        installmentId: installment.id
      }
    });
  }
};
```

---

### **Phase 5: Multi-Currency Profit Distribution** (2-3 days)

#### 5.1 Update Profit Payment Logic
```typescript
// backend/src/controllers/profit.controller.ts - payInstallment()

// Multi-investor profit distribution (enhanced with currency)
for (const share of installment.investorShares) {
  // Calculate profit in NGN (unchanged)
  const investorProfitShareNGN = Math.floor(
    totalProfitToDistribute * (share.sharePercentage / 100)
  );
  
  const investorPrincipalReturnNGN = Math.floor(
    principalToReturn * (share.sharePercentage / 100)
  );
  
  const totalToInvestorNGN = investorProfitShareNGN + investorPrincipalReturnNGN;
  
  // Convert to investor's original currency
  let totalToInvestor: bigint;
  let paymentCurrency: Currency;
  
  if (share.investmentCurrency === Currency.NGN) {
    // Pay in Naira (no conversion)
    totalToInvestor = BigInt(totalToInvestorNGN);
    paymentCurrency = Currency.NGN;
    
    await tx.wallet.update({
      where: { id: share.investor.wallet.id },
      data: { balanceNGN: { increment: Number(totalToInvestor) } }
    });
    
  } else {
    // Convert NGN profit back to investor's currency (ADA/USDM)
    const currentRate = await exchangeRateService.getRate(share.investmentCurrency);
    
    // Example: 4,000,000 kobo → ADA
    // rate = 800,000 kobo per ADA
    // result = 4,000,000 / 800,000 × 1,000,000 = 5,000,000 lovelace (5 ADA)
    totalToInvestor = BigInt(totalToInvestorNGN) * 1000000n / BigInt(currentRate);
    paymentCurrency = share.investmentCurrency;
    
    // Send ADA/USDM via Cardano transaction
    await this.sendCardanoPayment(
      share.investor.cardanoWallet.address,
      totalToInvestor,
      paymentCurrency
    );
    
    // Update off-chain wallet
    const walletField = `balance${paymentCurrency}` as keyof Wallet;
    await tx.wallet.update({
      where: { id: share.investor.wallet.id },
      data: { [walletField]: { increment: Number(totalToInvestor) } }
    });
  }
  
  // Update InstallmentShare
  await tx.installmentShare.update({
    where: { id: share.id },
    data: {
      expectedShare: BigInt(investorProfitShareNGN),
      paidAmount: totalToInvestor,
      paymentCurrency,
      paidAt: new Date()
    }
  });
  
  // Create transaction record
  await tx.transaction.create({
    data: {
      amount: totalToInvestor,
      currency: paymentCurrency,
      type: TransactionType.PROFIT_SHARE,
      status: TransactionStatus.COMPLETED,
      notes: `Profit share for ${getMonthName(installment.month)} ${installment.year}`,
      senderId: userId,
      recipientId: share.investorId
    }
  });
}
```

#### 5.2 Create Cardano Payment Service
```typescript
// backend/src/cardano/services/payment.service.ts

class CardanoPaymentService {
  /**
   * Send ADA or USDM to investor
   */
  async sendPayment(
    recipientAddress: string,
    amount: bigint,
    currency: 'ADA' | 'USDM'
  ): Promise<string> {
    const lucid = await this.initLucid();
    
    let tx = lucid.newTx();
    
    if (currency === 'ADA') {
      // Send native ADA
      tx = tx.payToAddress(recipientAddress, { lovelace: amount });
    } else {
      // Send USDM token
      const usdmAsset = `${USDM_POLICY_ID}.${USDM_ASSET_NAME}`;
      tx = tx.payToAddress(recipientAddress, { [usdmAsset]: amount });
    }
    
    const built = await tx.complete();
    const signed = await built.sign().complete();
    const txHash = await signed.submit();
    
    return txHash;
  }
}
```

---

### **Phase 6: Frontend Updates** (2 days)

#### 6.1 Currency Selection UI (Investor Dashboard)
```tsx
// investor-dashboard/app/dashboard/page.tsx

const [selectedCurrency, setSelectedCurrency] = useState<Currency>(Currency.NGN);

<select onChange={(e) => setSelectedCurrency(e.target.value as Currency)}>
  <option value="NGN">Nigerian Naira (₦)</option>
  <option value="ADA">Cardano (ADA) - International</option>
  <option value="USDM">USDM Stablecoin ($) - International</option>
</select>

// Display wallet balances
<div className="wallet-balances">
  <div>NGN Balance: ₦{formatNaira(wallet.balanceNGN)}</div>
  <div>ADA Balance: ₳{formatADA(wallet.balanceADA)}</div>
  <div>USDM Balance: ${formatUSDM(wallet.balanceUSDM)}</div>
</div>
```

#### 6.2 Currency Badge on Funding Requests
```tsx
// investor-dashboard/components/FundingRequestCard.tsx

<div className="accepted-currencies">
  <span>Accepts:</span>
  {request.acceptedCurrencies.map(currency => (
    <Badge key={currency} variant={currency}>
      {currency === 'NGN' && '₦ Naira'}
      {currency === 'ADA' && '₳ ADA'}
      {currency === 'USDM' && '$ USDM'}
    </Badge>
  ))}
</div>
```

#### 6.3 Exchange Rate Display
```tsx
// Show real-time exchange rate when investing
<div className="exchange-rate-info">
  {selectedCurrency !== 'NGN' && (
    <p>
      Current Rate: 1 {selectedCurrency} = ₦{exchangeRate.toLocaleString()}
      <br />
      Your {investmentAmount} {selectedCurrency} ≈ ₦{convertedAmount.toLocaleString()}
    </p>
  )}
</div>
```

---

## 🧪 Testing Strategy

### Unit Tests
- Exchange rate conversion calculations
- Currency-specific wallet operations
- Profit distribution in multiple currencies

### Integration Tests
- Complete investment flow (NGN → ADA → USDM)
- Mixed currency investments on same request
- Profit distribution with multiple currencies
- Escrow lock/release cycles

### End-to-End Tests
1. **Naira Investment (Baseline)**
   - Verify existing flow still works
   - No regressions

2. **ADA Investment**
   - International investor connects Cardano wallet
   - Deposits ADA to platform wallet
   - Invests in SME funding request
   - Funds locked in escrow
   - Request gets fully funded
   - Escrow released to SME
   - SME reports profit
   - Investor receives profit in ADA

3. **USDM Investment**
   - Same as ADA but with stablecoin
   - Verify 1:1 USD peg maintained

4. **Mixed Currency Investment**
   - Request accepts all 3 currencies
   - Investor A: 50% NGN
   - Investor B: 30% ADA
   - Investor C: 20% USDM
   - Verify proportional profit distribution

---

## 📊 Business Logic Verification

### Profit Distribution Example

**Scenario:**
- SME receives ₦1,000,000 funding
  - Investor A: ₦500,000 (50%) in NGN
  - Investor B: 5 ADA (₦40,000 = 5%) via ADA @ ₦8,000/ADA
  - Investor C: 281 USDM (₦450,000 = 45%) via USDM @ ₦1,600/USDM
- Month 1 profit: ₦200,000
- Profit share: 40%

**Calculations:**
```
Lender Gross Share: ₦200,000 × 40% = ₦80,000
SME Gross Share: ₦200,000 - ₦80,000 = ₦120,000

Platform Fee (Lender): ₦80,000 × 10% = ₦8,000
Platform Fee (SME): ₦120,000 × 20% = ₦24,000
Platform Total Revenue: ₦32,000

Agent Commission: ₦120,000 × 5% = ₦6,000 (if agent)

Risk Fund: ₦32,000 × 10% = ₦3,200

Total Due to Lenders: ₦80,000 - ₦8,000 = ₦72,000

Investor Distributions:
- Investor A (50% NGN): ₦72,000 × 50% = ₦36,000 (paid in NGN)
- Investor B (5% ADA): ₦72,000 × 5% = ₦3,600
  → Convert: ₦3,600 / ₦8,000 × 1,000,000 = 450,000 lovelace (0.45 ADA)
- Investor C (45% USDM): ₦72,000 × 45% = ₦32,400
  → Convert: ₦32,400 / ₦1,600 × 1,000,000 = 20,250,000 microUSDM (20.25 USDM)
```

---

## 🚀 Rollout Plan

### Phase 1: Foundation (Week 1)
- ✅ Database schema migration
- ✅ Exchange rate oracle service
- ✅ Basic multi-currency wallet CRUD

### Phase 2: Smart Contracts (Week 2)
- ✅ Write and test Aiken escrow contract
- ✅ Deploy to Preprod testnet
- ✅ Build escrow service integration

### Phase 3: Investment Flow (Week 3)
- ✅ Update funding request creation (currency selection)
- ✅ Update investment approval (multi-currency)
- ✅ Test ADA/USDM locking in escrow

### Phase 4: Profit Distribution (Week 4)
- ✅ Update profit calculation (currency conversion)
- ✅ Build Cardano payment service
- ✅ Test end-to-end profit distribution

### Phase 5: Frontend (Week 5)
- ✅ Currency selection UI
- ✅ Wallet balance display (multi-currency)
- ✅ Exchange rate display
- ✅ Transaction history per currency

### Phase 6: Testing & Launch (Week 6)
- ✅ Integration testing
- ✅ Security audit
- ✅ Mainnet deployment
- ✅ User documentation

---

## 🔐 Security Considerations

1. **Exchange Rate Manipulation**
   - Use multiple oracles (Charli3 + Binance)
   - Implement rate deviation alerts
   - Cache rates with short TTL

2. **Smart Contract Escrow**
   - Formal verification of Aiken contracts
   - Time-lock refund mechanism
   - Multi-sig oracle control

3. **Currency Mismatch**
   - Strict type checking on currency fields
   - Transaction-level currency validation
   - Audit logs for all conversions

4. **Wallet Security**
   - Separate hot/cold wallets per currency
   - Multi-sig for large ADA/USDM transfers
   - Regular balance reconciliation

---

## 📈 Success Metrics

### Technical KPIs
- [ ] Zero currency conversion errors
- [ ] < 5 second investment transaction time
- [ ] < 10 second profit distribution time
- [ ] 99.9% escrow contract success rate

### Business KPIs
- [ ] 20% of funding requests accept ADA/USDM within 3 months
- [ ] 15% of investments come from international investors
- [ ] $100,000 equivalent in ADA/USDM locked in platform
- [ ] 50+ international investors onboarded

---

## 🎯 Next Immediate Actions

1. **Review this plan with stakeholders** - Confirm architecture decisions
2. **Set up Charli3 oracle account** - For production exchange rates
3. **Write Aiken escrow contract** - Core smart contract logic
4. **Create database migration** - Schema changes
5. **Build exchange rate service** - Foundation for conversions

---

## 📚 References

- **Existing Codebase:**
  - [funding.controller.ts](c:\Users\Admin\Desktop\catalyst-project\backend\src\controllers\funding.controller.ts) - Investment approval logic
  - [profit.controller.ts](c:\Users\Admin\Desktop\catalyst-project\backend\src\controllers\profit.controller.ts) - Profit distribution logic
  - [schema.prisma](c:\Users\Admin\Desktop\catalyst-project\backend\prisma\schema.prisma) - Database models

- **Cardano Resources:**
  - [Lucid Cardano Docs](https://lucid.spacebudz.io/)
  - [Aiken Language Guide](https://aiken-lang.org/)
  - [Charli3 Oracle](https://charli3.io/)
  - [Mehen USDM](https://www.mehen.io/)

- **Exchange Rate APIs:**
  - Binance: `GET /api/v3/ticker/price?symbol=ADANGN`
  - Charli3: Cardano-native price feeds

---

## ✅ Approval & Sign-off

- [ ] **Technical Architecture** - Reviewed by Dev Team
- [ ] **Business Logic** - Approved by Product Owner
- [ ] **Security Design** - Audited by Security Team
- [ ] **Go-Live Date** - Confirmed by Stakeholders

---

**Status:** 📋 **READY FOR IMPLEMENTATION**  
**Priority:** 🔥 **CRITICAL - Option 4**  
**Estimated Timeline:** 6 weeks  
**Dependencies:** Cardano wallet integration (completed ✅)
