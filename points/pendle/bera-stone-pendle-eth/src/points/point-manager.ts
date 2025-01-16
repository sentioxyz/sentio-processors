import { LogLevel } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { DAILY_POINTS, MISC_CONSTS, PENDLE_POOL_ADDRESSES, WSTUSR_ADDRESS } from "../consts.ts";
import {
  EVENT_POINT_INCREASE,
  POINT_SOURCE,
  POINT_SOURCE_SY,
  POINT_SOURCE_YT,
} from "../types.ts";

import { getRatios} from "../ratio.ts"

export async function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  impliedAmountHolding: bigint,
  holdingPeriod: bigint,
  updatedAt: number
) {
  //cal points with ratio
  const ratio = await getRatios(ctx)
  const points = Number(impliedAmountHolding) * Number(ratio.eigenPointsPerStoneHour.toString()) * Number(holdingPeriod) / 60 

  //Market Expires all SY points go to treasury
  if (label == POINT_SOURCE_SY && ctx.timestamp.getTime() > PENDLE_POOL_ADDRESSES.MARKET_EXPIRY) {
    increasePoint(
      ctx,
      label,
      PENDLE_POOL_ADDRESSES.TREASURY,
      0n,
      holdingPeriod,
      points,
      updatedAt
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
      updatedAt
    )
    increasePoint(
      ctx,
      label,
      PENDLE_POOL_ADDRESSES.TREASURY,
      0n,
      holdingPeriod,
      pointsTreasuryFee,     
      updatedAt
    );
  } else {
    increasePoint(
      ctx,
      label,
      account,
      impliedAmountHolding,
      holdingPeriod,
      points,
      updatedAt
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
  updatedAt: number
) {
  ctx.eventLogger.emit(EVENT_POINT_INCREASE, {
    label,
    account: account.toLowerCase(),
    impliedBalance: impliedAmountHolding.scaleDown(18),
    holdingPeriod,
    points: points/10**18,
    updatedAt,
    severity: LogLevel.INFO
  });
}

function calcTreasuryFee(amount: number): number {
  return amount * 3 / 100
}
