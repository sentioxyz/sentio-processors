import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthContext, isNullAddress, TypedEvent } from "@sentio/sdk/eth";

import { LTokenContext, LTokenProcessor } from "./types/eth/ltoken.js";

import { AccountSnapshot, GlobalState, TempEvent } from "./schema/store.js";
import { TOKEN_DECIMALS, configs, getConfig } from "./config.js";
import { storeDelete, storeListAll, storeUpsert } from "./store_utils.js";
import {
  eigenRatioStartTimestampMilli,
  getEigenRatio,
  getEigenRatioByTime,
} from "./eigen_ratio.js";
import { getGlobalState, setGlobalState } from "./state.js";
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const EVENT_BUFFER_SIZE = 1000;
const EXCHANGE_RATE_DECIMALS = 18;

const lastEigenRatioTimestamp: Record<string, number> = {};

configs.forEach((config) =>
  LTokenProcessor.bind({
    network: config.network,
    address: config.address,
  })
    .onEventTransfer(async (event, ctx) => {
      const { from, to } = event.args;
      const accounts = [from, to].filter((account) => !isNullAddress(account));
      const evt = new TempEvent({
        ...baseEvent(ctx, event),
        args: accounts.join(","),
      });
      await storeUpsert(ctx, evt);
    })
    .onEventBorrow(async (event, ctx) => {
      const evt = new TempEvent({
        ...baseEvent(ctx, event),
        args: event.args.account,
      });
      await storeUpsert(ctx, evt);
    })
    .onEventRepayBorrow(async (event, ctx) => {
      const evt = new TempEvent({
        ...baseEvent(ctx, event),
        args: event.args.borrower,
      });
      await storeUpsert(ctx, evt);
    })
    .onTimeInterval(
      async (_, ctx) => {
        const ratio = await getEigenRatio(ctx);
        const las = lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address];
        const events = await storeListAll(ctx, TempEvent);
        if (
          ratio.timestampMilli == las &&
          events.length < EVENT_BUFFER_SIZE &&
          ctx.timestamp.getTime() < Date.now() - MILLISECOND_PER_HOUR * 24 // workaround: if already catch up, need to update regularly
        ) {
          return;
        }
        lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address] =
          ratio.timestampMilli;
        events.sort((a, b) => {
          if (a.blockNumber != b.blockNumber) {
            return a.blockNumber - b.blockNumber;
          }
          if (a.txIdx != b.txIdx) {
            return a.txIdx - b.txIdx;
          }
          return a.eventIdx - b.eventIdx;
        });
        await updateAccounts(ctx, events);
        await storeDelete(
          ctx,
          TempEvent,
          events.map((e) => e.id.toString())
        );
      },
      60,
      60
    )
);

