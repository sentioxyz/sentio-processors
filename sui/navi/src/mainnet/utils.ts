import { CoinMap } from "./interfaces.js";

export const COIN = [
  "SUI",
  "wUSDC",
  "wUSDT",
  "WETH",
  "CETUS",
  "VoloSui",
  "HASUI",
  "NAVX",
  "WBTC",
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
};

export const COIN_MAP: CoinMap = {
  "0x2::sui::SUI": "SUI",
  "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN":
    "wUSDC",
  "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN":
    "USDT",
  "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN":
    "WETH",
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

export const FlashLoanCoins: Record<string, string> = {
  "0xb29922cca8fecabe2957833260e5a95fce343e5c299a2126414ae557fdac51a3": "wUSDC",
  "0xc6a2ed14c23907cba22b56fa84f7347aa36a0bb8feab47057f170860c55e7dbe": "vSui",
  "0x168728630433e1b2494e037b2d38801461260295e9ca38efed4157e1a9cc6b91": "Sui",
  "0xff307af2ebe087ca693a136a7cb6e767564c1498224b4fbb608df765743743ff": "wUSDT",
  "0xc3e0d89194cf347d57718c9e1f044ee30a56a6e48fbfe0b4a36739fc71b0136f": "nUSDC",
  "0x3300beedc3bafc1400d4d148a5f4da7fa2ede56b09d8c317fa4527dce3ee0365": "Buck",
  "0xfc38586d817c483c42feda39f9c9ffe1ba9f2780e3eb74bcd2a5c069288d5312": "nUSDT",
  "0xaf6569023b944f60b47b0ed70f1313133bf71649835fb1f9161e99b79b5dfb35": "FDUSD",
  "0x80bae2b72ada1093c69b2ff7e17b14abbf22289ebbe1373d099877ec8bccb7d6": "CETUS",
  "0x7b2e91886bfa4fe2be22f34a6470df87797ea40955bef49f4bf446220844c746": "AUSD",
  "0x67506c67478c890f7652da773635b86a1c502e5c12a8c1cff8cc590fbc87d5d2": "USDY",
  "0x6ba7ce82602e117f07ec35d02e024df8cbed0a2a0374f35a1e2ac064d7925133": "haSui",
  "0x6b7bbb26e7fc2178bb488e8b389970e00b6e994e6d5b248a065ae8252996c450": "wETH",
  "0x2a68772af18af59979d2eb069a14b1dc8d5ed8028fab0137bcd759e9a9ec87d5": "nETH",
  "0x1f93117f47683dcb465289d915e9981ee150cd3a1a04e61872487f73f32911a9": "Blue",
  "0x34203e3acf09fa127977ec61cd1a6aa19356bed68543c54d03a22262a1f58a11": "NAVX",
};