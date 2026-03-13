// Reserve index -> coin type address used by the current markets.
export const COIN_MAPPING: Record<number, string> = {
  0: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  1: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  2: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
  3: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
  4: '0x6864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS',
  5: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
  6: '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI',
  7: '0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX',
  8: '0x27792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN',   // wBTC
  9: '0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD',  // AUSD
  10: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC', // nUSDC
  11: '0xd0e89b2af5e4910726fbcd8b8dd37bb79b29e5f83f7491bca830e94f7f226d29::eth::ETH',   // nbETH
  12: '0x960b531667636f39e85867775f52f6b1f220a058c4de786905bdf761e06a56bb::usdy::USDY', // USDY
  13: '0x5145494a5f5100e645e4b0aa950fa6b68f614e8c59e17bc5ded3495123a79178::ns::NS',     // NS
  14: '0x5f496ed5d9d045c5b788dc1bb85f54100f2ede11e46f6a232c29daada4c5bdb6::coin::COIN', // stBTC
  15: '0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP', // DEEP
  16: '0xf16e6b723f242ec745dfd7634ad072c42d5c1d9ac9d62a39c381303eaa57693a::fdusd::FDUSD', // FDUSD
  17: '0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE', // BLUE
  18: '0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK', // BUCK
  19: '0x375f70cf2ae4c00bf37117d0c85a2c71545e6ee05c4a5c7d282cd66a4504b068::usdt::USDT', // nUSDT
  20: '0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI', // stSUI
  21: '0xaafb102dd0902f5055cadecd687fb5b71ca82ef0e0285d90afde828ec58ca96b::btc::BTC',   // suiBTC
  22: '0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN', // SOL
  23: '0x3e8e9423d80e1774a7ca128fccd8bf5f1f7753be658c5e645929037f7c819040::lbtc::LBTC', // LBTC
  24: '0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL',   // WAL
  25: '0x3a304c7feba2d819ea57c3542d68439ca2c386ba02159c740f7b406e592c62ea::haedal::HAEDAL', // HAEDAL
  26: '0x876a4b7bce8aeaef60464c11f4026903e9afacab79b9b142686158aa86560b50::xbtc::XBTC', // XBTC
  27: '0x7262fb2f7a3a14c888c438a3cd9b912469a58cf60f367352c46584262e8299aa::ika::IKA',   // IKA
  28: '0x9d297676e7a4b771ab023291377b2adfaa4938fb9080b8d12430e4b108b836a9::xaum::XAUM', // XAUM
}

// Reserve index -> decimals
export const DECIMAL_MAP: Record<number, number> = {
  0: 9, 1: 6, 2: 6, 3: 8, 4: 9, 5: 9, 6: 9, 7: 9,
  8: 8, 9: 6, 10: 6, 11: 8, 12: 6, 13: 6, 14: 8, 15: 6,
  16: 6, 17: 9, 18: 9, 19: 6, 20: 9, 21: 8, 22: 8, 23: 8,
  24: 9, 25: 9, 26: 8, 27: 9, 28: 9,
}

// Reserve index -> symbol
export const SYMBOL_MAP: Record<number, string> = {
  0: 'SUI', 1: 'wUSDC', 2: 'wUSDT', 3: 'wETH', 4: 'CETUS',
  5: 'vSui', 6: 'haSui', 7: 'NAVX', 8: 'wBTC', 9: 'AUSD',
  10: 'nUSDC', 11: 'nbETH', 12: 'USDY', 13: 'NS', 14: 'stBTC',
  15: 'DEEP', 16: 'FDUSD', 17: 'BLUE', 18: 'BUCK', 19: 'nUSDT',
  20: 'stSUI', 21: 'suiBTC', 22: 'SOL', 23: 'LBTC', 24: 'WAL',
  25: 'HAEDAL', 26: 'XBTC', 27: 'IKA', 28: 'XAUM',
}

export const PROJECT = 'navi'

// Start slightly before the multi-market deployment window to backfill the upgrade.
export const MULTI_MARKET_START_CHECKPOINT = 240_000_000n

// Resolve the coin type for a reserve index across current markets.
export function getCoinTypeForReserve(_marketId: bigint, reserve: number): string | undefined {
  return COIN_MAPPING[reserve]
}
