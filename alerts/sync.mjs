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
import { canonical } from './lib/diff.mjs'
import { assertChannelsConfigured } from './channels.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
/**
 * Writes are serialised on purpose. With 4 concurrent PUTs against one project,
 * some rules came back carrying both their old and their new channel — the
 * concurrent writes interfere, and which rules are affected varies between runs.
 * A single targeted PUT replaces `channels` correctly every time, so this is
 * contention in the alert service rather than union semantics. Reads of a rule
 * immediately after its write can also be stale, so verify after a pause, not
 * instantly.
 */
const CONCURRENCY = 1

const args = process.argv.slice(2)
const command = args.find((a) => !a.startsWith('--')) ?? 'plan'
const prune = args.includes('--prune')
const showDiff = args.includes('--diff')
const recreate = args.includes('--recreate')
const only = args.includes('--file') ? args[args.indexOf('--file') + 1] : undefined

if (!['plan', 'apply'].includes(command)) {
  console.error(`unknown command ${command}, expected plan|apply`)
  process.exit(2)
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
  const recreates = []
  for (const wanted of rules) {
    const existing = bySubject.get(wanted.subject)
    if (!existing) creates.push(wanted)
    else if (canonical(wanted) === canonical(existing)) continue
    // Some rules refuse to converge through PUT — repointing at a different
    // notification channel is the case seen in practice, where the rule keeps
    // both the old and the new channel no matter how the payload is shaped or
    // how many times it is retried. Delete-and-recreate always works, so
    // `--recreate` offers it explicitly rather than leaving it folklore. It
    // discards the rule's firing history, which is why it is not the default.
    else if (recreate) recreates.push({ id: existing.id, wanted })
    else updates.push({ id: existing.id, wanted, existing })
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
  for (const r of recreates) console.log(`  ↻ recreate ${r.wanted.group}  ${r.wanted.subject}`)
  for (const r of deletes) console.log(`  - delete  ${r.group}  ${r.subject}${prune ? '' : '   (needs --prune)'}`)
  if (!creates.length && !updates.length && !recreates.length && !deletes.length) console.log('  up to date')

  if (command !== 'apply') return

  await pool(creates, CONCURRENCY, (r) => createRule({ ...r, projectId: project.id }))
  // Send the full remote rule with the spec laid over it, not just the fields we
  // own. A partial payload is treated as a patch and `channels` comes back as the
  // union of old and new, so repointing a rule at a different channel never
  // converges — rules kept carrying both their old and new channel across
  // repeated applies. Overlaying onto the remote object makes it a true replace.
  await pool(updates, CONCURRENCY, (u) =>
    updateRule(u.id, { ...u.existing, ...u.wanted, id: u.id, projectId: project.id }),
  )
  await pool(recreates, CONCURRENCY, async (r) => {
    await deleteRule(r.id)
    await createRule({ ...r.wanted, projectId: project.id })
  })
  if (prune) await pool(deletes, CONCURRENCY, (r) => deleteRule(r.id))
  console.log(
    `  applied: ${creates.length} created, ${updates.length} updated, ${recreates.length} recreated, ${prune ? deletes.length : 0} deleted`,
  )
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
