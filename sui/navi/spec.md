Navi Oracle Deviation Monitoring Spec (based on `sui/navi` and `sui/decentralized-oracle`)

## 1. Goals

- Track live prices and availability on the Navi mainnet price oracle object `0xc0601facd3b98d1e82905e660bf9f5998097dedcf86ed802cf485865e3e3667c`.
- Listen to decentralized-oracle events from package `0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83` to pinpoint which feed/provider is drifting or unavailable.
- Align both sources and define asset-level deviation thresholds (including nETH/wETH, etc.) with clear alert criteria.

## 2. Data Sources & Cadence

- Navi on-chain price table
  - Object: `0xc0601f...667c` holds dynamic fields keyed by `u8`, each a `Price { value, decimal }`
  - Suggested polling cadence: every 10 minutes (offset 10m)
- Decentralized oracle (event source)
  - Package: `0xc2d49bf5e75d2258ee5563efa527feb6155de7ac6f6bf025a23ee88cd12d5a83`
  - Events of interest: `PriceRegulation`, `InvalidOraclePrice`, `OracleUnavailable`, `PriceUpdated`
  - `PriceRegulation` carries: `level`, `price_diff_threshold1/2`, `primary_price`, `secondary_price`, `max_duration_within_thresholds`, `diff_threshold2_timer`
  - Suggested start: checkpoint `39539450`
  - Optionally read latest SUI/USDC/USDT history to enrich `PriceFeedsUnavailable`

## 3. Deviation Rules & Alerts

### 4.1 Event-first (from decentralized oracle)

- `PriceRegulation`:
  - `level = 1`: `|primary - secondary| / min(primary, secondary)` exceeds `price_diff_threshold1` but not threshold2 → alert.
  - `level = 2`: exceeds `price_diff_threshold2` or `max_duration_within_thresholds` → critical.
  - Thresholds come from on-chain config (`price_diff_threshold1/2`); per-asset values may differ.
- `InvalidOraclePrice`: price outside `minimum_effective_price`/`maximum_effective_price` or history span → critical.
- `OracleUnavailable`: record `feed_address` and `provider`; also emit `PriceFeedsUnavailable` with SUI/USDC/USDT snapshots.

### 4.2 Cross-check Navi vs decentralized feed

- Normalization:
  - Navi: already normalized by `decimal` in `Gauge("oracle")`.
  - Decentralized: `primary_price`/`secondary_price` share the same target decimal; when directly compared to Navi, use the asset `DECIMAL_MAP` to align both to 10^decimal.
- Fallback deviation bands (if on-chain thresholds are absent/unreadable), by 3 groups:
  - Stablecoin group: warn > 0.5%, critical > 1%.
  - ETH group: warn > 5%, critical > 10%.
  - BTC group: warn > 4%, critical > 8%.
- All other assets follow Stablecoin if pegged, ETH if ETH-denominated L2 synth, otherwise BTC if BTC-denominated; default to Stablecoin rules if unclear.
- Formula: `abs(navi_price - ref_price) / min(navi_price, ref_price)`; `ref_price` = `primary_price` (fallback to `secondary_price`).

### 4.3 Asset-level mapping to groups (for thresholds)

- BTC group: BTC-denominated assets (e.g., wBTC, stBTC, suiBTC, LBTC, XBTC).
- ETH group: ETH-denominated assets (e.g., wETH, nbETH/nETH).
- Stablecoin group: pegged assets (e.g., wUSDC, wUSDT, nUSDC, nUSDT, FDUSD, BUCK, AUSD, USDY). All others default to Stablecoin unless explicitly assigned; unassigned/no-feed assets use fallback group thresholds.

### 4.4 Group thresholds (only three groups, plus fallback)

| Group      | Warn | Critical | Notes                                                       |
| ---------- | ---- | -------- | ----------------------------------------------------------- |
| Stablecoin | 0.5% | 1%       | Default peg; use if unclear                                 |
| ETH        | 5%   | 10%      | ETH-denominated                                             |
| BTC        | 4%   | 8%       | BTC-denominated                                             |
| Fallback   | 8%   | 15%      | Use temporarily for unassigned/no-feed assets until grouped |

## 5. Ops / Runbook (requirements, no code)

- Event-first: when `PriceRegulation` / `InvalidOraclePrice` / `OracleUnavailable` fires, surface asset, feed address, provider, current price, and thresholds to ops dashboards/alerts.
- Scheduled cross-check (Navi vs decentralized): reuse Navi’s 10m cadence; flag deviations per the thresholds table when no on-chain thresholds are present.
- Missing feeds (WAL, HAEDAL, XBTC, IKA, XAUM): keep fallback rules until feeds are added; update the table when a feed goes live.
- Always prefer on-chain thresholds (`price_diff_threshold1/2`) over local defaults; show actual values in alerts.
