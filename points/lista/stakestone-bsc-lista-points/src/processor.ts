import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthChainId, EthContext } from "@sentio/sdk/eth";
import {
  ListaInteractionContext,
  ListaInteractionProcessor,
  getListaInteractionContractOnContext,
} from "./types/eth/listainteraction.js";
import { AccountSnapshot } from "./schema/store.js";
import { getEigenRatio } from "./eigen_ratio.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;

const TOKEN_DECIMALS = 18;

const STONE_ADDRESS = "0x80137510979822322193FC997d400D5A6C747bf7";
const LISTA_INTERACTION_CONTRACT_ADDRESS =
  "0xB68443Ee3e828baD1526b3e0Bdf2Dfc6b1975ec4";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

let lastEigenRatioTimestamp: number | undefined = undefined;

ListaInteractionProcessor.bind({
  network: EthChainId.BINANCE,
  address: LISTA_INTERACTION_CONTRACT_ADDRESS,
  startBlock: 38765592,
})
  .onEventDeposit(async (event, ctx) => {
    const { collateral, user } = event.args;
    if (collateral === STONE_ADDRESS) {
      await processAccount(ctx, user, event.name);
    }
  })
  .onEventWithdraw(async (event, ctx) => {
    const { user } = event.args;
    const accountSnapshot = await ctx.store.get(AccountSnapshot, user);
    if (accountSnapshot) {
      await processAccount(ctx, user, event.name);
    }
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

async function updateAll(ctx: ListaInteractionContext, triggerEvent: string) {
  const accounts = await ctx.store.list(AccountSnapshot, []);
  await Promise.all(
    accounts.map((account) =>
      processAccount(ctx, account.id.toString(), triggerEvent)
    )
  );
}

async function processAccount(
  ctx: EthContext,
  user: string,
  triggerEvent: string
) {
  const accountSnapshot = await ctx.store.get(AccountSnapshot, user);
  const points = accountSnapshot
    ? await calcPoints(ctx, accountSnapshot)
    : BigDecimal(0);
  const interactionContract = getListaInteractionContractOnContext(
    ctx,
    LISTA_INTERACTION_CONTRACT_ADDRESS
  );
  const newBalance = await interactionContract.locked(STONE_ADDRESS, user);
  const latestSnapshot = new AccountSnapshot({
    id: user,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    stoneBalance: newBalance,
  });
  await ctx.store.upsert(latestSnapshot);
  ctx.eventLogger.emit("point_update", {
    account: user,
    triggerEvent,
    points,
    newBalance,
    snapshotBalance: accountSnapshot ? accountSnapshot.stoneBalance : 0,
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

  const points = snapshot.stoneBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}
