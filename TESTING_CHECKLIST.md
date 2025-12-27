# Testing Checklist - Multi-Currency Implementation

## Prerequisites
- [x] Smart contract deployed to Preprod
- [x] Backend services implemented
- [x] Frontend components created
- [x] Database migrated
- [ ] Backend server running
- [ ] Frontend server running
- [ ] PostgreSQL database running
- [ ] Test wallets funded with Preprod ADA

---

## Test 1: NGN Investment Flow

### Setup
- [ ] Create test SME account
- [ ] Create test investor account
- [ ] Create funding request accepting NGN
- [ ] Fund investor wallet with NGN (via deposit)

### Test Steps
1. [ ] Login as investor
2. [ ] Navigate to funding request
3. [ ] Select NGN currency
4. [ ] Verify balance displays correctly
5. [ ] Enter investment amount
6. [ ] Click "Invest Now"
7. [ ] Verify success message
8. [ ] Check investor wallet (should be debited)
9. [ ] Check SME wallet (should be credited)
10. [ ] Check investment record in database
11. [ ] Check transaction record in database

### Expected Results
- ✅ Investment record created with currency=NGN
- ✅ Investor wallet balance decreased
- ✅ SME wallet balance increased
- ✅ Transaction status = COMPLETED
- ✅ Funding request amountFunded increased

---

## Test 2: ADA Investment Flow

### Setup
- [ ] Install Eternl, Nami, or Yoroi wallet
- [ ] Get Preprod testnet ADA from faucet
- [ ] Connect wallet to investor dashboard
- [ ] Create funding request accepting ADA
- [ ] Connect SME Cardano wallet

### Test Steps
1. [ ] Login as investor
2. [ ] Connect Cardano wallet
3. [ ] Navigate to funding request
4. [ ] Select ADA currency
5. [ ] Verify ADA balance displays correctly
6. [ ] Verify exchange rate displays (ADA = ₦506.35)
7. [ ] Enter investment amount (e.g., 10 ADA)
8. [ ] Verify NGN equivalent calculation
9. [ ] Click "Invest Now"
10. [ ] Sign transaction in wallet
11. [ ] Wait for blockchain confirmation
12. [ ] Verify success message
13. [ ] Check escrow contract (funds locked)
14. [ ] Check investment record (has blockchainTxHash)
15. [ ] Check SME wallet (NOT credited yet)

### Expected Results
- ✅ Investment record created with currency=ADA
- ✅ Investment.blockchainTxHash populated
- ✅ Investment.exchangeRateToNGN recorded
- ✅ Investment.amountInNGN calculated correctly
- ✅ Funds locked at escrow address
- ✅ SME wallet NOT credited immediately
- ✅ Funding request amountFunded increased (NGN equivalent)

---

## Test 3: Complete Funding & Escrow Release

### Setup
- [ ] Use funding request from Test 2 (partially funded with ADA)
- [ ] Calculate remaining amount needed

### Test Steps
1. [ ] Login as second investor
2. [ ] Make investment to complete funding
3. [ ] Verify funding request status = APPROVED
4. [ ] Verify payment schedule created
5. [ ] Wait for escrow release transaction
6. [ ] Check SME Cardano wallet (should receive ADA)
7. [ ] Check investment records (should have releaseTxHash)

### Expected Results
- ✅ Funding request status = APPROVED (fully funded)
- ✅ Payment schedule created
- ✅ Escrow funds released to SME
- ✅ Investment.releaseTxHash populated
- ✅ SME receives ADA in Cardano wallet

---

## Test 4: USDM Investment Flow

### Setup
- [ ] Configure USDM_POLICY_ID in .env
- [ ] Get testnet USDM tokens
- [ ] Create funding request accepting USDM

### Test Steps
1. [ ] Follow same steps as Test 2 but with USDM
2. [ ] Verify USDM balance displays
3. [ ] Verify exchange rate (USDM = ₦1,450.91)
4. [ ] Complete investment
5. [ ] Verify escrow locking

### Expected Results
- ✅ Same as Test 2 but with currency=USDM

---

## Test 5: Multi-Currency Funding Request

### Setup
- [ ] Create funding request accepting [NGN, ADA, USDM]

### Test Steps
1. [ ] Investor 1: Invest 50% in NGN
2. [ ] Investor 2: Invest 30% in ADA
3. [ ] Investor 3: Invest 20% in USDM
4. [ ] Verify all investments recorded correctly
5. [ ] Verify total amountFunded calculated correctly
6. [ ] Complete funding
7. [ ] Verify escrow releases for ADA & USDM

### Expected Results
- ✅ Multiple investments with different currencies
- ✅ Correct NGN equivalent calculations
- ✅ Mixed payment processing (NGN immediate, ADA/USDM escrowed)
- ✅ All funds released to SME when fully funded

---

## Test 6: Profit Distribution - NGN Only

### Setup
- [ ] Use fully funded NGN investment from Test 1
- [ ] Wait for first payment due date (or modify in DB)

### Test Steps
1. [ ] Login as SME
2. [ ] Report profit for installment
3. [ ] Mark installment as PAID
4. [ ] Trigger profit distribution
5. [ ] Check investor wallets (should receive profit share)
6. [ ] Check transaction records

