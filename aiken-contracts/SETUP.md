# Aiken Smart Contract Setup Guide

## Installing Aiken

### Windows (PowerShell)
```powershell
# Using Scoop (recommended)
scoop install aiken

# OR using Cargo (Rust)
cargo install aiken
```

### Linux/Mac
```bash
# Using Cargo (Rust)
cargo install aiken

# OR download pre-built binary
curl --proto '=https' --tlsv1.2 -LsSf https://install.aiken-lang.org | sh
```

### Verify Installation
```bash
aiken --version
# Should output: aiken v1.1.0 or later
```

## Building Smart Contracts

1. **Navigate to contracts directory:**
```bash
cd aiken-contracts
```

2. **Build all validators:**
```bash
aiken build
```

This generates `plutus.json` with compiled contract bytecode.

3. **Run tests (optional):**
```bash
aiken check
```

## Contract Structure

```
aiken-contracts/
├── aiken.toml              # Project configuration
├── plutus.json            # Compiled output (generated)
└── validators/
    ├── reputation_simple.ak       # Reputation registry (deployed ✅)
    └── investment_escrow.ak       # Investment escrow (NEW)
```

## Investment Escrow Contract

### Purpose
Locks ADA or USDM tokens on-chain when international investors fund SMEs.

### Datum (stored with locked funds)
```aiken
type InvestmentDatum {
  investor_pkh: PublicKeyHash,    // Investor's wallet
  sme_pkh: PublicKeyHash,          // SME's wallet
  oracle_pkh: PublicKeyHash,       // Platform oracle
  amount: Int,                     // Locked amount
  currency: ByteArray,             // "ADA" or "USDM"
  funding_request_id: ByteArray,   // UUID reference
  created_at: Int,                 // Timestamp
  expiry_time: Int,                // 30 days expiry
}
```

### Redeemers (actions)
- **Release**: Oracle releases funds to SME when request fully funded
- **Refund**: Investor reclaims funds after 30-day expiry

### Security Features
1. **Oracle-only release** - Only platform can release to SME
2. **Time-locked refund** - Investor can refund after expiry
3. **Signature verification** - Cryptographic proof required
4. **Amount preservation** - Locked amount must be transferred

## Deployment

### 1. Compile Contract
```bash
cd aiken-contracts
aiken build
```

### 2. Deploy to Preprod Testnet
```bash
cd ../backend
npm run deploy:escrow:preprod
```

### 3. Test Contract
```bash
npm test -- --grep "investment escrow"
```

### 4. Deploy to Mainnet (when ready)
```bash
npm run deploy:escrow:mainnet
```

## Environment Variables

Add to `backend/.env`:

```bash
# Escrow Contract (after deployment)
ESCROW_SCRIPT_ADDRESS=addr_test1...
ESCROW_SCRIPT_CBOR_HEX=5901...

# Platform Payment Wallet (for sending ADA/USDM)
PAYMENT_WALLET_SEED_PHRASE="24-word seed phrase..."
```

## Testing on Preprod

### 1. Get Test ADA
- Faucet: https://docs.cardano.org/cardano-testnets/tools/faucet/

### 2. Get Test USDM
- Contact Mehen team for testnet USDM

### 3. Fund Oracle Wallet
```bash
# Check balance
npm run cardano:balance

# Request from faucet to oracle address
```

### 4. Test Escrow Flow
```bash
# Lock 5 ADA
npm run test:escrow:lock -- --amount 5000000 --currency ADA

# Release funds
npm run test:escrow:release -- --requestId <uuid>

# Refund (after 30 days)
npm run test:escrow:refund -- --requestId <uuid>
```

## Troubleshooting

### Build Errors
```bash
# Clear build cache
rm -rf aiken-contracts/build

# Rebuild
aiken build
```

### Script Not Found
Ensure `plutus.json` exists after building:
```bash
ls aiken-contracts/plutus.json
```

### Network Issues
Check Blockfrost API key is valid:
```bash
curl https://cardano-preprod.blockfrost.io/api/v0/blocks/latest \
  -H "project_id: YOUR_KEY"
```

## Resources

- **Aiken Documentation**: https://aiken-lang.org/
- **Lucid Documentation**: https://lucid.spacebudz.io/
- **Cardano Developer Portal**: https://developers.cardano.org/
- **Blockfrost API**: https://blockfrost.io/
