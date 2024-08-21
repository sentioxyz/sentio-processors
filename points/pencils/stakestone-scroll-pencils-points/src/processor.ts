import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId, isNullAddress } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20";
import { getEigenRatio } from "./eigen_ratio.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

const PSTONE_ADDRESS = "0x20de0435e5674ef15e78ada570159984524b9e8f"; // 1:1 with STONE

ERC20Processor.bind({
  address: PSTONE_ADDRESS,
  network: EthChainId.SCROLL,
})
  .onEventTransfer(async (event, ctx) => {
    const accounts = [event.args.from, event.args.to].filter(
      (account) => !isNullAddress(account)
    );
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

  async function updateAll(ctx: ERC20Context, triggerEvent: string) {
    const snapshots = await ctx.store.list(AccountSnapshot, []);
      await Promise.all(
        snapshots.map((snapshot) =>
          process(ctx, snapshot.id.toString(), triggerEvent)
        )
      );
  }
  

async function process(
  ctx: ERC20Context,
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
  const newBalance = await ctx.contract.balanceOf(account);
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
  ctx: ERC20Context,
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
