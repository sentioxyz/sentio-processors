# Where this got to — 2026-08-17

Branch `feat/sentio-alerts-as-code`, pushed. Nothing else in the repo was touched:
the `sui/navi/*` edits and untracked files that were already in the working tree are
untouched and uncommitted.

## What you need to do, in one place

1. ~~Two Sentio channels~~ — done. `Jdd2WOaD` = #alert-navi-lending-critical,
   `HA6P3L8e` = #alert-navi-lending-warning, both wired up and verified.
2. ~~Connect your GitHub account to claude.ai~~ — done, the routine now clones the repo
   fine.
3. **Allow `app.sentio.xyz` in the cloud environment's network egress settings**
   (environment `env_01AQPX818Uirz8HURNMbYEng`). Until then the daily check reaches the
   repo but not Sentio. See the Daily check section.

All one-time. Everything after them is code.

## Live state on Sentio

**29 rules on `navi/navi-production-new`, all `mute: true`.** They evaluate and record
FIRING/NORMAL but deliver nothing. Verified: a muted rule was observed FIRING with an
active alert instance and `lastNotified: null`.

| namespace | rules | what it covers |
|---|---|---|
| `prod-params` | 8 | rate / LTV / cap bounds (243 bound checks inside 5 SQL rules), utilisation vs configured cap, fee pool, fee-rate changes |
| `prod-price` | 8 | wrapper-to-wrapper oracle consistency |
| `prod-liquidation` | 5 | rate, single size, repeat account, bad debt |
| `prod-flows` | 5 | hourly net flow per coin, unusually large single action, flashloan volume, treasury movements |
| `prod-health` | 3 | indexer stall, asset stopped reporting, zero-price liquidation |

Reproduce the state with `node alerts/inspect.mjs`, or validate the spec without
touching the server with `node alerts/inspect.mjs --dry-run`.

## The Sentio channel step in detail

1. Create the two notification channels in the Sentio web UI (critical, normal).
2. Attach each to any one throwaway alert, so the ids become readable.
3. `npx -y @sentio/cli@latest alert list --project navi/navi-production-new --yaml`
   prints the full channel objects including ids. Treat that output as a secret, it
   contains raw Slack webhook URLs.
4. Put the ids in `alerts/channels.mjs`, replacing the burn-in placeholder, and run
   `node alerts/sync.mjs apply`. Rules update in place; nothing is re-created.

Routing verified 2026-08-17 after the channels were wired up: 24 critical rules to
#alert-navi-lending-critical, 5 normal rules to #alert-navi-lending-warning, no rule still
carrying the old telegram placeholder, all 29 still muted.

Getting there needed `apply --recreate`: repointing a rule at a different channel does not
converge through PUT. Four rules held on to both their old and new channel through
serialised writes, full-object payloads and repeated retries. Worth knowing before the next
channel change — and the reason `--recreate` exists.

**The only thing left is `muted`.** Flipping it to false in the five rule files and running
`apply` is the moment real Slack messages start. Worth doing with someone watching.

## Two things found on the way that need a decision

**1. The SUI liquid-staking tokens are priced at SUI spot.** Measured against Sentio's
market feed: haSui −7.45%, vSui −6.28%, stSUI −4.30%, while plain SUI matches within
0.17%. The oracle values for all three sit within 0.3% of the SUI oracle value, so the
staking exchange rate looks like it is not being applied. Under-pricing *collateral* is
conservative and safe; under-pricing LST-denominated *debt* is not. Worth confirming
which side of the book that oracle feeds. (Sentio's own LST price could in principle be
the wrong one, but tracking SUI 1:1 is the more likely explanation.)

**2. `LZWBTC@0` is borrowed past its configured cap.** Utilisation 0.6441 against a
`borrowCapCeiling` of 0.5 — 129% of the cap. `SUI@9` (0.9587) and `nUSDC@3` (0.9506) are
merely *near* their 0.96 cap, which is normal.

