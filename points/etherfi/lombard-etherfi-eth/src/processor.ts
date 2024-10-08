import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { isNullAddress } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import {
  ADDRESSS,
  DAILY_POINTS,
  LBTC_ADDRESS,
  MULTIPLIER,
  NETWROK,
  SYM_LBTC_ADDRESS,
  SYM_LBTC_START_BLOCK,
} from "./config.js";
import {
  BoringVaultContext,
  BoringVaultProcessor,
} from "./types/eth/boringvault.js";
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20";

const MILLISECOND_PER_DAY = 60 * 60 * 1000 * 24;
const TOKEN_DECIMALS = 8;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

BoringVaultProcessor.bind({
  address: ADDRESSS,
  network: NETWROK,
})
  .onEventTransfer(async (event, ctx) => {
    const accounts = [event.args.from, event.args.to].filter(
      (address) => !isNullAddress(address)
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
  .onTimeInterval(
    async (_, ctx) => {
      const accountSnapshots = await ctx.store.list(AccountSnapshot, []);
      const newSnapshots = await Promise.all(
        accountSnapshots.map((snapshot) =>
          processAccount(ctx, snapshot.id.toString(), snapshot, "TimeInterval")
        )
      );
      await ctx.store.upsert(newSnapshots);
    },
    60,
    4 * 60
  );

async function processAccount(
  ctx: BoringVaultContext,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, account);
  }
  const points = snapshot ? calcPoints(ctx, snapshot) : new BigDecimal(0);

  const [lbtcTotal, symLbtcTotal, lpBalance, lpTotalSupply] = await Promise.all(
    [
      getERC20ContractOnContext(ctx, LBTC_ADDRESS).balanceOf(ctx.address),
      ctx.blockNumber >= SYM_LBTC_START_BLOCK
        ? getERC20ContractOnContext(ctx, SYM_LBTC_ADDRESS).balanceOf(
            ctx.address
          )
        : Promise.resolve(0n),
      ctx.contract.balanceOf(account),
      ctx.contract.totalSupply(),
    ]
  );
  const lbtcBalance = ((lbtcTotal + symLbtcTotal) * lpBalance) / lpTotalSupply;
  const newSnapshot = new AccountSnapshot({
    id: account,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    lbtcBalance,
    ebtcBalance: lpBalance,
    ebtcTotalSupply: lpTotalSupply,
  });

  ctx.eventLogger.emit("point_update", {
    account,
    triggerEvent,
    lPoints: points,
    bPoints: 0n,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0n,
    snapshotLbtcBalance: snapshot?.lbtcBalance.scaleDown(TOKEN_DECIMALS) ?? 0,
    snapshotEbtcBalance: snapshot?.ebtcBalance.scaleDown(TOKEN_DECIMALS) ?? 0,
    snapshotEbtcTotalSupply:
      snapshot?.ebtcTotalSupply.scaleDown(TOKEN_DECIMALS) ?? 0,
    newTimestampMilli: newSnapshot.timestampMilli,
    newLbtcBalance: newSnapshot.lbtcBalance.scaleDown(TOKEN_DECIMALS),
    newEbtcBalance: newSnapshot.ebtcBalance.scaleDown(TOKEN_DECIMALS),
    newEbtcTotalSupply: newSnapshot.ebtcTotalSupply.scaleDown(TOKEN_DECIMALS),
    multiplier: MULTIPLIER,
  });
  return newSnapshot;
}

function calcPoints(
  ctx: BoringVaultContext,
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

  const points = snapshot.lbtcBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(deltaDay)
    .multipliedBy(DAILY_POINTS)
    .multipliedBy(MULTIPLIER);
  return points;
}
