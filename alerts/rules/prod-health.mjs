import { metricRule, sqlRowRule } from '../lib/spec.mjs'

export const project = { owner: 'navi', slug: 'navi-production-new', id: 'e2kx9fDv' }
export const muted = true

/**
 * Indexer and oracle liveness. These are the rules that make the other 80
 * trustworthy: a stalled processor makes every other rule go quiet, which reads
 * exactly like "everything is fine".
 */
export const rules = [
  metricRule({
    severity: 'critical',
    subject: 'Indexer stalled',
    message: 'total_supply has not moved in 30 minutes. Every other alert on this project is unreliable while this is firing.',
    metric: 'total_supply',
    functions: [{ name: 'delta', arguments: [{ durationValue: { value: 30, unit: 'm' } }] }],
    op: '==',
    threshold: 0,
    for: '30m',
    interval: '5m',
  }),

  // An asset that stopped reporting at all. Compares the assets seen in the last
  // hour against those seen in the last day, so a pool going silent surfaces even
  // though no threshold was crossed.
  sqlRowRule({
    severity: 'critical',
    subject: 'Asset stopped reporting',
    message: '{{ range .Samples }}• {{ .series }} last seen {{ .last_seen }}\n{{ end }}',
    sql: `with recent as (
  select concat(token, '@', toString(market_id)) as k, max(timestamp) as last_seen
  from indexNumberEventV2
  where timestamp > now() - interval 1 day
  group by k
)
select last_seen as timestamp, k as series, last_seen
from recent
where last_seen < now() - interval 2 hour
order by last_seen`,
    for: '5m',
    interval: '15m',
  }),

  // Liquidation events carry the prices used at execution time; a zero there means
  // the liquidation was priced off a missing oracle read.
  sqlRowRule({
    severity: 'critical',
    subject: 'Liquidation executed with a zero price',
    message: '{{ range .Samples }}• {{ .user }} {{ .debt_symbol }}/{{ .collateral_symbol }} debt_price={{ .debt_price }} collateral_price={{ .collateral_price }}\n{{ end }}',
    sql: `select timestamp, user, debt_symbol, collateral_symbol,
       toFloat64(debt_price_normalized) as debt_price,
       toFloat64(collateral_price_normalized) as collateral_price
from Liquidation
where timestamp > now() - interval 15 minute
  and (toFloat64(debt_price_normalized) = 0 or toFloat64(collateral_price_normalized) = 0)`,
    for: '1m',
    interval: '5m',
  }),
]
