#!/usr/bin/env node
/**
 * Suggest alert bounds from history, so thresholds are not guessed.
 *
 *   node alerts/calibrate.mjs --project navi/navi-production-new
 *   node alerts/calibrate.mjs --project navi/navi-production-new --days 30 --columns ltv,currentBorrowRate
 *   node alerts/calibrate.mjs --project navi/navi-production-new --columns ltv --emit
 *
 * Reads the numeric columns of an event table, and per group prints
 * min / p1 / p50 / p99 / max over the window. Use p1 and p99 as the starting
 * bounds and widen them where the metric is legitimately spiky.
 *
 * `--emit` prints a paste-ready bounds map instead of the table: p1/p99 widened
 * by `--pad` (default 2x) and rounded, keyed by group. Feed it to sqlBoundsRule.
 */
import { executeSql } from './lib/api.mjs'

const args = process.argv.slice(2)
const flag = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback)

const project = flag('--project')
if (!project) {
  console.error('usage: node alerts/calibrate.mjs --project <owner>/<slug> [--days 7] [--table T] [--group col] [--columns a,b]')
  process.exit(2)
}
const [owner, slug] = project.split('/')
const days = Number(flag('--days', '7'))
const table = flag('--table', 'indexNumberEventV2')
const group = flag('--group', 'token')
const DEFAULT_COLUMNS = [
  'currentBorrowRate',
  'currentSupplyRate',
  'ltv',
  'total_supply',
  'total_borrow',
  'supplyCapCeiling',
  'borrowCapCeiling',
  'feePoolNetGrowth',
  'treasuryBalanceForPool',
]
const columns = flag('--columns', DEFAULT_COLUMNS.join(',')).split(',').filter(Boolean)
const where = flag('--where')
const emit = args.includes('--emit')
// Anything the fixed table/column shape cannot express — hourly net flow, ratios,
// window functions — goes through --inner: any SQL returning `grp` and `v` columns.
const inner = flag('--inner')
const minN = Number(flag('--min-n', '30'))
const pad = Number(flag('--pad', '2'))

/** Round to 3 significant digits so the emitted map stays readable. */
const sig = (v) => (v === 0 ? 0 : Number(Number(v).toPrecision(3)))

const fmt = (v) => {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return String(v)
  return Number.isInteger(n) ? String(n) : n.toPrecision(4)
}

for (const column of inner ? ['custom'] : columns) {
  const source = inner
    ? `(${inner})`
    : `(select ${group} as grp, toFloat64(${column}) as v from ${table}
        where timestamp > now() - interval ${days} day ${where ? `and (${where})` : ''})`
  const sql = `
    select grp,
           count() as n,
           min(v) as lo,
           quantile(0.01)(v) as p1,
           median(v) as p50,
           quantile(0.99)(v) as p99,
           max(v) as hi
    from ${source}
    group by grp
    having n > 0
    order by grp`
  let rows
  try {
    const res = await executeSql(owner, slug, sql)
    rows = res.result?.rows ?? []
  } catch (e) {
    console.log(`\n## ${column}\n  query failed: ${String(e).split('\n')[0]}`)
    continue
  }
  if (emit) {
    console.log(`\n// ${column}: p1/p99 over the last ${days}d, widened ${pad}x`)
    console.log(`export const BOUNDS_${column} = {`)
    for (const r of rows) {
      // Widen away from zero in both directions: dividing a negative p1 by pad
      // would tighten it, which is the opposite of what padding is for.
      const lo = sig(Number(r.p1) < 0 ? Number(r.p1) * pad : Number(r.p1) / pad)
      const hi = sig(Number(r.p99) < 0 ? Number(r.p99) / pad : Number(r.p99) * pad)
      if (Number(r.n) < minN) {
        console.log(`  // '${r.grp}': [${lo}, ${hi}],  // only ${r.n} samples, too few to calibrate`)
        continue
      }
      // A series that was flat zero for the whole window carries no signal: a
      // [0, 0] bound fires the moment the market goes live. Emit it commented
      // out so it is a decision, not a default.
      if (lo === 0 && hi === 0) console.log(`  // '${r.grp}': [0, 0],  // flat zero over the window, uncomment only if it must stay zero`)
      else console.log(`  '${r.grp}': [${lo}, ${hi}],${lo === 0 ? '  // p1 is 0' : ''}`)
    }
    console.log('}')
    continue
  }
  console.log(`\n## ${column}   (last ${days}d, grouped by ${group})`)
  console.log(`  ${'group'.padEnd(20)} ${'n'.padStart(8)} ${'min'.padStart(12)} ${'p1'.padStart(12)} ${'p50'.padStart(12)} ${'p99'.padStart(12)} ${'max'.padStart(12)}`)
  for (const r of rows) {
    console.log(
      `  ${String(r.grp).slice(0, 20).padEnd(20)} ${fmt(r.n).padStart(8)} ${fmt(r.lo).padStart(12)} ${fmt(r.p1).padStart(12)} ${fmt(r.p50).padStart(12)} ${fmt(r.p99).padStart(12)} ${fmt(r.hi).padStart(12)}`,
    )
  }
  if (!rows.length) console.log('  no rows')
}
