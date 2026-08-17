import { logRule, sqlColumnRule, sqlRowRule } from '../lib/spec.mjs'

export const project = { owner: 'navi', slug: 'navi-production-new', id: 'e2kx9fDv' }
export const muted = false // live since 2026-08-17; set true to silence this domain

/**
 * Liquidation monitoring, one rule per failure shape rather than one per asset.
 *
 * Every threshold is calibrated from 30 days of the `Liquidation` table
 * (2026-08-17), because the intuition here is badly wrong: the MEDIAN liquidation
 * is $0.17 and hourly counts routinely reach 32, so "a liquidation happened" and
 * "20 liquidations in 5 minutes" are both non-events.
 *
 *   liquidations per hour   p50 3    p95 32    p99 81    max 217
 *   size in USD             p50 0.17 p95 22.7  p99 175   max 168k
 *   same user per hour      p95 3    p99 10    max 34
 */
export const rules = [
  // Above the 30d max, so this only fires on something genuinely unprecedented.
  logRule({
    severity: 'critical',
    subject: 'Liquidation rate unprecedented',
    message: 'More liquidations in the last hour than any hour of the previous 30 days (max was 217).\n{{ range .Samples }}• {{ .user }} {{ .debt_symbol }} {{ .debt_amount_normalized }}\n{{ end }}',
    query: 'eventName:Liquidation',
    op: '>',
    threshold: 250,
    for: '1h',
    interval: '5m',
  }),
  // Between p99 and max: elevated but not yet unprecedented.
  logRule({
    severity: 'normal',
    subject: 'Liquidation rate elevated',
    message: 'Liquidation count for the hour is above the 30-day p99 of 81.\n{{ range .Samples }}• {{ .user }} {{ .debt_symbol }} {{ .debt_amount_normalized }}\n{{ end }}',
    query: 'eventName:Liquidation',
    op: '>',
    threshold: 100,
    for: '1h',
    interval: '15m',
  }),

  // p99 is $175 and the 30d max is $168k, so $50k is a large but not impossible
  // single liquidation — worth a look every time.
  sqlColumnRule({
    severity: 'critical',
    subject: 'Large single liquidation',
    message: 'A single liquidation above $50k was executed.',
    sql: `select timestamp,
       toFloat64(debt_amount_normalized) * toFloat64(debt_price_normalized) as usd
from Liquidation
where timestamp > now() - interval 15 minute`,
    valueColumn: 'usd',
    aggregation: 'MAX',
    op: '>',
    threshold: 50000,
    for: '1m',
    // 15m rather than 5m: seven of the fourteen SQL rules were being rejected by
    // the analytics tier quota, so they never evaluated at all. A slower rule that
    // runs beats a faster one that is refused. See STATUS.md.
    interval: '15m',
  }),

  // Same account liquidated repeatedly inside an hour: either a cascading position
  // or a liquidation bot fighting a stale price. p99 is 10, 30d max is 34.
  sqlRowRule({
    severity: 'critical',
    subject: 'Same account liquidated repeatedly',
    message: '{{ range .Samples }}• {{ .user }} liquidated {{ .n }} times, ${{ .usd }} total\n{{ end }}',
    // `max(timestamp) as timestamp` cannot be aliased over the source column —
    // ClickHouse then resolves the WHERE against the aggregate and rejects the
    // query. Aggregate in a subquery and rename on the way out.
    sql: `select ts as timestamp, user, n, usd
from (
  select max(timestamp) as ts,
         user,
         count() as n,
         round(sum(toFloat64(debt_amount_normalized) * toFloat64(debt_price_normalized)), 2) as usd
  from Liquidation
  where timestamp > now() - interval 1 hour
  group by user
  having n > 40
)
order by n desc`,
    for: '1m',
    interval: '15m',
  }),

  // Collateral seized worth less than the debt repaid means the position was
  // already underwater when it was liquidated — the protocol ate the difference.
  // This is the one liquidation rule that indicates actual loss, not just activity.
  sqlRowRule({
    severity: 'critical',
    subject: 'Liquidation left bad debt',
    message: '{{ range .Samples }}• {{ .user }} {{ .debt_symbol }}: repaid ${{ .debt_usd }} for ${{ .collateral_usd }} of {{ .collateral_symbol }} (shortfall ${{ .shortfall }})\n{{ end }}',
    sql: `select timestamp,
       user,
       debt_symbol,
       collateral_symbol,
       round(toFloat64(debt_amount_normalized) * toFloat64(debt_price_normalized), 2) as debt_usd,
       round(toFloat64(collateral_amount_normalized) * toFloat64(collateral_price_normalized), 2) as collateral_usd,
       round(debt_usd - collateral_usd, 2) as shortfall
from Liquidation
where timestamp > now() - interval 15 minute
  and debt_usd > 100
  and collateral_usd < debt_usd
order by shortfall desc`,
    for: '1m',
    interval: '15m', // quota, see the note above
  }),
]
