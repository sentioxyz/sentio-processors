import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId, isNullAddress } from "@sentio/sdk/eth";
import {
  SturdyPairContext,
  SturdyPairProcessor,
} from "./types/eth/sturdypair.js";
import { AccountSnapshot } from "./schema/store.js";
import { getEigenRatio } from "./eigen_ratio.js";

const STURDYPAIR_ADDRESS = "0x56da71dd546fb60a39accda39b175378cab58e88"; // fWETH(STONE)-10

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

SturdyPairProcessor.bind({
  address: STURDYPAIR_ADDRESS,
  network: EthChainId.MODE,
})
  .onEventAddCollateral(async (event, ctx) => {
    await process(ctx, event.args.borrower, event.name);
  })
  .onEventRemoveCollateral(async (event, ctx) => {
    await process(ctx, event.args._borrower, event.name);
  })
  .onEventDeposit(async (event, ctx) => {
    await process(ctx, event.args.owner, event.name);
  })
  .onEventWithdraw(async (event, ctx) => {
    await process(ctx, event.args.owner, event.name);
  })
  .onEventUpdateRate(async (event, ctx) => {
    const accounts = await ctx.store.list(AccountSnapshot, []);
    await Promise.all(
      accounts.map((snapshot) => {
        return process(ctx, snapshot.id.toString(), event.name);
      })
    );
  })
  .onEventTransfer(async (event, ctx) => {
    const { from, to } = event.args;
    const accounts = [from, to].filter((account) => !isNullAddress(account));
    await Promise.all(
      accounts.map((account) => process(ctx, account, event.name))
    );
  })
  .onTimeInterval(
    async (_, ctx) => {
      await updateAll(ctx, "TimeInterval");
    },
    4 * 60,
    24 * 60
  )
  .onTimeInterval(
    async (_, ctx) => {
      const ratio = await getEigenRatio(ctx);
      if (ratio.timestampMilli == lastEigenRatioTimestamp) {
        return;
      }
      await updateAll(ctx, "EigenRatioUpdate");
      lastEigenRatioTimestamp = ratio.timestampMilli;
    },
    30,
    30
  );

async function updateAll(ctx: SturdyPairContext, triggerEvent: string) {
  const accounts = await ctx.store.list(AccountSnapshot, []);
  await Promise.all(
    accounts.map((snapshot) => {
      return process(ctx, snapshot.id.toString(), triggerEvent);
    })
  );
}

async function process(
  ctx: SturdyPairContext,
  account: string,
  triggerEvent: string
) {
  const snapshot = await ctx.store.get(AccountSnapshot, account);
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotBalance = snapshot?.balance ?? 0n;

  const newBalance = await ctx.contract.userCollateralBalance(account);

  const points = await calculatePoints(
    ctx,
    snapshotTimestampMilli,
    snapshotBalance
  );

  const newTimestampMilli = ctx.timestamp.getTime();
  const newSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: BigInt(newTimestampMilli),
    balance: newBalance,
  });
  await ctx.store.upsert(newSnapshot);

  ctx.eventLogger.emit("point_update", {
    account,
    points,
    snapshotTimestampMilli,
    snapshotBalance,
    newTimestampMilli,
    newBalance,
    triggerEvent,
  });
}

async function calculatePoints(
  ctx: SturdyPairContext,
  snapshotTimestampMilli: number,
  snapshotBalance: bigint
): Promise<BigDecimal> {
  const nowMilli = ctx.timestamp.getTime();
  const snapshotMilli = Number(snapshotTimestampMilli);
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshotTimestampMilli,
      snapshotBalance
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR;

  const points = snapshotBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}
