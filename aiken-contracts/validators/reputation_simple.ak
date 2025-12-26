// Simplified reputation registry validator  
// Minimal version for testing - always succeeds

validator reputation_registry {
  spend(_datum: Option<Data>, _redeemer: Data, _output_reference: Data, _ctx: Data) {
    True
  }
}
