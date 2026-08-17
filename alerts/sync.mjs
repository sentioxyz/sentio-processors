#!/usr/bin/env node
/**
 * Declarative sync of Sentio alert rules.
 *
 *   node alerts/sync.mjs plan                    # show the diff, touch nothing
 *   node alerts/sync.mjs apply                   # create + update
 *   node alerts/sync.mjs apply --prune           # also delete managed rules no longer in the spec
 *   node alerts/sync.mjs plan --file navi-production-new
 *
 * Only rules whose `group` starts with `navi-managed/` are considered ours.
 * Anything created by hand in the web UI is invisible to this script.
 */
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { listRules, createRule, updateRule, deleteRule, pool } from './lib/api.mjs'
import { MANAGED_PREFIX } from './lib/spec.mjs'
import { assertChannelsConfigured } from './channels.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const CONCURRENCY = 4

const args = process.argv.slice(2)
const command = args.find((a) => !a.startsWith('--')) ?? 'plan'
const prune = args.includes('--prune')
const showDiff = args.includes('--diff')
const only = args.includes('--file') ? args[args.indexOf('--file') + 1] : undefined

if (!['plan', 'apply'].includes(command)) {
  console.error(`unknown command ${command}, expected plan|apply`)
  process.exit(2)
}

function prune_(value, key) {
  if (value === undefined || value === null || value === '') return undefined
  if (key === 'disabled' && value === false) return undefined
  if (Array.isArray(value)) {
    const arr = value.map((v) => prune_(v)).filter((v) => v !== undefined)
    return arr.length ? arr : undefined
  }
  if (typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value).sort()) {
      const v = prune_(value[k], k)
      if (v !== undefined) out[k] = v
    }
    return Object.keys(out).length ? out : undefined
  }
  return value
}

/**
 * The server echoes back all three condition blocks, filling the two that do
 * not apply with zero-valued defaults, and adds `threshold2: 0` even when the
 * operator is not `between`. Compare only the block the alertType selects.
 */
function conditionOf(rule) {
  const type = rule.alertType ?? 'METRIC'
  const raw = type === 'METRIC' ? rule.condition : type === 'LOG' ? rule.logCondition : rule.sqlCondition
  return dropUnusedThreshold2(raw)
}

function dropUnusedThreshold2(node) {
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map(dropUnusedThreshold2)
  const out = {}
  for (const [k, v] of Object.entries(node)) out[k] = dropUnusedThreshold2(v)
  if (out.comparisonOp !== 'between' && out.threshold2 === 0) delete out.threshold2
  return out
}

/** Fields we own. Everything else the server sets is ignored when diffing. */
function canonical(rule) {
  return JSON.stringify(
    prune_({
      subject: rule.subject,
      message: rule.message,
      group: rule.group,
      alertType: rule.alertType ?? 'METRIC',
      for: rule.for,
      interval: rule.interval,
      renotifyDuration: rule.renotifyDuration?.value ? rule.renotifyDuration : undefined,
      renotifyLimit: rule.renotifyLimit || undefined,
      condition: conditionOf(rule),
      mute: rule.mute || undefined,
      channels: (rule.channels ?? []).map((c) => c.id).sort(),
    }) ?? {},
  )
}

async function syncFile(mod, file) {
  const { project } = mod
  if (!project?.id) throw new Error(`${file}: missing \`export const project = { owner, slug, id }\``)

  // Several files can target one project — one per monitoring domain — so
  // ownership has to be per file, not per project. Without the namespace,
  // `--prune` on rules/prod-price.mjs would see every rule from
  // rules/prod-liquidation.mjs as an orphan and delete it.
  const namespace = mod.namespace ?? file.replace(/\.mjs$/, '')
  if (namespace.includes('/')) throw new Error(`${file}: namespace must not contain "/"`)
  const scope = `${MANAGED_PREFIX}${namespace}/`

  // `export const muted = true` is the burn-in switch: rules evaluate and record
  // their firing state, but no notification is delivered. Flip it off once the
  // thresholds have been watched for a while.
  const rules = mod.rules.map((r) => {
    const severity = (r.group ?? '').slice(MANAGED_PREFIX.length)
    if (!severity || severity.includes('/')) throw new Error(`${file}: rule "${r.subject}" was not built by lib/spec.mjs`)
    return { ...r, group: scope + severity, mute: mod.muted === true }
  })

  const subjects = new Set()
  for (const r of rules) {
    if (subjects.has(r.subject)) throw new Error(`${file}: duplicate subject "${r.subject}"`)
    subjects.add(r.subject)
  }

  const remote = await listRules(project.id)
  const managed = remote.filter((r) => (r.group ?? '').startsWith(scope))
  const bySubject = new Map(managed.map((r) => [r.subject, r]))

  const creates = []
  const updates = []
  for (const wanted of rules) {
    const existing = bySubject.get(wanted.subject)
    if (!existing) creates.push(wanted)
    else if (canonical(wanted) !== canonical(existing)) updates.push({ id: existing.id, wanted, existing })
  }
  const deletes = managed.filter((r) => !subjects.has(r.subject))

  console.log(`\n${project.owner}/${project.slug}  (${file})`)
  const otherManaged = remote.filter((r) => (r.group ?? '').startsWith(MANAGED_PREFIX) && !(r.group ?? '').startsWith(scope)).length
  console.log(
    `  spec ${rules.length} rules · in scope ${managed.length} · other managed ${otherManaged} · unmanaged ${remote.length - managed.length - otherManaged}` +
      `${mod.muted ? ' · MUTED' : ''}`,
  )
  for (const r of creates) console.log(`  + create  ${r.group}  ${r.subject}`)
  for (const u of updates) {
    console.log(`  ~ update  ${u.wanted.group}  ${u.wanted.subject}`)
    if (showDiff) {
      console.log(`      remote: ${canonical(u.existing)}`)
      console.log(`      spec:   ${canonical(u.wanted)}`)
    }
  }
  for (const r of deletes) console.log(`  - delete  ${r.group}  ${r.subject}${prune ? '' : '   (needs --prune)'}`)
  if (!creates.length && !updates.length && !deletes.length) console.log('  up to date')

  if (command !== 'apply') return

  await pool(creates, CONCURRENCY, (r) => createRule({ ...r, projectId: project.id }))
  await pool(updates, CONCURRENCY, (u) => updateRule(u.id, { ...u.wanted, id: u.id, projectId: project.id }))
  if (prune) await pool(deletes, CONCURRENCY, (r) => deleteRule(r.id))
  console.log(`  applied: ${creates.length} created, ${updates.length} updated, ${prune ? deletes.length : 0} deleted`)
}

try {
  assertChannelsConfigured()
} catch (e) {
  console.error(e.message)
  process.exit(2)
}

const files = readdirSync(join(HERE, 'rules'))
  .filter((f) => f.endsWith('.mjs'))
  .filter((f) => !only || f.startsWith(only))

if (!files.length) {
  console.error(only ? `no rule file matching ${only}` : 'alerts/rules is empty')
  process.exit(2)
}

for (const file of files) {
  const mod = await import(join(HERE, 'rules', file))
  await syncFile(mod, file)
}
