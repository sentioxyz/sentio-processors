// Periodic on-chain snapshot of every Vault object.
//
// Why this exists alongside the event handlers in main.ts: the vault's *state*
// (assets, shares, per-market balance, paused, cap) is not fully derivable from
// events. Interest accrues inside the Navi markets with no event of its own, so
// TVL and share price computed as sum(Deposit) - sum(Withdraw) drift further from
// reality every day. Likewise an event-driven Gauge for a config value only gets a
// data point when an admin changes it — vault_cap had no points at all for weeks.
//
// A snapshot every 10 minutes gives a continuous time series for all of it.

import { SuiObjectProcessor, SuiObjectContext } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { Gauge } from "@sentio/sdk";
import { getAllVaults, getMarketName, VaultInfo } from "./config.js";
import { scaleAmount, scaleWad, VIRTUAL_SHARES } from "./utils.js";

// Snapshot cadence, in seconds. 10 min ≈ 144 points/vault/day.
const SNAPSHOT_INTERVAL_MIN = 10;
const SNAPSHOT_BACKFILL_INTERVAL_MIN = 180;

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
// Live TVL: idle_balance + sum of every market's current_balance, matching the
// contract's get_total_assets(). Denominated in the underlying, not USD.
const tvl = Gauge.register("vault_tvl");
const totalShares = Gauge.register("vault_total_shares");
// (total_assets + VIRTUAL_SHARES) / (total_shares + VIRTUAL_SHARES) — the exact
// ratio the contract mints and burns at. Starts at 1.0 and only grows with yield,
// so its slope IS the vault's realised APY and a drop is a real loss.
const sharePrice = Gauge.register("vault_share_price");
const idleBalance = Gauge.register("vault_idle_balance");
const marketBalanceSnapshot = Gauge.register("vault_market_balance_snapshot");
const marketLoss = Gauge.register("vault_market_loss");
// Fraction of vault_cap consumed, 0..1. Unset cap (0 = unlimited) reports 0.
const capUtilization = Gauge.register("vault_cap_utilization");
const capSnapshot = Gauge.register("vault_cap_snapshot");
// 1 = paused. Alert on max() > 0.
const pausedGauge = Gauge.register("vault_paused");
const pendingFeeShares = Gauge.register("vault_pending_fee_shares");
const feeRate = Gauge.register("vault_fee_rate");
// Seconds since the market was last synced from Navi. A market that stops being
// synced has a stale current_balance, which silently biases TVL and share price.
const marketSyncAge = Gauge.register("vault_market_sync_age_seconds");
const vaultVersion = Gauge.register("vault_version");

// ---------------------------------------------------------------------------
// Field access
// ---------------------------------------------------------------------------
// The snapshot arrives as the fullnode's parsed-JSON object shape, where every
// u64/u128/u256 is a decimal STRING and nested Move values are wrapped in
// { type, fields }. VecMap<address, MarketInfo> lands as
//   { fields: { contents: [ { fields: { key, value: { fields: {...} } } } ] } }
// and an enum as { variant: "Active" }. Sentio's decoder has varied on whether the
// `fields` wrapper is present, so unwrap defensively rather than index blindly —
// a shape mismatch here would silently report 0 TVL instead of failing.
type AnyFields = Record<string, any>;

// The Move struct's own fields, from whatever the SDK hands the handler.
//
// sdk 4.x passes the whole object envelope — objectId, version, digest, content,
// owner, type, previousTransaction, objectBcs, json, display — with the struct
// under `content.fields`. sdk 2.x passed the parsed struct directly, which is why
// sui/volo-vault reads `self.fields`. Accept both rather than pinning to one.
function objectFields(self: any): AnyFields {
  return (
    self?.content?.fields ?? self?.json ?? self?.fields ?? self ?? {}
  );
}

function unwrap(value: any): any {
  if (value && typeof value === "object" && "fields" in value && !("contents" in value)) {
    return value.fields;
  }
  return value;
}

function num(value: any): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

interface MarketSnapshot {
  poolId: string;
  currentBalance: number;
  cap: number;
  penalty: number;
  loss: number;
  lastSyncAtMs: number;
  status: string;
  statusRaw: string;
}

