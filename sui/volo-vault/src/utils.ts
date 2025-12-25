import { CoinMap } from "./interfaces.js";

// Consolidated coin metadata; derived maps below keep lookups O(1).
type CoinDefinition = {
  id: number;
  symbol: string;
  decimals: number;
  coinType: string;
};

const COIN_DEFINITIONS: CoinDefinition[] = [
  {
    id: 0,
    symbol: "SUI",
    decimals: 9,
    coinType: "0x2::sui::SUI",
  },
  {
    id: 1,
    symbol: "wUSDC",
    decimals: 6,
    coinType:
      "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
  },
  {
    id: 2,
    symbol: "wUSDT",
    decimals: 6,
    coinType:
      "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
  },
  {
    id: 3,
    symbol: "wETH",
    decimals: 8,
    coinType:
      "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
  },
  {
    id: 4,
    symbol: "CETUS",
    decimals: 9,
    coinType:
      "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
  },
  {
    id: 5,
    symbol: "vSui",
    decimals: 9,
    coinType:
      "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
  },
  {
    id: 6,
    symbol: "haSui",
    decimals: 9,
    coinType:
      "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
  },
  {
    id: 7,
    symbol: "NAVX",
    decimals: 9,
    coinType:
      "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
  },
  {
    id: 8,
    symbol: "wBTC",
    decimals: 8,
    coinType:
      "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN",
  },
  {
    id: 9,
    symbol: "AUSD",
    decimals: 6,
    coinType:
      "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD",
  },
  {
    id: 10,
    symbol: "nUSDC",
    decimals: 6,
    coinType:
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  },
  {
    id: 11,
    symbol: "nbETH",
    decimals: 8,
    coinType:
      "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH",
  },
  {
    id: 12,
    symbol: "USDY",
    decimals: 6,
    coinType:
      "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY",
  },
  {
    id: 13,
    symbol: "NS",
    decimals: 6,
    coinType:
      "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS",
  },
  {
    id: 14,
    symbol: "stBTC",
    decimals: 8,
    coinType:
      "0x5f496ed5d9d045c5b788dc1bb85f54100f2ede11e46f6a232c29daada4c5bdb6::coin::COIN",
  },
  {
    id: 15,
    symbol: "DEEP",
    decimals: 6,
    coinType:
      "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
  },
  {
    id: 16,
    symbol: "FDUSD",
    decimals: 6,
    coinType:
      "0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD",
  },
  {
    id: 17,
    symbol: "BLUE",
    decimals: 9,
    coinType:
      "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
  },
  {
    id: 18,
    symbol: "BUCK",
    decimals: 9,
    coinType:
      "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
  },
  {
    id: 19,
    symbol: "nUSDT",
    decimals: 6,
    coinType:
      "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT",
  },
  {
    id: 20,
    symbol: "stSUI",
    decimals: 9,
    coinType:
      "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI",
  },
  {
    id: 21,
    symbol: "suiBTC",
    decimals: 8,
    coinType:
      "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC",
  },
  {
    id: 22,
    symbol: "SOL",
    decimals: 8,
    coinType:
      "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN",
  },
  {
    id: 23,
    symbol: "LBTC",
    decimals: 8,
    coinType:
      "0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC",
  },
  {
    id: 24,
    symbol: "WAL",
    decimals: 9,
    coinType:
      "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
  },
  {
    id: 25,
    symbol: "HAEDAL",
    decimals: 9,
    coinType:
      "0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL",
  },
  {
    id: 26,
    symbol: "XBTC",
    decimals: 8,
    coinType:
      "0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC",
  },
  {
    id: 27,
    symbol: "IKA",
    decimals: 9,
    coinType:
      "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA",
  },
];

const COIN_BY_SYMBOL = new Map<string, CoinDefinition>();
const COIN_BY_TYPE = new Map<string, CoinDefinition>();
const COIN_BY_ID = new Map<number, CoinDefinition>();