async function updateAccounts(ctx: LTokenContext, events: TempEvent[]) {
  const conf = getConfig(ctx.chainId)!;
  const rnpStoneContract = conf
    ? getERC20ContractOnContext(ctx, conf.rnpTokenAddress)
    : undefined;

  const start = new Date().getTime();
  const promises: Promise<[string, bigint]>[] = [];
  for (const event of events) {
    const bn = event.blockNumber;
    const overrides = { blockTag: bn };
    const eventAccounts = event.args.split(",");
    promises.push(
      ctx.contract.totalSupply(overrides).then((v) => [`totalSupply_${bn}`, v]),
      ctx.contract.totalBorrow(overrides).then((v) => [`totalBorrow_${bn}`, v]),
      ctx.contract
        .exchangeRate(overrides)
        .then((v) => [`exchangeRate_${bn}`, v])
    );
    for (const account of eventAccounts) {
      promises.push(
        // ctx.contract
        //   .underlyingBalanceOf(account, overrides)
        //   .then((v) => [`underlyingBalanceOf_${account}_${bn}`, v]),
        ctx.contract
          .balanceOf(account, overrides)
          .then((v) => [`balanceOf_${account}_${bn}`, v]),
        ctx.contract
          .borrowBalanceOf(account, overrides)
          .then((v) => [`borrowBalanceOf_${account}_${bn}`, v]),
        rnpStoneContract && bn >= conf.rnpTokenStartBlock
          ? rnpStoneContract
              .balanceOf(account, overrides)
              .then((v) => [`rnpStone_balanceOf_${account}_${bn}`, v])
          : Promise.resolve([`rnpStone_balanceOf_${account}_${bn}`, 0n])
      );
    }
  }
  const callResults = Object.fromEntries(await Promise.all(promises));

  const elapsed = new Date().getTime() - start;
  const total = Object.keys(callResults).length;
  console.log(
    `chain ${ctx.chainId} got call results, total: ${total}, elapsed: ${elapsed}ms, avg: ${elapsed / total}ms`
  );

  const snapshots = Object.fromEntries(
    (await storeListAll(ctx, AccountSnapshot)).map((snapshot) => [
      snapshot.id.toString(),
      snapshot,
    ])
  );
  const state = await getGlobalState(ctx);
  const eventsWithSentry = [
    ...events,
    new TempEvent({
      eventName: "end",
      timestampMilli: BigInt(ctx.timestamp.getTime()),
    }),
  ];

  const shouldUpdatePoints =
    ctx.timestamp.getTime() >= eigenRatioStartTimestampMilli;
  console.log(
    `chain ${ctx.chainId} start, ${eventsWithSentry.length} temp events, ${Object.keys(snapshots).length} snapshots, shouldUpdatePoints: ${shouldUpdatePoints}`
  );

  const pointsSum: Record<string, BigDecimal> = {};
  for (let i = 0; i < eventsWithSentry.length; i++) {
    if (i % 100 == 0 && i > 0) {
      console.log(
        `chain ${ctx.chainId} temp event ${i}/${eventsWithSentry.length}`
      );
    }
    const event = eventsWithSentry[i];
    const nowMilli = Number(event.timestampMilli);
    const eigenRatio = await getEigenRatioByTime(nowMilli);

    if (shouldUpdatePoints) {
      const m = (state.totalSupply - state.totalBorrow)
        .scaleDown(TOKEN_DECIMALS)
        .div(state.totalPositiveNetBalance.asBigDecimal())
        .multipliedBy(eigenRatio.ratio);
      for (const snapshot of Object.values(snapshots)) {
        if (snapshot.netBalance <= 0) {
          continue;
        }
        const account = snapshot.id.toString();

        // const points = calcPoints(nowMilli, state, snapshot, eigenRatio);
        const points = calcPoints(nowMilli, snapshot, m);
        if (!pointsSum[account]) {
          pointsSum[account] = new BigDecimal(0);
        }
        pointsSum[account] = pointsSum[account].plus(points);
        snapshot.timestampMilli = BigInt(nowMilli);
      }
    }
    if (event.eventName === "end") {
      break;
    }

    // update global state and accounts
    const bn = event.blockNumber;
    const eventAccounts = event.args.split(",");
    state.totalSupply = callResults[`totalSupply_${bn}`];
    state.totalBorrow = callResults[`totalBorrow_${bn}`];
    const exchangeRate = callResults[`exchangeRate_${bn}`];
    for (const account of eventAccounts) {
      if (isProtocolAddress(account)) {
        continue;
      }
      const snapshot =
        snapshots[account] ??
        new AccountSnapshot({ id: account, netBalance: 0n });
      if (snapshot.netBalance > 0n) {
        state.totalPositiveNetBalance -= snapshot.netBalance;
      }
      const newLpBalance = callResults[`balanceOf_${account}_${bn}`];
      const newRnpStoneBalance =
        callResults[`rnpStone_balanceOf_${account}_${bn}`];
      const newBalance =
        ((newLpBalance + newRnpStoneBalance) * exchangeRate) / 10n ** 18n;
        
      const newBorrowBalance = callResults[`borrowBalanceOf_${account}_${bn}`];
      const newNetBalance = newBalance - newBorrowBalance;
      if (newNetBalance > 0n) {
        state.totalPositiveNetBalance += newNetBalance;
      }
      snapshots[account] = new AccountSnapshot({
        id: account,
        timestampMilli: BigInt(nowMilli),
        balance: newBalance,
        borrowBalance: newBorrowBalance,
        netBalance: newNetBalance,
      });
    }
  }
  console.log(
    `chain ${ctx.chainId} finish ${eventsWithSentry.length} temp events, ${Object.keys(snapshots).length} snapshots`
  );

  if (shouldUpdatePoints) {
    for (const [account, points] of Object.entries(pointsSum)) {
      const snapshot = snapshots[account];
      ctx.eventLogger.emit("point_update", {
        account,
        points,
        balance: snapshot.balance,
        borrowBalance: snapshot.borrowBalance,
        netBalance: snapshot.netBalance,
        totalSupply: state.totalSupply,
        totalBorrow: state.totalBorrow,
        totalPositiveNetBalance: state.totalPositiveNetBalance,
        timestampMilli: ctx.timestamp.getTime(),
      });
    }
  }
  await storeUpsert(ctx, Object.values(snapshots));
  await setGlobalState(ctx, state);

  // console.log(`chain ${ctx.chainId} finish upsert`);
}

function calcPoints(
  nowMilli: number,
  // state: GlobalState,
  accountSnapshot: AccountSnapshot,
  // eigenRatio: BigDecimal,
  m: BigDecimal
): BigDecimal {
  if (nowMilli < Number(accountSnapshot.timestampMilli)) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      accountSnapshot
    );
    return new BigDecimal(0);
  } else if (nowMilli == Number(accountSnapshot.timestampMilli)) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }

  if (accountSnapshot.netBalance <= 0) {
    return new BigDecimal(0);
  }

  const deltaHour =
    (nowMilli - Number(accountSnapshot.timestampMilli)) / MILLISECOND_PER_HOUR;

  const points = accountSnapshot.netBalance
    .asBigDecimal()
    .multipliedBy(m)
    .multipliedBy(deltaHour);

  // const points = (
  //   (state.totalSupply - state.totalBorrow) *
  //   accountSnapshot.netBalance
  // )
  //   .scaleDown(TOKEN_DECIMALS)
  //   .div(state.totalPositiveNetBalance.asBigDecimal())
  //   .multipliedBy(eigenRatio)
  // .multipliedBy(deltaHour);

  return points;
}

function baseEvent(ctx: EthContext, event: TypedEvent) {
  return {
    id: event.blockNumber + "," + event.transactionIndex + "," + event.index,
    blockNumber: ctx.blockNumber,
    txIdx: event.transactionIndex,
    eventIdx: event.index,
    eventName: event.name,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
  };
}

function isProtocolAddress(address: string) {
  return (
    isNullAddress(address) ||
    configs
      .map((c) => c.rnpTokenAddress.toLowerCase())
      .includes(address.toLowerCase())
  );
}
