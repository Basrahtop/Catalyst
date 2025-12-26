# Reputation Scoring System - Complete Breakdown

## Overview
The Catalyst platform uses a **1000-point reputation scoring system** to evaluate SME trustworthiness across four key dimensions.

## Score Distribution (Total: 1000 points)

### 1. **Marketplace Score** (300 points max)
**What it measures:** Order fulfillment reliability

**Calculation:**
```
Marketplace Score = (Completed Orders / Total Finished Orders) × 300
```

**Example:**
- Total Finished Orders (COMPLETED + CANCELLED): 100
- Completed Orders: 85
- Score: (85 / 100) × 300 = **255 points**

**How to improve:**
- ✅ Complete orders on time
- ✅ Avoid order cancellations
- ✅ Maintain high fulfillment rate

---

### 2. **Feedback Score** (350 points max)
**What it measures:** Customer satisfaction and product quality

**Calculation:**
```
Feedback Score = (Average Rating / 5.0) × 350
```

**Example:**
- Average customer rating: 4.2 stars
- Score: (4.2 / 5.0) × 350 = **294 points**

**How to improve:**
- ✅ Deliver quality products
- ✅ Provide excellent customer service
- ✅ Address customer concerns promptly
- ✅ Encourage satisfied customers to leave reviews

---

### 3. **Platform Trust Score** (150 points max)
**What it measures:** Identity verification and platform engagement

**Calculation:**
```
Base Score: 50 points (account creation)
Email Verification: +25 points
KYC (NIN) Verification: +75 points
Total Maximum: 150 points
```

**Breakdown:**
- Account created: 50 points (automatic)
- Email verified: +25 points → 75 total
- NIN/KYC verified: +75 points → **150 total**

**How to improve:**
- ✅ Verify your email address (+25 points)
- ✅ Complete KYC verification (+75 points)
- 🔮 Future: BVN verification, Address verification (Phase 2)

---

### 4. **Financial Score** (200 points max)
**What it measures:** Payment reliability and financial discipline

**Calculation:**
```
Financial Score = (On-Time Payments / Total Payments) × 200
```

**What counts as "on-time":**
- Payment marked as PAID (not LATE)
- Paid on or before the due date

**Example:**
- Total finished installments: 20
- On-time payments: 18
- Score: (18 / 20) × 200 = **180 points**

**How to improve:**
- ✅ Pay installments on or before due date
- ✅ Set up payment reminders
- ✅ Maintain good cash flow management
- ✅ Communicate early if payment issues arise

---

## Overall Score Calculation

```
Overall Score = Marketplace Score + Feedback Score + Platform Trust Score + Financial Score

Maximum: 300 + 350 + 150 + 200 = 1000 points
```

### Example SME Profile

| Metric | Score | Max | Percentage |
|--------|-------|-----|------------|
| Marketplace | 255 | 300 | 85% |
| Feedback | 294 | 350 | 84% |
| Platform Trust | 150 | 150 | 100% |
| Financial | 180 | 200 | 90% |
| **Overall** | **879** | **1000** | **87.9%** |

---

## Score Tiers & Interpretation

| Overall Score | Rating | Investor Confidence | Access Level |
|---------------|--------|---------------------|--------------|
| 900-1000 | Excellent | Very High | Premium funding rates |
| 750-899 | Good | High | Standard funding |
| 600-749 | Fair | Moderate | Basic funding |
| 400-599 | Developing | Low | Limited funding |
| 0-399 | New/Emerging | Very Low | Restricted access |

---

## Automatic Updates

Reputation scores are **automatically recalculated** when:

1. ✅ Order status changes (COMPLETED/CANCELLED)
2. ✅ New review is posted
3. ✅ Email is verified
4. ✅ KYC verification completes
5. ✅ Payment installment is marked PAID/LATE

**Update Frequency:**
- Real-time for individual actions
- Batch update every 12 hours (configurable via ORACLE_CRON_SCHEDULE)

---

## Blockchain Recording

SMEs with **verified Cardano wallets** can:

1. Record their reputation on-chain
2. Create tamper-proof reputation records
3. Share verifiable reputation IDs with investors
4. Prove reputation authenticity via blockchain explorer

**Cost:** ~2.17 ADA per submission (0.17 ADA fee + 2 ADA min UTxO)

---

## FAQ

**Q: Why is my overall score showing 250/150?**
A: This was a bug in the score distribution where Platform Trust was set to 300 max instead of 150. This has been fixed. After the next reputation update, your scores will display correctly.

**Q: When are scores updated?**
A: Immediately when actions occur (orders complete, reviews posted, payments made) + automated batch updates every 12 hours.

**Q: Can I see my score history?**
A: Yes! Go to Dashboard → Reputation to see your historical scores and on-chain submissions.

**Q: How do investors verify my reputation?**
A: They can use the "Verify Reputation" page (accessible from both portals) by entering your:
- Transaction hash (from blockchain explorer)
- Reputation ID (privacy-preserving identifier)

**Q: What if I disagree with my score?**
A: Scores are calculated automatically from platform data. To improve:
- Check which metric is low
- Review the calculation method above
- Take action to improve that specific area

---

## Technical Implementation

**Database:** Scores stored in `User` and `SME` models
**History:** All updates logged in `ReputationHistory` table
**Blockchain:** On-chain submissions stored in Cardano smart contract
**Oracle Service:** Automated cron job runs every 12 hours

**Files:**
- Calculation logic: `backend/src/services/reputation.service.ts`
- Oracle service: `backend/src/cardano/services/oracle.service.ts`
- Score constants: Lines 5-10 in reputation.service.ts
