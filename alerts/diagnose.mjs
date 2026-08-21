#!/usr/bin/env node
/**
 * Diagnose the deployed alert rules and print a report meant to be pasted back
 * to whoever maintains this directory.
 *
 *   node alerts/diagnose.mjs
 *   node alerts/diagnose.mjs --file prod-params
 *
 * Two halves, because they fail independently:
 *
 *  - QUERY SIDE: runs each rule's own query and formula. Works with a
 *    `read:project` key. Answers "would this rule fire on today's data".
 *  - SERVER SIDE: reads the rule's state, error, last evaluation and last
 *    notification. Requires a WRITE-capable key — Sentio gates reading alert
 *    rules behind write access, so `read:project` gets 403 on both
 *    `/v1/alerts/rule/project/{id}` and `/v1/alerts/{ruleId}`. Skipped with a
 *    note when the key cannot read it.
 *
 * The interesting failures live in the gap between the two halves: a rule whose
 * query returns rows while the server reports NORMAL is broken in a way neither
 * half detects alone.
 */
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listRules, getAlert, executeSql, queryInsights, insightSeries, pool } from './lib/api.mjs'
import { MANAGED_PREFIX } from './lib/spec.mjs'
import { canonical, durationSeconds } from './lib/diff.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const only = args.includes('--file') ? args[args.indexOf('--file') + 1] : undefined
const now = Date.now()

/** Every problem this can recognise, with what to do about each. */
const CLASSES = {
  MASKED_FIRING: 'rule.state is ERROR/NO_DATA while its lastState is FIRING — the condition matched but no notification goes out',
  QUOTA: 'evaluation rejected by the analytics tier quota — the rule never gets to run',
  ERRORED: 'evaluation failed for a reason other than quota',
  NEVER_EVALUATED: 'the server has never run this rule',
  STALE: 'last evaluation is older than 3x the rule interval — it has stopped being scheduled',
  SILENT: 'the query returns rows but the server says NORMAL — the two disagree',
  DEAD_QUERY: 'the query itself fails',
  DEGENERATE_FORMULA: 'every series already breaches the threshold — usually a formula evaluating to a constant',
  NO_SERIES: 'the metric resolves to no series at all — wrong metric name or labelSelector',
  BAD_LABEL: 'a groupBy label does not exist on the metric, so the series silently collapses to one',
  MISROUTED: 'notification channels do not match the spec',
  DUP_CHANNELS: 'more than one channel attached — every notification is delivered twice',
  DRIFT: 'the deployed rule differs from the local spec — someone edited it, or apply never ran',
  MUTE_MISMATCH: 'mute on the server does not match the rule file',
  FIRING_STALE: 'firing continuously for over 24h — either unattended or the threshold is wrong',
}

const problems = []
const healthy = []
const delivering = []
const note = (cls, subject, detail) => problems.push({ cls, subject, detail })

const ts = (v) => (v && !String(v).startsWith('0001') ? String(v).replace('T', ' ').slice(0, 19) : null)

