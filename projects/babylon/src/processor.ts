// NOTE: This processor is temporarily disabled due to extensive SDK API breaking changes.
// The following deprecated functions were used throughout the codebase:
// - getPrice: No longer exported from @sentio/sdk/aptos/ext
// - getCoinInfo: Replaced by getTokenInfoWithFallback (async, different interface)
// - whiteListed: Replaced by whitelistTokens (different interface)
//
// This processor needs significant refactoring to work with the new SDK APIs:
// 1. Replace getCoinInfo with getTokenInfoWithFallback (async)
// 2. Find alternative pricing mechanism for getPrice
// 3. Update whiteListed calls to use whitelistTokens
//
// For now, this is a placeholder that exports nothing.

console.log('babylon processor is disabled - needs refactoring for new Sentio SDK')