for (const definition of COIN_DEFINITIONS) {
  COIN_BY_SYMBOL.set(definition.symbol, definition);
  COIN_BY_TYPE.set(definition.coinType, definition);
  COIN_BY_ID.set(definition.id, definition);
}

export const COIN = COIN_DEFINITIONS.map(({ symbol }) => symbol);

export const DECIMAL_MAP = Object.fromEntries(
  COIN_DEFINITIONS.map(({ id, decimals }) => [id, decimals] as const)
) as Record<number, number>;

export const SYMBOL_MAP = Object.fromEntries(
  COIN_DEFINITIONS.map(({ id, symbol }) => [id, symbol] as const)
) as Record<number, string>;

export const COIN_MAP = Object.fromEntries(
  COIN_DEFINITIONS.map(({ coinType, symbol }) => [coinType, symbol] as const)
) as CoinMap;

export const DECIMAL_RAY = 27;
export const DEFAULT_COIN_DECIMAL = 9;

export function getDecimalBySymbol(coinSymbol: string): number | undefined {
  return COIN_BY_SYMBOL.get(coinSymbol)?.decimals;
}

export function getIdBySymbol(coinSymbol: string): number | undefined {
  return COIN_BY_SYMBOL.get(coinSymbol)?.id;
}

// Vault Configuration - Main vault addresses for different BTC strategies
export const VAULT_ADDRESSES = {
  // Production Vault Package Address (discovered from metrics)
  VAULT_PACKAGE_PROD:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa",

  // XBTC Vault - Production vault
  xBTC_VAULT:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::Vault<0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC>",

  // suiBTC Vault - Production vault
  // Note: Despite the "BTC" in the type name, this is actually suiBTC token
  wBTC_VAULT:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::Vault<0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC>",

  // nUSDC Vault - Production vault
  "Stable_MMT#1_VAULT":
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::Vault<0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>",

  "Stable_MMT#2_VAULT":
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::Vault<0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>",
} as const;

// Helper functions for vault address parsing (moved here for early use)
export function parseVaultType(vaultTypeString: string): {
  packageAddress: string;
  moduleName: string;
  structName: string;
  coinType: string;
} | null {
  // Parse format: packageAddress::module::Struct<coinType>
  const regex = /^(0x[a-f0-9]+)::([^:]+)::([^<]+)<(.+)>$/;
  const match = vaultTypeString.match(regex);

  if (!match) return null;

  return {
    packageAddress: match[1],
    moduleName: match[2],
    structName: match[3],
    coinType: match[4],
  };
}

// Extract coin symbol from vault type
export function getCoinSymbolFromVaultType(vaultTypeString: string): string {
  const parsed = parseVaultType(vaultTypeString);
  if (!parsed) return "UNKNOWN";

  // Use COIN_MAP to get the correct symbol name
  const coinSymbol = COIN_MAP[parsed.coinType];
  if (coinSymbol) {
    return coinSymbol; // Return "suiBTC" or "XBTC" from COIN_MAP
  }

  // Fallback: Extract coin symbol from coin type (e.g., "xbtc" from "...::xbtc::XBTC")
  const coinTypeMatch = parsed.coinType.match(/::([^:]+)::([^>]+)$/);
  if (coinTypeMatch) {
    return coinTypeMatch[2]; // Return "XBTC" or "BTC"
  }

  return "UNKNOWN";
}

const VAULT_ID_TO_TYPE: Record<string, keyof typeof VAULT_ADDRESSES> = {
  "0x6e53ffe5b77a85ff609b0813955866ec98a072e4aaf628108e717143ec907bd8":
    "wBTC_VAULT",
  "0x041b49dc6625e074f452b9bc60a9a828aebfbef29bcba119ad90a4b11ba405bf":
    "xBTC_VAULT",
  "0xa97cc9a63710f905deb2da40d6548ce7a75ee3dfe4be0c1d553553d2059c31a3":
    "Stable_MMT#1_VAULT",
  "0x27936e146ec8c695d14a3b900d21a495d2396c0a99e3c6766f86d15fe91d3897":
    "Stable_MMT#2_VAULT",
};

