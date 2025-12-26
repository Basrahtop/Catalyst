# Cardano Integration Setup Guide

This guide covers the setup and configuration of Cardano blockchain features for the Catalyst platform.

## Phase 1 Features

✅ **On-Chain Reputation Registry** - SME reputation scores stored immutably on-chain  
✅ **Multi-Signature Risk Fund** - 3-of-3 admin wallet for platform operations  
⏳ **Wallet Connect Integration** - CIP-30 wallet connection (Nami, Eternl, Flint, Yoroi, Lace)

## Prerequisites

1. **Blockfrost API Account**
   - Sign up at: https://blockfrost.io/
   - Get API keys for Preprod (testing) and Mainnet (production)

2. **Node.js Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Aiken CLI** (for smart contract compilation)
   ```bash
   # Install Aiken from: https://aiken-lang.org/installation-instructions
   # Verify installation:
   aiken --version
   ```

## Setup Instructions

### Step 1: Configure Environment Variables

1. Copy the example file:
   ```bash
   cd backend
   cp .env.cardano.example .env.cardano
   ```

2. Edit `.env.cardano` and add your Blockfrost API key:
   ```env
   CARDANO_ENABLED=true
   CARDANO_NETWORK=Preprod
   BLOCKFROST_URL=https://cardano-preprod.blockfrost.io/api/v0
   BLOCKFROST_API_KEY=your_actual_api_key_here
   ```

3. Load environment variables in your main `.env`:
   ```bash
   # Add to backend/.env
   source .env.cardano
   ```

### Step 2: Compile Smart Contracts

```bash
# From backend directory
npm run cardano:build-contracts
```

This will:
1. Compile Aiken contracts in `aiken-contracts/`
2. Generate Plutus JSON
3. Copy to `backend/src/cardano/plutus/`

**Expected Output:**
```
✓ Compiling reputation_registry
✓ 3 tests passed
✅ Contracts compiled and copied
```

### Step 3: Create Multi-Signature Wallet

```bash
npm run cardano:setup-multisig
```

This generates:
- 3 admin key pairs
- Multi-sig script (3-of-3 authorization)
- Multi-sig address for risk fund
- Configuration file: `backend/config/multisig-wallet.json`
- Individual key files: `backend/keys/admin1.json`, `admin2.json`, `admin3.json`

**⚠️ SECURITY WARNING:**
- Distribute the 3 admin keys to different trusted individuals
- Store keys securely (password manager, hardware wallet)
- NEVER commit keys to version control
- `backend/keys/` is already in `.gitignore`

**Expected Output:**
```
🔐 Creating 3-of-3 Multi-Signature Wallet...
✅ Admin keys generated
   Admin 1: addr_test1...
   Admin 2: addr_test1...
   Admin 3: addr_test1...
🏦 Multi-Signature Address Created:
   addr_test1qz...
✅ Configuration saved
```

### Step 4: Fund Multi-Sig Wallet (Preprod Only)

For testing on Preprod:

1. Copy your multi-sig address from the output above
2. Get test ADA from faucet: https://docs.cardano.org/cardano-testnets/tools/faucet/
3. Send 1000 test ADA to the multi-sig address
4. Verify balance:
   ```bash
   # Check balance using Blockfrost API
   curl -H "project_id: YOUR_BLOCKFROST_API_KEY" \
        https://cardano-preprod.blockfrost.io/api/v0/addresses/YOUR_MULTISIG_ADDRESS
   ```

### Step 5: Database Migration

```bash
npx prisma db push
npx prisma generate
```

This creates 3 new tables:
- `CardanoWallet` - User wallet connections
- `ReputationHistory` - On-chain reputation updates
- `RiskFundContribution` - Risk fund deposit tracking

### Step 6: Start Oracle Service

The Oracle service updates reputation scores every 12 hours:

```bash
npm run oracle:start
```

**Or** integrate into your main server (recommended):

```typescript
// backend/src/index.ts
import { cardanoOracle } from './cardano/services/oracle.service';

async function startServer() {
  // ... existing server setup ...
  
  // Initialize Cardano Oracle
  await cardanoOracle.initialize();
  
  // Start listening
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
```

## Testing the Integration

### Test 1: Check Oracle Service Status

```bash
curl http://localhost:8000/api/cardano/status
```

**Expected Response:**
```json
{
  "service": "cardano-oracle",
  "initialized": true,
  "network": "Preprod",
  "lastUpdate": "2024-01-15T12:00:00.000Z"
}
```

### Test 2: Trigger Manual Reputation Update

```typescript
// Run in Node.js console or API endpoint
import { cardanoOracle } from './cardano/services/oracle.service';

await cardanoOracle.initialize();
await cardanoOracle.updateAllReputationScores();
```

### Test 3: Check Risk Fund Balance

