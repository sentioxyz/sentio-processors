import { priceDeviationRule, oracleRatioRule } from '../lib/spec.mjs'

export const project = { owner: 'navi', slug: 'navi-production-new', id: 'e2kx9fDv' }
export const muted = true

/**
 * Oracle price monitoring. This is the domain that genuinely needs one rule per
 * asset: pairing a metric grouped by `coin_symbol` with a multi-coin price query
 * does not align the two sides, and the formula silently evaluates to a constant
 * instead of erroring. So every coin gets its own pinned rule.
 *
 * Tolerances come from measuring the live deviation for all 37 listed assets on
 * 2026-08-17. Almost everything sits under 1%, so 2% is the default and 3% is
 * used for the thin-liquidity small caps that were already near 0.9%.
 */
const DEFAULT_TOLERANCE = 0.02

/**
 * The `oracle` metric emits roughly every 11 minutes per coin, so the critical
 * default of `for: 2m` leaves most evaluation windows with no sample at all and
 * the rule sits in NO_DATA forever. Observed live: all 27 price rules stayed
 * NO_DATA on the 2m window. The window has to be a multiple of the data cadence.
 */
const PRICE_CADENCE = { for: '30m', interval: '5m' }
const WIDER = { BLUE: 0.03, CETUS: 0.03, IKA: 0.03, XAUM: 0.03 }

/**
 * The three SUI liquid-staking tokens are priced by NAVI's oracle at essentially
 * the SUI spot price, ignoring the staking exchange rate — measured haSui -7.45%,
 * vSui -6.28%, stSUI -4.30%, while plain SUI matches market within 0.16%. These
 * tolerances are set above the current gap. Raised with the team on 2026-08-17 and
 * closed: this is intentional, there is a specific reason for it on the contract side.
 * So these stay widened — do NOT tighten them to DEFAULT_TOLERANCE. What they still
 * catch is the gap *growing* beyond where it sits today, which would be new.
 */
const LST_TOLERANCE = { haSui: 0.1, vSui: 0.09, stSUI: 0.07 }

/** Assets Sentio has a usable market price for. */
const PRICED = [
  'AUSD', 'BLUE', 'BUCK', 'CETUS', 'DEEP', 'FDUSD', 'HAEDAL', 'IKA', 'LBTC',
  'NAVX', 'NS', 'SOL', 'SUI', 'USDSUI', 'USDY', 'WAL', 'XAUM', 'XBTC',
  'enzoBTC', 'stBTC', 'suiUSDe', 'wBTC', 'wETH', 'wUSDC',
  'haSui', 'vSui', 'stSUI',
]

/**
 * Excluded on purpose:
 * - LZWBTC, YBTC, nUSDC, nUSDT, nbETH, suiBTC, wUSDT — no Sentio market price.
 *   Covered by the oracle-ratio rules below instead.
 * - XAGm — market price exists but no oracle series was emitted in the window.
 * - eACRED — neither side has data.
 * - MBTC — Sentio's feed reports $130,343 against an oracle of $62,832, i.e. very
 *   close to 2x BTC. The reference is almost certainly wrong rather than the
 *   oracle, so a deviation rule here would be pure noise. Covered by ratio instead.
 */
const NO_REFERENCE = ['LZWBTC', 'YBTC', 'nUSDC', 'nUSDT', 'nbETH', 'suiBTC', 'wUSDT', 'MBTC']

/**
 * Wrapper-consistency pairs for the assets above. Two wrappers of the same
 * underlying must track each other; all seven measured within 0.9% of 1.0 on
 * 2026-08-17, so 2% is a real bound rather than a guess.
 */
const RATIO_PAIRS = [
  ['suiBTC', 'wBTC'],
  ['LZWBTC', 'XBTC'],
  ['YBTC', 'XBTC'],
  ['MBTC', 'wBTC'],
  ['nbETH', 'wETH'],
  ['nUSDC', 'wUSDC'],
  ['nUSDT', 'suiUSDe'],
  ['wUSDT', 'nUSDC'],
]

/**
 * BLOCKED — do not re-enable without re-testing.
 *
 * `priceQuery` is accepted inside an alert condition's insightQueries and the
 * rule saves cleanly, but the alert engine never evaluates it. All 27 deviation
 * rules were applied live on 2026-08-17 and every one of them either reported the
 * degenerate `abs(a/b-1) = 1` (with the price input marked disabled) or sat in
 * NO_DATA (with it enabled), on both a 2m and a 30m window. The identical formula
 * returns correct values through the insights API — 0.0017 for SUI — so the
 * expression is right and the alert-side price data source is the gap.
 *
 * Metric-to-metric formulas are unaffected: the RATIO_PAIRS rules below work, and
 * `Pool utilisation critical` returned real values (SUI@9 = 0.9587).
 *
 * Next thing to try: have the processor emit the market price as its own metric,
 * then express deviation as metric-to-metric, which is the path known to work.
 */
const PRICE_DEVIATION_WORKS = false

export const rules = [
  ...(PRICE_DEVIATION_WORKS ? PRICED : []).map((coin) =>
    priceDeviationRule({
      severity: LST_TOLERANCE[coin] ? 'normal' : 'critical',
      coin,
      maxDeviation: LST_TOLERANCE[coin] ?? WIDER[coin] ?? DEFAULT_TOLERANCE,
      ...PRICE_CADENCE,
      message: `NAVI oracle for ${coin} has drifted from the market price by more than the allowed band.`,
    }),
  ),
  ...RATIO_PAIRS.map(([a, b]) =>
    oracleRatioRule({
      severity: 'critical',
      a,
      b,
      tolerance: 0.02,
      ...PRICE_CADENCE,
      message: `${a} and ${b} wrap the same underlying but their oracle prices have diverged.`,
    }),
  ),
]

export const excluded = { NO_REFERENCE }
