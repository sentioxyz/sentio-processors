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
