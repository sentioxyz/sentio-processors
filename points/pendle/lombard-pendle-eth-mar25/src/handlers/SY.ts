import { AccountSnapshot } from "../schema/schema.js"
import { TransferEvent } from "../types/eth/pendlemarket.js";
import { ERC20Context } from "@sentio/sdk/eth/builtin/erc20";
import { getUnixTimestamp, isPendleAddress, getAllAddresses } from "../helper.js";
import { updatePoints } from "../points/point-manager.js";
import { EVENT_USER_SHARE, POINT_SOURCE_SY } from "../types.js";


export async function handleSYTransfer(evt: TransferEvent, ctx: ERC20Context) {
  await processAccount(evt.args.from, ctx);
  await processAccount(evt.args.to, ctx);
}

export async function processAllAccounts(ctx: ERC20Context) {
  const allAddresses = await getAllAddresses(ctx);
  await Promise.all(allAddresses.map((a) => processAccount(a, ctx)));
}

async function processAccount(account: string, ctx: ERC20Context) {
  if (isPendleAddress(account)) return;
  const timestamp = getUnixTimestamp(ctx.timestamp);
  const ts: bigint = BigInt(timestamp).valueOf();

  const accountId = account.toLowerCase() + POINT_SOURCE_SY;
  const snapshot = await ctx.store.get(AccountSnapshot, accountId);
  if (snapshot && snapshot.lastUpdatedAt < ts) {
    await updatePoints(
      ctx,
      POINT_SOURCE_SY,
      account,
      BigInt(snapshot.lastImpliedHolding),
      BigInt(ts.valueOf() - snapshot.lastUpdatedAt.valueOf()),
      timestamp
    );
  }

  const newBalance = await ctx.contract.balanceOf(account);

  const newSnapshot = new AccountSnapshot({
    id: accountId,
    lastUpdatedAt: BigInt(timestamp),
    lastImpliedHolding: newBalance.toString()
  })

  if (BigInt(snapshot ? snapshot.lastImpliedHolding : 0) != newBalance) {
    ctx.eventLogger.emit(EVENT_USER_SHARE, {
      label: POINT_SOURCE_SY,
      account,
      share: newBalance,
    })
  }

  await ctx.store.upsert(newSnapshot)
}
