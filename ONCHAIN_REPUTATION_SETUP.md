# On-Chain Reputation Recording - Setup Guide

## Overview
The on-chain reputation system allows SMEs to permanently record their reputation scores on the Cardano blockchain, making them tamper-proof and verifiable by investors.

## What We Just Implemented

### Backend
1. **Oracle Service Enhancement** (`oracle.service.ts`)
   - Added `submitReputationToBlockchain()` method
   - Builds Cardano transactions with reputation data
   - Submits to preprod testnet
   - Stores transaction hash in database

2. **New Controller** (`reputation-onchain.controller.ts`)
   - `POST /api/reputation/submit-onchain` - Submit reputation to blockchain
   - `GET /api/reputation/onchain-history` - View submission history
   - `GET /api/reputation/verify/:reputationId` - Public verification endpoint

3. **Routes** (`reputation-onchain.routes.ts`)
   - Connected all endpoints with authentication middleware

### Frontend (SME Portal)
1. **New Page** (`/dashboard/reputation`)
   - Submit button to record reputation on-chain
   - View blockchain submission history
   - Links to Cardano explorer for each transaction
   - Real-time status updates

2. **Sidebar Navigation**
   - Added "Reputation" link with Shield icon

## Setup Required

### 1. Create Oracle Wallet (Preprod Testnet)

The oracle wallet pays for blockchain transactions. You need to:

