import { BigDecimal } from '@sentio/sdk';
import { ONE_YEAR } from './consts.js';

export function getExchangeRateFromLnImpliedRate(
    lnImpliedRate: bigint,
    timeToExpiry: BigDecimal
): BigDecimal {
    const normalizedLnRate = lnImpliedRate.scaleDown(18).times(timeToExpiry).div(ONE_YEAR);
    return new BigDecimal(Math.exp(normalizedLnRate.toNumber()));
}
