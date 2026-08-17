# Where this got to — 2026-08-17

Branch `feat/sentio-alerts-as-code`, pushed. Nothing else in the repo was touched:
the `sui/navi/*` edits and untracked files that were already in the working tree are
untouched and uncommitted.

## Live state on Sentio

**31 rules on `navi/navi-production-new`, all `mute: true`.** They evaluate and record
FIRING/NORMAL but deliver nothing. Verified: a muted rule was observed FIRING with an
active alert instance and `lastNotified: null`.

| namespace | rules | what it covers |
|---|---|---|
| `prod-params` | 10 | rate / LTV / cap bounds (243 bound checks inside 5 SQL rules), cap utilisation, fee pool, fee-rate changes |
| `prod-price` | 8 | wrapper-to-wrapper oracle consistency |
| `prod-liquidation` | 5 | rate, single size, repeat account, bad debt |
| `prod-flows` | 5 | hourly net flow per coin, single action share of pool, flashloan volume, treasury movements |
| `prod-health` | 3 | indexer stall, asset stopped reporting, zero-price liquidation |

Reproduce the state with `node alerts/inspect.mjs`, or validate the spec without
touching the server with `node alerts/inspect.mjs --dry-run`.

## What you need to do (5 minutes, the only UI-bound step)

1. Create the two notification channels in the Sentio web UI (critical, normal).
2. Attach each to any one throwaway alert, so the ids become readable.
3. `npx -y @sentio/cli@latest alert list --project navi/navi-production-new --yaml`
   prints the full channel objects including ids. Treat that output as a secret, it
   contains raw Slack webhook URLs.
4. Put the ids in `alerts/channels.mjs`, replacing the burn-in placeholder, and run
   `node alerts/sync.mjs apply`. Rules update in place; nothing is re-created.

**Both tiers currently point at the pre-existing org default telegram channel
`087i9RCH` (sentio-navi) as a placeholder.** Do not set `muted = false` in any rule
file before the real ids are in, or the critical rules fire into that group.

## Two things found on the way that need a decision

**1. The SUI liquid-staking tokens are priced at SUI spot.** Measured against Sentio's
market feed: haSui −7.45%, vSui −6.28%, stSUI −4.30%, while plain SUI matches within
0.17%. The oracle values for all three sit within 0.3% of the SUI oracle value, so the
staking exchange rate looks like it is not being applied. Under-pricing *collateral* is
conservative and safe; under-pricing LST-denominated *debt* is not. Worth confirming
which side of the book that oracle feeds. (Sentio's own LST price could in principle be
the wrong one, but tracking SUI 1:1 is the more likely explanation.)

**2. Two pools are above 95% utilisation right now.** `Pool utilisation critical`
returned real values: `SUI@9 = 0.9587`, `nUSDC@3 = 0.9510`. Either genuine and worth
acting on, or the 0.95 threshold is too tight for those two markets.

## Open item: oracle-vs-market deviation does not work

This is the one piece of the plan that is blocked, and it is a Sentio limitation rather
than a spec problem.

`priceQuery` is accepted inside an alert condition and the rule saves cleanly, but the
alert engine never evaluates it. All 27 per-coin deviation rules were applied live and
every one either reported the degenerate `abs(a/b-1) = 1` (price input marked
`disabled: true`) or sat in NO_DATA (`disabled: false`), on both a 2m and a 30m window.
The identical formula returns correct values through the insights API — 0.0017 for SUI —
so the expression is right and the alert-side price data source is the gap.

Metric-to-metric formulas are fine: the 8 wrapper-ratio rules work, and
`Pool utilisation critical` returns real numbers. The code is kept behind
`PRICE_DEVIATION_WORKS = false` in `rules/prod-price.mjs`; the 27 rules were pruned off
the server so nobody learns to ignore a permanently grey alert.

Next thing to try: have the processor emit the market price as its own metric, then
express deviation metric-to-metric, which is the path known to work. Failing that, ask
Sentio whether PRICE is supported in alert conditions at all.

Coverage lost meanwhile: 27 coins have no oracle-vs-market check. The wrapper-ratio
rules still catch a wrapper diverging from its peers, but nothing catches the whole
BTC or SUI complex drifting together.

## Second open item: SQL evaluation is hitting the tier quota

Between 2 and 9 of the 31 rules carry
`ResourceExhausted: too many requests in queue, current: 100, limit: 100` at any moment.
It rotates and self-heals per rule, so evaluations are being skipped rather than lost
permanently, but it means the SQL rules are not reliably running.

Already done: `call()` retries 429 with backoff, and the heavy scanning rules were moved
from the 1m default to a 15m interval after measuring that `indexNumberEventV2` only
emits about every 11 minutes per series, making a 1m interval a tenfold waste.

Still open: whether the 100-query queue is shared with other NAVI projects and other
people's ad-hoc queries, and whether the tier needs raising before this scales past ~30
SQL rules. Worth asking Sentio for the actual quota semantics.

## Traps that are already encoded, do not rediscover them

All verified live against app.sentio.xyz, all written up in `README.md`:

- a failing SQL query returns **HTTP 200 with an `error` field**. Unchecked, a typo reads
  as "zero rows matched". Two rules here were silently broken this way; `executeSql` now
  throws instead.
- metric labels are `coin_symbol` / `market_id`, **not** the warehouse column name
  `token`. Grouping by a label that does not exist collapses the series silently and the
  rule then never fires.
- `feePoolNetGrowth` and the treasury metrics carry no `market_id`, unlike
  `total_supply` / `ltv` / `currentBorrowRate`.
- formula inputs need `disabled: true`. With `false` the condition produces no data at
  all.
- `aggregate.op` accepts only AVG/SUM/MIN/MAX/COUNT; anything else is coerced to AVG.
- a channel supplied without a known `id` is dropped and replaced by the org default.
- `market_id` is a String in the warehouse: `market_id = '0'`, not `= 0`.
- an aggregate cannot be aliased over its own source column.

## The calibration point worth remembering

Thresholds came from 30 days of live data, not intuition, and intuition was wrong. The
median liquidation is **$0.17** and hourly liquidation counts reach 217, so the obvious
"20 liquidations in 5 minutes" rule would never have fired once. Same for bounds: a
single global rate threshold is useless because the same token behaves differently per
market — `HAEDAL@0` is a flat 0.3008 while `HAEDAL@3` is a flat 0.

Regenerate any calibration with `node alerts/calibrate.mjs`; `--emit` prints a
paste-ready bounds map. Re-run after adding a market.