**Option A: Use Eternl Wallet (Recommended)**
1. Install [Eternl Wallet](https://eternl.io/)
2. Create a new wallet
3. **IMPORTANT**: Select "Preprod Testnet" network
4. Save the 24-word seed phrase securely
5. Get test ADA from [Cardano Faucet](https://docs.cardano.org/cardano-testnet/tools/faucet/)
   - Request at least 1000 test ADA
   - Each reputation submission costs ~2 ADA

**Option B: Generate with Cardano CLI**
```bash
cardano-cli address key-gen \
  --verification-key-file oracle.vkey \
  --signing-key-file oracle.skey

cardano-cli address build \
  --payment-verification-key-file oracle.vkey \
  --testnet-magic 1 \
  --out-file oracle.addr
```

### 2. Configure Environment Variables

Add to `backend/.env`:

```env
# Oracle Wallet Seed Phrase (24 words from step 1)
ORACLE_WALLET_SEED_PHRASE="word1 word2 word3 ... word24"
```

**SECURITY WARNINGS:**
- ⚠️ Never commit seed phrases to git
- ⚠️ Use different wallets for testnet and mainnet
- ⚠️ Store production seed phrases in secure vaults (AWS Secrets Manager, Azure Key Vault)

### 3. Ensure Cardano Integration is Enabled

In `backend/.env`:
```env
CARDANO_ENABLED=true
CARDANO_NETWORK=Preprod
BLOCKFROST_URL=https://cardano-preprod.blockfrost.io/api/v0
BLOCKFROST_API_KEY=preprod39l0NhDAV4JADjgkMXNkqfJooLhomXDR
```

### 4. Restart Backend

```bash
cd backend
npm run dev
```

Check logs for:
```
✅ Script address: addr_test1w...
✅ Cardano Oracle Service initialized successfully
✅ Oracle Service active
```

## How to Use

### For SMEs:
1. **Connect Wallet** (if not already done)
   - Go to Dashboard → Wallet
   - Connect your Cardano wallet (Eternl, Nami, etc.)
   - Sign verification message

2. **Submit Reputation**
   - Go to Dashboard → Reputation
   - Click "Record Reputation on Blockchain"
   - Wait ~20-60 seconds for confirmation
   - View transaction on Cardano explorer

3. **View History**
   - See all past blockchain submissions
   - Each entry shows scores and transaction hash
   - Click "View TX" to see on blockchain explorer

### For Investors (Future):
1. Get SME's Reputation ID (displayed on SME profile)
2. Use verification endpoint or dedicated UI
3. See authentic, tamper-proof reputation history

## Testing Checklist

- [ ] Backend starts without errors
- [ ] SME can connect wallet
- [ ] SME can verify wallet ownership
- [ ] "Reputation" link appears in sidebar
- [ ] Reputation page loads correctly
- [ ] Submit button works (if wallet verified)
- [ ] Transaction appears in history
- [ ] Blockchain explorer link works
- [ ] Scores match database values

## Cost Structure

**Per On-Chain Submission:**
- Transaction fee: ~0.17 ADA
- Min UTxO (locked in contract): 2 ADA
- **Total**: ~2.17 ADA per submission

**Recommended Funding:**
- Test wallet: 100-1000 test ADA (free from faucet)
- Production wallet: Start with 1000 ADA
- Monitor and refill as needed

## Troubleshooting

### "Cardano service not initialized"
- Check `CARDANO_ENABLED=true` in .env
- Verify Blockfrost API key is valid
- Check backend logs for initialization errors

### "Missing required field: signature"
- Wallet not verified
- Go to Dashboard → Wallet → Sign verification message

### "Insufficient funds"
- Oracle wallet needs test ADA
- Visit Cardano faucet and request funds
- Check wallet balance in Eternl

### Transaction not appearing
- Wait 20-60 seconds for confirmation
- Check browser console for errors
- Check backend terminal for submission logs

## Next Steps

1. **Investor Verification UI**: Build interface for investors to verify reputation
2. **Automatic Submissions**: Trigger on-chain submission when scores update significantly
3. **Gas Optimization**: Batch multiple submissions to save on transaction fees
4. **Historical Queries**: Query blockchain directly to show reputation timeline
5. **Mainnet Migration**: Deploy to Cardano mainnet with security audit

## API Endpoints

### Submit Reputation (Authenticated)
```http
POST /api/reputation/submit-onchain
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "txHash": "abc123...",
  "utxoRef": "abc123...#0",
  "reputationId": "85516e0a...",
  "explorerUrl": "https://preprod.cardanoscan.io/transaction/abc123...",
  "timestamp": "2025-12-26T00:00:00.000Z"
}
```

### Get History (Authenticated)
```http
GET /api/reputation/onchain-history
Authorization: Bearer <jwt_token>

Response:
{
  "history": [
    {
      "timestamp": "2025-12-26T00:00:00.000Z",
      "overallScore": 850,
      "marketplaceScore": 250,
      "feedbackScore": 300,
      "platformTrustScore": 150,
      "financialScore": 150,
      "txHash": "abc123...",
      "explorerUrl": "https://preprod.cardanoscan.io/transaction/abc123..."
    }
  ],
  "total": 1
}
```

### Verify Reputation (Public)
```http
GET /api/reputation/verify/85516e0a1153d1239ab442230e6a435d67b2967f1026c0d646d8cbfe07ac6246

Response:
{
  "businessName": "Example SME",
  "industry": "Agriculture",
  "reputationId": "85516e0a...",
  "verified": true,
  "reputation": {
    "overallScore": 850,
    "marketplaceScore": 250,
    "feedbackScore": 300,
    "platformTrustScore": 150,
    "financialScore": 150,
    "lastUpdated": "2025-12-26T00:00:00.000Z",
    "txHash": "abc123...",
    "explorerUrl": "https://preprod.cardanoscan.io/transaction/abc123..."
  }
}
```

## Architecture

```
┌─────────────┐
│ SME Portal  │
│ (Frontend)  │
└──────┬──────┘
       │ POST /reputation/submit-onchain
       ▼
┌─────────────────┐
│ Backend API     │
│ (Express)       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐         ┌──────────────┐
│ Oracle Service  │────────>│ Lucid-Cardano│
│ (Business Logic)│         │ (TX Builder) │
└─────────────────┘         └──────┬───────┘
       │                            │
       │                            ▼
       │                    ┌──────────────┐
       │                    │ Blockfrost   │
       │                    │ (Node API)   │
       │                    └──────┬───────┘
       │                           │
       ▼                           ▼
┌─────────────────┐         ┌──────────────┐
│ PostgreSQL      │         │ Cardano      │
│ (Off-Chain DB)  │         │ Blockchain   │
└─────────────────┘         └──────────────┘
```

## Security Considerations

1. **Seed Phrase Protection**
   - Never log or expose seed phrases
   - Use environment variables
   - Rotate wallets periodically

2. **Transaction Validation**
   - Verify wallet ownership before submission
   - Rate limit submissions (prevent spam)
   - Monitor oracle wallet balance

3. **Data Privacy**
   - Only reputation scores go on-chain
   - No personal information (names, addresses)
   - Use Reputation ID instead of wallet address

4. **Access Control**
   - Only verified wallet owners can submit
   - Public verification doesn't expose sensitive data

## Monitoring

Track these metrics:
- Oracle wallet balance (alert if < 100 ADA)
- Failed transaction rate
- Average transaction confirmation time
- Cost per submission
- Total on-chain submissions
