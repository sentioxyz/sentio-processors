import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const HOST = process.env.SENTIO_HOST ?? 'https://app.sentio.xyz'

let cachedKey
function apiKey() {
  if (cachedKey) return cachedKey
  if (process.env.SENTIO_API_KEY) return (cachedKey = process.env.SENTIO_API_KEY)
  let cfg
  try {
    cfg = JSON.parse(readFileSync(join(homedir(), '.sentio', 'config.json'), 'utf8'))
  } catch {
    throw new Error('no ~/.sentio/config.json; set SENTIO_API_KEY or run `npx -y @sentio/cli@latest login --api-key <key>`')
  }
  const key = cfg[HOST]?.api_keys
  if (!key) throw new Error(`~/.sentio/config.json has no key for ${HOST}`)
  return (cachedKey = key)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * The analytics tier caps queued SQL queries per account (429 "reject by tier
 * quota"). Fanning out over dozens of rules hits it easily, so retry those with
 * backoff rather than reporting a rule as broken when it is only queued.
 */
async function call(method, path, body, attempt = 0) {
  const res = await fetch(`${HOST}/api${path}`, {
    method,
    headers: { 'api-key': apiKey(), 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await sleep(2000 * 2 ** attempt)
    return call(method, path, body, attempt + 1)
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : {}
}

export const listRules = (projectId) =>
  call('GET', `/v1/alerts/rule/project/${projectId}`).then((r) => r.rules ?? [])

/** Rule plus its firing instances, including the rendered subject/message. */
export const getAlert = (ruleId) => call('GET', `/v1/alerts/${ruleId}`)

export const createRule = (rule) => call('POST', '/v1/alerts/rule', { rule })

export const updateRule = (id, rule) => call('PUT', `/v1/alerts/rule/${id}`, { rule })

export const deleteRule = (id) => call('DELETE', `/v1/alerts/rule/${id}`)

/**
 * A failing query comes back as HTTP 200 with an `error` field, not as an HTTP
 * error. Left unchecked, a query with a typo reads as "zero rows matched" —
 * indistinguishable from a healthy rule that simply has nothing to report. Turn
 * it into a throw so callers cannot mistake one for the other.
 */
export async function executeSql(owner, slug, sql) {
  const res = await call('POST', `/v1/analytics/${owner}/${slug}/sql/execute`, { sqlQuery: { sql, size: 1000 } })
  if (res.error) throw new Error(`SQL failed: ${res.error}`)
  if (!res.result) throw new Error(`SQL returned no result block: ${JSON.stringify(res).slice(0, 300)}`)
  return res
}

/**
 * Run the same shape of query an alert condition uses, so a rule can be checked
 * before it is applied. `queries` are insights queries (METRICS / EVENTS / PRICE),
 * `formulas` optional. Series come back at results[].matrix.samples[].
 */
export const queryInsights = (owner, slug, queries, formulas = [], timeRange = { start: 'now-1h', end: 'now', step: 300, timezone: 'UTC' }) =>
  call('POST', `/v1/insights/${owner}/${slug}/query`, { timeRange, queries, formulas })

/** Flatten an insights response into { label, labels, value } per series. */
export function insightSeries(response) {
  const out = []
  for (const r of response.results ?? []) {
    for (const s of r.matrix?.samples ?? []) {
      out.push({
        label: s.metric?.displayName ?? s.metric?.name ?? '?',
        labels: s.metric?.labels ?? {},
        value: s.values?.slice(-1)[0]?.value,
      })
    }
  }
  return out
}

/** Run `tasks` with at most `limit` in flight, preserving result order. */
export async function pool(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}