// Export for external use
export { VAULT_ID_TO_TYPE };

// Helper to get coin symbol from vault type
function getCoinSymbolFromVaultTypeKey(
  vaultType: keyof typeof VAULT_ADDRESSES
): string {
  const vaultTypeString = VAULT_ADDRESSES[vaultType];
  if (typeof vaultTypeString !== "string" || !vaultTypeString.includes("::")) {
    return "UNKNOWN";
  }
  return getCoinSymbolFromVaultType(vaultTypeString);
}

// Build VAULT_ID_ENTRIES with auto-derived coin symbols
type VaultIdInfo = {
  vaultType: string;
  coinSymbol: string;
};

const VAULT_ID_ENTRIES: Array<[string, VaultIdInfo]> = Object.entries(
  VAULT_ID_TO_TYPE
).map(([vaultId, vaultType]) => [
  vaultId,
  {
    vaultType,
    coinSymbol: getCoinSymbolFromVaultTypeKey(vaultType),
  },
]);

export const VAULT_ID_MAPPING = Object.fromEntries(VAULT_ID_ENTRIES) as Record<
  string,
  VaultIdInfo
>;

const VAULT_INFO_BY_ID = new Map<string, VaultIdInfo>(VAULT_ID_ENTRIES);
const VAULT_INFO_BY_TYPE = new Map<string, VaultIdInfo>();
const VAULT_ID_BY_TYPE = new Map<string, string>();
const VAULT_ID_BY_COIN_SYMBOL = new Map<string, string>();

for (const [vaultId, info] of VAULT_ID_ENTRIES) {
  if (!VAULT_ID_BY_TYPE.has(info.vaultType)) {
    VAULT_ID_BY_TYPE.set(info.vaultType, vaultId);
  }
  if (!VAULT_ID_BY_COIN_SYMBOL.has(info.coinSymbol)) {
    VAULT_ID_BY_COIN_SYMBOL.set(info.coinSymbol, vaultId);
  }
  if (!VAULT_INFO_BY_TYPE.has(info.vaultType)) {
    VAULT_INFO_BY_TYPE.set(info.vaultType, info);
  }
}

type VaultStatusSenderInfo = VaultIdInfo & { vaultId: string };
// Populated at runtime when VaultStatusRecord events surface new senders.
const vaultStatusSenderMap = new Map<string, VaultStatusSenderInfo>();

// Helper: get vault info by vaultId
export function getVaultInfoById(vaultId: string): {
  vaultType: string;
  coinSymbol: string;
} | null {
  return VAULT_INFO_BY_ID.get(vaultId) || null;
}

export function getVaultInfoByType(vaultType: string): VaultIdInfo | null {
  return VAULT_INFO_BY_TYPE.get(vaultType) || null;
}

// Helper: get vault ID by vault type
export function getVaultIdByType(vaultType: string): string | null {
  return VAULT_ID_BY_TYPE.get(vaultType) || null;
}

// Helper: get vault ID by coin symbol
export function getVaultIdByCoinSymbol(coinSymbol: string): string | null {
  return VAULT_ID_BY_COIN_SYMBOL.get(coinSymbol) || null;
}

// PerformanceFeeRecord central address
// All vault PerformanceFeeRecords are stored as dynamic fields at this address
// The DynamicFieldPerformanceFeeRecordProcessor automatically scans all fields
export const PERFORMANCE_FEE_RECORD_ADDRESS =
  "0x2ae13659389ea8d146d9b6a576f073c4fdc75f5f95adbb16fe621ed6fbc7dc90";

