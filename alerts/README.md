# Sentio alerts as code

Alert rules live in `alerts/rules/*.mjs` and are pushed with `alerts/sync.mjs`.
Nothing here needs the web UI except creating the two notification channels once.

```
node alerts/sync.mjs plan                       # diff, touches nothing
node alerts/sync.mjs plan --diff                # same, prints the field-level diff
node alerts/sync.mjs apply                      # create + update
node alerts/sync.mjs apply --prune              # also delete managed rules dropped from the spec
node alerts/sync.mjs apply --recreate           # delete+recreate instead of PUT, see below
node alerts/sync.mjs plan --file navi-vault     # one rule file only

node alerts/inspect.mjs                         # server state of every managed rule
node alerts/inspect.mjs --firing                # only what is firing, with the rendered message
node alerts/inspect.mjs --dry-run               # run each SQL rule's query now, before applying anything

node alerts/calibrate.mjs --project navi/navi-production-new --days 30
node alerts/calibrate.mjs --project navi/navi-production-new --columns ltv --emit
```

Auth comes from `~/.sentio/config.json` (same key the CLI uses) or `SENTIO_API_KEY`.

## What is "managed"

Every rule this repo owns gets `group: "navi-managed/<severity>"`. `sync.mjs` only
ever reads, updates or deletes rules carrying that prefix, so alerts somebody made
by hand in the UI are invisible to it and cannot be pruned by accident. The group
is also Sentio's mute unit, so muting `navi-managed/normal` silences the whole
normal tier in one click.

Rules are matched by `subject`, which must therefore be unique inside a file —
`sync.mjs` throws if it is not. Renaming a subject reads as delete + create, which
shows up plainly in `plan`.

## Channels

`channels.mjs` maps `critical` / `normal` to a channel id. Sentio has no channel
CRUD endpoint: a channel object posted without an `id` is **silently dropped** and
the rule falls back to the org default channel, with no error. So channels are
created once in the web UI and referenced by id forever after. Ids are readable
with `npx -y @sentio/cli@latest alert list --project navi/<slug> --yaml` once at
least one rule uses the channel — that output includes the raw Slack webhook URL,
so treat it as a secret.

## Burn-in

`export const muted = true` in a rule file makes `sync.mjs` create every rule with
`mute: true`. The rules evaluate and record FIRING/NORMAL on the server, but
deliver nothing. That is the safe way to find out how noisy a threshold really is:
apply muted, leave it for a few days, watch `node alerts/inspect.mjs --firing`,
tighten, then flip `muted` to false and re-apply.

## One rule, many bounds

A single global threshold does not survive contact with this data. Grouping the
last 30 days of `indexNumberEventV2` by `token` alone hides the markets: `HAEDAL`
looks like it swings between 0 and 0.30, when really `HAEDAL@0` is a flat 0.3008
and `HAEDAL@3` is a flat 0. `nUSDC` spans eight markets from 0.007 to 0.22. Bounds
have to be per token *and* per market — which is exactly how a monitoring setup
ends up with a hundred rules.

`sqlBoundsRule` avoids that. It inlines the whole bounds table into the query as a
ClickHouse `VALUES` list, joins the latest value of each series against it, and
uses `rowCondition` so the rule fires when any row survives. The five bounds rules
in `rules/navi-production-new.mjs` carry 216 individual bound checks between them.
The message template iterates `.Samples`, so one notification names every series
that broke, with its value and its allowed range.

Rule count also costs evaluation: 100 rules at `interval: 1m` is 144k queries a
day against the project. `SEVERITY_DEFAULTS` therefore puts `normal` at 5m.

`bounds.generated.mjs` is produced by `calibrate.mjs --emit` and is meant to be
regenerated, not hand-edited, whenever a market is added. Series that were flat
zero across the whole window are emitted commented out, because a `[0, 0]` bound
fires the moment that market goes live.

## Scaling across the contract surface

