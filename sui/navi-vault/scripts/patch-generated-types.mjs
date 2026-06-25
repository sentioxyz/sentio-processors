// Post-codegen patch for sui/navi-vault generated types.
//
// `sentio gen` (CLI 2.30.x) cannot fully model two things in the navi_vault
// package, and emits TypeScript that fails the build's type-check:
//   1. `TimelockProposal` is a Move `enum` with a phantom type param. Codegen
//      emits a non-generic namespace but references it as `TimelockProposal<T>`.
//   2. `lending_core::account` (dependency package) has no generated namespace,
//      so `...account.AccountCap` is an unresolved member.
//
// None of this touches the `events` module that the processor actually uses, so
// we relax the broken type references to `any`. Idempotent — safe to re-run
// after every `sentio gen`.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, "..", "src", "types", "sui", "navi_vault.ts");

let src;
try {
  src = readFileSync(target, "utf8");
} catch {
  console.log(`[patch-generated-types] ${target} not found, skipping.`);
  process.exit(0);
}

const before = src;

// 1. TimelockProposal enum: drop the unsupported generic argument.
src = src
  .replace(/TypeDescriptor<TimelockProposal<any>>/g, "TypeDescriptor<any>")
  .replace(/\): TypeDescriptor<TimelockProposal<T0>> \{/g, "): TypeDescriptor<any> {")
  .replace(/navi_vault\.TimelockProposal<T0>/g, "any");

// 2. Unresolved AccountCap from the lending_core::account dependency.
src = src.replace(
  /_0x[0-9a-f]+\.account\.AccountCap/g,
  "any"
);

if (src !== before) {
  writeFileSync(target, src, "utf8");
  console.log("[patch-generated-types] navi_vault.ts patched.");
} else {
  console.log("[patch-generated-types] no changes needed.");
}
