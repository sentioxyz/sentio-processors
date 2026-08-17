import { CHANNELS } from '../channels.mjs'

/**
 * Every rule this repo owns carries `group: "navi-managed/<severity>"`.
 * That marker is what makes `sync.mjs --prune` safe: rules created by hand in
 * the web UI have a different group and are never touched. It doubles as the
 * mute unit, so muting `navi-managed/normal` silences the whole normal tier.
 */
export const MANAGED_PREFIX = 'navi-managed/'

export const SEVERITY_DEFAULTS = {
  critical: { for: '2m', interval: '1m', renotify: '30m', renotifyLimit: 5 },
  normal: { for: '15m', interval: '5m', renotify: null, renotifyLimit: 0 },
}

/** "5m" -> { value: 5, unit: "m" } */
export function duration(s) {
  if (s == null) return undefined
  const m = /^(\d+(?:\.\d+)?)(s|m|h|d)$/.exec(s)
  if (!m) throw new Error(`bad duration ${s}, expected like 30s / 5m / 2h / 1d`)
  return { value: Number(m[1]), unit: m[2] }
}

function base({ subject, message, severity, for: forDur, interval, renotify, renotifyLimit }) {
  const d = SEVERITY_DEFAULTS[severity]
  if (!d) throw new Error(`unknown severity ${severity}, expected critical|normal`)
  const channel = CHANNELS[severity]
  const renotifyValue = renotify === undefined ? d.renotify : renotify
  return {
    subject,
    message,
    group: MANAGED_PREFIX + severity,
    for: duration(forDur ?? d.for),
    interval: duration(interval ?? d.interval),
    renotifyDuration: duration(renotifyValue),
    renotifyLimit: renotifyValue ? (renotifyLimit ?? d.renotifyLimit) : 0,
    channels: [{ id: channel.id, projectId: channel.projectId, type: channel.type }],
  }
}

/** How series inside one group are collapsed. The server rejects anything else. */
const AGGREGATE_OPS = ['AVG', 'SUM', 'MIN', 'MAX', 'COUNT']

function checkAggr(op) {
  if (!AGGREGATE_OPS.includes(op)) throw new Error(`bad aggregate op ${op}, expected one of ${AGGREGATE_OPS}`)
  return op
}

/**
 * Threshold on a metric. Fires per group when `groupBy` is set, so one rule
 * covers every token / market instead of one rule per series.
 */
export function metricRule(opts) {
  const { metric, aggr = 'AVG', groupBy = [], labels = {}, op, threshold, threshold2, functions = [] } = opts
  checkAggr(aggr)
  return {
    ...base(opts),
    alertType: 'METRIC',
    condition: {
      comparisonOp: op,
      threshold,
      ...(threshold2 === undefined ? {} : { threshold2 }),
      insightQueries: [
        {
          metricsQuery: {
            id: 'a',
            alias: metric,
            query: metric,
            labelSelector: labels,
            aggregate: { op: aggr, grouping: groupBy },
            functions,
            disabled: false,
          },
        },
      ],
    },
  }
}

/**
 * Threshold on an expression over several metrics, e.g. utilisation `a / b`.
 * `queries` is a map of formula variable -> { metric, aggr, labels, groupBy }.
 */
export function formulaRule(opts) {
  const { expression, queries, op, threshold, threshold2 } = opts
  return {
    ...base(opts),
    alertType: 'METRIC',
    condition: {
      comparisonOp: op,
      threshold,
      ...(threshold2 === undefined ? {} : { threshold2 }),
      formula: { expression },
      insightQueries: Object.entries(queries).map(([id, q]) => ({
        metricsQuery: {
          id,
          alias: q.alias ?? q.metric,
          query: q.metric,
          labelSelector: q.labels ?? {},
          aggregate: { op: checkAggr(q.aggr ?? 'AVG'), grouping: q.groupBy ?? [] },
          functions: q.functions ?? [],
          // Formula inputs must be `disabled: true`. That is what the web UI emits
          // and what the engine expects — it means "feed the formula, do not plot".
          // With false, the condition produced no data at all and every formula
          // rule sat in NO_DATA (verified live 2026-08-17, both with a 2m and a 30m
          // window, so it is not a data-cadence problem).
          disabled: true,
        },
      })),
    },
  }
}

/**
 * Deviation between the protocol's own oracle and Sentio's market price feed.
 *
 * Deliberately pinned to ONE coin via labelSelector. Grouping the metric by
 * `coin_symbol` and pairing it with a multi-coin price query does not align the
 * two sides — the formula silently evaluates to a constant instead of erroring,
 * which is worse than a crash. So price monitoring is genuinely one rule per
 * coin; that is where the rule count legitimately grows.
 *
 * Measured 2026-08-16: SUI deviates 0.17%, but haSui -7.4%, vSui -6.3% and
 * stSUI -4.4%, because the LST oracles track SUI spot without the staking
 * exchange rate. Set `maxDeviation` per coin accordingly rather than globally.
 */
export function priceDeviationRule(opts) {
  const { coin, maxDeviation, metric = 'oracle' } = opts
  return {
    ...base({ subject: `Oracle deviates from market: ${coin}`, ...opts }),
    alertType: 'METRIC',
    condition: {
      comparisonOp: '>',
      threshold: maxDeviation,
      formula: { expression: 'abs(a / b - 1)' },
      insightQueries: [
        {
          metricsQuery: {
            id: 'a',
            alias: `${metric} ${coin}`,
            query: metric,
            labelSelector: { coin_symbol: coin },
            aggregate: { op: 'AVG', grouping: [] },
            disabled: true,
          },
        },
        { priceQuery: { id: 'b', alias: `market ${coin}`, coinId: [{ symbol: coin }], disabled: true } },
      ],
    },
  }
}

