import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthContext, isNullAddress } from "@sentio/sdk/eth";
import { AccountSnapshot } from "./schema/store.js";
import {
  DAILY_POINTS,
  LBTC_WBTC_MARKET_ID,
  MORPHO_ADDRESS,
  MULTIPLIER,
  NETWORK,
  VAULT_ADDRESSES,
} from "./config.js";
import {
  MetaMorphoContext,
  MetaMorphoProcessor,
} from "./types/eth/metamorpho.js";
import { getMorphoContractOnContext } from "./types/eth/morpho.js";

const MILLISECOND_PER_DAY = 60 * 60 * 1000 * 24;
const TOKEN_DECIMALS = 8;

const VIRTUAL_SHARES = BigInt(1e6);
const VIRTUAL_ASSETS = BigInt(1);

GLOBAL_CONFIG.execution = {
  sequential: true,
};

VAULT_ADDRESSES.forEach((address) =>
  MetaMorphoProcessor.bind({
    network: NETWORK,
    address: address,
  })
    .onEventTransfer(async (event, ctx) => {
      const newSnapshots = await Promise.all(
        [event.args.from, event.args.to]
          .filter((account) => !isNullAddress(account))
          .map((account) => process(ctx, account, undefined, event.name))
      );
      await ctx.store.upsert(newSnapshots);
    })
    .onEventReallocateSupply(
      async (event, ctx) => {
        await updateAll(ctx, event.name);
      },
      MetaMorphoProcessor.filters.ReallocateSupply(null, LBTC_WBTC_MARKET_ID)
    )
    .onTimeInterval(
      async (_, ctx) => {
        await updateAll(ctx, "TimeInterval");
      },
      60,
      4 * 60
    )
);

async function updateAll(ctx: MetaMorphoContext, triggerEvent: string) {
  const accounts = await ctx.store.list(AccountSnapshot, [
    {
      field: "vault",
      op: "=",
      value: ctx.address,
    },
  ]);
  const newSnapshots = await Promise.all(
    accounts.map((account) =>
      process(ctx, account.id.toString().split(".")[1], account, triggerEvent)
    )
  );
  await ctx.store.upsert(newSnapshots);
}

async function process(
  ctx: MetaMorphoContext,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  const vault = ctx.address;
  const id = vault + "." + account;
  if (!snapshot) {
    snapshot = await ctx.store.get(AccountSnapshot, id);
  }
  const points = snapshot ? await calcPoints(ctx, snapshot) : new BigDecimal(0);

  // const [lbtcTotal, lpTotalSupply, lpBalance] = await Promise.all([
  //   getVaultAssetsInMarket(ctx),
  //   ctx.contract.totalSupply(),
  //   ctx.contract.balanceOf(account),
  // ]);
  const [wbtcTotal, lpTotalSupply, lpBalance] = await Promise.all([
    ctx.contract.totalAssets(),
    ctx.contract.totalSupply(),
    ctx.contract.balanceOf(account),
  ]);
  // const newBalance = (lbtcTotal * lpBalance) / lpTotalSupply;
  const newBalance = (wbtcTotal * lpBalance) / lpTotalSupply;
  const newSnapshot = new AccountSnapshot({
    id,
    vault,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
    wbtcBalance: newBalance,
  });

  ctx.eventLogger.emit("point_update", {
    account,
    vault,
    bPoints: 0,
    lPoints: points,
    // lbtcTotal: lbtcTotal.scaleDown(TOKEN_DECIMALS),
    wbtcTotal: wbtcTotal.scaleDown(TOKEN_DECIMALS),
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0n,
    snapshotWbtcBalance: snapshot?.wbtcBalance.scaleDown(TOKEN_DECIMALS) ?? 0,
    // snapshotLbtcBalance: snapshot?.lbtcBalance.scaleDown(TOKEN_DECIMALS) ?? 0,
    newTimestampMilli: newSnapshot.timestampMilli,
    newWbtcBalance: newSnapshot.wbtcBalance.scaleDown(TOKEN_DECIMALS),
    // newLbtcBalance: newSnapshot.lbtcBalance.scaleDown(TOKEN_DECIMALS),
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

  // const points = snapshot.lbtcBalance
  const points = snapshot.wbtcBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy(DAILY_POINTS)
    .multipliedBy(deltaDay)
    .multipliedBy(MULTIPLIER);

  return points;
}

async function getVaultAssetsInMarket(ctx: MetaMorphoContext) {
  // get the amount of LBTC the vault allocated to the market
  const morpho = getMorphoContractOnContext(ctx, MORPHO_ADDRESS);
  const [position, market] = await Promise.all([
    morpho.position(LBTC_WBTC_MARKET_ID, ctx.address),
    morpho.market(LBTC_WBTC_MARKET_ID),
  ]);
  return toAssetsDown(
    position.supplyShares,
    market.totalSupplyAssets,
    market.totalSupplyShares
  );
}

function toAssetsDown(
  shares: bigint,
  totalAssets: bigint,
  totalShares: bigint
): bigint {
  return (
    (shares * (totalAssets + VIRTUAL_ASSETS)) / (totalShares + VIRTUAL_SHARES)
  );
}
