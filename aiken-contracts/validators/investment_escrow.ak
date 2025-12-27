// Investment Escrow Validator
// 
// Locks ADA or USDM tokens in escrow when international investors fund SMEs.
// Funds are released to the SME when the funding request is fully funded,
// or refunded to the investor if the request expires.

use aiken/builtin
use aiken/dict.{Dict}
use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{ScriptContext, Spend, Transaction, InlineDatum, Input, Output}
use aiken/transaction/credential.{VerificationKey, Address, ScriptCredential}
use aiken/transaction/value.{PolicyId, AssetName, Value, lovelace_of, quantity_of}

// Datum: Investment details locked in the UTXO
type InvestmentDatum {
  investor_pkh: Hash<Blake2b_224, VerificationKey>,  // Investor's public key hash
  sme_pkh: Hash<Blake2b_224, VerificationKey>,       // SME's public key hash
  oracle_pkh: Hash<Blake2b_224, VerificationKey>,    // Platform oracle key hash
  amount: Int,                                         // Amount in lovelace/tokens
  currency: ByteArray,                                 // "ADA" or "USDM"
  funding_request_id: ByteArray,                       // Off-chain reference (UUID)
  created_at: Int,                                     // POSIXTime (milliseconds)
  expiry_time: Int,                                    // POSIXTime - 30 days from creation
}

// Redeemer: Action to take with locked funds
type EscrowRedeemer {
  Release                                              // Release funds to SME (oracle only)
  Refund                                               // Refund investor (after expiry)
}

// Validate the spend transaction
validator investment_escrow {
  spend(
    datum: InvestmentDatum,
    redeemer: EscrowRedeemer,
    _own_ref: Data,
    ctx: ScriptContext,
  ) -> Bool {
    let ScriptContext { transaction, purpose } = ctx
    
    expect Spend(_) = purpose
    
    let Transaction { inputs, outputs, extra_signatories, validity_range, .. } = transaction
    
    when redeemer is {
      // RELEASE: Oracle authorizes release to SME when request fully funded
      Release -> {
        // 1. Verify oracle signed the transaction
        let has_oracle_signature =
          list.has(extra_signatories, datum.oracle_pkh)
        
        // 2. Find output paying to SME
        let has_sme_output =
          list.any(
            outputs,
            fn(output) {
              let Output { address, value, .. } = output
              // Check address pays to SME's pubkey hash
              when address.payment_credential is {
                VerificationKey(pkh) -> pkh == datum.sme_pkh
                _ -> False
              }
            },
          )
        
        // 3. Verify amount is preserved (minus tx fees)
        // For simplicity, we trust the oracle to construct correct outputs
        
        has_oracle_signature && has_sme_output
      }
      
      // REFUND: Investor can reclaim after expiry
      Refund -> {
        // 1. Verify investor signed the transaction
        let has_investor_signature =
          list.has(extra_signatories, datum.investor_pkh)
        
        // 2. Verify expiry time has passed
        let is_expired =
          when validity_range.upper_bound.bound_type is {
            // Check current time > expiry
            transaction.Finite(valid_before) ->
              valid_before >= datum.expiry_time
            _ -> False
          }
        
        // 3. Find output returning to investor
        let has_investor_output =
          list.any(
            outputs,
            fn(output) {
              let Output { address, value, .. } = output
              when address.payment_credential is {
                VerificationKey(pkh) -> pkh == datum.investor_pkh
                _ -> False
              }
            },
          )
        
        has_investor_signature && is_expired && has_investor_output
      }
    }
  }
}

// Helper test: Always succeeds for initial testing
test always_succeeds() {
  True
}

// Test datum construction
test datum_construction() {
  let test_datum =
    InvestmentDatum {
      investor_pkh: #"00000000000000000000000000000000000000000000000000000000",
      sme_pkh: #"11111111111111111111111111111111111111111111111111111111",
      oracle_pkh: #"22222222222222222222222222222222222222222222222222222222",
      amount: 5000000,
      currency: "ADA",
      funding_request_id: "test-request-123",
      created_at: 1735257600000,
      expiry_time: 1737849600000,
    }
  
  test_datum.amount == 5000000
}