// Navi Account Cap addresses for yield farming strategies
// These addresses are used to claim rewards from Navi protocol
export const NAVI_ACCOUNT_CAPS = {
  // SUIBTC Vault account capabilities for Navi protocol interaction
  wBTC_VAULT: {
    naviAccountCap0:
      "0x84e1b26743c563fe60eb44ae56c2dd4193d9ef931159e8dbfefe365093552298",
    naviAccountCap1:
      "0xa7c97f0f7d5163bbe37be83419f212eeab9d0f7f04a23bb407b6062958e514df",
  },

  // XBTC Vault account capabilities for Navi protocol interaction
  xBTC_VAULT: {
    naviAccountCap0:
      "0x2653a84c3dd88cbaf481fcf3b2581943332267fe87c2cebd34c194e8105a25bb",
    naviAccountCap1:
      "0x5914bedd733f33443cabde42f5e95aa63569a2350448afe46c8affaf0ddbf6b4",
  },
} as const;

const NAVI_ACCOUNT_CAP_ARRAY_BY_VAULT = new Map<
  keyof typeof NAVI_ACCOUNT_CAPS,
  string[]
>();

const NAVI_ACCOUNT_CAP_SET = new Set<string>();

const NAVI_ACCOUNT_CAP_TO_VAULT = new Map<
  string,
  keyof typeof NAVI_ACCOUNT_CAPS
>();

for (const [vaultType, caps] of Object.entries(NAVI_ACCOUNT_CAPS) as Array<
  [
    keyof typeof NAVI_ACCOUNT_CAPS,
    (typeof NAVI_ACCOUNT_CAPS)[keyof typeof NAVI_ACCOUNT_CAPS],
  ]
>) {
  const validCaps = Object.values(caps).filter(Boolean) as string[];
  NAVI_ACCOUNT_CAP_ARRAY_BY_VAULT.set(vaultType, validCaps);
  for (const cap of validCaps) {
    NAVI_ACCOUNT_CAP_SET.add(cap);
    NAVI_ACCOUNT_CAP_TO_VAULT.set(cap, vaultType);
  }
}

// Mapping from RewardsClaimed sender address to vault_type
// Auto-generated from NAVI_ACCOUNT_CAPS to avoid duplication
const REWARD_SENDER_ENTRIES: Array<[string, string]> = Object.entries(
  NAVI_ACCOUNT_CAPS
).flatMap(([vaultType, caps]) =>
  Object.values(caps)
    .filter(Boolean)
    .map((address) => [address, vaultType] as [string, string])
);

export const REWARDS_SENDER_TO_VAULT_MAPPING = Object.fromEntries(
  REWARD_SENDER_ENTRIES
) as Record<string, string>;

const REWARDS_SENDER_TO_VAULT_MAP = new Map<string, string>(
  REWARD_SENDER_ENTRIES.map(([address, vaultType]) => [
    address.toLowerCase(),
    vaultType,
  ])
);

// Helper: get vault_type by RewardsClaimed sender address
export function getVaultTypeFromRewardsSender(senderAddress: string): string {
  return (
    REWARDS_SENDER_TO_VAULT_MAP.get(senderAddress.toLowerCase()) ||
    "UNKNOWN_VAULT"
  );
}

// Event type identifiers used for monitoring vault activities
export const EVENT_TYPES = {
  // Vault operation events (Production package)
  DEPOSIT_EXECUTED:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::DepositExecuted",
  WITHDRAW_EXECUTED:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::WithdrawExecuted",
  REWARD_CLAIMED:
    "0xd899cf7d2b5db716bd2cf55599fb0d5ee38a3061e7b6bb6eebf73fa5bc4c81ca::incentive_v3::RewardClaimed",
} as const;

// Helper function to get all Navi account cap addresses for a specific vault
export function getNaviAccountCaps(
  vaultType: keyof typeof NAVI_ACCOUNT_CAPS
): string[] {
  return NAVI_ACCOUNT_CAP_ARRAY_BY_VAULT.get(vaultType) || [];
}

