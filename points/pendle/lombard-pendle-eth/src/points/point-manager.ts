import { LogLevel } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { MULTIPLIER, DAILY_POINTS, MISC_CONSTS, PENDLE_POOL_ADDRESSES } from "../consts.ts";
import {
  EVENT_POINT_INCREASE,
  POINT_SOURCE,
  POINT_SOURCE_YT,
} from "../types.ts";

export async function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountHolding: bigint,
  holdingPeriod: bigint,
  updatedAt: number
) {

  const lPoints = (amountHolding * holdingPeriod / 86400n) * BigInt(DAILY_POINTS * MULTIPLIER)
  const bPoints = 0n
  // console.log("entering update points", amountHolding, holdingPeriod, lPoints)


  if (label == POINT_SOURCE_YT) {
    const lPointsTreasuryFee = calcTreasuryFee(lPoints)
    const bPointsTreasuryFee = calcTreasuryFee(bPoints);
    increasePoint(
      ctx,
      label,
      account,
      amountHolding,
      holdingPeriod,
      lPoints - lPointsTreasuryFee,
      bPoints - bPointsTreasuryFee,
      updatedAt
    )
    increasePoint(
      ctx,
      label,
      PENDLE_POOL_ADDRESSES.TREASURY,
      0n,
      holdingPeriod,
      lPointsTreasuryFee,
      bPointsTreasuryFee,
      updatedAt
    );
  } else {
    increasePoint(
      ctx,
      label,
      account,
      amountHolding,
      holdingPeriod,
      lPoints,
      bPoints,
      updatedAt
    );
  }
}

function increasePoint(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  amountHolding: bigint,
  holdingPeriod: bigint,
  lPoints: bigint,
  bPoints: bigint,
  updatedAt: number
) {
  ctx.eventLogger.emit(EVENT_POINT_INCREASE, {
    label,
    account: account.toLowerCase(),
    lbtcBalance: amountHolding.scaleDown(8),
    holdingPeriod,
    lPoints: lPoints.scaleDown(8),
    bPoints: bPoints.scaleDown(8),
    updatedAt,
    severity: LogLevel.INFO,
  });
}

function calcTreasuryFee(amount: bigint): bigint {
  return amount * 3n / 100n
}
