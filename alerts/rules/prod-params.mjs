import { metricRule, logRule, sqlBoundsRule, sqlRowRule } from '../lib/spec.mjs'
import {
  BOUNDS_currentBorrowRate,
  BOUNDS_currentSupplyRate,
  BOUNDS_ltv,
  BOUNDS_supplyCapCeiling,
  BOUNDS_borrowCapCeiling,
} from '../bounds.generated.mjs'
import { marketNameExpr } from '../markets.mjs'

export const project = { owner: 'navi', slug: 'navi-production-new', id: 'e2kx9fDv' }

/**
 * Burn-in switch. While true every rule is created with `mute: true`: it
 * evaluates and records FIRING/NORMAL, but delivers nothing. Set back to true
 * and re-apply to silence this whole domain without deleting anything.
 *
 * Live since 2026-08-17.
 */
export const muted = false

/**
 * Metric label names, verified 2026-08-16 against the live series. These are
 * NOT the SQL column names: the warehouse table calls it `token`, the metric
 * labels call it `coin_symbol`. Grouping by a label that does not exist does not
 * error — the query silently collapses to one ungrouped series and the rule
 * never fires again. `node alerts/inspect.mjs --dry-run` checks for this.
 */
const BY_POOL = ['coin_symbol', 'market_id']
const BY_COIN = ['coin_symbol'] // feePoolNetGrowth and the treasury metrics carry no market_id

const boundsMessage = '{{ range .Samples }}• {{ .series }} = {{ .value }}  (expected {{ .lo }} .. {{ .hi }})\n{{ end }}'

/**
 * `indexNumberEventV2` emits roughly every 11 minutes per series (measured: 921
 * samples over 10050 minutes for SUI@0), so evaluating these on the 1m default
 * would re-scan the same rows ten times over. It also matters operationally: the
 * analytics tier caps queued SQL queries per account and returns 429 once the
 * queue hits 100, so the heavy scanning rules deliberately run slowly.
 */
const BOUNDS_CADENCE = { for: '5m', interval: '15m' }

export const rules = [
  // --- per-series bounds ---------------------------------------------------
  // One rule per column, not per token. The bounds table is inlined into the
  // SQL, so these five rules carry 216 individual bound checks between them.
  // Regenerate after adding a market:
  //   node alerts/calibrate.mjs --project navi/navi-production-new --days 30 \
  //     --group "concat(token,'@',toString(market_id))" --columns <col> --emit
  sqlBoundsRule({
    severity: 'critical',
    subject: 'Borrow rate out of bounds',
    message: boundsMessage,
    column: 'currentBorrowRate',
    bounds: BOUNDS_currentBorrowRate,
    ...BOUNDS_CADENCE,
  }),
  sqlBoundsRule({
    severity: 'normal',
    subject: 'Supply rate out of bounds',
    message: boundsMessage,
    column: 'currentSupplyRate',
    bounds: BOUNDS_currentSupplyRate,
    ...BOUNDS_CADENCE,
  }),
  sqlBoundsRule({
    severity: 'critical',
    subject: 'LTV out of bounds',
    message: boundsMessage,
    column: 'ltv',
    bounds: BOUNDS_ltv,
    ...BOUNDS_CADENCE,
  }),
  // Caps are configuration, not market data: any move here means somebody
  // changed a parameter on chain.
  sqlBoundsRule({
    severity: 'critical',
    subject: 'Supply cap ceiling changed',
    message: boundsMessage,
    column: 'supplyCapCeiling',
    bounds: BOUNDS_supplyCapCeiling,
    ...BOUNDS_CADENCE,
  }),
  sqlBoundsRule({
    severity: 'critical',
    subject: 'Borrow cap ceiling changed',
    message: boundsMessage,
    column: 'borrowCapCeiling',
    bounds: BOUNDS_borrowCapCeiling,
    ...BOUNDS_CADENCE,
  }),

  /**
   * Utilisation against each pool's own configured cap ratio, firing only when it
   * actually EXCEEDS the cap.
   *
   * Three earlier attempts were all silently wrong, each in a different way:
   *  - `total_supply / supplyCapCeiling` is off by 10^decimals. total_supply is
   *    normalised (SUI@0 = 2.6e7) while supplyCapCeiling is raw (5.5e16), so the
   *    ratio came out at ~1e-9 for every pool and could never fire.
   *  - `total_borrow / borrowCapCeiling` is nonsense: borrowCapCeiling is a RATIO
   *    parameter (0.96, 0.92, 0.5), not an absolute ceiling. It returned 1.4e8.
   *  - `total_borrow / total_supply > 0.95` was an arbitrary number, and
   *    `> cap * 0.98` \u2014 "approaching the cap" \u2014 was arbitrary in a subtler way: the
   *    single-pair isolated markets (ids 4-9) have exactly one borrowable asset
   *    which is DESIGNED to sit at full utilisation, so it flagged `SUI@9` at
   *    0.9587 against its 0.96 cap as a permanent warning. Measured across every
   *    pool, eleven of twelve sit under their cap and exactly one exceeds it.
   *
   * Comparing against the pool's own borrowCapCeiling is unit-free, since both
   * sides are ratios, and needs no decimals table.
   *
   * Supply-cap fullness is deliberately NOT covered: it needs per-token decimals
   * to reconcile the two units, and the warehouse has no decimals column. See
   * STATUS.md.
   */
  sqlRowRule({
    severity: 'critical',
    subject: 'Utilisation over configured borrow cap',
    message: '{{ range .Samples }}\u2022 {{ .asset }} in {{ .market }} \u2014 utilisation {{ .utilisation }}, cap {{ .cap }}\n{{ end }}',
    sql: `select ts as timestamp, asset, market, utilisation, cap
from (
  select token as asset,
         ${marketNameExpr()} as market,
         max(timestamp) as ts,
         argMax(toFloat64(total_borrow), timestamp) as bor,
         argMax(toFloat64(total_supply), timestamp) as sup,
         argMax(toFloat64(borrowCapCeiling), timestamp) as cap,
         round(bor / nullIf(sup, 0), 4) as utilisation
  from indexNumberEventV2
  where timestamp > now() - interval 1 hour
  group by asset, market
)
where sup > 0 and cap > 0 and utilisation > cap
order by utilisation - cap desc`,
    ...BOUNDS_CADENCE,
  }),

  // --- treasury / revenue --------------------------------------------------
  metricRule({
    severity: 'critical',
    subject: 'Fee pool net growth went negative',
    message: '{{ range .Samples }}• {{ .coin_symbol }} feePoolNetGrowth = {{ .Value }}\n{{ end }}',
    metric: 'feePoolNetGrowth',
    groupBy: BY_COIN,
    op: '<',
    threshold: 0,
    ...BOUNDS_CADENCE,
  }),

  // --- parameter change events ---------------------------------------------
  logRule({
    severity: 'critical',
    subject: 'Borrow fee rate changed',
    message: '{{ range .Samples }}\u2022 {{ .asset_symbol }} rate -> {{ .rate }} by {{ .sender }}\n{{ end }}',
    query: 'eventName:AssetBorrowFeeRateUpdated',
    op: '>',
    threshold: 0,
    for: '1m',
    interval: '5m',
  }),
]