// MarketStatus is a Move enum (Active | Disabled). How it arrives depends on the
// decoder: the fullnode's JSON gives { type, variant: "Active", fields: {} },
// but sdk 4.x has been observed handing back other encodings. Reading only
// `.variant` left every market labelled "unknown" while the numbers were fine,
// so accept the shapes an enum can plausibly take and surface anything else raw
// rather than flattening it to "unknown".
function readStatus(raw: any): string {
  if (raw === null || raw === undefined) return "unknown";
  if (typeof raw === "string") return raw.split("::").pop() || "unknown";
  if (typeof raw === "number") return raw === 0 ? "Active" : raw === 1 ? "Disabled" : String(raw);
  if (typeof raw === "object") {
    // sdk 4.x encodes it as { "@variant": "Active" }; the fullnode uses
    // { type, variant: "Active", fields: {} }.
    const named = raw["@variant"] ?? raw.variant ?? raw.$kind ?? raw.name;
    if (typeof named === "string") return named.split("::").pop() || "unknown";

    // Enum-as-single-key object: { Active: {} }. Only the key can be the variant
    // name here, so ignore structural keys and anything sigil-prefixed — taking
    // the key blindly is what turned "@variant" itself into the label.
    const keys = Object.keys(raw).filter(
      (k) => k !== "type" && k !== "fields" && !k.startsWith("@") && !k.startsWith("$"),
    );
    if (keys.length === 1) return keys[0];

    if (raw.fields && typeof raw.fields === "object") return readStatus(raw.fields);
  }
  return "unknown";
}

