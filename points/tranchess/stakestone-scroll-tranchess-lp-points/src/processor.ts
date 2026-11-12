import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthContext, isNullAddress, TypedEvent } from "@sentio/sdk/eth";
import { AccountSnapshot, GlobalState, TempEvent } from "./schema/store.js";
import {
  LIQUIDITY_GAUGE_ADDRESS,
  NETWORK,
  STABLE_SWAP_ADDRESS,
  TOKEN_DECIMALS,
} from "./config.js";
import { getEigenRatio, getEigenRatioByTime } from "./eigen_ratio.js";
import { getGlobalState, setGlobalState } from "./state.js";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import {
  BishopStableSwapV2Processor,
  getBishopStableSwapV2ContractOnContext,
} from "./types/eth/bishopstableswapv2.js";
import { getLiquidityGaugeV2ContractOnContext } from "./types/eth/liquiditygaugev2.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const EVENT_BUFFER_SIZE = 1000;

let lastEigenRatioTimestamp = -1;

ERC20Processor.bind({
  address: LIQUIDITY_GAUGE_ADDRESS,
  network: NETWORK,
}).onEventTransfer(async (event, ctx) => {
  const { from, to } = event.args;
  const accounts = [from, to].filter((account) => !isNullAddress(account));
  const evt = new TempEvent({
    ...baseEvent(ctx, event),
    args: accounts.join(","),
  });
  await ctx.store.upsert(evt);
});

BishopStableSwapV2Processor.bind({
  address: STABLE_SWAP_ADDRESS,
  network: NETWORK,
})
  .onEventSwap(async (event, ctx) => {
    const evt = new TempEvent({
      ...baseEvent(ctx, event),
      args: "",
    });
    await ctx.store.upsert(evt);
  })
  .onEventRebalanced(async (event, ctx) => {
    const evt = new TempEvent({
      ...baseEvent(ctx, event),
      args: "",
    });
    await ctx.store.upsert(evt);
  })
  .onEventSync(async (event, ctx) => {
    const evt = new TempEvent({
      ...baseEvent(ctx, event),
      args: "",
    });
    await ctx.store.upsert(evt);
  })
  .onTimeInterval(
    async (_, ctx) => {
      const ratio = await getEigenRatio(ctx);
      const events = await ctx.store.list(TempEvent, []);
      if (
        ratio.timestampMilli == lastEigenRatioTimestamp &&
        events.length < EVENT_BUFFER_SIZE &&
        ctx.timestamp.getTime() < 1723308890000 // workaround: if already catch up, need to update regularly
      ) {
        return;
      }
      lastEigenRatioTimestamp = ratio.timestampMilli;
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
      await ctx.store.delete(
        TempEvent,
        events.map((e) => e.id.toString())
      );
    },
    60,
    60
  );

async function updateAccounts(ctx: EthContext, events: TempEvent[]) {
  const start = new Date().getTime();
  const promises: Promise<[string, bigint]>[] = [];

  const pool = getBishopStableSwapV2ContractOnContext(ctx, STABLE_SWAP_ADDRESS);
  const gauge = getLiquidityGaugeV2ContractOnContext(
    ctx,
    LIQUIDITY_GAUGE_ADDRESS
  );

  for (const event of events) {
    const bn = event.blockNumber;
    const overrides = { blockTag: bn };
    const eventAccounts = event.args.split(",").filter((s) => s.length > 0);
    promises.push(
      pool.allBalances(overrides).then((v) => [`pool_allBalances_${bn}`, v[1]]),
      gauge.totalSupply(overrides).then((v) => [`gauge_totalSupply_${bn}`, v])
    );
    for (const account of eventAccounts) {
      promises.push(
        gauge
          .balanceOf(account, overrides)
          .then((v) => [`gauge_balanceOf_${account}_${bn}`, v])
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
    (await ctx.store.list(AccountSnapshot, [])).map((snapshot) => [
      snapshot.id.toString(),
      snapshot,
    ])
  );
  const state = await getGlobalState(ctx);
  const eventsWithSentry = [
    ...events,
    new TempEvent({
      id: "end",
      args: "",
      blockNumber: 0,
      txIdx: 0,
      eventIdx: 0,
      eventName: "end",
      timestampMilli: BigInt(ctx.timestamp.getTime()),
    }),
  ];

  const pointsSum: Record<string, BigDecimal> = {};
  for (let i = 0; i < eventsWithSentry.length; i++) {
    const event = eventsWithSentry[i];
    const nowMilli = Number(event.timestampMilli);
    const eigenRatio = await getEigenRatioByTime(nowMilli);

    for (const snapshot of Object.values(snapshots)) {
      if (snapshot.lpBalance <= 0) {
        continue;
      }
      const account = snapshot.id.toString();
      const points = await calcPoints(
        nowMilli,
        state,
        snapshot,
        eigenRatio.ratio
      );
      if (!pointsSum[account]) {
        pointsSum[account] = new BigDecimal(0);
      }
      pointsSum[account] = pointsSum[account].plus(points);
      snapshot.timestampMilli = BigInt(nowMilli);
    }
    if (event.eventName === "end") {
      break;
    }

    // update global state and accounts
    const bn = event.blockNumber;
    const eventAccounts = event.args.split(",").filter((s) => s.length > 0);
    state.lpTotalSupply = callResults[`gauge_totalSupply_${bn}`];
    state.totalStoneBalance = callResults[`pool_allBalances_${bn}`];
    for (const account of eventAccounts) {
      snapshots[account] = new AccountSnapshot({
        id: account,
        timestampMilli: BigInt(nowMilli),
        lpBalance: callResults[`gauge_balanceOf_${account}_${bn}`],
      });
    }
  }
  for (const [account, points] of Object.entries(pointsSum)) {
    const snapshot = snapshots[account];
    ctx.eventLogger.emit("point_update", {
      account,
      points,
      lpBalance: snapshot.lpBalance,
      lpTotalSupply: state.lpTotalSupply,
      totalStoneBalance: state.totalStoneBalance,
      timestampMilli: ctx.timestamp.getTime(),
    });
  }
  await ctx.store.upsert(Object.values(snapshots));
  await setGlobalState(ctx, state);
  console.log(
    `chain ${ctx.chainId} finish ${eventsWithSentry.length} temp events`
  );
}

async function calcPoints(
  nowMilli: number,
  state: GlobalState,
  accountSnapshot: AccountSnapshot,
  eigenRatio: BigDecimal
): Promise<BigDecimal> {
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

  if (accountSnapshot.lpBalance <= 0) {
    return new BigDecimal(0);
  }

  const deltaHour =
    (nowMilli - Number(accountSnapshot.timestampMilli)) / MILLISECOND_PER_HOUR;

  const points = (state.totalStoneBalance * accountSnapshot.lpBalance)
    .scaleDown(TOKEN_DECIMALS)
    .div(state.lpTotalSupply.asBigDecimal())
    .multipliedBy(eigenRatio)
    .multipliedBy(deltaHour);

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
