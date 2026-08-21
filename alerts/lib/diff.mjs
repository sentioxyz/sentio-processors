/**
 * Comparing a local rule spec against what the server echoes back, shared by
 * sync.mjs and diagnose.mjs so the two can never disagree about what "drifted"
 * means.
 *
 * The server does not round-trip a rule verbatim, so a naive deep-equal reports
 * every rule as changed forever. Everything here exists to absorb one specific
 * observed behaviour.
 */

function prune(value, key) {
  if (value === undefined || value === null || value === '') return undefined
  if (key === 'disabled' && value === false) return undefined
  if (Array.isArray(value)) {
    const arr = value.map((v) => prune(v)).filter((v) => v !== undefined)
    return arr.length ? arr : undefined
  }
  if (typeof value === 'object') {
    const out = {}
    for (const k of Object.keys(value).sort()) {
      const v = prune(value[k], k)
      if (v !== undefined) out[k] = v
    }
    return Object.keys(out).length ? out : undefined
  }
  return value
}

function dropUnusedThreshold2(node) {
  if (!node || typeof node !== 'object') return node
  if (Array.isArray(node)) return node.map(dropUnusedThreshold2)
  const out = {}
  for (const [k, v] of Object.entries(node)) out[k] = dropUnusedThreshold2(v)
  // The server adds `threshold2: 0` whether or not the operator uses it.
  if (out.comparisonOp !== 'between' && out.threshold2 === 0) delete out.threshold2
  return out
}

/**
 * The server echoes all three condition blocks, filling the two that do not
 * apply with zero-valued defaults. Compare only the block alertType selects.
 */
export function conditionOf(rule) {
  const type = rule.alertType ?? 'METRIC'
  const raw = type === 'METRIC' ? rule.condition : type === 'LOG' ? rule.logCondition : rule.sqlCondition
  return dropUnusedThreshold2(raw)
}

/** The fields this repo owns. Everything else the server sets is ignored. */
export function canonical(rule) {
  return JSON.stringify(
    prune({
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

/** Seconds represented by a `{value, unit}` duration, 0 when absent. */
export function durationSeconds(d) {
  if (!d?.value) return 0
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[d.unit]
  return mult ? d.value * mult : 0
}
