// Generated 2026-08-17 from 30 days of UserInteraction. Regenerate with the
// commands in the comment above each map. --min-n 30 drops series with too
// few samples to calibrate; they are emitted commented out.

// node alerts/calibrate.mjs --project navi/navi-production-new --days 30 --emit --pad 3 \
//   --inner "select coin_symbol as grp, sum(if(type='DepositEvent',toFloat64(amount),0)) - sum(if(type='WithdrawEvent',toFloat64(amount),0)) as v from UserInteraction where timestamp > now() - interval 30 day group by coin_symbol, toStartOfHour(timestamp)"

// custom: p1/p99 over the last 7d, widened 3x
export const NETFLOW_HOURLY = {
  // 'AUSD': [-171, 0],  // only 4 samples, too few to calibrate
  // 'BLUE': [-2300000, 1300000],  // only 45 samples, too few to calibrate
  'BUCK': [-2.49, 3],
  'CETUS': [-224000, 78400],
  'DEEP': [-2190000, 5520000],
  // 'FDUSD': [-1.45, 0.573],  // only 10 samples, too few to calibrate
  'HAEDAL': [-586000, 853000],
  'IKA': [-4560000, 62400],
  'LBTC': [-4.16, 1.61],
  'LZWBTC': [-0.235, 0.6],
  'NAVX': [-558000, 606000],
  'NS': [-2700000, 1050000],
  // 'SOL': [-47.1, 14.3],  // only 32 samples, too few to calibrate
  'SUI': [-289000, 321000],
  'USDSUI': [-484000, 730000],
  'USDY': [-59700, 181000],
  'WAL': [-1130000, 806000],
  'XAGm': [-395, 383],
  'XAUM': [-16.7, 15],
  'XBTC': [-5.07, 3],
  'eACRED': [-16.6, 17.1],
  'haSui': [-42000, 30900],
  'nUSDC': [-801000, 776000],
  'nUSDT': [-444000, 35100],
  'nbETH': [-45, 44.2],
  'stSUI': [-230, 429],
  'suiBTC': [-45.4, 0.68],
  'suiUSDe': [-2880, 1110],
  'vSui': [-49000, 91700],
  // 'wETH': [-0.389, -0.00000427],  // only 5 samples, too few to calibrate
  'wUSDC': [-14.2, 21.6],
  'wUSDT': [-1460, 0],
}

// node alerts/calibrate.mjs --project navi/navi-production-new --emit --pad 5 --min-n 30 --upper-only \
//   --inner "select concat(coin_symbol,'/',type) as grp, toFloat64(amount) as v from UserInteraction where timestamp > now() - interval 30 day and type in ('WithdrawEvent','BorrowEvent')"

// custom: p1/p99 over the last 7d, widened 5x
export const ACTION_SIZE = {
  // 'AUSD/WithdrawEvent': [0, 291],  // only 2 samples, too few to calibrate
  'BLUE/WithdrawEvent': [0, 3830000],  // p1 is 0
  'BUCK/BorrowEvent': [0, 285000],  // p1 is 0
  // 'BUCK/WithdrawEvent': [0, 231],  // only 4 samples, too few to calibrate
  'CETUS/WithdrawEvent': [0, 562000],  // p1 is 0
  'DEEP/BorrowEvent': [0, 383000],  // p1 is 0
  'DEEP/WithdrawEvent': [0, 9430000],  // p1 is 0
  // 'FDUSD/BorrowEvent': [0, 52.7],  // only 4 samples, too few to calibrate
  // 'FDUSD/WithdrawEvent': [0, 2.48],  // only 4 samples, too few to calibrate
  'HAEDAL/WithdrawEvent': [0, 9680000],  // p1 is 0
  'IKA/WithdrawEvent': [0, 2370000],  // p1 is 0
  // 'LBTC/BorrowEvent': [0, 0.208],  // only 15 samples, too few to calibrate
  // 'LBTC/WithdrawEvent': [0, 17],  // only 20 samples, too few to calibrate
  'LZWBTC/WithdrawEvent': [0, 7.81],  // p1 is 0
  'NAVX/BorrowEvent': [0, 822000],  // p1 is 0
  'NAVX/WithdrawEvent': [0, 2030000],  // p1 is 0
  'NS/WithdrawEvent': [0, 5660000],  // p1 is 0
  // 'SOL/BorrowEvent': [0, 0.00502],  // only 1 samples, too few to calibrate
  // 'SOL/WithdrawEvent': [0, 50.8],  // only 11 samples, too few to calibrate
  'SUI/BorrowEvent': [0, 960000],  // p1 is 0
  'SUI/WithdrawEvent': [0, 350000],  // p1 is 0
  'USDSUI/BorrowEvent': [0, 238000],  // p1 is 0
  'USDSUI/WithdrawEvent': [0, 1480000],  // p1 is 0
  'USDY/BorrowEvent': [0, 1590000],  // p1 is 0
  'USDY/WithdrawEvent': [0, 159000],  // p1 is 0
  'WAL/BorrowEvent': [0, 15900000],  // p1 is 0
  'WAL/WithdrawEvent': [0, 3660000],  // p1 is 0
  'XAGm/WithdrawEvent': [0, 698],  // p1 is 0
  'XAUM/WithdrawEvent': [0, 31.7],  // p1 is 0
  'XBTC/BorrowEvent': [0, 0.0502],  // p1 is 0
  'XBTC/WithdrawEvent': [0, 23.8],  // p1 is 0
  // 'eACRED/WithdrawEvent': [0, 44.1],  // only 18 samples, too few to calibrate
  'haSui/BorrowEvent': [0, 55700],  // p1 is 0
  'haSui/WithdrawEvent': [0, 64800],  // p1 is 0
  'nUSDC/BorrowEvent': [0, 150000],  // p1 is 0
  'nUSDC/WithdrawEvent': [0, 1110000],  // p1 is 0
  'nUSDT/BorrowEvent': [0, 15600],  // p1 is 0
  'nUSDT/WithdrawEvent': [0, 935000],  // p1 is 0
  // 'nbETH/BorrowEvent': [0, 0.251],  // only 5 samples, too few to calibrate
  'nbETH/WithdrawEvent': [0, 75],  // p1 is 0
  // 'stSUI/BorrowEvent': [0, 79.6],  // only 14 samples, too few to calibrate
  // 'stSUI/WithdrawEvent': [0, 488],  // only 8 samples, too few to calibrate
  'suiBTC/WithdrawEvent': [0, 75.8],  // p1 is 0
  'suiUSDe/BorrowEvent': [0, 72400],  // p1 is 0
  // 'suiUSDe/WithdrawEvent': [0, 5000],  // only 23 samples, too few to calibrate
  'vSui/BorrowEvent': [0, 50600],  // p1 is 0
  'vSui/WithdrawEvent': [0, 417000],  // p1 is 0
  // 'wETH/WithdrawEvent': [0, 0.374],  // only 5 samples, too few to calibrate
  'wUSDC/WithdrawEvent': [0, 18.7],  // p1 is 0
  'wUSDT/WithdrawEvent': [0, 2330],  // p1 is 0
}
