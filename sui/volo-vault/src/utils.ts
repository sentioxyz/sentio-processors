import { CoinMap } from "./interfaces.js";

export const COIN = [
  "SUI",
  "wUSDC",
  "wUSDT",
  "wETH",
  "CETUS",
  "vSui",
  "haSui",
  "NAVX",
  "wBTC",
  "AUSD",
  "nUSDC",
  "nbETH",
  "USDY",
  "NS",
  "stBTC",
  "DEEP",
  "FDUSD",
  "BLUE",
  "BUCK",
  "nUSDT",
  "stSUI",
  "suiBTC",
  "SOL",
  "LBTC",
  "WAL",
  "HAEDAL",
  "XBTC",
  "IKA",
];

export const DECIMAL_RAY = 27;
export const DEFAULT_COIN_DECIMAL = 9;

export const DECIMAL_MAP: Record<number, number> = {
  0: 9,
  1: 6,
  2: 6,
  3: 8,
  4: 9,
  5: 9,
  6: 9,
  7: 9,
  8: 8,
  9: 6,
  10: 6,
  11: 8,
  12: 6,
  13: 6,
  14: 8,
  15: 6,
  16: 6,
  17: 9,
  18: 9,
  19: 6,
  20: 9,
  21: 8,
  22: 8,
  23: 8,
  24: 9,
  25: 9,
  26: 8,
  27: 9,
};

export const COIN_MAP: CoinMap = {
  "0x2::sui::SUI": "SUI",
  "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN":
    "wUSDC",
  "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN":
    "wUSDT",
  "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN":
    "wETH",
  "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS":
    "CETUS",
  "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT":
    "vSui",
  "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI":
    "haSui",
  "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX":
    "NAVX",
  "0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN":
    "wBTC",
  "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD":
    "AUSD",
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC":
    "nUSDC",
  "0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH":
    "nbETH",
  "0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY":
    "USDY",
  "0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS":
    "NS",
  "0x5f496ed5d9d045c5b788dc1bb85f54100f2ede11e46f6a232c29daada4c5bdb6::coin::COIN":
    "stBTC",
  "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP":
    "DEEP",
  "0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD":
    "FDUSD",
  "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE":
    "BLUE",
  "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK":
    "BUCK",
  "0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT":
    "nUSDT",
  "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI":
    "stSUI",
  "0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC":
    "suiBTC",
  "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN":
    "SOL",
  "0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC":
    "LBTC",
  "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL":
    "WAL",
  "0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL":
    "HAEDAL",
  "0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC":
    "XBTC",
  "0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA":
    "IKA",
};

export const SYMBOL_MAP: Record<number, string> = {
  0: "SUI",
  1: "wUSDC",
  2: "wUSDT",
  3: "wETH",
  4: "CETUS",
  5: "vSui",
  6: "haSui",
  7: "NAVX",
  8: "wBTC",
  9: "AUSD",
  10: "nUSDC",
  11: "nbETH",
  12: "USDY",
  13: "NS",
  14: "stBTC",
  15: "DEEP",
  16: "FDUSD",
  17: "BLUE",
  18: "BUCK",
  19: "nUSDT",
  20: "stSUI",
  21: "suiBTC",
  22: "SOL",
  23: "LBTC",
  24: "WAL",
  25: "HAEDAL",
  26: "XBTC",
  27: "IKA",
};

export function SymbolMatcher(objectType: string) {
  const regex = /<([^>]+)>/;
  const matches = objectType.match(regex);
  if (matches && matches.length > 1) {
    return matches[1];
  } else {
    return "unknown";
  }
}

export function getDecimalBySymbol(coinSymbol: string): number | undefined {
  // Find the id corresponding to the coinSymbol
  const id = Object.keys(SYMBOL_MAP).find(
    (key) => SYMBOL_MAP[Number(key)] === coinSymbol
  );

  if (id !== undefined) {
    // Return the decimal using the id
    return DECIMAL_MAP[Number(id)];
  }

  return undefined; // Return undefined if the symbol is not found
}

export function getIdBySymbol(coinSymbol: string): number | undefined {
  for (const [id, symbol] of Object.entries(SYMBOL_MAP)) {
    if (symbol === coinSymbol) {
      return Number(id);
    }
  }
  return undefined;
}

// Vault Configuration - Main vault addresses for different BTC strategies
export const VAULT_ADDRESSES = {
  // Production Vault Package Address (discovered from metrics)
  VAULT_PACKAGE_PROD:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa",

  // XBTC Vault - Production vault (discovered from vaultDailyDepositVolume metrics)
  XBTC_VAULT:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::Vault<0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC>",

  // suiBTC Vault - Production vault (discovered from vaultDailyDepositVolume metrics)
  // Note: Despite the "BTC" in the type name, this is actually suiBTC token
  SUIBTC_VAULT:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::Vault<0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC>",

  // nUSDC Vault - Production vault (discovered from RPC query)
  NUSDC_VAULT:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::Vault<0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC>",
} as const;

export const VAULT_ID_MAPPING: Record<
  string,
  {
    vaultType: string;
    coinSymbol: string;
  }