/**
 * Consistency between two of the protocol's own oracle series.
 *
 * Covers the assets Sentio has no market price for — nUSDC, nUSDT, wUSDT,
 * suiBTC, nbETH, LZWBTC, YBTC — where `priceDeviationRule` is impossible. Two
 * wrappers of the same underlying must track each other, so the ratio drifting
 * is a real signal and needs no external feed. Both sides are pinned with
 * labelSelector for the same alignment reason as above.
 */
export function oracleRatioRule(opts) {
  const { a, b, tolerance, metric = 'oracle' } = opts
  return {
    ...base({ subject: `Oracle ratio drifted: ${a} vs ${b}`, ...opts }),
    alertType: 'METRIC',
    condition: {
      comparisonOp: '>',
      threshold: tolerance,
      formula: { expression: 'abs(a / b - 1)' },
      insightQueries: [a, b].map((coin, i) => ({
        metricsQuery: {
          id: i === 0 ? 'a' : 'b',
          alias: `${metric} ${coin}`,
          query: metric,
          labelSelector: { coin_symbol: coin },
          aggregate: { op: 'AVG', grouping: [] },
          disabled: true,
        },
      })),
    },
  }
}

/** Threshold on a count of event-log entries. `query` is Elasticsearch query-string syntax. */
export function logRule(opts) {
  const { query, op = '>', threshold = 0 } = opts
  return {
    ...base(opts),
    alertType: 'LOG',
    logCondition: { query, comparisonOp: op, threshold },
  }
}

/** Threshold on one aggregated column of a SQL result. */
export function sqlColumnRule(opts) {
  const { sql, timeColumn = 'timestamp', valueColumn, aggregation = 'MAX', op, threshold, threshold2 } = opts
  return {
    ...base(opts),
    alertType: 'SQL',
    sqlCondition: {
      sqlQuery: sql,
      columnCondition: {
        timeColumn,
        valueColumn,
        aggregation,
        comparisonOp: op,
        threshold,
        ...(threshold2 === undefined ? {} : { threshold2 }),
      },
    },
  }
}

/**
 * Fires when the SQL returns any row at all. This is the one that collapses
 * "N separate bound checks" into a single rule: put every bound in the WHERE
 * clause, return one row per violation, and iterate `.Samples` in the message.
 */
export function sqlRowRule(opts) {
  return {
    ...base(opts),
    alertType: 'SQL',
    sqlCondition: { sqlQuery: opts.sql, rowCondition: {} },
  }
}

const sqlString = (s) => `'${String(s).replace(/'/g, "\\'")}'`

/**
 * Per-series bounds for a whole family of checks, as ONE rule.
 *
 * A single global threshold is useless when the same token behaves differently
 * in every market (nUSDC borrow rate runs 0.007 in market 6 and 0.22 in market
 * 3). The usual fix is one rule per series, which is where "100 rules" comes
 * from. Instead this inlines the bounds as a VALUES table, joins the latest
 * value of each series against it, and fires when any row survives the join.
 * One rule, one query, arbitrarily many bounds.
 *
 * `bounds` is `{ '<key>': [lo, hi] }` — generate it with
 * `node alerts/calibrate.mjs --columns <column> --emit`.
 */
export function sqlBoundsRule(opts) {
  const {
    table = 'indexNumberEventV2',
    column,
    // Default is "the newest value of `column` per series". Override for
    // anything aggregated over the window — hourly net flow, counts, ratios.
    valueExpr = column ? `toFloat64(argMax(${column}, timestamp))` : undefined,
    keyExpr = "concat(token, '@', toString(market_id))",
    where,
    bounds,
    window = '1 hour',
  } = opts
  if (!valueExpr) throw new Error(`sqlBoundsRule ${opts.subject}: pass either column or valueExpr`)
  const entries = Object.entries(bounds)
  if (!entries.length) throw new Error(`sqlBoundsRule ${opts.subject}: bounds map is empty`)
  const values = entries.map(([k, [lo, hi]]) => `(${sqlString(k)}, ${lo}, ${hi})`).join(',\n      ')

  // The numeric columns come back as Decimal, so every comparison against the
  // Float64 bounds table has to be cast explicitly.
  const sql = `with latest as (
  select ${keyExpr} as k,
         ${valueExpr} as v,
         max(timestamp) as ts
  from ${table}
  where timestamp > now() - interval ${window}${where ? ` and (${where})` : ''}
  group by k
),
bounds as (
  select * from values(
    'k String, lo Float64, hi Float64',
      ${values}
  )
)
select latest.ts as timestamp,
       latest.k as series,
       latest.v as value,
       bounds.lo as lo,
       bounds.hi as hi
from latest inner join bounds using (k)
where latest.v < bounds.lo or latest.v > bounds.hi
order by series`

  return sqlRowRule({ ...opts, sql })
}

/** Convenience: emit a `too high` and a `too low` rule from one bound spec. */
export function bounds(opts) {
  const { name, min, max, ...rest } = opts
  const out = []
  if (max !== undefined) out.push(metricRule({ ...rest, subject: `${name} too high`, op: '>', threshold: max }))
  if (min !== undefined) out.push(metricRule({ ...rest, subject: `${name} too low`, op: '<', threshold: min }))
  return out
}