### Expected Results
- ✅ Profit shares calculated correctly
- ✅ Investor wallets credited
- ✅ SME wallet debited
- ✅ Transaction records created with type=PROFIT_SHARE
- ✅ Installment status = DISTRIBUTED

---

## Test 7: Profit Distribution - Multi-Currency

### Setup
- [ ] Use fully funded multi-currency request from Test 5
- [ ] SME reports profit

### Test Steps
1. [ ] Distribute profit shares
2. [ ] Verify NGN investor receives NGN
3. [ ] Verify ADA investor receives ADA (converted from NGN profit)
4. [ ] Verify USDM investor receives USDM (converted from NGN profit)
5. [ ] Check blockchain transactions for ADA/USDM payments
6. [ ] Verify exchange rates used for conversions

### Expected Results
- ✅ NGN investors paid in NGN
- ✅ ADA investors paid in ADA (on blockchain)
- ✅ USDM investors paid in USDM (on blockchain)
- ✅ Correct exchange rate conversions
- ✅ Blockchain TX hashes stored
- ✅ All shares marked as PAID

---

## Test 8: Exchange Rate API

### Test Steps
1. [ ] GET /api/exchange-rates
2. [ ] Verify returns { NGN: 1, ADA: 506.35, USDM: 1450.91 }
3. [ ] GET /api/exchange-rates/ADA
4. [ ] Verify returns { currency: "ADA", rate: 506.35 }
5. [ ] POST /api/exchange-rates/convert
6. [ ] Body: { amount: "1000000", fromCurrency: "ADA", toCurrency: "NGN" }
7. [ ] Verify correct conversion result

### Expected Results
- ✅ All endpoints return 200 OK
- ✅ Rates are current
- ✅ Conversion calculations correct

---

## Test 9: Frontend Currency Selector

### Test Steps
1. [ ] Open investment form
2. [ ] Click NGN tab (default)
3. [ ] Verify NGN balance displays
4. [ ] Click ADA tab
5. [ ] If wallet not connected, verify warning message
6. [ ] Connect wallet
7. [ ] Verify ADA balance displays
8. [ ] Verify exchange rate displays
9. [ ] Enter amount
10. [ ] Verify NGN equivalent updates
11. [ ] Click USDM tab
12. [ ] Verify USDM balance displays

### Expected Results
- ✅ Currency tabs switch correctly
- ✅ Balances fetch and display
- ✅ Exchange rates display
- ✅ NGN equivalent calculated
- ✅ Wallet requirement enforced
- ✅ UI responsive and intuitive

---

## Test 10: Error Handling

### Test Cases
1. [ ] Invest with insufficient balance
   - Expected: Error message "Insufficient balance"
2. [ ] Invest in non-accepted currency
   - Expected: Error message about accepted currencies
3. [ ] Invest without connecting wallet (ADA/USDM)
   - Expected: Warning to connect wallet
4. [ ] Exceed remaining funding amount
   - Expected: Error message about max amount
5. [ ] Network error during blockchain TX
   - Expected: Graceful error handling
6. [ ] Exchange rate API failure
   - Expected: Fallback to cached rate

### Expected Results
- ✅ All errors handled gracefully
- ✅ User-friendly error messages
- ✅ No crashes or blank screens
- ✅ Appropriate fallback mechanisms

---

## Performance Tests

### Metrics to Check
- [ ] Exchange rate API response time < 200ms (cached)
- [ ] Wallet balance query time < 1s
- [ ] Investment transaction processing < 5s (NGN)
- [ ] Investment transaction processing < 30s (ADA/USDM, including blockchain)
- [ ] Profit distribution batch < 10s per 10 investors (NGN)
- [ ] Profit distribution batch < 60s per 10 investors (ADA/USDM)

---

## Security Tests

### Check These
- [ ] Cannot invest more than balance
- [ ] Cannot invest in non-accepted currency
- [ ] Cannot release escrow without full funding
- [ ] Exchange rate validation prevents manipulation
- [ ] Blockchain TX hashes are verifiable
- [ ] Investor cannot access other investor's data
- [ ] SME cannot manipulate profit shares

---

## Database Validation

### Verify Schema
- [ ] Investment table has currency, exchangeRateToNGN, blockchainTxHash
- [ ] Transaction table has currency, blockchainTxHash
- [ ] FundingRequest has acceptedCurrencies array
- [ ] All indexes created correctly

### Verify Data Integrity
- [ ] No orphaned records
- [ ] All foreign keys valid
- [ ] Currency enum values consistent
- [ ] Exchange rates reasonable (not 0 or extreme)
- [ ] Blockchain TX hashes valid format

---

## Bug Tracking

Use this section to note any issues found:

| Test # | Issue Description | Severity | Status |
|--------|------------------|----------|--------|
|        |                  |          |        |

---

## Sign-Off

- [ ] All NGN tests passing
- [ ] All ADA tests passing
- [ ] All USDM tests passing
- [ ] All multi-currency tests passing
- [ ] Performance acceptable
- [ ] Security validated
- [ ] UI/UX acceptable
- [ ] Documentation reviewed

**Tested By:** _______________  
**Date:** _______________  
**Result:** PASS / FAIL / PENDING

---

## Notes

- Test with small amounts first
- Use Preprod testnet only
- Keep test wallets separate from real funds
- Document any unexpected behavior
- Take screenshots of successful flows