> = {
  "0x6e53ffe5b77a85ff609b0813955866ec98a072e4aaf628108e717143ec907bd8": {
    vaultType: "SUIBTC_VAULT",
    coinSymbol: "suiBTC",
  },

  "0x041b49dc6625e074f452b9bc60a9a828aebfbef29bcba119ad90a4b11ba405bf": {
    vaultType: "XBTC_VAULT",
    coinSymbol: "XBTC",
  },

  "0xa97cc9a63710f905deb2da40d6548ce7a75ee3dfe4be0c1d553553d2059c31a3": {
    vaultType: "NUSDC_VAULT",
    coinSymbol: "nUSDC",
  },
} as const;

export const VAULT_STATUS_SENDER_MAPPING: Record<
  string,
  {
    vaultType: string;
    vaultId: string;
    coinSymbol: string;
  }
> = {} as const;

// Helper: get vault info by vaultId
export function getVaultInfoById(vaultId: string): {
  vaultType: string;
  coinSymbol: string;
} | null {
  return VAULT_ID_MAPPING[vaultId] || null;
}

// Helper: get vault info by sender of VaultStatusRecord
export function getVaultInfoBySender(senderAddress: string): {
  vaultType: string;
  vaultId: string;
  coinSymbol: string;
} | null {
  return VAULT_STATUS_SENDER_MAPPING[senderAddress] || null;
}

// Helper: add new mapping for vault status sender (dynamic update)
export function addVaultStatusSenderMapping(
  senderAddress: string,
  vaultType: string,
  vaultId: string,
  coinSymbol: string
): void {
  (VAULT_STATUS_SENDER_MAPPING as any)[senderAddress] = {
    vaultType,
    vaultId,
    coinSymbol,
  };
}

// Helper: get all known vault IDs
export function getAllKnownVaultIds(): string[] {
  return Object.keys(VAULT_ID_MAPPING);
}

// Helper: get vault ID by vault type
export function getVaultIdByType(vaultType: string): string | null {
  for (const [vaultId, info] of Object.entries(VAULT_ID_MAPPING)) {
    if (info.vaultType === vaultType) {
      return vaultId;
    }
  }
  return null;
}

// Helper: get vault ID by coin symbol
export function getVaultIdByCoinSymbol(coinSymbol: string): string | null {
  for (const [vaultId, info] of Object.entries(VAULT_ID_MAPPING)) {
    if (info.coinSymbol === coinSymbol) {
      return vaultId;
    }
  }
  return null;
}

// PerformanceFeeRecord central address; dynamic fields store all vault records here
export const PERFORMANCE_FEE_RECORD_ADDRESS =
  "0x2ae13659389ea8d146d9b6a576f073c4fdc75f5f95adbb16fe621ed6fbc7dc90";

// PerformanceFeeRecord dynamic field configuration for monitoring vault records
export const PERFORMANCE_FEE_RECORD_MAPPING: Record<
  string,
  {
    objectId: string;
    parentObjectId: string;
    vaultId: string;
    vaultType: string;
    coinSymbol: string;
  }
> = {
  // XBTC Vault PerformanceFeeRecord
  XBTC_VAULT: {
    objectId:
      "0x3511e0a0465010188fc73d4fb0b9098af27d39d10a70a0fa86fd73159e5146ef",
    parentObjectId: PERFORMANCE_FEE_RECORD_ADDRESS,
    vaultId:
      "0x041b49dc6625e074f452b9bc60a9a828aebfbef29bcba119ad90a4b11ba405bf",
    vaultType: "XBTC_VAULT",
    coinSymbol: "XBTC",
  },

  // SUIBTC Vault PerformanceFeeRecord (TBD)
  // "SUIBTC_VAULT": {
  //   objectId: "TBD",
  //   parentObjectId: PERFORMANCE_FEE_RECORD_ADDRESS,
  //   vaultId: "0x6e53ffe5b77a85ff609b0813955866ec98a072e4aaf628108e717143ec907bd8",
  //   vaultType: "SUIBTC_VAULT",
  //   coinSymbol: "suiBTC",
  // },

  // nUSDC Vault PerformanceFeeRecord (TBD)
  // "NUSDC_VAULT": {
  //   objectId: "TBD",
  //   parentObjectId: PERFORMANCE_FEE_RECORD_ADDRESS,
  //   vaultId: "0xa97cc9a63710f905deb2da40d6548ce7a75ee3dfe4be0c1d553553d2059c31a3",
  //   vaultType: "NUSDC_VAULT",
  //   coinSymbol: "nUSDC",
  // },
} as const;

// Helper: get all PerformanceFeeRecord configs
export function getAllPerformanceFeeRecords(): Array<{
  objectId: string;
  parentObjectId: string;
  vaultId: string;
  vaultType: string;
  coinSymbol: string;
}> {
  return Object.values(PERFORMANCE_FEE_RECORD_MAPPING);
}

// Helper: get PerformanceFeeRecord by vault type
export function getPerformanceFeeRecordByVaultType(vaultType: string): {
  objectId: string;
  parentObjectId: string;
  vaultId: string;
  vaultType: string;
  coinSymbol: string;
} | null {
  return PERFORMANCE_FEE_RECORD_MAPPING[vaultType] || null;
}