Correcting an earlier version of this file: it reported SUI@9 and nUSDC@3 as "above 95%
utilisation" and treated that as the finding. That was an artefact of an arbitrary hard
0.95 threshold — both pools are inside their configured caps. The real signal is LZWBTC@0,
and it only became visible once the rule compared utilisation against each pool's own cap.

## Three more silent-wrongness bugs, found by running the dry-run against live data

None of these errored. All three computed a number, and the number was meaningless. This
is the failure mode that matters at this scale, and only comparing the output against
reality catches it.

- **`UserInteraction.reserve` is the asset id (0, 1, 2 …), not the pool balance.** The
  "single action took a large share of the pool" rule divided by it and produced shares
  above 274%. Replaced with per-coin calibrated size bounds, which keep the comparison
  inside one coin so the units cancel.
- **`supplyCapCeiling` is raw on-chain units while `total_supply` is normalised** — SUI@0
  is 5.5e16 against 2.6e7. Their ratio came out at ~1e-9 for every pool, so the supply-cap
  rule could never have fired.
- **`borrowCapCeiling` is a ratio parameter (0.96, 0.92, 0.5), not an absolute ceiling.**
  `total_borrow / borrowCapCeiling` returned 1.4e8.

All three cap/utilisation formula rules were replaced by one SQL rule comparing utilisation
against each pool's own `borrowCapCeiling`, which is unit-free because both sides are
ratios. That is also what surfaced the LZWBTC@0 finding above.

**Supply-cap fullness is now uncovered.** It needs per-token decimals to reconcile the two
units and there is no decimals column in the warehouse. `WithdrawTreasuryV2` carries both
`amount` and `amount_normalized`, so decimals could be derived from it for coins that have
had a treasury withdrawal — untried.

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
`Utilisation approaching configured borrow cap` returns real numbers. The code is kept behind
`PRICE_DEVIATION_WORKS = false` in `rules/prod-price.mjs`; the 27 rules were pruned off
the server so nobody learns to ignore a permanently grey alert.

Next thing to try: have the processor emit the market price as its own metric, then
express deviation metric-to-metric, which is the path known to work. Failing that, ask
Sentio whether PRICE is supported in alert conditions at all.

Coverage lost meanwhile: 27 coins have no oracle-vs-market check. The wrapper-ratio
rules still catch a wrapper diverging from its peers, but nothing catches the whole
BTC or SUI complex drifting together.

## Second open item: SQL evaluation is hitting the tier quota

Between 2 and 9 of the 29 rules carry
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
paste-ready bounds map, `--upper-only` for the "is this unusually large" checks where a
small value carries no signal. Re-run after adding a market.

## Daily check

`alerts/DAILY_CHECK.md` holds the instructions for a scheduled cloud agent that runs
`inspect.mjs --dry-run` and reports what would fire. Keeping the instructions in the repo
rather than in the routine prompt means they are version-controlled and editable without
touching the schedule.

The routine exists: `trig_01TfMJBkVrpFyB8MBNULTEiA`, daily at 09:00 America/Los_Angeles
(`0 16 * * *` UTC), claude-sonnet-5, read-only tools, using the `read:project` Sentio key
so it cannot write even by mistake. It can push to a phone, so results do not have to be
read off the web page.

**It cannot reach Sentio yet.** The first run cloned the repo, checked out the branch and
ran correctly, but every rule failed with `403 Host not in allowlist: app.sentio.xyz` —
the cloud environment's egress proxy, not Sentio. `app.sentio.xyz` has to be added to the
egress allowlist for environment `env_01AQPX818Uirz8HURNMbYEng`. The routine is left
enabled so it keeps failing visibly rather than being forgotten; it starts working the
moment the allowlist is fixed, no redeploy needed.

Note that reading alert rule state (`GET /v1/alerts/rule/project/...`) requires WRITE
access on Sentio — a read-only key gets 403. So the scheduled check uses `--dry-run`, which
only needs SQL and insights. That is the better view anyway: it evaluates each rule's own
condition directly, independent of the alert engine, which is currently unreliable because
of the quota contention above.
