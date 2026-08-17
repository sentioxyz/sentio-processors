/**
 * The only part of this setup that cannot be created from code.
 *
 * Sentio has no channel CRUD endpoint: a channel object posted without an `id`
 * is silently dropped and the rule falls back to the org default channel.
 * Channels are created once in the web UI; from then on we only reference ids.
 *
 * To find an id: attach the channel to any one alert, then
 *   npx -y @sentio/cli@latest alert list --project navi/<slug> --yaml
 * prints the full channel object. Treat that output as a secret, it contains
 * the raw Slack webhook URL.
 */
/**
 * BURN-IN PLACEHOLDER — both tiers point at the pre-existing org default telegram
 * channel so the rules could be applied and start collecting firing history before
 * the real channels exist. Every rule is created with `mute: true`, so nothing is
 * delivered here: a muted rule was observed FIRING with an active alert instance
 * and `lastNotified: null`.
 *
 * Replace both entries with the real critical / normal channel ids and re-run
 * `node alerts/sync.mjs apply` — the rules update in place, no re-creation.
 * DO NOT set `muted = false` in the rule files until this is done, or 48 critical
 * rules will fire into the sentio-navi telegram group.
 */
export const CHANNELS = {
  critical: { id: '087i9RCH', projectId: 'hXovp1EL', type: 'TELEGRAM' }, // TODO: real critical channel
  normal: { id: '087i9RCH', projectId: 'hXovp1EL', type: 'TELEGRAM' }, // TODO: real normal channel
}

/** Channel ids already in use by hand-made rules, kept here for reference. */
export const KNOWN_CHANNELS = {
  'navi-vault slack #lending-vault-alert': { id: 'yjj21rIH', projectId: 'rNITGeqT', type: 'SLACK' },
  'astros telegram aggregator-alert': { id: 'bTth0XLc', projectId: 'lDlwJYP3', type: 'TELEGRAM' },
  'org default telegram sentio-navi': { id: '087i9RCH', projectId: 'hXovp1EL', type: 'TELEGRAM' },
}

export function assertChannelsConfigured() {
  for (const [severity, c] of Object.entries(CHANNELS)) {
    if (c.id === 'TODO' || c.projectId === 'TODO') {
      throw new Error(`channels.mjs: ${severity} channel is still TODO, fill in the id from the web UI first`)
    }
  }
}
