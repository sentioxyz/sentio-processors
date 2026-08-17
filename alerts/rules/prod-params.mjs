import { metricRule, formulaRule, logRule, sqlBoundsRule } from '../lib/spec.mjs'
import {
  BOUNDS_currentBorrowRate,
  BOUNDS_currentSupplyRate,
  BOUNDS_ltv,
  BOUNDS_supplyCapCeiling,
  BOUNDS_borrowCapCeiling,
} from '../bounds.generated.mjs'

export const project = { owner: 'navi', slug: 'navi-production-new', id: 'e2kx9fDv' }

/**
 * Burn-in switch. While true every rule is created with `mute: true`: it
 * evaluates and records FIRING/NORMAL, but delivers nothing. Watch
 * `node alerts/inspect.mjs` for a few days, tighten whatever is noisy, then set
 * this to false and re-apply.
 */
export const muted = true

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

  // --- capacity ------------------------------------------------------------
  formulaRule({
    severity: 'normal',
    subject: 'Supply cap almost full',
    message: '{{ range .Samples }}• {{ .coin_symbol }}@{{ .market_id }} supply cap utilisation = {{ .Value }}\n{{ end }}',
    expression: 'a / b',
    queries: {
      a: { metric: 'total_supply', groupBy: BY_POOL },
      b: { metric: 'supplyCapCeiling', groupBy: BY_POOL },
    },
    op: '>',
    threshold: 0.9,
    ...BOUNDS_CADENCE,
  }),
  formulaRule({
    severity: 'normal',
    subject: 'Borrow cap almost full',
    message: '{{ range .Samples }}• {{ .coin_symbol }}@{{ .market_id }} borrow cap utilisation = {{ .Value }}\n{{ end }}',
    expression: 'a / b',
    queries: {
      a: { metric: 'total_borrow', groupBy: BY_POOL },
      b: { metric: 'borrowCapCeiling', groupBy: BY_POOL },
    },
    op: '>',
    threshold: 0.9,
    ...BOUNDS_CADENCE,
  }),
  formulaRule({
    severity: 'critical',
    subject: 'Pool utilisation critical',
    message: '{{ range .Samples }}• {{ .coin_symbol }}@{{ .market_id }} utilisation = {{ .Value }}\n{{ end }}',
    expression: 'a / b',
    queries: {
      a: { metric: 'total_borrow', groupBy: BY_POOL },
      b: { metric: 'total_supply', groupBy: BY_POOL },
    },
    op: '>',
    threshold: 0.95,
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
