import { CoinMap } from "./interfaces.js";

export const COIN = ["SUI", "wUSDC", "USDT", "WETH", "CETUS", "VoloSui",
  "HASUI", "NAVX", "WBTC", "AUSD", "nUSDC", "nbETH", "USDY", "NS", "stBTC", "DEEP", "FDUSD", 'BLUE', 'BUCK', 'suiUSDT'];

export const DECIMAL_RAY = 27;
export const DEFAULT_COIN_DECIMAL = 9;

export const COIN_MAP: CoinMap = {
  "0x2::sui::SUI":
    "SUI",
  "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN":
    "wUSDC",
  "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN":
    "USDT",
  "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN":
    "WETH",
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
