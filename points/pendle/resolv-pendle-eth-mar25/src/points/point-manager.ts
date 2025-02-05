import { LogLevel } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { DAILY_POINTS, MISC_CONSTS, PENDLE_POOL_ADDRESSES, WSTUSR_ADDRESS, TIMESTAMP_EOD_4TH_JAN, TIMESTAMP_EOD_31TH_JAN } from "../consts.ts";
import {
  EVENT_POINT_INCREASE,
  POINT_SOURCE,
  POINT_SOURCE_SY,
  POINT_SOURCE_YT,
} from "../types.ts";
import { getWstUSRContractOnContext } from "../types/eth/wstusr.ts";

export async function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  impliedAmountHolding: bigint,
  holdingPeriod: bigint,
  updatedAt: number
) {

  const stUSR_ratio = Number(await getWstUSRContractOnContext(ctx, WSTUSR_ADDRESS).convertToAssets(MISC_CONSTS.ONE_E18))/10**18
  
  //variable multiplier
  let multiplier = 15
  if (ctx.timestamp.getTime()<=TIMESTAMP_EOD_4TH_JAN) multiplier = 30
  else if (ctx.timestamp.getTime()<=TIMESTAMP_EOD_31TH_JAN) multiplier = 20
  
  //cal points
  const points = Number(impliedAmountHolding) * stUSR_ratio * Number(holdingPeriod) / 86400 * DAILY_POINTS * multiplier

  //Market Expires all SY points go to treasury
  if (label == POINT_SOURCE_SY && ctx.timestamp.getTime() > PENDLE_POOL_ADDRESSES.MARKET_EXPIRY) {
    increasePoint(
      ctx,
      label,
      PENDLE_POOL_ADDRESSES.TREASURY,
      0n,
      holdingPeriod,
      points,
      updatedAt,
      multiplier
    )
    return
  }

  // Handle Treasury
  if (label == POINT_SOURCE_YT) {
    const pointsTreasuryFee = calcTreasuryFee(points)
    increasePoint(
      ctx,
      label,
      account,
      impliedAmountHolding,
      holdingPeriod,
      points - pointsTreasuryFee,
      updatedAt,
      multiplier
    )
    increasePoint(
      ctx,
      label,
      PENDLE_POOL_ADDRESSES.TREASURY,
      0n,
      holdingPeriod,
      pointsTreasuryFee,     
      updatedAt,
      multiplier
    );
  } else {
    increasePoint(
      ctx,
      label,
      account,
      impliedAmountHolding,
      holdingPeriod,
      points,
      updatedAt,
      multiplier
    );
  }
}

function increasePoint(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  impliedAmountHolding: bigint,
  holdingPeriod: bigint,
  points: number,
  updatedAt: number,
  multiplier: number
) {
  ctx.eventLogger.emit(EVENT_POINT_INCREASE, {
    label,
    account: account.toLowerCase(),
    impliedBalance: impliedAmountHolding.scaleDown(18),
    holdingPeriod,
    points: points/10**18,
    updatedAt,
    severity: LogLevel.INFO,
    multiplier
  });
}

function calcTreasuryFee(amount: number): number {
  return amount * 3 / 100
}
