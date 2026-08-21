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
 * Created in the web UI on 2026-08-17 and verified with
 * `GET /api/v1/alerts/channels/{id}`. Only the ids live here — the channel objects
 * also carry raw Slack webhook URLs, which must not be committed.
 */
export const CHANNELS = {
  critical: { id: 'Jdd2WOaD', projectId: 'e2kx9fDv', type: 'SLACK' }, // #alert-navi-lending-critical
  normal: { id: 'HA6P3L8e', projectId: 'e2kx9fDv', type: 'SLACK' }, // #alert-navi-lending-warning
}

/** Channel ids in use by hand-made rules elsewhere, kept here for reference. */
export const KNOWN_CHANNELS = {
  'navi-vault slack #lending-vault-alert': { id: 'yjj21rIH', projectId: 'rNITGeqT', type: 'SLACK' },
  'astros telegram aggregator-alert': { id: 'bTth0XLc', projectId: 'lDlwJYP3', type: 'TELEGRAM' },
  'org default telegram sentio-navi': { id: '087i9RCH', projectId: 'hXovp1EL', type: 'TELEGRAM' },
}

/**
 * There is no endpoint that lists channels — only `GET /v1/alerts/channels/{id}`,
 * a fetch by id. So an id is discoverable only by reading it out of a rule that
 * already references the channel, or from the web UI. Probed and confirmed absent:
 * /v1/channels, /v1/alerts/channels, /v1/notification(s)/channels,
 * /v1/projects/{id}/channels, /v1/alerts/channels/project/{id}, and the by-id route
 * does not accept a channel name.
 */

export function assertChannelsConfigured() {
  for (const [severity, c] of Object.entries(CHANNELS)) {
    if (c.id === 'TODO' || c.projectId === 'TODO') {
      throw new Error(`channels.mjs: ${severity} channel is still TODO, fill in the id from the web UI first`)
    }
  }
}