// Helper: get PerformanceFeeRecord by coin symbol
export function getPerformanceFeeRecordByCoinSymbol(coinSymbol: string): {
  objectId: string;
  parentObjectId: string;
  vaultId: string;
  vaultType: string;
  coinSymbol: string;
} | null {
  for (const record of Object.values(PERFORMANCE_FEE_RECORD_MAPPING)) {
    if (record.coinSymbol === coinSymbol) {
      return record;
    }
  }
  return null;
}

// Helper: get PerformanceFeeRecord by vault ID
export function getPerformanceFeeRecordByVaultId(vaultId: string): {
  objectId: string;
  parentObjectId: string;
  vaultId: string;
  vaultType: string;
  coinSymbol: string;
} | null {
  for (const record of Object.values(PERFORMANCE_FEE_RECORD_MAPPING)) {
    if (record.vaultId === vaultId) {
      return record;
    }
  }
  return null;
}

// Mapping from RewardsClaimed sender address to vault_type
export const REWARDS_SENDER_TO_VAULT_MAPPING: Record<string, string> = {
  "0x84e1b26743c563fe60eb44ae56c2dd4193d9ef931159e8dbfefe365093552298":
    "SUIBTC_VAULT",
  "0xa7c97f0f7d5163bbe37be83419f212eeab9d0f7f04a23bb407b6062958e514df":
    "SUIBTC_VAULT",

  "0x2653a84c3dd88cbaf481fcf3b2581943332267fe87c2cebd34c194e8105a25bb":
    "XBTC_VAULT",
  "0x5914bedd733f33443cabde42f5e95aa63569a2350448afe46c8affaf0ddbf6b4":
    "XBTC_VAULT",
} as const;

// Helper: get vault_type by RewardsClaimed sender address
export function getVaultTypeFromRewardsSender(senderAddress: string): string {
  const normalizedAddress = senderAddress.toLowerCase();
  return REWARDS_SENDER_TO_VAULT_MAPPING[normalizedAddress] || "UNKNOWN_VAULT";
}

// Navi Account Cap addresses for yield farming strategies
// These addresses are used to claim rewards from Navi protocol
export const NAVI_ACCOUNT_CAPS = {
  // SUIBTC Vault account capabilities for Navi protocol interaction
  SUIBTC_VAULT: {
    naviAccountCap0:
      "0x84e1b26743c563fe60eb44ae56c2dd4193d9ef931159e8dbfefe365093552298",
    naviAccountCap1:
      "0xa7c97f0f7d5163bbe37be83419f212eeab9d0f7f04a23bb407b6062958e514df",
  },

  // XBTC Vault account capabilities for Navi protocol interaction
  XBTC_VAULT: {
    naviAccountCap0:
      "0x2653a84c3dd88cbaf481fcf3b2581943332267fe87c2cebd34c194e8105a25bb",
    naviAccountCap1:
      "0x5914bedd733f33443cabde42f5e95aa63569a2350448afe46c8affaf0ddbf6b4",
  },

  // nUSDC Vault account capabilities for Navi protocol interaction
  // Note: These need to be discovered from the vault's asset_types field
  NUSDC_VAULT: {
    naviAccountCap0:
      "0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860::position::Position0",
    naviAccountCap1: "", // To be discovered if needed
  },
} as const;

// Event type identifiers used for monitoring vault activities
export const EVENT_TYPES = {
  // Vault operation events (Production package)
  DEPOSIT_EXECUTED:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::DepositExecuted",
  WITHDRAW_EXECUTED:
    "0xcd86f77503a755c48fe6c87e1b8e9a137ec0c1bf37aac8878b6083262b27fefa::vault::WithdrawExecuted",

  // Navi protocol reward claiming event
  REWARD_CLAIMED:
    "0xd899cf7d2b5db716bd2cf55599fb0d5ee38a3061e7b6bb6eebf73fa5bc4c81ca::incentive_v3::RewardClaimed",
} as const;

// Helper function to get all Navi account cap addresses for a specific vault
export function getNaviAccountCaps(
  vaultType: keyof typeof NAVI_ACCOUNT_CAPS
): string[] {
  const caps = NAVI_ACCOUNT_CAPS[vaultType];
  return Object.values(caps);
}

// Helper function to check if an address is a known Navi account cap
export function isNaviAccountCap(address: string): boolean {
  const allCaps = [
    ...getNaviAccountCaps("SUIBTC_VAULT"),
    ...getNaviAccountCaps("XBTC_VAULT"),
    ...getNaviAccountCaps("NUSDC_VAULT"),
  ];
  return allCaps.includes(address);
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

// Helper functions for vault address parsing
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

// Check if an address is a vault type string or simple address
export function isVaultTypeString(address: string): boolean {
  return address.includes("::");
}

// Extract package address from vault type string
export function getPackageFromVaultType(vaultTypeString: string): string {
  const parsed = parseVaultType(vaultTypeString);
  return parsed?.packageAddress || vaultTypeString;
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
let latestPriceData = new Map<
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
