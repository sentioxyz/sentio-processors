import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId, isNullAddress } from "@sentio/sdk/eth";
import { ATokenContext, ATokenProcessor } from "./types/eth/atoken.js";
import { AccountSnapshot } from "./schema/store.js";
import { getEigenRatio } from "./eigen_ratio.js";
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20";

const ATOKEN_ADDRESS = "0x4f908f7e51e5f03c937452f74c467bf071858aaf";
const STONE_ADDRESS = "0x80137510979822322193FC997d400D5A6C747bf7";
const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

ATokenProcessor.bind({
  address: ATOKEN_ADDRESS,
  network: EthChainId.SCROLL,
})
  .onEventMint(async (event, ctx) => {
    await process(ctx, event.args.from, event.name);
  })
  .onEventBurn(async (event, ctx) => {
    await process(ctx, event.args.from, event.name);
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

async function updateAll(ctx: ATokenContext, triggerEvent: string) {
  const accounts = await ctx.store.list(AccountSnapshot, []);
  await Promise.all(
    accounts.map((account) => process(ctx, account.id.toString(), triggerEvent))
  );
}

async function process(
  ctx: ATokenContext,
  account: string,
  triggerEvent: string
) {
  const snapshot = await ctx.store.get(AccountSnapshot, account);
  const snapshotTimestampMilli = Number(snapshot?.timestampMilli ?? 0n);
  const snapshotStoneBalance = snapshot?.stoneBalance ?? 0n;
  const points = await calculatePoints(
    ctx,
    snapshotTimestampMilli,
    snapshotStoneBalance
  );

  const newTimestampMilli = BigInt(ctx.timestamp.getTime());
  const [newLpBalance, newTotalSupply, totalStone] = await Promise.all([
    ctx.contract.balanceOf(account),
    ctx.contract.totalSupply(),
    getERC20ContractOnContext(ctx, STONE_ADDRESS).balanceOf(ctx.address),
  ]);
  const newStoneBalance = (totalStone * newLpBalance) / newTotalSupply;
  const newSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: newTimestampMilli,
    stoneBalance: newStoneBalance,
  });
  await ctx.store.upsert(newSnapshot);

  ctx.eventLogger.emit("point_update", {
    account,
    points,
    snapshotTimestampMilli,
    snapshotStoneBalance,
    newTimestampMilli,
    newStoneBalance,
    triggerEvent,
  });
}

async function calculatePoints(
  ctx: ATokenContext,
  snapshotTimestampMilli: number,
  snapshotStoneBalance: bigint
): Promise<BigDecimal> {
  const nowMilli = ctx.timestamp.getTime();
  const snapshotMilli = Number(snapshotTimestampMilli);
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshotTimestampMilli,
      snapshotStoneBalance
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR;

  const points = snapshotStoneBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}
