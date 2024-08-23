import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthContext, isNullAddress } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import {
  DAILY_POINTS,
  LBTC_ADDRESS,
  MULTIPLIER,
  NETWORK,
  VAULT_ADDRESS,
  WBTC_ADDRESS,
} from "./config.js";
import { ERC20Processor } from "@sentio/sdk/eth/builtin";
import {
  ERC20Context,
  getERC20ContractOnContext,
} from "@sentio/sdk/eth/builtin/erc20";

const MILLISECOND_PER_DAY = 60 * 60 * 1000 * 24;
const TOKEN_DECIMALS = 8;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

ERC20Processor.bind({
  network: NETWORK,
  address: VAULT_ADDRESS,
})
  .onEventTransfer(async (event, ctx) => {
    const newSnapshots = await Promise.all(
      [event.args.from, event.args.to]
        .filter((account) => !isNullAddress(account))
        .map((account) => process(ctx, account, undefined, event.name))
    );
    await ctx.store.upsert(newSnapshots);
  })
  .onTimeInterval(
    async (_, ctx) => {
      const accounts = await ctx.store.list(AccountSnapshot, []);
      const newSnapshots = await Promise.all(
        accounts.map((account) =>
          process(ctx, account.id.toString(), account, "TimeInterval")
        )
      );
      await ctx.store.upsert(newSnapshots);
    },
    60,
    4 * 60
  );

async function process(
  ctx: ERC20Context,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, account);
  }
  const points = snapshot ? await calcPoints(ctx, snapshot) : new BigDecimal(0);

  const [lbtcTotal, wbtcTotal, lpBalance, totalSupply] = await Promise.all([
    getERC20ContractOnContext(ctx, LBTC_ADDRESS).balanceOf(VAULT_ADDRESS),
    getERC20ContractOnContext(ctx, WBTC_ADDRESS).balanceOf(VAULT_ADDRESS),
    ctx.contract.balanceOf(account),
    ctx.contract.totalSupply(),
  ]);
  const newSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    lbtcBalance: (lbtcTotal * lpBalance) / totalSupply,
    wbtcBalance: (wbtcTotal * lpBalance) / totalSupply,
  });

  ctx.eventLogger.emit("point_update", {
    account,
    bPoints: 0,
    lPoints: points,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0n,
    snapshotLbtcBalance: snapshot?.lbtcBalance.scaleDown(TOKEN_DECIMALS) ?? 0,
    snapshotWbtcBalance: snapshot?.wbtcBalance.scaleDown(TOKEN_DECIMALS) ?? 0,
    newTimestampMilli: newSnapshot.timestampMilli,
    newLbtcBalance: newSnapshot.lbtcBalance.scaleDown(TOKEN_DECIMALS),
    newWbtcBalance: newSnapshot.wbtcBalance.scaleDown(TOKEN_DECIMALS),
    multiplier: MULTIPLIER,
    triggerEvent,
  });
  return newSnapshot;
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
      snapshot.timestampMilli
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaDay = (nowMilli - snapshotMilli) / MILLISECOND_PER_DAY;

  const points = (snapshot.lbtcBalance + snapshot.wbtcBalance)
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(DAILY_POINTS)
    .multipliedBy(deltaDay)
    .multipliedBy(MULTIPLIER);

  return points;
}