function readMarkets(marketsField: any): MarketSnapshot[] {
  const inner = unwrap(marketsField);
  const contents = inner?.contents ?? inner ?? [];
  if (!Array.isArray(contents)) return [];

  return contents.map((entry: any) => {
    const e: AnyFields = unwrap(entry) ?? {};
    const v: AnyFields = unwrap(e.value) ?? {};
    const status = readStatus(v.status);
    return {
      poolId: String(e.key ?? ""),
      currentBalance: num(v.current_balance),
      cap: num(v.cap),
      penalty: num(v.penalty),
      loss: num(v.loss),
      lastSyncAtMs: num(v.last_sync_at),
      status,
      // Kept so a still-unrecognised encoding is visible in the snapshot log
      // instead of silently collapsing to "unknown" again.
      statusRaw: status === "unknown" ? JSON.stringify(v.status ?? null).slice(0, 120) : "",
    };
  });
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------
export function VaultStateProcessor() {
  const vaults = getAllVaults();
  if (vaults.length === 0) {
    throw new Error("no vaults configured — refusing to start with no snapshots");
  }

  for (const vault of vaults) {
    // Don't bind before the object exists — there is nothing to read there, and
    // the snapshots would be wasted work over the 45 days between the first two
    // vaults and the Prime pair. (An earlier comment here blamed this for a
    // startup hang; that was wrong. The hang was a slow first-time cold start on
    // Sentio's side, unrelated to these bindings.)
    // Skipping is still the safe direction for an unknown vault: it loses that
    // vault's snapshots, everything else runs, and the gap is logged.
    const start = vault.snapshotStartCheckpoint;
    if (start === undefined) {
      console.error(
        `[navi-vault] ${vault.key} (${vault.vaultId}) has no creation checkpoint in ` +
          `VAULT_CREATED_AT_CHECKPOINT — skipping its snapshot processor. Add it to ` +
          `src/config.ts to restore TVL / share price for this vault.`,
      );
      continue;
    }

    SuiObjectProcessor.bind({
      objectId: vault.vaultId,
      network: ChainId.SUI_MAINNET,
      startCheckpoint: start,
    }).onTimeInterval(
      async (self, _dynamicFields, ctx) => {
        await snapshotVault(vault, self, ctx);
      },
      SNAPSHOT_INTERVAL_MIN,
      SNAPSHOT_BACKFILL_INTERVAL_MIN,
      undefined,
      { owned: false },
    );
  }
}

async function snapshotVault(vault: VaultInfo, self: any, ctx: SuiObjectContext) {
  const fields: AnyFields = objectFields(self);
  const dec = vault.decimals;
  const tags = { vault_key: vault.key, vault_symbol: vault.symbol };

  // A Vault always has total_shares; its absence means the shape assumption broke.
  // Emitting zeroed metrics would look like a drained vault, so bail loudly instead.
  if (fields.total_shares === undefined) {
    ctx.eventLogger.emit("VaultSnapshotError", {
      ...tags,
      vault: vault.vaultId,
      reason: "unexpected object shape: total_shares missing",
      keys: Object.keys(fields).join(","),
      envelope_keys: self && typeof self === "object" ? Object.keys(self).join(",") : typeof self,
      timestamp: ctx.timestamp,
    });
    return;
  }

  const markets = readMarkets(fields.markets);

  const idleRaw = num(unwrap(fields.idle_balance)?.value ?? fields.idle_balance);
  const marketTotalRaw = markets.reduce((sum, m) => sum + m.currentBalance, 0);
  // Mirrors navi_vault::get_total_assets(). The struct's cached `total_assets` is
  // only refreshed on accrue_interest/deposit/withdraw, so it lags between txs.
  const totalAssetsRaw = idleRaw + marketTotalRaw;
  const cachedTotalAssetsRaw = num(fields.total_assets);
  const totalSharesRaw = num(fields.total_shares);
  const vaultCapRaw = num(fields.vault_cap);

  const totalAssets = scaleAmount(totalAssetsRaw, dec);
  const shares = scaleAmount(totalSharesRaw, dec);
  const idle = scaleAmount(idleRaw, dec);
  const cap = scaleAmount(vaultCapRaw, dec);

  // VIRTUAL_SHARES offsets cancel in the ratio, so no decimal scaling is needed —
  // this is assets-per-share in the underlying, ~1.0 at genesis.
  const price =
    (totalAssetsRaw + VIRTUAL_SHARES) / (totalSharesRaw + VIRTUAL_SHARES);

  const paused = fields.paused === true;
  // vault_cap == 0 means unlimited (navi_vault deposit check), not "full".
  const utilization =
    vaultCapRaw > 0 ? totalAssetsRaw / vaultCapRaw : 0;

  tvl.record(ctx, totalAssets, tags);
  totalShares.record(ctx, shares, tags);
  sharePrice.record(ctx, price, tags);
  idleBalance.record(ctx, idle, tags);
  capSnapshot.record(ctx, cap, tags);
  capUtilization.record(ctx, utilization, tags);
  pausedGauge.record(ctx, paused ? 1 : 0, tags);
  vaultVersion.record(ctx, num(fields.version), tags);

  feeRate.record(ctx, scaleWad(num(fields.management_fee)), {
    ...tags,
    fee_type: "management",
  });
  feeRate.record(ctx, scaleWad(num(fields._performance_fee)), {
    ...tags,
    fee_type: "performance",
  });
  pendingFeeShares.record(
    ctx,
    scaleAmount(num(fields.pending_management_fee_shares), dec),
    { ...tags, fee_type: "management" },
  );
  pendingFeeShares.record(
    ctx,
    scaleAmount(num(fields.pending_performance_fee_shares), dec),
    { ...tags, fee_type: "performance" },
  );

  // ctx.timestamp is a Date; last_sync_at is Move ms since epoch.
  const nowMs = ctx.timestamp.getTime();

  for (const m of markets) {
    const marketTags = {
      ...tags,
      market_name: getMarketName(vault.vaultId, m.poolId),
      status: m.status,
    };
    if (m.statusRaw) {
      ctx.eventLogger.emit("MarketStatusUnrecognised", {
        ...tags,
        market_name: marketTags.market_name,
        raw: m.statusRaw,
        timestamp: ctx.timestamp,
      });
    }
    marketBalanceSnapshot.record(ctx, scaleAmount(m.currentBalance, dec), marketTags);
    marketLoss.record(ctx, scaleAmount(m.loss, dec), marketTags);
    marketSyncAge.record(
      ctx,
      m.lastSyncAtMs > 0 ? Math.max(0, (nowMs - m.lastSyncAtMs) / 1000) : -1,
      marketTags,
    );
  }

  ctx.eventLogger.emit("VaultSnapshot", {
    ...tags,
    vault: vault.vaultId,
    coin_type: vault.coinType,
    decimals: dec,
    total_assets: totalAssets,
    total_assets_raw: String(totalAssetsRaw),
    // The struct's cached figure, kept for comparison: a persistent gap against
    // total_assets means markets are not being synced.
    cached_total_assets: scaleAmount(cachedTotalAssetsRaw, dec),
    total_shares: shares,
    total_shares_raw: String(totalSharesRaw),
    share_price: price,
    idle_balance: idle,
    market_total: scaleAmount(marketTotalRaw, dec),
    vault_cap: cap,
    cap_utilization: utilization,
    paused,
    version: num(fields.version),
    market_count: markets.length,
    default_market: getMarketName(vault.vaultId, String(fields.default_market ?? "")),
    management_fee_rate: scaleWad(num(fields.management_fee)),
    performance_fee_rate: scaleWad(num(fields._performance_fee)),
    last_update_timestamp: num(fields.last_update_timestamp),
    timestamp: ctx.timestamp,
  });
}
