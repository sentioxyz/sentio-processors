import { GLOBAL_CONFIG } from "@sentio/runtime";
import { EthChainId, isNullAddress } from "@sentio/sdk/eth";
import { BigDecimal } from "@sentio/sdk";
import { AccountSnapshot } from "./schema/store.js";
import { getEigenRatio } from "./eigen_ratio.js";
import {
  CErc20DelegateContext,
  CErc20DelegateProcessor,
} from "./types/eth/cerc20delegate.js";

const IONIC_STONE_MARKET = "0x959FA710CCBb22c7Ce1e59Da82A247e686629310";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

CErc20DelegateProcessor.bind({
  network: EthChainId.MODE,
  address: IONIC_STONE_MARKET,
})
  .onEventTransfer(async (event, ctx) => {
    const { from, to } = event.args;
    const accounts = [from, to].filter((account) => !isNullAddress(account));
    await Promise.all(
      accounts.map((account) => processAccount(ctx, account, event.name))
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

async function updateAll(ctx: CErc20DelegateContext, triggerEvent: string) {
  const accounts = await ctx.store.list(AccountSnapshot, []);
  await Promise.all(
    accounts.map((account) =>
      processAccount(ctx, account.id.toString(), triggerEvent)
    )
  );
}

async function processAccount(
  ctx: CErc20DelegateContext,
  account: string,
  triggerEvent: string
) {
  const snapshot = await ctx.store.get(AccountSnapshot, account);
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotBalance = snapshot?.stoneBalance ?? 0n;
  const snapshotTotalSupply = snapshot?.totalSupply ?? 0n;
  const snapshotTotalBorrow = snapshot?.totalBorrow ?? 0n;
  const points = snapshot ? await calcPoints(ctx, snapshot) : new BigDecimal(0);

  const newTimestampMilli = ctx.timestamp.getTime();
  const supplyBalance = await ctx.contract.balanceOfUnderlying(account);
  const borrowBalance = await ctx.contract.borrowBalanceCurrent(account);
  const newBalance =
    supplyBalance > borrowBalance ? supplyBalance - borrowBalance : 0n;
  const newTotalSupply = await ctx.contract.totalSupply();
  const newTotalBorrow = await ctx.contract.totalBorrows();
  const newSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: BigInt(newTimestampMilli),
    stoneBalance: newBalance,
    totalBorrow: newTotalBorrow,
    totalSupply: newTotalSupply,
  });
  await ctx.store.upsert(newSnapshot);

  ctx.eventLogger.emit("point_update", {
    account,
    points,
    snapshotTimestampMilli,
    snapshotBalance,
    snapshotTotalSupply,
    snapshotTotalBorrow,
    newTimestampMilli,
    newBalance,
    newTotalSupply,
    newTotalBorrow,
    triggerEvent,
  });
}

async function calcPoints(
  ctx: CErc20DelegateContext,
  snapshot: AccountSnapshot
): Promise<BigDecimal> {
  const nowMilli = ctx.timestamp.getTime();
  const snapshotMilli = Number(snapshot.timestampMilli);
  if (nowMilli < snapshot.timestampMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshotMilli
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaHour =
    (ctx.timestamp.getTime() - snapshotMilli) / MILLISECOND_PER_HOUR;

  const ratio = (snapshot.totalSupply - snapshot.totalBorrow)
    .asBigDecimal()
    .div(snapshot.totalSupply.asBigDecimal());

  const points = snapshot.stoneBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(ratio)
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}
