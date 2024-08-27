import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { isNullAddress } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import {
  CurveStableSwapNGContext,
  CurveStableSwapNGProcessor,
} from "./types/eth/curvestableswapng.js";
import {
  DAILY_POINTS,
  // GAUGE_ADDRESS,
  // GAUGE_START_BLOCK,
  MULTIPLIER,
  NETWROK,
  POOL_ADDRESS,
  VAULT_ADDRESS,
} from "./config.js";
import { getCurveGaugeContractOnContext } from "./types/eth/curvegauge.js";

const MILLISECOND_PER_DAY = 60 * 60 * 1000 * 24;
const TOKEN_DECIMALS = 8;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

CurveStableSwapNGProcessor.bind({
  address: POOL_ADDRESS,
  network: NETWROK,
})
  .onEventAddLiquidity(async (event, ctx) => {
    const accountAddress = event.args.provider;
    const accounts = [accountAddress].filter(
      (account) => !isNullAddress(account)
    );
    const newSnapshots = await Promise.all(
      accounts.map((account) =>
        processAccount(ctx, account, undefined, event.name)
      )
    );
    await ctx.store.upsert(
      newSnapshots.filter((snapshot) => snapshot != undefined) as any
    );
  })
  .onEventRemoveLiquidity(async (event, ctx) => {
    const accountAddress = event.args.provider;
    const accounts = [accountAddress].filter(
      (account) => !isNullAddress(account)
    );
    const newSnapshots = await Promise.all(
      accounts.map((account) =>
        processAccount(ctx, account, undefined, event.name)
      )
    );
    await ctx.store.upsert(
      newSnapshots.filter((snapshot) => snapshot != undefined) as any
    );
  })
  .onEventTransfer(async (event, ctx) => {
    const accounts = [event.args.sender, event.args.receiver];

    if (accounts.some(isProtocolAddress)) {
      return;
    }

    const newSnapshots = await Promise.all(
      accounts.map((account) =>
        processAccount(ctx, account, undefined, event.name)
      )
    );
    await ctx.store.upsert(
      newSnapshots.filter((snapshot) => snapshot != undefined) as any
    );
  })
  .onEventTokenExchange(async (event, ctx) => {
    const accountSnapshots = await ctx.store.list(AccountSnapshot, []);
    const newSnapshots = await Promise.all(
      accountSnapshots.map((snapshot) =>
        processAccount(ctx, snapshot.id.toString(), snapshot, event.name)
      )
    );
    await ctx.store.upsert(
      newSnapshots.filter((snapshot) => snapshot != undefined) as any
    );
  })
  .onTimeInterval(
    async (_, ctx) => {
      const accountSnapshots = await ctx.store.list(AccountSnapshot, []);
      const newSnapshots = await Promise.all(
        accountSnapshots.map((snapshot) =>
          processAccount(ctx, snapshot.id.toString(), snapshot, "TimeInterval")
        )
      );
      await ctx.store.upsert(
        newSnapshots.filter((snapshot) => snapshot != undefined) as any
      );
    },
    60,
    4 * 60
  );

async function processAccount(
  ctx: CurveStableSwapNGContext,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (account.toLowerCase() == VAULT_ADDRESS.toLowerCase()) {
    return;
  }
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, account);
  }
  const points = snapshot ? calcPoints(ctx, snapshot) : new BigDecimal(0);

  const newSnapshot = await getAccountSnapshot(ctx, account);

  ctx.eventLogger.emit("point_update", {
    account,
    triggerEvent,
    lPoints: points,
    bPoints: 0n,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0n,
    snapshotLbtcBalance: snapshot?.token0Balance.scaleDown(8) ?? 0,
    snapshotWbtcBalance: snapshot?.token1Balance.scaleDown(8) ?? 0,
    newTimestampMilli: newSnapshot.timestampMilli,
    newLbtcBalance: newSnapshot.token0Balance.scaleDown(8),
    newWbtcBalance: newSnapshot.token1Balance.scaleDown(8),
    multiplier: MULTIPLIER,
  });
  return newSnapshot;
}

function calcPoints(
  ctx: CurveStableSwapNGContext,
  snapshot: AccountSnapshot
): BigDecimal {
  const nowMilli = ctx.timestamp.getTime();
  if (nowMilli < Number(snapshot.timestampMilli)) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshot
    );
    return new BigDecimal(0);
  } else if (nowMilli == Number(snapshot.timestampMilli)) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaDay =
    (nowMilli - Number(snapshot.timestampMilli)) / MILLISECOND_PER_DAY;

  const token0Points = snapshot.token0Balance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(deltaDay)
    .multipliedBy(DAILY_POINTS)
    .multipliedBy(MULTIPLIER);
  const token1Points = snapshot.token1Balance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(deltaDay)
    .multipliedBy(DAILY_POINTS)
    .multipliedBy(MULTIPLIER);
  const points = token0Points.plus(token1Points);
  return points;
}

async function getAccountSnapshot(
  ctx: CurveStableSwapNGContext,
  account: string
) {
  let lpBalance = await ctx.contract.balanceOf(account);
  // if (ctx.blockNumber > GAUGE_START_BLOCK) {
  //   const gaugeContract = getCurveGaugeContractOnContext(ctx, GAUGE_ADDRESS);
  //   lpBalance += await gaugeContract.balanceOf(account);
  // }
  const lpSupply = await ctx.contract.totalSupply();
  const share = BigInt(lpBalance)
    .asBigDecimal()
    .div(BigInt(lpSupply).asBigDecimal());

  const [token0Total, token1Total] = await ctx.contract.get_balances();

  return new AccountSnapshot({
    id: account,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    token0Balance: BigInt(
      token0Total.asBigDecimal().multipliedBy(share).toFixed(0)
    ),
    token1Balance: BigInt(
      token1Total.asBigDecimal().multipliedBy(share).toFixed(0)
    ),
  });
}

function isProtocolAddress(address: string): boolean {
  return (
    isNullAddress(address) || address.toLowerCase() == POOL_ADDRESS // ||
    // address.toLowerCase() == GAUGE_ADDRESS
  );
}