One rule file per monitoring domain, all pointing at the same project. The file
name becomes the ownership namespace (`navi-managed/<file>/<severity>`), so
`--prune` on one domain cannot touch another's rules. Override with
`export const namespace = '...'` if the file gets renamed.

| domain | mechanism | rules |
|---|---|---|
| parameter / rate bounds | `sqlBoundsRule` | few, each carrying dozens of bounds |
| oracle price deviation | `priceDeviationRule` | **one per coin** — see below |
| liquidations | `logRule` on `Liquidation`, `sqlColumnRule` for size and concentration | one per failure shape |
| fund flows | `sqlColumnRule` / `sqlRowRule` over `PoolDeposit` / `PoolWithdraw` / `flashloan` | one per window and shape |
| pool totals | `formulaRule` on `total_supply` / `total_borrow` / caps | one per ratio |
| indexer health | `metricRule` with `delta()` | a couple |

Price deviation does not collapse the way bounds do. Pairing a metric grouped by
`coin_symbol` with a multi-coin price query **does not align the two sides** — the
formula quietly evaluates to a constant rather than erroring. Each coin therefore
needs its own rule with `labelSelector: { coin_symbol: X }`. That is a real reason
for the rule count to reach three figures, not an artefact of bad structuring.

## The failure mode to design against

Neither metrics nor labels are validated at write time. A metric name that does not
exist, or a `groupBy` on a label that does not exist, produces an empty or collapsed
series — no error, no warning, and a rule that will never fire again. At ten rules
you would notice; at a hundred you would not.

Two traps found the hard way here:

- the warehouse table column is `token`, the metric label is `coin_symbol`. SQL
  rules want the former, metric rules want the latter.
- `feePoolNetGrowth` and the treasury metrics carry no `market_id`, unlike
  `total_supply` / `ltv` / `currentBorrowRate`. Same project, different label sets.

`node alerts/inspect.mjs --dry-run` is therefore not optional: it executes every
SQL rule's own query, and for every metric rule checks that the metric resolves to
real series and that each `groupBy` label actually exists. Run it before every
apply.

## Debugging

There is no test-fire or template-preview endpoint. Debug the query, not the rule:

- SQL rules — run the identical SQL first, `node alerts/calibrate.mjs` or
  `npx -y @sentio/cli@latest data sql --project navi/<slug> --version <n> --query '...'`
- metric rules — `npx -y @sentio/cli@latest data query --project navi/<slug> --metric <m>`
- log rules — `logCondition.query` is Elasticsearch query-string syntax, ranges must
  be `field:>value`, not `field > value`

Once a rule has evaluated at least once,
`npx -y @sentio/cli@latest alert get <rule-id> --project navi/<slug> --yaml`
returns the firing instances with the rendered subject/message and the samples that
fed the Go template.

## Server quirks the diff has to absorb

Verified 2026-08-13 against app.sentio.xyz:

- the response echoes all three condition blocks, filling the two that do not apply
  with zero-valued defaults, and adds `threshold2: 0` regardless of the operator
- `aggregate.op` accepts only `AVG | SUM | MIN | MAX | COUNT`; anything else is
  silently coerced to `AVG`
- `channels` entries without a known `id` are dropped, see above
- **a failing SQL query returns HTTP 200 with an `error` field.** Unchecked, a query
  with a typo reads as "zero rows matched" — identical to a healthy rule with
  nothing to report. Two rules here were silently broken this way before
  `executeSql` was made to throw on it. Never treat a missing `result` as empty.
- the analytics tier caps queued SQL queries per account and returns
  `429 reject by tier quota` at 100. Fanning out across dozens of rules hits it, so
  `call()` retries 429 with backoff and the heavy scanning rules run on a 15m
  interval rather than the 1m default.
- `market_id` is a String in the warehouse, not a number: `market_id = 0` fails,
  `market_id = '0'` works.
- an aggregate cannot be aliased over its own source column —
  `select max(timestamp) as timestamp ... where timestamp > ...` is rejected.
  Aggregate in a subquery and rename on the way out.
