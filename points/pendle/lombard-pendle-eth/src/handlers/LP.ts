import { AccountSnapshot } from "../schema/schema.ts";
import {
  PendleMarketContext,
  RedeemRewardsEvent,
  SwapEvent,
  TransferEvent,
  getPendleMarketContractOnContext,
} from "../types/eth/pendlemarket.ts";
import { updatePoints } from "../points/point-manager.ts";
import {
  getUnixTimestamp,
  isLiquidLockerAddress,
  getAllAddresses,
  isSentioInternalError,
} from "../helper.ts";
import { PENDLE_POOL_ADDRESSES } from "../consts.ts";
import { EthContext } from "@sentio/sdk/eth";
import {
  readAllUserERC20Balances,
  readAllUserActiveBalances,
} from "../multicall.ts";
import { EVENT_USER_SHARE, POINT_SOURCE_LP } from "../types.ts";

/**
 * @dev 1 LP = (X PT + Y SY) where X and Y are defined by market conditions
 * So same as Balancer LPT, we need to update all positions on every swap

 */

export async function handleLPTransfer(
  evt: TransferEvent,
  ctx: PendleMarketContext
) {
  await processAllLPAccounts(ctx, [
    evt.args.from.toLowerCase(),
    evt.args.to.toLowerCase(),
  ]);
}

export async function handleMarketRedeemReward(
  evt: RedeemRewardsEvent,
  ctx: PendleMarketContext
) {
  await processAllLPAccounts(ctx);
}

export async function handleMarketSwap(_: SwapEvent, ctx: PendleMarketContext) {
  await processAllLPAccounts(ctx);
}

export async function processAllLPAccounts(
  ctx: EthContext,
  addressesToAdd: string[] = []
) {
  // might not need to do this on interval since we are doing it on every swap
  const allAddresses = await getAllAddresses(ctx);

  for (let address of addressesToAdd) {
    address = address.toLowerCase();
    if (!allAddresses.includes(address) && !isLiquidLockerAddress(address)) {
      allAddresses.push(address);
    }
  }
  const marketContract = getPendleMarketContractOnContext(
    ctx,
    PENDLE_POOL_ADDRESSES.LP
  );

  const [allUserShares, totalShare, state] = await Promise.all([
    readAllUserActiveBalances(ctx, allAddresses),
    marketContract.totalActiveSupply(),
    marketContract.readState(marketContract.address),
  ]);

  for (const liquidLocker of PENDLE_POOL_ADDRESSES.LIQUID_LOCKERS) {
    const liquidLockerBal = await marketContract.balanceOf(
      liquidLocker.address
    );
    if (liquidLockerBal == 0n) continue;

    const liquidLockerActiveBal = await marketContract.activeBalance(
      liquidLocker.address
    );
    try {
      const allUserReceiptTokenBalances = await readAllUserERC20Balances(
        ctx,
        allAddresses,
        liquidLocker.receiptToken
      );
      for (let i = 0; i < allAddresses.length; i++) {
        const userBal = allUserReceiptTokenBalances[i];
        const userBoostedHolding =
          (userBal * liquidLockerActiveBal) / liquidLockerBal;
        allUserShares[i] += userBoostedHolding;
      }
    } catch (err) {
      if (isSentioInternalError(err)) {
        throw err;
      }
    }
  }

  const timestamp = getUnixTimestamp(ctx.timestamp)
  let promises = []
  for (let i = 0; i < allAddresses.length; i++) {
    const account = allAddresses[i];
    const impliedSy = (allUserShares[i] * state.totalSy) / totalShare
    promises.push(updateAccount(ctx, account, impliedSy, timestamp))
  }
  await Promise.all(promises)
}

async function updateAccount(
  ctx: EthContext,
  account: string,
  impliedSy: bigint,
  timestamp: number
) {
  const accountId = account.toLowerCase() + POINT_SOURCE_LP;
  const snapshot = await ctx.store.get(AccountSnapshot, accountId);
  const ts: bigint = BigInt(timestamp).valueOf();

  if (snapshot && snapshot.lastUpdatedAt < timestamp) {
    await updatePoints(
      ctx,
      POINT_SOURCE_LP,
      account,
      BigInt(snapshot.lastImpliedHolding),
      BigInt(ts - snapshot.lastUpdatedAt.valueOf()),
      timestamp
    );
  }

  const newSnapshot = new AccountSnapshot({
    id: accountId,
    lastUpdatedAt: ts,
    lastImpliedHolding: impliedSy.toString(),
    lastBalance: snapshot ? snapshot.lastBalance.toString() : "",
  });

  if (BigInt(snapshot ? snapshot.lastImpliedHolding : 0) != impliedSy) {
    ctx.eventLogger.emit(EVENT_USER_SHARE, {
      label: POINT_SOURCE_LP,
      account: account,
      share: impliedSy,
    });
  }

  await ctx.store.upsert(newSnapshot);
}
