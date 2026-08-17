# Daily check — instructions for the scheduled cloud agent

Read-only. Do **not** create, update, delete or apply any alert rule, and do **not**
commit or push anything.

## Environment prerequisite

The cloud environment's egress proxy must allow `app.sentio.xyz`. Without it every rule
fails identically with `403 Host not in allowlist: app.sentio.xyz`, which comes from the
session proxy and not from Sentio. That is a hard block — do not retry it as one of the
transient failures below; report it and stop.

## Setup

1. `git checkout feat/sentio-alerts-as-code`
2. `export SENTIO_API_KEY=<the key from the routine prompt>` — never write it to a file.
3. No `npm install`. `alerts/` is dependency-free plain ESM and runs on node directly.

## What to run

```
node alerts/diagnose.mjs
```

It prints a structured report with a `PROBLEMS` section grouped by problem class. Paste
that report back verbatim — it is written to be actionable without further digging.

**Which half runs depends on the key.** `diagnose.mjs` has two halves:

- the **query side** runs each rule's own SQL and evaluates each metric rule's formula.
  A `read:project` key is enough.
- the **server side** reads each rule's state, error, last evaluation and last
  notification. This needs a **write-capable** key: Sentio gates reading alert rules behind
  write access, so `read:project` gets 403 on both `/v1/alerts/rule/project/{id}` and
  `/v1/alerts/{ruleId}`.

With a read-only key the report says so explicitly and prints only the query side. That
still catches broken queries, dead metrics and bad labels, but it is **blind to the failure
currently biting**: a rule whose condition matched while the server reports ERROR, which
delivers nothing. If the report says the server half was skipped, say so prominently — it
means the run could not check whether alerts actually reach Slack.

## Transient failures are not findings

Expect some. `diagnose.mjs` already retries a query up to three times when the error looks
transient (`DeadlineExceeded`, `rewrite sql failed`, `429`, tier quota). A `[QUOTA]` entry
in the report means it still failed after those retries, which is a real finding: the rule
is not evaluating at all.

## What to report

Paste the whole `==== SENTIO ALERT DIAGNOSTIC ====` block. Then add, in at most a few
lines:

1. Which problem classes are new versus the known set below.
2. Whether anything is in `FIRING AND DELIVERED` — that is the only evidence alerts
   actually reach Slack.
3. Nothing else. Do not propose threshold changes and do not speculate about causes; a rule
   firing once is not evidence its threshold is wrong.

Send a push notification only when there is something to act on: a new problem class, a
rule newly firing that is not in the known set, or the server half being skipped when it
worked before. A report identical to yesterday's does not warrant a push.

## Known state as of 2026-08-17

Do not present these as new.

**Firing correctly, but blocked from delivering by the quota problem below:**

- `Utilisation approaching configured borrow cap` — `LZWBTC@0` 0.6441 against a configured
  cap of 0.5, plus `SUI@9` 0.9587 and `nUSDC@3` 0.9506, which are inside their 0.96 cap and
  only near it.
- `Supply rate out of bounds` — `USDY@0` and `nUSDC@7`.
- `Borrow rate out of bounds` — `nUSDC@7`.

**Open problems:**

- `[QUOTA]` — the Sentio analytics tier rejects evaluations at 100 queued queries, which
  masks FIRING as ERROR and stops notifications. The SQL rules moved to a 15m interval to
  cut volume, but the real fix is a quota raise. A count that keeps climbing is worth
  reporting; the class merely persisting is not.
- `[MASKED_FIRING]` — a direct consequence of the above. Expect it while QUOTA persists.

**Closed, do not raise again:**

- SUI liquid-staking tokens priced at SUI spot (haSui/vSui/stSUI oracle ignoring the
  staking exchange rate). Intentional, for a reason on the contract side. The widened
  tolerances in `rules/prod-price.mjs` are deliberate.
- `SUI@9` and `nUSDC@3` near 95% utilisation. Both are inside their configured 0.96 cap.
  Only utilisation exceeding a pool's own `borrowCapCeiling` is a finding.
- Oracle-vs-market deviation being absent. `priceQuery` is not evaluated by the alert
  engine; the 27 per-coin rules are deliberately disabled behind
  `PRICE_DEVIATION_WORKS = false`.