async function diagnoseFile(mod, file) {
  const { project } = mod
  const namespace = mod.namespace ?? file.replace(/\.mjs$/, '')
  const scope = `${MANAGED_PREFIX}${namespace}/`
  const spec = mod.rules.map((r) => ({
    ...r,
    group: scope + r.group.slice(MANAGED_PREFIX.length),
    mute: mod.muted === true,
  }))

  let server = null
  let serverError = null
  try {
    server = (await listRules(project.id)).filter((r) => (r.group ?? '').startsWith(scope))
  } catch (e) {
    serverError = String(e).split('\n')[0]
  }
  const bySubject = new Map((server ?? []).map((r) => [r.subject, r]))

  await pool(spec, 2, async (want) => {
    const got = bySubject.get(want.subject)
    const label = `${namespace}/${want.subject}`

    // ---- query side -------------------------------------------------------
    let rows = null
    let queryDead = null
    if (want.alertType === 'SQL') {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await executeSql(project.owner, project.slug, want.sqlCondition.sqlQuery)
          rows = res.result?.rows ?? []
          queryDead = null
          break
        } catch (e) {
          queryDead = String(e).split('\n')[0]
          // Quota and planner timeouts are transient; a syntax error is not.
          if (!/quota|Deadline|rewrite sql failed|429/i.test(queryDead)) break
        }
      }
      if (queryDead) note('DEAD_QUERY', label, queryDead.slice(0, 220))
    }

    if (want.alertType === 'METRIC') {
      const queries = want.condition?.insightQueries ?? []
      for (const q of queries) {
        if (!q.metricsQuery) continue
        const { query: metric, aggregate, labelSelector } = q.metricsQuery
        try {
          const series = insightSeries(
            await queryInsights(project.owner, project.slug, [
              { dataSource: 'METRICS', metricsQuery: { id: 'a', query: metric, labelSelector: labelSelector ?? {} } },
            ]),
          )
          if (!series.length) {
            note('NO_SERIES', label, `metric "${metric}" with labelSelector ${JSON.stringify(labelSelector ?? {})}`)
            continue
          }
          const present = new Set(series.flatMap((s) => Object.keys(s.labels)))
          const missing = (aggregate?.grouping ?? []).filter((g) => !present.has(g))
          if (missing.length) note('BAD_LABEL', label, `${metric}: missing ${missing.join(', ')}; has ${[...present].join(', ')}`)
        } catch (e) {
          note('DEAD_QUERY', label, `${metric}: ${String(e).split('\n')[0].slice(0, 200)}`)
        }
      }
      const formula = want.condition?.formula?.expression
      if (formula) {
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
          const vals = series
            .filter((s) => /^(abs|[a-z] ?[-+/*])/i.test(s.label) || s.label.includes('/') || s.label.includes('-'))
            .map((s) => Number(s.value))
            .filter(Number.isFinite)
          const op = want.condition.comparisonOp
          const t = want.condition.threshold
          if (vals.length) {
            const breach = vals.filter((v) => (op === '>' ? v > t : op === '<' ? v < t : false))
            if (breach.length === vals.length) {
              note('DEGENERATE_FORMULA', label, `${formula} = ${vals.map((v) => v.toPrecision(4)).join(', ')} all ${op} ${t}`)
            }
          }
        } catch (e) {
          note('DEAD_QUERY', label, `formula: ${String(e).split('\n')[0].slice(0, 200)}`)
        }
      }
    }

    // ---- server side ------------------------------------------------------
    if (!server) return
    if (!got) {
      note('DRIFT', label, 'in the spec but not on the server — apply has not run')
      return
    }
    if (canonical(want) !== canonical(got)) note('DRIFT', label, 'deployed rule differs from the spec, run `sync.mjs plan --diff`')
    if (!!got.mute !== !!want.mute) note('MUTE_MISMATCH', label, `server mute=${!!got.mute}, spec muted=${!!want.mute}`)

    const wantCh = (want.channels ?? []).map((c) => c.id).sort().join(',')
    const gotCh = (got.channels ?? []).map((c) => c.id).sort().join(',')
    if ((got.channels ?? []).length > 1) {
      note('DUP_CHANNELS', label, `${(got.channels ?? []).map((c) => c.slackChannel || c.name || c.id).join(' + ')} — fix with \`apply --recreate\``)
    } else if (wantCh !== gotCh) {
      note('MISROUTED', label, `server=${gotCh || 'none'} spec=${wantCh}`)
    }

    const lastQuery = ts(got.lastQueryTime)
    if (!lastQuery) {
      note('NEVER_EVALUATED', label, 'lastQueryTime is unset')
    } else {
      const ageSec = (now - Date.parse(got.lastQueryTime)) / 1000
      const intervalSec = durationSeconds(got.interval) || 300
      if (ageSec > intervalSec * 3) {
        note('STALE', label, `last evaluated ${Math.round(ageSec / 60)}m ago, interval is ${Math.round(intervalSec / 60)}m`)
      }
    }

    let alert = null
    try {
      const d = await getAlert(got.id)
      alert = d.alerts?.find((x) => x.active) ?? d.alerts?.[0]
    } catch {
      /* covered by serverError below */
    }

    const quota = /ResourceExhausted|tier quota|too many requests/i.test(got.error ?? '')
    if (quota) note('QUOTA', label, (got.error ?? '').slice(0, 160))
    else if (got.state === 'ERROR') note('ERRORED', label, got.error ? got.error.slice(0, 220) : '(server reports ERROR with an empty error field)')

    const innerFiring = alert?.lastState?.state === 'FIRING'
    if (innerFiring && got.state !== 'FIRING') {
      note('MASKED_FIRING', label, `state=${got.state}; would have sent:\n        ${(alert.lastState.message ?? '').trim().split('\n').join('\n        ')}`)
    }

    // "Rows came back" only means the condition matched for a rowCondition rule.
    // A columnCondition aggregates one column and compares it to a threshold, so
    // rows can come back while the condition is correctly not met — the first
    // version of this check flagged `Large single liquidation` for returning two
    // $4 liquidations against a $50k threshold. And a rule whose own lastState is
    // already FIRING is simply waiting out its `for` window, which MASKED_FIRING
    // covers, so it is not a disagreement.
    if (rows?.length && got.state === 'NORMAL' && !innerFiring) {
      const col = want.sqlCondition?.columnCondition
      if (!col) {
        note('SILENT', label, `query returns ${rows.length} row(s) but the server says NORMAL; first: ${JSON.stringify(rows[0]).slice(0, 200)}`)
      } else {
        const vals = rows.map((r) => Number(r[col.valueColumn])).filter(Number.isFinite)
        const agg = {
          MAX: (a) => Math.max(...a),
          MIN: (a) => Math.min(...a),
          SUM: (a) => a.reduce((x, y) => x + y, 0),
          AVG: (a) => a.reduce((x, y) => x + y, 0) / a.length,
          COUNT: (a) => a.length,
          LAST: (a) => a[a.length - 1],
        }[col.aggregation ?? 'COUNT']
        const value = vals.length || col.aggregation === 'COUNT' ? agg(vals) : null
        const op = col.comparisonOp
        const breaches = value !== null && (op === '>' ? value > col.threshold : op === '<' ? value < col.threshold : false)
        if (breaches) {
          note('SILENT', label, `${col.aggregation}(${col.valueColumn}) = ${value} ${op} ${col.threshold} over ${rows.length} row(s), but the server says NORMAL`)
        }
      }
    }

    if (got.state === 'FIRING') {
      const notified = ts(alert?.lastNotified)
      const since = ts(alert?.startTime)
      if (notified) delivering.push({ label, notified, since, message: (alert?.lastState?.message ?? '').trim() })
      else note('MASKED_FIRING', label, 'FIRING but lastNotified is unset — nothing was delivered')
      if (since && now - Date.parse(alert.startTime) > 86400_000) {
        note('FIRING_STALE', label, `firing since ${since}`)
      }
    }

    if (!problems.some((p) => p.subject === label) && !delivering.some((d) => d.label === label)) healthy.push(label)
  })

  return { serverError, serverCount: server?.length ?? 0, specCount: spec.length }
}

const files = readdirSync(join(HERE, 'rules'))
  .filter((f) => f.endsWith('.mjs'))
  .filter((f) => !only || f.startsWith(only))

const summaries = []
for (const file of files) {
  const mod = await import(join(HERE, 'rules', file))
  summaries.push({ file, muted: mod.muted, ...(await diagnoseFile(mod, file)) })
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const line = (s = '') => console.log(s)
line('==== SENTIO ALERT DIAGNOSTIC ====')
line(`generated: ${new Date(now).toISOString()}`)
line(`spec ${summaries.reduce((n, s) => n + s.specCount, 0)} rules across ${files.length} domain file(s)`)
for (const s of summaries) {
  line(`  ${s.file.padEnd(24)} spec ${String(s.specCount).padStart(2)}  server ${String(s.serverCount).padStart(2)}  ${s.muted ? 'MUTED' : 'live'}${s.serverError ? `  server read failed: ${s.serverError.slice(0, 90)}` : ''}`)
}

const withServer = summaries.some((s) => !s.serverError)
if (!withServer) {
  line()
  line('SERVER-SIDE HALF SKIPPED — the key cannot read alert rules.')
  line('Sentio gates reading alert rules behind WRITE access, so a read:project key gets 403.')
  line('Everything below is query-side only: it cannot see ERROR states, masked firing, or delivery.')
}

line()
if (problems.length === 0) {
  line('PROBLEMS: none')
} else {
  const byClass = {}
  for (const p of problems) (byClass[p.cls] ??= []).push(p)
  line(`PROBLEMS: ${problems.length} across ${Object.keys(byClass).length} class(es)`)
  for (const [cls, list] of Object.entries(byClass).sort()) {
    line()
    line(`[${cls}] x${list.length} — ${CLASSES[cls]}`)
    for (const p of list) {
      line(`  · ${p.subject}`)
      line(`      ${p.detail}`)
    }
  }
}

line()
if (delivering.length) {
  line(`FIRING AND DELIVERED: ${delivering.length}`)
  for (const d of delivering) {
    line(`  · ${d.label}   last notified ${d.notified}${d.since ? `, firing since ${d.since}` : ''}`)
    for (const l of d.message.split('\n').slice(0, 6)) line(`      ${l}`)
  }
} else {
  line('FIRING AND DELIVERED: none')
}

line()
line(`HEALTHY: ${healthy.length}`)
line()
line('==== END ====')
