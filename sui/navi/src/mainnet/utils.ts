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
};

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
  "0x6286fe43b426bfa22dfe9e6ee1adf3aa5c02a3a226e8e042ad0b7b62c9642f56": "NS",
  "0x295499419fc18d02ad508eef0ff9f1f527b913f21a2ce0a396ce3304ee0f19c3": "wBTC",
  "0x9c5745c58a3100c165c211442bd6306e9c6c35c90d81d6d5952da30779438fac": "DEEP",
  "0xbb6a086d5fecd456b4cbabaa9d62f695e27aed35d26827aa860207f55804f6a6": "suiBTC",
  "0xd77386d964efa7cb85396ac046e39a33807341de6681c47543b39f8849be8ecf": "stSUI",
  "0x6babe2eca341c9ca8df2a66ec26b4e57064cc94a10918f547f14f730bbdd4744": "SOL",
  "0xe13a4d24fd3acdaabb7710285260f98a9918fb0d6bc792b3f4c0e3c2616cbf11": "LBTC",
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
  return undefined; // 如果找不到 symbol，返回 undefined
}