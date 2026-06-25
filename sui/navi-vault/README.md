# navi-vault Sentio processor

Indexes the **Navi Lending Vault** (`navi_vault`) on Sui mainnet — an ERC4626-style
vault that supplies into Navi lending markets. Built in the style of `sui/navi`.

- Sentio project: `navi/navi-vault`
- Package (defining / event type address): `0x51cecaacaed0bd436f04ebbd8ba0ca1627c9c4d0e54ad28eff095ca78591518c`
- Published at checkpoint `289808972` (2026-06-21); processor starts at `289800000`.

## Vaults

| symbol | vault objectId | underlying | decimals |
|--------|----------------|------------|----------|
| SUI  | `0x864527a8ed2435aed828b46c6d9d0244506b418761cca25b7dd47a83c7797a29` | `0x2::sui::SUI` | 9 |
| USDC | `0x54359eb5d0e4364bd26989899fdb472f5594d1885e1f0d816ef4a066cab2ae4c` | native USDC (`0xdba3…::usdc::USDC`) | 6 |

Vault shares share the underlying's decimals (initial 1:1 mint), so share fields are
normalized by the vault's underlying decimals. Reward amounts are normalized by the
reward coin's own decimals (CERT/vSUI = 9). Fee rates / penalties are WAD-scaled (1e18).

All 35 events from `navi_vault::events` are handled in `src/main.ts` (deposits,
withdraws, allocate/deallocate, market sync, fees, timelock proposals, market admin,
access control, pause, and reward rules / vault-native incentives).

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

## Commands

```bash
yarn install        # installs deps, runs gen + patch
yarn build          # type-check + bundle (skip-gen)
yarn upload         # deploy to Sentio (skip-gen)
```
