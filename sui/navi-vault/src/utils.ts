import { CoinMap } from "./interfaces.js";

// ---------------------------------------------------------------------------
// Scaling constants
// ---------------------------------------------------------------------------
// Fee rates / penalties are WAD-scaled (1e18) on-chain. Reward rate is RAY (1e27).
export const WAD = 1e18;
export const RAY = 1e27;
export const DEFAULT_COIN_DECIMAL = 9;

// ---------------------------------------------------------------------------
// Coin metadata (underlying assets + reward coins). Keyed lookups stay O(1).
// ---------------------------------------------------------------------------
type CoinDefinition = {
  symbol: string;
  decimals: number;
  coinType: string;
};

const COIN_DEFINITIONS: CoinDefinition[] = [
  { symbol: "SUI", decimals: 9, coinType: "0x2::sui::SUI" },
  // native USDC (vault underlying for the USDC vault)
  { symbol: "USDC", decimals: 6, coinType: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC" },
  // vSUI / CERT — the CERT reward coin harvested from Navi incentives
  { symbol: "vSUI", decimals: 9, coinType: "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT" },
  // NAVX — common reward coin
  { symbol: "NAVX", decimals: 9, coinType: "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX" },
];

export const COIN_MAP: CoinMap = Object.fromEntries(
  COIN_DEFINITIONS.map(({ coinType, symbol }) => [coinType, symbol] as const)
);

const COIN_BY_TYPE = new Map<string, CoinDefinition>();
for (const def of COIN_DEFINITIONS) {
  COIN_BY_TYPE.set(normalizeCoinType(def.coinType), def);
}

const UNKNOWN_COIN = "unknown";

function normalizeAddress(address: string): string {
  let addr = address.trim();
  if (!addr.startsWith("0x")) {
    addr = `0x${addr}`;
  }
  let body = addr.slice(2).replace(/^0+/, "");
  if (body === "") {
    body = "0";
  }
  return `0x${body.toLowerCase()}`;
}

// Normalize an address (vault id, pool id, cap id, ...) to canonical short form
// (lowercase, no leading zeros). Used as the join key for both event values and
// config so that 0x000..02 and 0x2 compare equal.
export function normalizeId(address: string): string {
  if (!address) return "";
  return normalizeAddress(address);
}

// Normalize a coin type. Reward coin types arrive as ascii::String type names
// WITHOUT a leading 0x (e.g. "549e...::cert::CERT"); this canonicalizes them.
export function normalizeCoinType(coinType: string): string {
  if (!coinType) return "";
  let type = coinType.trim();
  if (type === "" || type === UNKNOWN_COIN) return type;
  if (!type.startsWith("0x")) type = `0x${type}`;

  const sep = type.indexOf("::");
  if (sep === -1) return normalizeAddress(type);

  const addressPart = type.slice(0, sep);
  const rest = type.slice(sep + 2);
  return `${normalizeAddress(addressPart)}::${rest}`;
}

// ---------------------------------------------------------------------------
// Vault registry: vault objectId -> underlying coin metadata.
// Mainnet vaults from the navi_vault deployment.
// ---------------------------------------------------------------------------
export interface VaultInfo {
  vaultId: string;
  symbol: string;
  coinType: string;
  decimals: number;
}

const VAULT_LIST: VaultInfo[] = [
  {
    vaultId: "0x864527a8ed2435aed828b46c6d9d0244506b418761cca25b7dd47a83c7797a29",
    symbol: "SUI",
    coinType: "0x2::sui::SUI",
    decimals: 9,
  },
  {
    vaultId: "0x54359eb5d0e4364bd26989899fdb472f5594d1885e1f0d816ef4a066cab2ae4c",
    symbol: "USDC",
    coinType: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    decimals: 6,
  },
];

const VAULT_BY_ID = new Map<string, VaultInfo>();
for (const v of VAULT_LIST) {
  VAULT_BY_ID.set(normalizeId(v.vaultId), v);
}

export function getVaultByAddress(vaultId: string): VaultInfo | undefined {
  return VAULT_BY_ID.get(normalizeId(vaultId));
}

// Coin symbol / decimals for an arbitrary coin type (reward coins, etc).
export function getCoinSymbolByType(coinType: string): string {
  const def = COIN_BY_TYPE.get(normalizeCoinType(coinType));
  return def ? def.symbol : UNKNOWN_COIN;
}

export function getDecimalByCoinType(coinType: string): number {
  const def = COIN_BY_TYPE.get(normalizeCoinType(coinType));
  return def ? def.decimals : DEFAULT_COIN_DECIMAL;
}

// ---------------------------------------------------------------------------
// Numeric scaling helpers
// ---------------------------------------------------------------------------
// Scale a raw integer amount down by its token decimals.
export function scaleAmount(raw: bigint | string | number, decimals: number): number {
  return Number(raw) / 10 ** decimals;
}

// Scale a WAD-scaled (1e18) rate down to a plain fraction (e.g. 0.05 for 5%).
export function scaleWad(raw: bigint | string | number): number {
  return Number(raw) / WAD;
}
