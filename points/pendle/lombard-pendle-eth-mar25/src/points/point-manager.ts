import { LogLevel } from "@sentio/sdk";
import { EthContext } from "@sentio/sdk/eth";
import { MULTIPLIER, DAILY_POINTS, MISC_CONSTS, PENDLE_POOL_ADDRESSES } from "../consts.js";
import {
  EVENT_POINT_INCREASE,
  POINT_SOURCE,
  POINT_SOURCE_SY,
  POINT_SOURCE_YT,
} from "../types.js";

export async function updatePoints(
  ctx: EthContext,
  label: POINT_SOURCE,
  account: string,
  impliedAmountHolding: bigint,
  holdingPeriod: bigint,
  updatedAt: number
) {

  const lPoints = (impliedAmountHolding * holdingPeriod / 86400n) * BigInt(DAILY_POINTS * MULTIPLIER)
  const bPoints = 0n
  // console.log("entering update points", impliedAmountHolding, holdingPeriod, lPoints)

  //Market Expires all SY points go t
  if (label == POINT_SOURCE_SY && ctx.timestamp.getTime() > PENDLE_POOL_ADDRESSES.MARKET_EXPIRY) {
    increasePoint(
      ctx,
      label,
      PENDLE_POOL_ADDRESSES.TREASURY,
      0n,
      holdingPeriod,
      lPoints,
      bPoints,
      updatedAt
    )
    return
  }

  // Handle Treasury Fee
  if (label == POINT_SOURCE_YT) {
    const lPointsTreasuryFee = calcTreasuryFee(lPoints)
    const bPointsTreasuryFee = calcTreasuryFee(bPoints);
    increasePoint(
      ctx,
      label,
      account,
      impliedAmountHolding,
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
      impliedAmountHolding,
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
  impliedAmountHolding: bigint,
  holdingPeriod: bigint,
  lPoints: bigint,
  bPoints: bigint,
  updatedAt: number
) {
  ctx.eventLogger.emit(EVENT_POINT_INCREASE, {
    label,
    account: account.toLowerCase(),
    impliedLbtcBalance: impliedAmountHolding.scaleDown(8),
    holdingPeriod,
    lPoints: lPoints.scaleDown(8),
    bPoints: bPoints.scaleDown(8),
    updatedAt,
    severity: LogLevel.INFO,
    multiplier: MULTIPLIER
  });
}

function calcTreasuryFee(amount: bigint): bigint {
  return amount * 3n / 100n
}
