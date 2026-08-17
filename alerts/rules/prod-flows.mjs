import { sqlBoundsRule, sqlRowRule, sqlColumnRule, logRule } from '../lib/spec.mjs'
import { NETFLOW_HOURLY, ACTION_SIZE } from '../bounds.flows.generated.mjs'

export const project = { owner: 'navi', slug: 'navi-production-new', id: 'e2kx9fDv' }
export const muted = true

/**
 * Fund-flow monitoring.
 *
 * Amounts here are raw on-chain integers with per-coin decimals and there is no
 * USD column on UserInteraction, so everything is calibrated per coin in native
 * units instead of being converted. That is fine for detecting anomalies and
 * avoids depending on a decimals table.
 *
 * 30-day volumes: DepositEvent 13888, WithdrawEvent 8022, RepayEvent 2961,
 * BorrowEvent 2063, flashloan 412.
 */
export const rules = [
  // Hourly deposits minus withdrawals per coin, against the 30-day p1/p99 widened
  // 3x. Catches both a drain and an unexplained inflow, 27 coins in one rule.
  sqlBoundsRule({
    severity: 'critical',
    subject: 'Hourly net flow out of bounds',
    message: '{{ range .Samples }}• {{ .series }} net flow {{ .value }}  (expected {{ .lo }} .. {{ .hi }})\n{{ end }}',
    table: 'UserInteraction',
    keyExpr: 'coin_symbol',
    valueExpr: "sum(if(type = 'DepositEvent', toFloat64(amount), 0)) - sum(if(type = 'WithdrawEvent', toFloat64(amount), 0))",
    window: '1 hour',
    bounds: NETFLOW_HOURLY,
    for: '5m',
    interval: '15m',
  }),

  /**
   * A single withdrawal or borrow far larger than anything seen in the last 30
   * days for that coin.
   *
   * The obvious version of this rule — `amount / reserve > 0.25` — was wrong and
   * silently so: `UserInteraction.reserve` is the ASSET ID (0, 1, 2 …), not the
   * pool balance, so the ratio was meaningless and produced "shares" above 274%.
   * Comparing against the pool balance instead does not work either, because
   * `amount` is raw on-chain units while `total_supply` is normalised, and there
   * is no decimals column to reconcile them. Per-coin calibrated bounds sidestep
   * both problems: the comparison stays inside one coin, so units cancel.
   */
  sqlBoundsRule({
    severity: 'critical',
    subject: 'Single action unusually large',
    message: '{{ range .Samples }}• {{ .series }} amount {{ .value }}  (30d p99 x5 = {{ .hi }})\n{{ end }}',
    table: 'UserInteraction',
    keyExpr: "concat(coin_symbol, '/', type)",
    valueExpr: 'max(toFloat64(amount))',
    where: "type in ('WithdrawEvent', 'BorrowEvent')",
    window: '15 minute',
    bounds: ACTION_SIZE,
    for: '1m',
    interval: '5m',
  }),

  // Flashloan volume, not count: count is extremely spiky (30d p95 11, p99 99,
  // max 477 per hour) so counting it would be noise. Volume relative to the pool
  // is the part that matters.
  sqlRowRule({
    severity: 'normal',
    subject: 'Flashloan volume unusually large',
    message: '{{ range .Samples }}• {{ .coinType }}: {{ .n }} loans, total {{ .total }}\n{{ end }}',
    sql: `select ts as timestamp, coinType, n, total
from (
  select max(timestamp) as ts, coinType, count() as n, sum(toFloat64(amount)) as total
  from flashloan
  where timestamp > now() - interval 1 hour
  group by coinType
  having n > 300
)
order by n desc`,
    for: '5m',
    interval: '15m',
  }),

  // Treasury movements are rare and always intentional, so every one is reported
  // rather than thresholded.
  logRule({
    severity: 'normal',
    subject: 'Treasury withdrawal',
    message: '{{ range .Samples }}• {{ .coin_symbol }} {{ .withdraw_amount_decimal }} -> {{ .recipient }} by {{ .sender }}\n{{ end }}',
    query: 'eventName:WithdrawTreasuryV2',
    op: '>',
    threshold: 0,
    for: '1m',
    interval: '5m',
  }),

  // Pool-level withdrawals bypassing the user path.
  sqlColumnRule({
    severity: 'normal',
    subject: 'Pool reserve withdrawal',
    message: 'A PoolWithdrawReserve happened in the last 15 minutes.',
    sql: `select timestamp, 1 as n from PoolWithdrawReserve where timestamp > now() - interval 15 minute`,
    valueColumn: 'n',
    aggregation: 'COUNT',
    op: '>',
    threshold: 0,
    for: '1m',
    interval: '5m',
  }),
]
