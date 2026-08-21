/**
 * Human-readable market names, so an alert says something a reader can act on
 * rather than `SUI@9`.
 *
 * Source of truth is the chain tool, not this file:
 * ~/Documents/navi/navi_chain_tool/navi_chain_tool/src/setup/mainnet/config.ts
 * Copied here on 2026-08-17 because the cloud agent has no access to that repo.
 * Re-copy when a market is added.
 *
 * `isolated` marks the single-pair markets created 2026-08-03 (ids 4-9). Each is
 * one supply-only collateral asset plus one borrow-only debt asset, so the debt
 * leg is DESIGNED to sit near full utilisation. "Utilisation approaching the cap"
 * is their steady state and is not a finding for them; only utilisation actually
 * exceeding the configured cap is.
 */
export const MARKETS = {
  0: { name: 'main', isolated: false },
  1: { name: 'Ember (nUSDC/suiUSDe/eACRED)', isolated: false },
  2: { name: 'Matrixdock (nUSDC/XAUM/XAGm)', isolated: false },
  3: { name: 'SuiEco (SUI/nUSDC/CETUS/BLUE/HAEDAL/IKA/NS)', isolated: false },
  4: { name: 'SUI/nUSDC isolated', isolated: true },
  5: { name: 'LZWBTC/nUSDC isolated', isolated: true },
  6: { name: 'XBTC/nUSDC isolated', isolated: true },
  7: { name: 'vSui/nUSDC isolated', isolated: true },
  8: { name: 'vSui/SUI isolated', isolated: true },
  9: { name: 'haSui/SUI isolated', isolated: true },
}

/**
 * A ClickHouse expression mapping `market_id` to its name, for use in a rule's
 * SELECT so the rendered message carries the name. `market_id` is a String in the
 * warehouse, so the keys are quoted.
 */
export function marketNameExpr(column = 'market_id') {
  const ids = Object.keys(MARKETS).map((id) => `'${id}'`).join(', ')
  const names = Object.values(MARKETS).map((m) => `'${m.name.replace(/'/g, "\\'")}'`).join(', ')
  // A market added on chain but not yet copied here falls back to "market N"
  // rather than an empty string, so the alert stays readable either way.
  return `transform(${column}, [${ids}], [${names}], concat('market ', ${column}))`
}

/** Market ids whose debt leg is designed to run at full utilisation. */
export const ISOLATED_MARKET_IDS = Object.entries(MARKETS)
  .filter(([, m]) => m.isolated)
  .map(([id]) => id)
