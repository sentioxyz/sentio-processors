# CLAUDE.md

## Repo
Yarn (classic) **workspace monorepo** of Sentio processors. Subprojects live under
`projects/*`, `points/*/*`, `sui/*`, `aptos/*`, `fuel/*`, `iota/*`, `actions/*`.
The `@sentio/*` toolchain and shared dev deps are declared **once in the root
`package.json`** and hoisted to every subproject.

## Dependency management (IMPORTANT)
- **Subprojects must NOT declare their own `@sentio/sdk`, `@sentio/cli`,
  `@sentio/action`, or `typescript` dependency.** They inherit these from the root
  workspace. Pinning them per-subproject causes **version drift** — one project
  resolving a different SDK than the rest — which breaks codegen/typing consistency.
  (This bit `projects/coinbase` and `fuel/fuel-balances`, which used to pin their own
  `@sentio/sdk`; their deps were removed so they inherit the root version.)
- To bump the SDK for the whole repo, change the version **only in the root
  `package.json`** (`@sentio/sdk`, `@sentio/action`), then run `yarn install`.
- A subproject `package.json` should list only deps that are genuinely specific to it
  (e.g. `lru-cache`, `async-mutex`) — never the shared toolchain.
- Package manager is **yarn classic** (root `yarn.lock` + `workspaces` field). Don't
  use npm in subprojects; note `sentio build` may leave a stray root
  `package-lock.json` — delete it if it appears.

## TypeScript / tsconfig
- Repo is on **TypeScript 6** (SDK 4's expected major; pinned once at the root).
- TS 6 turns `strict` **on by default**, which breaks this codebase (generated entity
  fields → TS2564, `catch (e) { e.message }` → many sites). So every subproject
  `tsconfig.json` sets **`"strict": false`** to preserve the prior (TS 5) posture,
  while keeping **`"strictFunctionTypes": true`** — that flag is what makes
  `ctx.store.get(MyEntity, id)` infer the concrete entity type instead of
  `AbstractEntity`. New projects created via `sentio create` need the same two
  settings added.
- Relative imports must use explicit `.js` extensions (`moduleResolution: nodenext`);
  TS 6 enforces this (TS2835).
