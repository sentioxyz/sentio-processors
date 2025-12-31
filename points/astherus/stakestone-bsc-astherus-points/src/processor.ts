import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId, EthContext } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import { getEigenRatio } from "./eigen_ratio.js";
import { AstherusVaultProcessor } from "./types/eth/astherusvault.js";
import { getStoneBalances } from "./api.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;

const STONE_ADDRESS = "0x80137510979822322193FC997d400D5A6C747bf7";
const VAULT = "0x128463A60784c4D3f46c23Af3f65Ed859Ba87974";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

AstherusVaultProcessor.bind({
  network: EthChainId.BSC,
  address: VAULT,
  startBlock: 38765592,
})
  .onEventDeposit(
    async (event, ctx) => {
      await updateAccounts(ctx, event.name);
    },
    AstherusVaultProcessor.filters.Deposit(null, STONE_ADDRESS)
  )
  .onEventWithdraw(
    async (event, ctx) => {
      await updateAccounts(ctx, event.name);
    },
    AstherusVaultProcessor.filters.Withdraw(null, null, STONE_ADDRESS)
  )
  .onTimeInterval(
    async (_, ctx) => {
      await updateAccounts(ctx, "TimeInterval");
    },
    60,
    24 * 60
  )
  .onTimeInterval(
    async (_, ctx) => {
      const ratio = await getEigenRatio(ctx);
      if (ratio.timestampMilli == lastEigenRatioTimestamp) {
        return;
      }
      await updateAccounts(ctx, "EigenRatioUpdate");
      lastEigenRatioTimestamp = ratio.timestampMilli;
    },
    30,
    30
  );

async function updateAccounts(ctx: EthContext, triggerEvent: string) {
  const balances = await getStoneBalances(ctx);
  await Promise.all(
    Object.entries(balances).map(async ([account, balance]) =>
      processAccount(ctx, account, balance, triggerEvent)
    )
  );
}

async function processAccount(
  ctx: EthContext,
  account: string,
  newBalance: number,
  triggerEvent: string
) {
  const accountSnapshot = await ctx.store.get(AccountSnapshot, account);
  const points = accountSnapshot
    ? await calcPoints(ctx, accountSnapshot)
    : BigDecimal(0);

  const latestSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    balance: new BigDecimal(newBalance),
  });
  await ctx.store.upsert(latestSnapshot);
  ctx.eventLogger.emit("point_update", {
    account,
    triggerEvent,
    points,
    newBalance,
    snapshotBalance: accountSnapshot ? accountSnapshot.balance.toString() : "0",
    newTimestamp: ctx.timestamp.getTime(),
    snapshotTimestamp: accountSnapshot ? accountSnapshot.timestampMilli : 0,
  });
}

async function calcPoints(
  ctx: EthContext,
  snapshot: AccountSnapshot
): Promise<BigDecimal> {
  const nowMilli = ctx.timestamp.getTime();
  const snapshotMilli = Number(snapshot.timestampMilli);
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshot
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaHour =
    (ctx.timestamp.getTime() - Number(snapshot.timestampMilli)) /
    MILLISECOND_PER_HOUR;

  const points = snapshot.balance
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}
