# navi-vault Sentio processor

Indexes the **Navi Lending Vault** (`navi_vault`) on Sui mainnet — an ERC4626-style
vault that supplies into Navi lending markets. Built in the style of `sui/navi`.

- Sentio project: `navi/navi-vault`
- Published at checkpoint `289808972` (2026-06-21); processor starts at `289800000`.

## Package address — do not "update" it after an upgrade

The processor binds to `0x51cecaac…` (`package.typeIdentity` in the config below).
Sui keeps object and event **type identity** at the original package id forever; an
upgrade only changes the `callTarget` you send transactions to. Rebinding to the
upgraded `callTarget` would match zero events. `config.ts` reads the address straight
out of the JSON so there is nothing to edit here on an upgrade.

## Vaults / markets config

`src/config/vaults.mainnet.json` is a **copy** of the on-chain dump produced by
`navi_chain_tool/navi_vault_setup/dump_vaults.ts`. `src/config.ts` derives the vault
registry, the pool→market-name map and the coin decimals from it.

Do not hand-edit either file. To pick up a new vault or market:

```bash
RPC=https://rpc-mainnet.suiscan.xyz npx ts-node navi_vault_setup/dump_vaults.ts
```

then copy the regenerated `vaults.mainnet.json` over `src/config/vaults.mainnet.json`
and re-upload. (Hand-maintaining a second copy of these ids is what let the registry
sit at 2 vaults while the chain had 4 — every metric for SUI Prime and USDC Prime was
labelled `UNKNOWN`, and USDC Prime's amounts were scaled by 1e9 instead of 1e6.)

Only static identity fields are read from the JSON. Everything an admin or curator can
change at runtime — `paused`, `vaultCap`, `withdrawPenalty`, fee rates — is read from
chain instead, so a stale JSON can never produce a wrong number for those.

Current vaults:

| key | vault objectId | underlying | decimals |
|-----|----------------|------------|----------|
| `SUI` | `0x864527a8…` | `0x2::sui::SUI` | 9 |
| `USDC` | `0x54359eb5…` | native USDC (`0xdba3…::usdc::USDC`) | 6 |
| `SUI_PRIME` | `0x01236ff6…` | `0x2::sui::SUI` | 9 |
| `USDC_PRIME` | `0x908c978d…` | native USDC | 6 |

**Group metrics by `vault_key`, not `vault_symbol`.** SUI and SUI_PRIME share an
underlying (as do USDC and USDC_PRIME), so `vault_symbol` is not unique and grouping
by it silently merges two vaults into one series. `vault_symbol` is kept as a
secondary label for per-asset roll-ups.

Vault shares share the underlying's decimals (initial 1:1 mint), so share fields are
normalized by the vault's underlying decimals. Reward amounts are normalized by the
reward coin's own decimals (CERT/vSUI = 9). Fee rates / penalties are WAD-scaled (1e18).

## What is indexed

**`src/main.ts` — events.** All 35 events from `navi_vault::events` (deposits,
withdraws, allocate/deallocate, market sync, fees, timelock proposals, market admin,
access control, pause, reward rules). Market-scoped payloads carry both the raw
`pool_address` and a readable `market_name`.

**`src/state-processor.ts` — object snapshots.** A `SuiObjectProcessor` reads every
Vault object on a 10-minute interval. This is not redundant with the events: interest
accrues inside the Navi markets without emitting anything, so TVL and share price
derived from `sum(Deposit) − sum(Withdraw)` drift permanently. Snapshot metrics:

| metric | notes |
|--------|-------|
| `vault_tvl` | `idle_balance + Σ market.current_balance`, mirroring `get_total_assets()`. In the underlying, not USD. |
| `vault_share_price` | `(total_assets + VIRTUAL_SHARES) / (total_shares + VIRTUAL_SHARES)` — the exact ratio the contract mints/burns at. Its slope is the realised APY; a drop is a real loss. |
| `vault_total_shares`, `vault_idle_balance` | |
| `vault_cap_snapshot`, `vault_cap_utilization` | utilization is 0..1; `vault_cap == 0` means unlimited and reports 0. |
| `vault_paused` | 1 = paused. |
| `vault_market_balance_snapshot`, `vault_market_loss` | labelled by `market_name` + `status` (Active/Disabled). |
| `vault_market_sync_age_seconds` | seconds since `last_sync_at`. A market that stops being synced has a stale `current_balance`, which biases TVL and share price. |
| `vault_fee_rate`, `vault_pending_fee_shares` | labelled `fee_type` = management \| performance. |
| `vault_version` | |

The `VaultSnapshot` event log carries the same values plus the struct's cached
`total_assets`; a persistent gap between it and `vault_tvl` means markets are not
being synced. If the object shape ever stops matching, the handler emits
`VaultSnapshotError` and records nothing rather than reporting a zeroed vault.

Not yet covered: USD normalization (needs the Navi oracle at
`0x1568865e…`, so SUI and USDC vaults can be summed into one TVL figure) and
per-user positions (needs `ctx.store` entities keyed by receipt id).

## Codegen caveat (important)

`sentio gen` (CLI 2.30.x) cannot model the `navi_vault` module's `TimelockProposal`
Move **enum** or the `lending_core::account::AccountCap` dependency type, and emits
TypeScript that fails the build's type-check. Those types live in the `navi_vault`
module, which the processor does not use (it only binds the `events` module).

`scripts/patch-generated-types.mjs` relaxes those broken references to `any`. It is
idempotent and runs automatically after every `sentio gen`:

- `yarn gen`  → `sentio gen && node scripts/patch-generated-types.mjs`
- `yarn build` / `yarn upload` use `--skip-gen` so they consume the already-patched
  types instead of regenerating (which would re-introduce the errors).

So the flow is: **`yarn gen` (or `yarn install`, via postinstall) then `yarn upload`.**

## After uploading: give it ~50 minutes before concluding anything

A freshly uploaded version sits in `STARTING` for a long time — measured at
**49 minutes** for a version starting at checkpoint 289800000. For that entire
window there is no feedback of any kind:

- `processorStatus.state` stays `STARTING`
- `states` (per-chain progress) stays empty
- the Processor Log panel is completely empty
- the version badge says `backfill` and the stats panel says "initiating"

None of that indicates a problem. The first real signal is the Processor Log
filling with `Processing from <n> to <m>` lines, at which point the status flips
to `PROCESSING` / `PROCESSING_LATEST`.

**Uploading a new version immediately deactivates the current one**, so a version
killed at the 20–30 minute mark never gets to finish starting. Do not re-upload
to "retry" a version that looks stuck — that resets the clock and produces a
convincing but false impression that nothing works. Wait it out first.

## Commands

```bash
yarn install        # installs deps, runs gen + patch
yarn build          # type-check + bundle (skip-gen)
yarn upload         # deploy to Sentio (skip-gen)
```
