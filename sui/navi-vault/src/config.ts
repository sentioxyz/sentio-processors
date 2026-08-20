// Vault / market registry, derived from vaults.mainnet.json.
//
// That file is generated on-chain by navi_chain_tool/navi_vault_setup/dump_vaults.ts.
// To pick up a new vault or market: re-run the dump and copy the file over
// src/config/vaults.mainnet.json — do NOT hand-edit either file. Hand-maintaining
// a second copy of these ids is what let the registry drift to 2 vaults while the
// chain had 4.
//
// Only the STATIC identity fields are read here (vault id, coin type, decimals,
// pool id -> market name). Everything the admin/curator can change at runtime
// (paused, vault_cap, penalty, deposit cap, fee rates) is deliberately ignored —
// those come from events and from the on-chain snapshot in state-processor.ts.

import VAULTS_JSON from "./config/vaults.mainnet.json" with { type: "json" };
import {
  normalizeId,
  normalizeCoinType,
  DEFAULT_COIN_DECIMAL,
  UNKNOWN_COIN,
} from "./utils.js";

// ---------------------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------------------
// The registry is a copy of an externally generated file, so a truncated or
// half-copied version is a real failure mode. Everything below reads it at
// module load; without this check a bad copy surfaces as a confusing startup
// failure instead of a named one.
function assertConfig(): void {
  const where = "src/config/vaults.mainnet.json";
  if (!VAULTS_JSON || typeof VAULTS_JSON !== "object") {
    throw new Error(`${where} is empty or not an object`);
  }
  if (!VAULTS_JSON.package?.typeIdentity) {
    throw new Error(`${where} is missing package.typeIdentity`);
  }
  if (!Array.isArray(VAULTS_JSON.vaults) || VAULTS_JSON.vaults.length === 0) {
    throw new Error(`${where} has no vaults`);
  }
  for (const v of VAULTS_JSON.vaults) {
    if (!v.key || !v.vault || !v.coinType || typeof v.decimals !== "number") {
      throw new Error(`${where}: vault entry ${JSON.stringify(v?.key)} is incomplete`);
    }
  }
}

assertConfig();

// ---------------------------------------------------------------------------
// Package identity
// ---------------------------------------------------------------------------
// Sui keeps object/event TYPE identity at the ORIGINAL package id across upgrades,
// so the processor binds here and never needs to change on an upgrade. The
// upgraded `callTarget` is only for sending transactions — binding to it would
// match zero events.
export const NAVI_VAULT_PACKAGE = normalizeId(VAULTS_JSON.package.typeIdentity);

// navi_vault was published at checkpoint 289808972 (2026-06-21). Start a little
// before to be safe. This is the EVENT start: events carry the package's type
// identity from publication onward, so one range covers every vault.
export const START_CHECKPOINT = 289800000n;

// Object snapshots are per-object, and an object cannot be read before it is
// created. The two Prime vaults were created 45 days after the first two, so a
// single shared start range wastes 45 days of snapshots on objects that do not
// exist yet — right for events, wrong here.
//
// Checkpoint of the CreateVaultEvent transaction for each vault:
//   SUI, USDC              289812804  (2026-06-22, tx 9qHXKPNU…)
//   SUI_PRIME, USDC_PRIME  306919703  (2026-08-05, tx 6JKajTQP…)
//
// To find it for a new vault:
//   suix_queryEvents on <typeIdentity>::events::CreateVaultEvent, then
//   sui_getTransactionBlock on the returned digest and read `checkpoint`.
//
// A vault missing from this map gets no snapshot processor (see
// state-processor.ts) rather than a guessed range — losing one vault's snapshots
// is recoverable and visible in the log; a guessed range is neither.
const VAULT_CREATED_AT_CHECKPOINT: Record<string, bigint> = {
  SUI: 289812804n,
  USDC: 289812804n,
  SUI_PRIME: 306919703n,
  USDC_PRIME: 306919703n,
};

// ---------------------------------------------------------------------------
// Coin metadata
// ---------------------------------------------------------------------------
type CoinDefinition = {
  symbol: string;
  decimals: number;
  coinType: string;
};

// Reward coins and other types that never appear as a vault underlying, so the
// JSON dump carries no decimals for them.
const EXTRA_COINS: CoinDefinition[] = [
  { symbol: "SUI", decimals: 9, coinType: "0x2::sui::SUI" },
  {
    symbol: "vSUI",
    decimals: 9,
    coinType: "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
  },
  {
    symbol: "NAVX",
    decimals: 9,
    coinType: "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
  },
];

