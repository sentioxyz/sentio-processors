#!/usr/bin/env node
/**
 * Burn-in view: what would have been delivered if the rules were not muted.
 *
 *   node alerts/inspect.mjs                    # state of every managed rule
 *   node alerts/inspect.mjs --firing           # only the ones currently firing
 *   node alerts/inspect.mjs --dry-run          # run each SQL rule's query now, no server state needed
 *
 * Sentio has no test-fire endpoint, so this is the debug loop: --dry-run
 * executes the rule's own query against the warehouse and shows the rows it
 * would alert on, and the plain listing shows the rendered message of anything
 * the server has already flagged.
 */
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listRules, getAlert, executeSql, queryInsights, insightSeries, pool } from './lib/api.mjs'
import { MANAGED_PREFIX } from './lib/spec.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const onlyFiring = args.includes('--firing')
const dryRun = args.includes('--dry-run')
const only = args.includes('--file') ? args[args.indexOf('--file') + 1] : undefined

const files = readdirSync(join(HERE, 'rules'))
  .filter((f) => f.endsWith('.mjs'))
  .filter((f) => !only || f.startsWith(only))

for (const file of files) {
  const mod = await import(join(HERE, 'rules', file))
  const { project } = mod
  console.log(`\n${project.owner}/${project.slug}${mod.muted ? '  (MUTED)' : ''}`)

  if (dryRun) {
    const sqlRules = mod.rules.filter((r) => r.alertType === 'SQL')
    await pool(sqlRules, 2, async (r) => {
      let rows
      try {
        const res = await executeSql(project.owner, project.slug, r.sqlCondition.sqlQuery)
        rows = res.result?.rows ?? []
      } catch (e) {
        console.log(`  ✗ ${r.subject}: query failed — ${String(e).split('\n')[0]}`)
        return
      }
      console.log(`  ${rows.length ? '▲' : '·'} ${r.subject}: ${rows.length} row(s) would fire`)
      for (const row of rows.slice(0, 10)) console.log(`      ${JSON.stringify(row)}`)
      if (rows.length > 10) console.log(`      ... ${rows.length - 10} more`)
    })

    // METRIC rules fail silently rather than loudly: a metric name that does not
    // exist, or a groupBy label that does not exist, both yield an empty or
    // collapsed series instead of an error, and the rule then never fires. Check
    // both against the live series before trusting the rule.
    const metricRules = mod.rules.filter((r) => r.alertType === 'METRIC')
    await pool(metricRules, 2, async (r) => {
      const queries = r.condition?.insightQueries ?? []
      const problems = []
      for (const q of queries) {
        if (!q.metricsQuery) continue
        const { query: metric, aggregate, labelSelector } = q.metricsQuery
        const grouping = aggregate?.grouping ?? []
        let series
        try {
          series = insightSeries(
            await queryInsights(project.owner, project.slug, [
              { dataSource: 'METRICS', metricsQuery: { id: 'a', query: metric, labelSelector: labelSelector ?? {} } },
            ]),
          )
        } catch (e) {
          problems.push(`${metric}: query failed — ${String(e).split('\n')[0]}`)
          continue
        }
        if (!series.length) {
          problems.push(`${metric}: no series, metric name or labelSelector is wrong`)
          continue
        }
        const present = new Set(series.flatMap((s) => Object.keys(s.labels)))
        const missing = grouping.filter((g) => !present.has(g))
        if (missing.length) problems.push(`${metric}: groupBy label(s) ${missing.join(', ')} do not exist (have: ${[...present].join(', ')})`)
      }
      // A grouped metric paired with a price query cannot align; the formula
      // silently evaluates to a constant.
      const hasPrice = queries.some((q) => q.priceQuery)
      const grouped = queries.some((q) => (q.metricsQuery?.aggregate?.grouping ?? []).length)
      if (hasPrice && grouped) problems.push('price query mixed with a grouped metric — the formula will not align, pin one coin with labelSelector')

      // Checking that each input resolves is not enough: a formula whose inputs
      // resolve individually can still degenerate. `disabled: true` on an input
      // made every price rule report exactly abs(a/b-1) = 1 and fire forever, and
      // an input-only check could not see it. So evaluate the formula itself and
      // compare the result against the threshold the rule will use.
      const formula = r.condition?.formula?.expression
      let evaluated
      if (formula && !problems.length) {
        try {
          const series = insightSeries(
            await queryInsights(
              project.owner,
              project.slug,
              queries.map((q) => ({
                dataSource: q.priceQuery ? 'PRICE' : 'METRICS',
                ...(q.priceQuery ? { priceQuery: q.priceQuery } : { metricsQuery: q.metricsQuery }),
              })),
              [{ id: 'f', alias: 'formula', expression: formula }],
            ),
          )
          const result = series.filter((s) => !/^(avg|sum|min|max|count|price|oracle)/i.test(s.label))
          if (!result.length) problems.push(`formula "${formula}" produced no series`)
          else {
            const values = result.map((s) => Number(s.value)).filter(Number.isFinite)
            const op = r.condition.comparisonOp
            const t = r.condition.threshold
            const breaches = values.filter((v) => (op === '>' ? v > t : op === '<' ? v < t : false))
            evaluated = `${formula} = ${values.map((v) => Number(v).toPrecision(4)).join(', ')}  ${op} ${t}`
            if (breaches.length === values.length && values.length) {
              problems.push(`every series already breaches the threshold: ${evaluated} — check for a degenerate formula`)
            }
          }
        } catch (e) {
          problems.push(`formula evaluation failed — ${String(e).split('\n')[0]}`)
        }
      }

      console.log(`  ${problems.length ? '✗' : '·'} ${r.subject}${problems.length ? '' : `: ok${evaluated ? `  [${evaluated}]` : ''}`}`)
      for (const p of problems) console.log(`      ${p}`)
    })
    continue
  }

  const managed = (await listRules(project.id)).filter((r) => (r.group ?? '').startsWith(MANAGED_PREFIX))
  if (!managed.length) {
    console.log('  no managed rules on the server yet, run `node alerts/sync.mjs apply`')
    continue
  }
  const details = await pool(managed, 3, (r) => getAlert(r.id).catch(() => null))
  for (const [i, r] of managed.entries()) {
    if (onlyFiring && r.state !== 'FIRING') continue
    const alert = details[i]?.alerts?.find((a) => a.active) ?? details[i]?.alerts?.[0]
    const matches = alert?.lastState?.sqlMatchCount ?? alert?.lastState?.samples?.length ?? 0
    console.log(
      `  ${r.state === 'FIRING' ? '▲' : r.state === 'ERROR' ? '✗' : '·'} [${r.group.slice(MANAGED_PREFIX.length)}] ${r.subject}` +
        `  state=${r.state} matches=${matches}${r.error ? ` error=${r.error}` : ''}`,
    )
    if (r.state === 'FIRING' && alert?.lastState?.message) {
      for (const line of alert.lastState.message.trim().split('\n').slice(0, 8)) console.log(`      ${line}`)
    }
  }
}