// Helper function to check if an address is a known Navi account cap
export function isNaviAccountCap(address: string): boolean {
  return NAVI_ACCOUNT_CAP_SET.has(address);
}

export function getVaultTypeByAccountCap(address: string): string | null {
  return NAVI_ACCOUNT_CAP_TO_VAULT.get(address) || null;
}

export function getCoinSymbolByVaultType(vaultType: string): string | null {
  return VAULT_INFO_BY_TYPE.get(vaultType)?.coinSymbol || null;
}

// Vault metrics calculation constants
export const VAULT_METRICS = {
  // Precision constants for calculations
  VAULT_DECIMALS: 1_000_000_000, // 10^9 for internal vault calculations
  ORACLE_DECIMALS: 1_000_000_000_000_000_000, // 10^18 for price oracle precision

  // Fee rate precision (1bp = 1, 100% = 10,000)
  RATE_SCALING: 10_000,

  // Default settlement time (UTC 8PM for daily reconciliation)
  DAILY_SETTLEMENT_HOUR: 20, // 8 PM UTC
} as const;

// Check if an address is a vault type string or simple address
export function isVaultTypeString(address: string): boolean {
  return address.includes("::");
}

// Date and time utilities for daily operations
export function getCurrentDateUTC(): string {
  return new Date().toISOString().split("T")[0];
}

export function isDaily8PMUTC(timestamp: Date): boolean {
  const utc = new Date(timestamp.toISOString());
  return (
    utc.getUTCHours() === VAULT_METRICS.DAILY_SETTLEMENT_HOUR &&
    utc.getUTCMinutes() === 0
  );
}

export function getNextDaily8PMUTC(): Date {
  const now = new Date();
  const next8PM = new Date(now);
  next8PM.setUTCHours(VAULT_METRICS.DAILY_SETTLEMENT_HOUR, 0, 0, 0);

  // If we've already passed 8 PM UTC today, move to tomorrow
  if (next8PM <= now) {
    next8PM.setUTCDate(next8PM.getUTCDate() + 1);
  }

  return next8PM;
}

// Precision handling utilities
export function applyVaultPrecision(amount: number | bigint | string): number {
  const numAmount =
    typeof amount === "string" ? parseFloat(amount) : Number(amount);
  return numAmount / VAULT_METRICS.VAULT_DECIMALS;
}

export function applyOraclePrecision(price: number | bigint | string): number {
  const numPrice =
    typeof price === "string" ? parseFloat(price) : Number(price);
  return numPrice / VAULT_METRICS.ORACLE_DECIMALS;
}

export function applyTokenDecimalPrecision(
  amount: number | bigint | string,
  decimals: number
): number {
  const numAmount =
    typeof amount === "string" ? parseFloat(amount) : Number(amount);
  return numAmount / Math.pow(10, decimals);
}

// Price Oracle Configuration
export const PRICE_ORACLE_CONFIG = {
  // Navi Price Oracle Address (same as navi project)
  ORACLE_ADDRESS:
    "0xc0601facd3b98d1e82905e660bf9f5998097dedcf86ed802cf485865e3e3667c",

  // Starting checkpoint for price monitoring
  START_CHECKPOINT: 172000000n,

  // Update interval (minutes)
  UPDATE_INTERVAL: 10,

  // Update offset (minutes)
  UPDATE_OFFSET: 5,
} as const;

// Price data cache for real-time access
const latestPriceData = new Map<
  string,
  {
    price: number;
    decimal: number;
    timestamp: Date;
    coinSymbol: string;
  }
>();

// Price utilities
export function updatePriceCache(
  coinId: string,
  price: number,
  decimal: number,
  coinSymbol: string,
  timestamp: Date
): void {
  latestPriceData.set(coinId, {
    price: price,
    decimal: decimal,
    timestamp: timestamp,
    coinSymbol: coinSymbol,
  });
}