const COIN_BY_TYPE = new Map<string, CoinDefinition>();
for (const def of EXTRA_COINS) {
  COIN_BY_TYPE.set(normalizeCoinType(def.coinType), def);
}

// Vault underlyings come from the dump, which is authoritative for decimals.
// `key` may be suffixed (SUI_PRIME); the asset symbol is the un-suffixed prefix.
function symbolFromVaultKey(key: string): string {
  return key.split("_")[0];
}

// ---------------------------------------------------------------------------
// Market registry
// ---------------------------------------------------------------------------
export interface MarketInfo {
  name: string;
  poolId: string;
  storageId: string;
  assetId: number;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Vault registry
// ---------------------------------------------------------------------------
export interface VaultInfo {
  // Stable label for metrics. Unique per vault — unlike `symbol`, which collides
  // (SUI and SUI_PRIME are both 0x2::sui::SUI).
  key: string;
  displayName: string;
  vaultId: string;
  timelocksId: string;
  symbol: string;
  coinType: string;
  decimals: number;
  markets: MarketInfo[];
  marketByPool: Map<string, MarketInfo>;
  // Checkpoint the vault object was created at, or undefined when unknown.
  // Snapshot bindings must not start before this.
  snapshotStartCheckpoint?: bigint;
}

const VAULT_LIST: VaultInfo[] = VAULTS_JSON.vaults.map((v) => {
  const markets: MarketInfo[] = v.markets.map((m) => ({
    name: m.name,
    poolId: normalizeId(m.pool),
    storageId: normalizeId(m.storage),
    assetId: m.assetId,
    isDefault: m.isDefault,
  }));

  const coinType = normalizeCoinType(v.coinType);
  const symbol = symbolFromVaultKey(v.key);

  // The dump's decimals are authoritative — register the underlying if unseen.
  if (!COIN_BY_TYPE.has(coinType)) {
    COIN_BY_TYPE.set(coinType, { symbol, decimals: v.decimals, coinType });
  }

  return {
    key: v.key,
    displayName: v.displayName,
    vaultId: normalizeId(v.vault),
    timelocksId: normalizeId(v.timelocks),
    symbol,
    coinType,
    decimals: v.decimals,
    markets,
    marketByPool: new Map(markets.map((m) => [m.poolId, m])),
    snapshotStartCheckpoint: VAULT_CREATED_AT_CHECKPOINT[v.key],
  };
});

const VAULT_BY_ID = new Map<string, VaultInfo>();
for (const v of VAULT_LIST) {
  VAULT_BY_ID.set(v.vaultId, v);
}

// Fallback pool -> market name across all vaults. The same Navi pool is shared by
// several vaults (vsui-sui by SUI and SUI_PRIME, sui-usdc by USDC and USDC_PRIME)
// and always carries the same name, so a global map is safe for the case where an
// event gives a pool but no resolvable vault.
const MARKET_NAME_BY_POOL = new Map<string, string>();
for (const v of VAULT_LIST) {
  for (const m of v.markets) {
    MARKET_NAME_BY_POOL.set(m.poolId, m.name);
  }
}

export function getAllVaults(): VaultInfo[] {
  return VAULT_LIST;
}

export function getVaultByAddress(vaultId: string): VaultInfo | undefined {
  return VAULT_BY_ID.get(normalizeId(vaultId));
}

// Human-readable market name for a pool. Prefers the vault-scoped lookup so a pool
// that is somehow named differently per vault still resolves correctly.
export function getMarketName(vaultId: string, poolId: string): string {
  const pool = normalizeId(poolId);
  if (!pool || pool === "0x0") return "none";
  const vault = getVaultByAddress(vaultId);
  const scoped = vault?.marketByPool.get(pool);
  if (scoped) return scoped.name;
  return MARKET_NAME_BY_POOL.get(pool) ?? "unknown";
}

// ---------------------------------------------------------------------------
// Coin lookups (reward coins, underlyings)
// ---------------------------------------------------------------------------
export function getCoinSymbolByType(coinType: string): string {
  const def = COIN_BY_TYPE.get(normalizeCoinType(coinType));
  return def ? def.symbol : UNKNOWN_COIN;
}

export function getDecimalByCoinType(coinType: string): number {
  const def = COIN_BY_TYPE.get(normalizeCoinType(coinType));
  return def ? def.decimals : DEFAULT_COIN_DECIMAL;
}
