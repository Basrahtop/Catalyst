# Catalyst Platform - Aiken Smart Contracts

This directory contains the Aiken smart contracts for the Catalyst fintech platform.

## Prerequisites

```bash
# Install Aiken
cargo install aiken

# Verify installation
aiken --version
```

## Build

```bash
# Build all contracts
aiken build

# Run tests
aiken check

# Generate Plutus JSON
aiken blueprint convert > plutus.json
```

## Contracts

1. **reputation_registry** - On-chain SME reputation score storage and updates
2. **investment_escrow** - Multi-investor escrow for funding requests (Phase 2)
3. **profit_distribution** - Automated profit sharing to investors (Phase 2)

## Deployment

Copy compiled contracts to backend:
```bash
cp plutus.json ../backend/src/cardano/plutus/
```
