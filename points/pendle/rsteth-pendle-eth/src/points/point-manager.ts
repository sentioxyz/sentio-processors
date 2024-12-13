import { LogLevel } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { MELLOW_MULTIPLIER, MISC_CONSTS, PENDLE_POOL_ADDRESSES } from "../consts.ts";
import {
  EVENT_POINT_INCREASE,
  POINT_SOURCE,
  POINT_SOURCE_YT,
} from "../types.ts";
import { getPriceBySymbol } from "@sentio/sdk/utils";

/**
 *
 * @param amountEthHolding amount of Eth user holds during the period
 * @param holdingPeriod amount of time user holds the Eth
 * @returns Zircuit point
 *
 * @dev to be reviewed by Zircuit team
 */
function calcPointsFromHolding(
  amountEthHolding: bigint,
  holdingPeriod: bigint,
  ethPrice: number
): bigint {
  // 0.00025 points per hour per $1 dollar
  const priceFactor = 10 ** 12
  const ethPriceBigInt = BigInt(Math.round(ethPrice * priceFactor))
  return amountEthHolding * ethPriceBigInt / BigInt(priceFactor) * 25n / 100000n * (holdingPeriod / 3600n)
}

export async function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountEthHolding: bigint,
  holdingPeriod: bigint,
  updatedAt: number
) {
  // TODO: replace to rstETH price
  const ethPrice = await getPriceBySymbol("ETH", ctx.timestamp)

  if (!ethPrice) {
    throw new Error(`can't get eth price at ${ctx.timestamp}`)
  }

  //TODO: add the start time for symbiotic/mellow points


  const mPoints = calcPointsFromHolding(amountEthHolding, holdingPeriod, ethPrice) * MELLOW_MULTIPLIER
  const sPoints = calcPointsFromHolding(amountEthHolding, holdingPeriod, ethPrice)


  if (label == POINT_SOURCE_YT) {
    const mPointsTreasuryFee = calcTreasuryFee(mPoints)
    const sPointsTreasuryFee = calcTreasuryFee(sPoints);
    increasePoint(
      ctx,
      label,
      account,
      amountEthHolding,
      holdingPeriod,
      mPoints - mPointsTreasuryFee,
      sPoints - sPointsTreasuryFee,
      updatedAt
    )
    increasePoint(
      ctx,
      label,
      PENDLE_POOL_ADDRESSES.TREASURY,
      0n,
      holdingPeriod,
      mPointsTreasuryFee,
      sPointsTreasuryFee,
      updatedAt
    );
  } else {
    increasePoint(
      ctx,
      label,
      account,
      amountEthHolding,
      holdingPeriod,
      mPoints,
      sPoints,
      updatedAt
    );
  }
}

function increasePoint(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountEthHolding: bigint,
  holdingPeriod: bigint,
  mPoints: bigint,
  sPoints: bigint,
  updatedAt: number
) {
  ctx.eventLogger.emit(EVENT_POINT_INCREASE, {
    label,
    account: account.toLowerCase(),
    amountEthHolding: amountEthHolding.scaleDown(18),
    holdingPeriod,
    mPoints: mPoints.scaleDown(18),
    sPoints: sPoints.scaleDown(18),
    updatedAt,
    severity: LogLevel.INFO,
  });
}

function calcTreasuryFee(amount: bigint): bigint {
  return amount * 3n / 100n
}
