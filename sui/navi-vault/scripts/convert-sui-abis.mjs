// Convert cached Sui ABI files from the legacy normalized-modules map into the
// array format @sentio/cli >= 4 expects.
//
// Why this exists: cli 4.x auto-"upgrades" legacy ABIs by re-downloading them
// from https://fullnode.mainnet.sui.io, which is hardcoded with no override and
// has been dead since Sui deprecated JSON-RPC on public fullnodes (2026-08-03).
// Codegen aborts before generating anything. Our ABIs are already cached under
// abis/sui, so we convert them in place; the CLI's re-download step then finds
// nothing legacy and skips the network entirely.
//
// The transform is NOT reimplemented. The CLI keeps its whole Move-ABI
// normalization in one contiguous block, so we lift that block verbatim out of
// the bundle at run time and call its entry point. That way the output cannot
// drift from what the CLI itself would have written. If a future CLI moves or
// renames those internals, this throws instead of emitting a subtly wrong ABI.

import fs from "node:fs";
import path from "node:path";

// First and last declaration of the block to lift, in bundle order.
const BLOCK_START = "const MOVE_DATATYPE_KIND_STRUCT = 1;";
const BLOCK_ENTRY = "normalizedModulesToAbi";

const ABI_DIR = path.resolve("abis", "sui");

// The CLI's package "exports" map hides both dist/index.js and package.json, so
// neither can be resolved through the module system — walk up to the nearest
// node_modules instead.
function findCliBundle(from) {
  let dir = from;
  for (;;) {
    const candidate = path.join(dir, "node_modules", "@sentio", "cli", "dist", "index.js");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("cannot locate the @sentio/cli bundle");
    dir = parent;
  }
}

function liftTransform(bundle) {
  const start = bundle.indexOf(BLOCK_START);
  if (start === -1) {
    throw new Error(`CLI bundle no longer contains ${JSON.stringify(BLOCK_START)}`);
  }
  const entryDecl = `\nfunction ${BLOCK_ENTRY}(`;
  const entryAt = bundle.indexOf(entryDecl, start);
  if (entryAt === -1) {
    throw new Error(`CLI bundle no longer declares ${BLOCK_ENTRY} after the constants block`);
  }
  // Close the block at the end of the entry function, by brace matching.
  let depth = 0;
  let seen = false;
  let end = -1;
  for (let i = entryAt; i < bundle.length; i++) {
    const c = bundle[i];
    if (c === "{") { depth++; seen = true; }
    else if (c === "}") {
      depth--;
      if (seen && depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) throw new Error(`unbalanced braces while lifting ${BLOCK_ENTRY}`);
  return new Function(`${bundle.slice(start, end)}\nreturn ${BLOCK_ENTRY};`)();
}

// Deliberately broader than the CLI's own isLegacyNormalizedModules, which only
// recognises the map-of-modules shape and returns false for ANY array. Two of
// our cached files are arrays of raw modules ({address, name, structs,
// exposedFunctions}) — a third, older shape the CLI neither detects nor rejects,
// so codegen crashes on a missing `.module` instead. normalizedModulesToAbi
// handles both inputs, so we test for the target shape and convert everything
// else.
function isCurrent(parsed) {
  return (
    Array.isArray(parsed) &&
    parsed.length > 0 &&
    parsed.every(
      (e) => e && typeof e === "object" && "address" in e && "module" in e,
    )
  );
}

if (!fs.existsSync(ABI_DIR)) {
  console.log(`[convert-sui-abis] no ${ABI_DIR}, nothing to do.`);
  process.exit(0);
}

const normalizedModulesToAbi = liftTransform(fs.readFileSync(findCliBundle(process.cwd()), "utf8"));

let converted = 0;
let current = 0;
for (const entry of fs.readdirSync(ABI_DIR, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
  const file = path.join(ABI_DIR, entry.name);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  if (isCurrent(parsed)) { current++; continue; }
  const abi = normalizedModulesToAbi(parsed);
  if (!Array.isArray(abi) || abi.length === 0) {
    throw new Error(`${entry.name}: transform produced no modules, refusing to overwrite`);
  }
  fs.writeFileSync(file, JSON.stringify(abi, null, 2) + "\n");
  console.log(`[convert-sui-abis] ${entry.name}: ${abi.length} module(s) -> array format`);
  converted++;
}
console.log(`[convert-sui-abis] converted ${converted}, already current ${current}`);
