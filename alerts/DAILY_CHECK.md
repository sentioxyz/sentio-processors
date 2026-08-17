# Daily check — instructions for the scheduled cloud agent

Read-only. Do **not** create, update, delete or apply any alert rule, and do **not**
commit or push anything. The key the routine supplies has scope `read:project` only, so
writes are rejected server-side, but do not attempt them.

## Environment prerequisite

The cloud environment's egress proxy must allow `app.sentio.xyz`. Without it every rule
fails identically with `403 Host not in allowlist: app.sentio.xyz`, which comes from the
session proxy and not from Sentio. That is a hard block — do not retry it as if it were
one of the transient failures below; report it and stop.

## Setup

1. `git checkout feat/sentio-alerts-as-code`
2. `export SENTIO_API_KEY=<the key from the routine prompt>` — never write it to a file.
3. No `npm install`. `alerts/` is dependency-free plain ESM and runs on node directly.

## What to run

```
node alerts/inspect.mjs --dry-run
```

This executes each alert rule's own query against the Sentio warehouse and evaluates each
metric rule's formula, reporting the rows or values that would trigger a notification.

Every rule is currently **muted** on Sentio, so nothing is delivered to anyone. This run
is the only place findings surface.

Read `alerts/STATUS.md` before reporting. It records the known state, the findings already
raised, and the traps already encoded. Do not re-report what it already covers as if it
were new.

## Transient failures are not findings

Expect some. If a rule reports `DeadlineExceeded`, `rewrite sql failed`, or
`429 / too many requests in queue / tier quota`, re-run just that domain up to twice more
before treating it as real:

```
node alerts/inspect.mjs --dry-run --file prod-params
node alerts/inspect.mjs --dry-run --file prod-price
node alerts/inspect.mjs --dry-run --file prod-liquidation
node alerts/inspect.mjs --dry-run --file prod-flows
node alerts/inspect.mjs --dry-run --file prod-health
```

The Sentio analytics tier caps queued SQL at 100 per account, shared across the org, so
contention is normal rather than a defect in the rule.

## What to report

Keep the final message short. It is the whole product of the run.

1. **Rules that would fire, with the actual rows or computed values.** This is the point
   of the run — include the numbers, not just the rule names.
2. Rules that failed for a non-transient reason, with the error.
3. Anything that changed versus `STATUS.md`.
4. If nothing would fire and nothing failed, say exactly that in one line and stop.

Send a push notification only when there is something the human has to act on: a rule that
would fire and is not in the known-firing list below, or a non-transient failure. A clean
run does not warrant a push.

Do not speculate about causes beyond what the data shows, and do not propose threshold
changes — a rule firing once is not evidence that its threshold is wrong. Report what
happened; the human decides.

## Known-firing at the time this was written (2026-08-17)

Do not present these as new:

- `Utilisation approaching configured borrow cap` — `LZWBTC@0` at 0.6441 against a
  configured cap of 0.5, plus `SUI@9` 0.9587 and `nUSDC@3` 0.9506 which are both inside
  their 0.96 cap and only near it.
- `Supply rate out of bounds` — `USDY@0` and `nUSDC@7`.
- `Borrow rate out of bounds` — `nUSDC@7`.

A *change* in this set is worth reporting. The set staying the same is worth one line.

## Closed, do not raise again

- **SUI liquid-staking tokens priced at SUI spot** (haSui/vSui/stSUI oracle ignoring the
  staking exchange rate). Intentional, for a reason on the contract side. The widened
  tolerances in `rules/prod-price.mjs` are deliberate.
- **`SUI@9` and `nUSDC@3` above 95% utilisation.** Both sit inside their configured 0.96
  cap. Only utilisation exceeding a pool's own `borrowCapCeiling` is a finding.
