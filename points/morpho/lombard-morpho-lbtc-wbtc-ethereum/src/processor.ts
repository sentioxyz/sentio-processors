import { BigDecimal } from "@sentio/sdk";
import { GLOBAL_CONFIG } from "@sentio/runtime";
import { MorphoContext, MorphoProcessor } from "./types/eth/morpho.js";
import { AccountSnapshot } from "./schema/store.js";
import {
  DAILY_POINTS,
  LBTC_WBTC_MARKET_ID,
  MILLISECOND_PER_DAY,
  MORPHO_ADDRESS,
  MULTIPLIER,
  NETWORK,
} from "./config.js";

const START_BLOCK = 20570000;

const TOKEN_DECIMALS = 8;
const VIRTUAL_SHARES = BigInt(1e6);
const VIRTUAL_ASSETS = BigInt(1);

GLOBAL_CONFIG.execution = {
  sequential: true,
};

MorphoProcessor.bind({
  address: MORPHO_ADDRESS,
  network: NETWORK,
  startBlock: START_BLOCK,
})
  .onEventSupply(async (event, ctx) => {
    const { id, onBehalf } = event.args;
    await processAccount(ctx, onBehalf, undefined, event.name);
  }, MorphoProcessor.filters.Supply(LBTC_WBTC_MARKET_ID))
  .onEventWithdraw(async (event, ctx) => {
    const { id, onBehalf } = event.args;
    await processAccount(ctx, onBehalf, undefined, event.name);
  }, MorphoProcessor.filters.Withdraw(LBTC_WBTC_MARKET_ID))
  .onEventSupplyCollateral(async (event, ctx) => {
    const { id, onBehalf } = event.args;
    await processAccount(ctx, onBehalf, undefined, event.name);
  }, MorphoProcessor.filters.SupplyCollateral(LBTC_WBTC_MARKET_ID))
  .onEventWithdrawCollateral(async (event, ctx) => {
    const { id, onBehalf } = event.args;
    await processAccount(ctx, onBehalf, undefined, event.name);
  }, MorphoProcessor.filters.WithdrawCollateral(LBTC_WBTC_MARKET_ID))
  .onEventLiquidate(async (event, ctx) => {
    const { id, borrower } = event.args;
    await processAccount(ctx, borrower, undefined, event.name);
  }, MorphoProcessor.filters.Liquidate(LBTC_WBTC_MARKET_ID))
  .onTimeInterval(
    async (_, ctx) => {
      const snapshots = await ctx.store.list(AccountSnapshot);
      await Promise.all(
        snapshots.map((snapshot) =>
          processAccount(ctx, snapshot.id, snapshot, "TimeInterval")
        )
      );
    },
    60,
    24 * 60
  );

async function processAccount(
  ctx: MorphoContext,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, account);
  }

  const snapshotTimestampMilli = Number(
    snapshot?.timestampMilli.toString() ?? "0"
  );
  const snapshotLbtcBalance = BigInt(snapshot?.lbtcBalance.toString() ?? "0");
  const snapshotWbtcBalance = BigInt(snapshot?.wbtcBalance.toString() ?? "0");

  const [collateralPoints, supplyPoints] = calcPoints(
    ctx,
    snapshotTimestampMilli,
    snapshotLbtcBalance,
    snapshotWbtcBalance
  );

  const [position, market] = await Promise.all([
    ctx.contract.position(LBTC_WBTC_MARKET_ID, account),
    ctx.contract.market(LBTC_WBTC_MARKET_ID),
  ]);

  const newTimestampMilli = ctx.timestamp.getTime();
  const newLbtcBalance = position.collateral;
  const newWbtcBalance = toAssetsDown(
    position.supplyShares,
    market.totalSupplyAssets,
    market.totalSupplyShares
  );
  await ctx.store.upsert(
    new AccountSnapshot({
      id: account,
      lbtcBalance: newLbtcBalance,
      wbtcBalance: newWbtcBalance,
      timestampMilli: BigInt(newTimestampMilli),
    })
  );

  ctx.eventLogger.emit("point_update", {
    account,
    bPoints: 0,
    lPoints: collateralPoints,
    // supplyPoints,
    snapshotTimestampMilli,
    snapshotLbtcBalance,
    snapshotWbtcBalance,
    newTimestampMilli,
    newLbtcBalance,
    newWbtcBalance,
    triggerEvent,
    multiplier: MULTIPLIER,
  });
}

function calcPoints(
  ctx: MorphoContext,
  snapshotMilli: number,
  snapshotLbtcBalance: bigint,
  snapshotWbtcBalance: bigint
): [BigDecimal, BigDecimal] {
  const nowMilli = ctx.timestamp.getTime();
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshotMilli
    );
    return [new BigDecimal(0), new BigDecimal(0)];
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return [new BigDecimal(0), new BigDecimal(0)];
  }

  const timeDiff = nowMilli - snapshotMilli;
  const pointsForCollateral = points(snapshotLbtcBalance, timeDiff);
  const pointsForSupply = points(snapshotWbtcBalance, timeDiff);
  return [pointsForCollateral, pointsForSupply];
}

function points(balance: bigint, timeDiff: number): BigDecimal {
  const deltaDay = timeDiff / MILLISECOND_PER_DAY;
  return balance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(deltaDay)
    .multipliedBy(DAILY_POINTS)
    .multipliedBy(MULTIPLIER);
}

// Port from SharesMathLib.toAssetsDown
function toAssetsDown(
  shares: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint {
  return (
    (shares * (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES)
  );
}
