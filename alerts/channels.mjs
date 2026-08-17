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
export const CHANNELS = {
  critical: { id: 'TODO', projectId: 'TODO', type: 'SLACK' },
  normal: { id: 'TODO', projectId: 'TODO', type: 'SLACK' },
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
