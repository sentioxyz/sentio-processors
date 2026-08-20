// Pure helpers: address / coin-type normalization and numeric scaling.
// The vault + market registry lives in config.ts (loaded from vaults.mainnet.json).

// ---------------------------------------------------------------------------
// Scaling constants
// ---------------------------------------------------------------------------
// Fee rates / penalties are WAD-scaled (1e18) on-chain. Reward rate is RAY (1e27).
export const WAD = 1e18;
export const RAY = 1e27;
export const DEFAULT_COIN_DECIMAL = 9;

// Inflation-attack offset baked into the share math (navi_vault::VIRTUAL_SHARES).
// share_price = (total_assets + VIRTUAL_SHARES) / (total_shares + VIRTUAL_SHARES),
// both in native units, so the offset cancels out of the ratio's units.
export const VIRTUAL_SHARES = 1_000_000;

export const UNKNOWN_COIN = "unknown";

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------
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
// Numeric scaling helpers
// ---------------------------------------------------------------------------
// Scale a raw integer amount down by its token decimals.
//
// Deliberately not `Number(raw) / 10 ** decimals`: Number() rounds any integer
// above 2^53 before the division happens. Splitting the digit string instead
// keeps the integer exact and only converts the final decimal.
//
// This is defensive, not a fix for a live bug. Measured against the naive form,
// the two agree across every value these vaults can currently hold — the largest
// possible raw amount is the SUI_PRIME cap, 5e15, and dividing by 1e9 lands in a
// range where double precision absorbs the rounding. They diverge only ~100x
// beyond that, or for tokens with very few decimals (a 2-decimal token diverges
// at 9e13). Keeping the exact path means neither case has to be thought about.
export function scaleAmount(raw: bigint | string | number, decimals: number): number {
  if (decimals <= 0) return Number(raw);

  const s = typeof raw === "bigint" ? raw.toString() : String(raw);
  const negative = s.startsWith("-");
  const digits = negative ? s.slice(1) : s;

  // Anything that is not a plain integer (already-scaled floats, exponent
  // notation) has no precision to preserve — fall back to plain division.
  if (!/^\d+$/.test(digits)) return Number(raw) / 10 ** decimals;

  const padded = digits.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  return Number(`${negative ? "-" : ""}${whole}${frac ? `.${frac}` : ""}`);
}

// Scale a WAD-scaled (1e18) rate down to a plain fraction (e.g. 0.05 for 5%).
export function scaleWad(raw: bigint | string | number): number {
  return Number(raw) / WAD;
}

// Scale a RAY-scaled (1e27) rate down to a plain fraction.
export function scaleRay(raw: bigint | string | number): number {
  return Number(raw) / RAY;
}
