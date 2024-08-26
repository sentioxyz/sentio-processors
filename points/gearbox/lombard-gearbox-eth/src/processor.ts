import { getAddress } from "ethers";
import { GLOBAL_CONFIG } from "@sentio/runtime";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import { CreditFacadeProcessorTemplate } from "./types/eth/creditfacade.js";
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20";
import {
  CreditConfiguratorV3ProcessorTemplate,
  CreditManagerV3Processor,
} from "./types/eth/index.js";
import { CreditAccountSnapshot } from "./schema/store.js";
import {
  CREDIT_MANAGER_ADDRESS,
  DAILY_POINTS,
  LBTC_ADDRESS,
  MULTIPLIER,
  NETWORK,
} from "./config.js";

const MILLISECOND_PER_DAY = 60 * 60 * 1000 * 24;
const TOKEN_DECIMALS = 8;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const creditFacadeTemplate = new CreditFacadeProcessorTemplate()
  .onEventOpenCreditAccount(async (event, ctx) => {
    const { creditAccount, onBehalfOf } = event.args;
    const snapshot = new CreditAccountSnapshot({
      id: creditAccount,
      borrower: onBehalfOf,
      lbtcBalance: 0n,
      timestampMilli: BigInt(ctx.timestamp.getTime()),
    });

    await ctx.store.upsert(snapshot);
    ctx.eventLogger.emit("credit_account", {
      creditAccount,
      borrower: onBehalfOf,
      status: "open",
      creditFacade: getAddress(ctx.address),
    });
  })
  .onEventCloseCreditAccount(async (event, ctx) => {
    const { creditAccount, borrower } = event.args;

    try {
      await ctx.store.delete(CreditAccountSnapshot, creditAccount);

      ctx.eventLogger.emit("credit_account", {
        creditAccount,
        borrower,
        status: "close",
        creditFacade: getAddress(ctx.address),
      });
    } catch (e) {
      console.error(`Failed to remove credit account ${creditAccount}`, e);
    }
  });

const creditConfiguratorTemplate =
  new CreditConfiguratorV3ProcessorTemplate().onEventSetCreditFacade(
    async (event, ctx) => {
      const newCreditFacade = event.args.creditFacade;
      creditFacadeTemplate.bind({ address: newCreditFacade }, ctx);
      ctx.eventLogger.emit("credit_facade", {
        creditFacade: newCreditFacade,
      });
    }
  );

CreditManagerV3Processor.bind({
  network: NETWORK,
  address: CREDIT_MANAGER_ADDRESS,
}).onEventSetCreditConfigurator(async (event, ctx) => {
  const newConfigurator = event.args.newConfigurator;
  creditConfiguratorTemplate.bind({ address: newConfigurator }, ctx);
  ctx.eventLogger.emit("credit_configurator", {
    creditConfigurator: newConfigurator,
  });
});

ERC20Processor.bind({
  network: NETWORK,
  address: LBTC_ADDRESS,
})
  .onEventTransfer(async (event, ctx) => {
    const { from, to } = event.args;
    const fromCreditAccount = await ctx.store.get(CreditAccountSnapshot, from);
    const toCreditAccount = await ctx.store.get(CreditAccountSnapshot, to);
    if (fromCreditAccount) {
      await processCreditAccount(ctx, fromCreditAccount);
    }
    if (toCreditAccount) {
      await processCreditAccount(ctx, toCreditAccount);
    }
  })
  .onTimeInterval(
    async (_, ctx) => {
      const snapshots = await ctx.store.list(CreditAccountSnapshot);
      const promises = [];
      for (const snapshot of snapshots) {
        promises.push(processCreditAccount(ctx, snapshot));
      }
      await Promise.all(promises);
    },
    4 * 60,
    24 * 60
  );

async function processCreditAccount(
  ctx: ERC20Context,
  snapshot: CreditAccountSnapshot
) {
  const {
    id: idRaw,
    borrower,
    lbtcBalance: snapshotLbtcBalance,
    timestampMilli: snapshotTimestampMilli,
  } = snapshot;
  const id = idRaw.toString();
  const newTimestampMilli = ctx.timestamp.getTime();
  const deltaDay =
    (newTimestampMilli - Number(snapshotTimestampMilli)) / MILLISECOND_PER_DAY;
  const points = snapshotLbtcBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(deltaDay)
    .multipliedBy(DAILY_POINTS)
    .multipliedBy(MULTIPLIER);

  const newLbtcBalance = await ctx.contract.balanceOf(id);
  const newSnapshot = new CreditAccountSnapshot({
    id,
    borrower,
    lbtcBalance: newLbtcBalance,
    timestampMilli: BigInt(newTimestampMilli),
  });
  await ctx.store.upsert(newSnapshot);

  ctx.eventLogger.emit("point_update", {
    account: borrower,
    lPoints: points,
    bPoints: 0,
    creditAccount: id,
    snapshotLbtcBalance,
    snapshotTimestampMilli,
    newLbtcBalance,
    newTimestampMilli,
    multiplier: MULTIPLIER,
  });
}