```typescript
import { riskFundService } from './cardano/services/risk-fund.service';

await riskFundService.initialize();
const balance = await riskFundService.getBalance();
console.log(balance); // { ada: 1000, usdm: 0, utxos: 1 }
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Catalyst Platform                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐         ┌──────────────┐              │
│  │ Investor     │◄────────┤  SME Portal  │              │
│  │ Dashboard    │         └──────┬───────┘              │
│  └──────┬───────┘                │                       │
│         │                        │                       │
│         │    ┌───────────────────▼────────┐              │
│         └────►   Backend API (Express)    │              │
│              └───────────┬────────────────┘              │
│                          │                               │
│              ┌───────────▼────────────┐                  │
│              │   PostgreSQL Database   │                  │
│              └───────────┬────────────┘                  │
│                          │                               │
└──────────────────────────┼───────────────────────────────┘
                           │
              ┌────────────▼───────────┐
              │   Cardano Integration   │
              ├─────────────────────────┤
              │                         │
              │  ┌──────────────────┐   │
              │  │ Oracle Service   │   │
              │  │ (Cron: 12hrs)    │   │
              │  └────────┬─────────┘   │
              │           │             │
              │  ┌────────▼─────────┐   │
              │  │ Lucid (TX Build) │   │
              │  └────────┬─────────┘   │
              │           │             │
              │  ┌────────▼─────────┐   │
              │  │ Blockfrost API   │   │
              │  └────────┬─────────┘   │
              │           │             │
              └───────────┼─────────────┘
                          │
              ┌───────────▼─────────────┐
              │   Cardano Blockchain    │
              ├─────────────────────────┤
              │                         │
              │  ┌──────────────────┐   │
              │  │ Reputation UTxO  │   │
              │  │ (Aiken Contract) │   │
              │  └──────────────────┘   │
              │                         │
              │  ┌──────────────────┐   │
              │  │ Multi-Sig Wallet │   │
              │  │ (3-of-3 Native)  │   │
              │  └──────────────────┘   │
              │                         │
              └─────────────────────────┘
```

## File Structure

```
backend/
├── src/
│   └── cardano/
│       ├── services/
│       │   ├── oracle.service.ts       # Reputation update service
│       │   ├── oracle.runner.ts        # Cron job runner
│       │   └── risk-fund.service.ts    # Multi-sig wallet management
│       ├── scripts/
│       │   └── create-multisig.ts      # Multi-sig setup script
│       ├── plutus/
│       │   └── reputation_registry.json # Compiled smart contract
│       ├── keys/                        # Admin keys (gitignored)
│       └── config/
│           └── multisig-wallet.json    # Multi-sig config (gitignored)
├── .env.cardano                         # Cardano environment variables
└── .env.cardano.example                 # Template

aiken-contracts/
├── validators/
│   └── reputation_registry.ak          # Aiken smart contract
├── aiken.toml                          # Aiken project config
└── plutus.json                         # Compiled output
```

## Troubleshooting

### Issue: "Oracle service not initialized"

**Cause:** `CARDANO_ENABLED=false` or missing Blockfrost API key

**Solution:**
1. Check `.env.cardano`: Set `CARDANO_ENABLED=true`
2. Verify `BLOCKFROST_API_KEY` is valid
3. Restart backend server

### Issue: "Plutus contract not found"

**Cause:** Aiken contracts not compiled

**Solution:**
```bash
npm run cardano:build-contracts
```

### Issue: "Multi-sig configuration not found"

**Cause:** Multi-sig wallet not created

**Solution:**
```bash
npm run cardano:setup-multisig
```

### Issue: Database errors with Cardano models

**Cause:** Prisma client not regenerated after schema changes

**Solution:**
```bash
npx prisma generate
# If that fails, restart VS Code TypeScript server
```

## Production Deployment

### Mainnet Checklist

- [ ] Update `CARDANO_NETWORK=Mainnet`
- [ ] Update `BLOCKFROST_URL` to mainnet endpoint
- [ ] Get new Blockfrost API key for Mainnet
- [ ] Generate new multi-sig wallet (mainnet keys)
- [ ] Fund multi-sig wallet with real ADA
- [ ] Deploy reputation registry contract to Mainnet
- [ ] Test with small amounts first
- [ ] Set up monitoring and alerts
- [ ] Store admin keys in hardware wallets

### Security Hardening

1. **Key Management:**
   - Use hardware wallets (Ledger, Trezor) for admin keys
   - Store keys in separate secure locations
   - Implement key rotation policy

2. **Access Control:**
   - Restrict API keys to specific IP addresses
   - Use rate limiting on Blockfrost requests
   - Monitor transaction activity

3. **Monitoring:**
   - Set up Blockfrost webhooks for transaction notifications
   - Alert on unauthorized multi-sig attempts
   - Track reputation update success rate

## $USDM Stablecoin Integration

To enable $USDM (Mehen) stablecoin:

1. Get $USDM policy ID from Cardano:
   ```
   # Policy ID will be available when $USDM launches
   USDM_POLICY_ID=<policy_id_from_mehen>
   ```

2. Update `.env.cardano`:
   ```env
   USDM_POLICY_ID=abc123...
   ```

3. Risk fund will automatically track $USDM balance alongside ADA

## Next Phase: Escrow Contracts

Phase 2 will add:
- Investment escrow smart contracts
- Profit distribution automation
- Multi-currency swaps (NGN ↔ ADA ↔ $USDM)
- Anonymized investor IDs on-chain

## Support

For issues or questions:
- Check logs: `backend/logs/cardano-oracle.log`
- Review Aiken docs: https://aiken-lang.org/
- Blockfrost docs: https://docs.blockfrost.io/
- Lucid docs: https://lucid.spacebudz.io/
