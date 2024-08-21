import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import {
  ZtakingPoolContext,
  ZtakingPoolProcessor,
} from "./types/eth/ztakingpool.js";
import { getEigenRatio } from "./eigen_ratio.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

const ZtakingPoolAddress = "0xf047ab4c75cebf0eb9ed34ae2c186f3611aeafa6";
const CSTONE_ADDRESS = "0x4d831e22f062b5327dfdb15f0b6a5df20e2e3dd0";
const CSTONE_START_BLOCK = 19546580;

ZtakingPoolProcessor.bind({
  address: ZtakingPoolAddress,
  network: EthChainId.ETHEREUM,
  startBlock: CSTONE_START_BLOCK,
})
  .onEventDeposit(
    async (event, ctx) => {
      await process(ctx, event.args.depositor, event.name);
    },
    ZtakingPoolProcessor.filters.Deposit(undefined, undefined, CSTONE_ADDRESS)
  )
  .onEventWithdraw(
    async (event, ctx) => {
      await process(ctx, event.args.withdrawer, event.name);
    },
    ZtakingPoolProcessor.filters.Withdraw(undefined, undefined, CSTONE_ADDRESS)
  )
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

async function updateAll(ctx: ZtakingPoolContext, triggerEvent: string) {
  const accounts = await ctx.store.list(AccountSnapshot, []);
  await Promise.all(
    accounts.map((account) => process(ctx, account.id.toString(), triggerEvent))
  );
}

async function process(
  ctx: ZtakingPoolContext,
  account: string,
  triggerEvent: string
) {
  const snapshot = await ctx.store.get(AccountSnapshot, account);
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotBalance = snapshot?.balance ?? 0n;
  const points = await calculatePoints(
    ctx,
    snapshotTimestampMilli,
    snapshotBalance
  );

  const newTimestampMilli = BigInt(ctx.timestamp.getTime());
  const newBalance = await ctx.contract.balance(CSTONE_ADDRESS, account); // (tokenAddress => stakerAddress => stakedAmount)
  const newSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: newTimestampMilli,
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
  ctx: ZtakingPoolContext,
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
