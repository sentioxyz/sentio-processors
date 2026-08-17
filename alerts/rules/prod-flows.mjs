import { sqlBoundsRule, sqlRowRule, sqlColumnRule, logRule } from '../lib/spec.mjs'
import { NETFLOW_HOURLY } from '../bounds.flows.generated.mjs'

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

  // A single withdrawal or borrow taking a large slice of what the pool holds.
  // Ratio-based, so it needs no per-coin calibration and no decimals.
  sqlRowRule({
    severity: 'critical',
    subject: 'Single action took a large share of the pool',
    message: '{{ range .Samples }}• {{ .coin_symbol }} {{ .type }} by {{ .sender }} = {{ .share }} of pool\n{{ end }}',
    sql: `with actions as (
  select timestamp, coin_symbol, type, sender, toFloat64(amount) as amount, toFloat64(reserve) as reserve
  from UserInteraction
  where timestamp > now() - interval 15 minute
    and type in ('WithdrawEvent', 'BorrowEvent')
    and toFloat64(reserve) > 0
)
select timestamp, coin_symbol, type, sender, round(amount / reserve, 4) as share
from actions
where amount / reserve > 0.25
order by share desc`,
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
