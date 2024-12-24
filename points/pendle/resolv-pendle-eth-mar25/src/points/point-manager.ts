import { LogLevel } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { MULTIPLIER, DAILY_POINTS, MISC_CONSTS, PENDLE_POOL_ADDRESSES } from "../consts.ts";
import {
  EVENT_POINT_INCREASE,
  POINT_SOURCE,
  POINT_SOURCE_SY,
  POINT_SOURCE_YT,
} from "../types.ts";

export async function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  impliedAmountHolding: bigint,
  holdingPeriod: bigint,
  updatedAt: number
) {

  const points = Number(impliedAmountHolding) * Number(holdingPeriod) / 86400* DAILY_POINTS * MULTIPLIER
  // console.log("entering update points", impliedAmountHolding, holdingPeriod, lPoints)

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
    severity: LogLevel.INFO,
    multiplier: MULTIPLIER
  });
}

function calcTreasuryFee(amount: number): number {
  return amount * 3 / 100
}
