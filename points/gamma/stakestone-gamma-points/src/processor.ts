import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { EthContext, isNullAddress } from "@sentio/sdk/eth";
import {
  HypervisorContext,
  HypervisorProcessor,
} from "./types/eth/hypervisor.js";
import { AccountSnapshot } from "./schema/store.js";
import { beefyConfigs, configs, token0IsStone } from "./config.js";
import { storeGet, storeListAll, storeUpsert } from "./store_utils.js";
import { getEigenRatio } from "./eigen_ratio.js";
import { getGaugeV2CLContractOnContext } from "./types/eth/gaugev2cl.js";
import "./beefy_processor.js";

const MILLISECOND_PER_HOUR = 60 * 60 * 1000;
const TOKEN_DECIMALS = 18;

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const lastEigenRatioTimestamp: Record<string, number> = {};

configs.forEach((config) =>
  config.addresses.forEach((address) =>
    HypervisorProcessor.bind({
      address,
      network: config.network,
    })
      .onEventTransfer(async (event, ctx) => {
        const { from, to } = event.args;
        const lynexGauge = (config.lynexGauges || {})[address];
        const accounts = [from, to].filter(
          (account) =>
            !isNullAddress(account) &&
            (!lynexGauge ||
              account.toLowerCase() != lynexGauge.address.toLowerCase())
        );
        const newSnapshots = (
          await Promise.all(
            accounts.map((account) =>
              process(ctx, ctx.address, account, undefined, event.name)
            )
          )
        ).filter((ret) => ret != undefined);
        await storeUpsert(ctx, newSnapshots);
      })
      .onEventRebalance(async (event, ctx) => {
        const snapshots = await storeListAll(ctx, AccountSnapshot);
        const newSnapshots = (
          await Promise.all(
            snapshots.map((snapshot) =>
              process(
                ctx,
                snapshot.vault,
                snapshot.account,
                snapshot,
                event.name
              )
            )
          )
        ).filter((ret) => ret != undefined);
        await storeUpsert(ctx, newSnapshots);
      })
      .onEventZeroBurn(async (event, ctx) => {
        const snapshots = await storeListAll(ctx, AccountSnapshot);
        const newSnapshots = (
          await Promise.all(
            snapshots.map((snapshot) =>
              process(
                ctx,
                snapshot.vault,
                snapshot.account,
                snapshot,
                event.name
              )
            )
          )
        ).filter((ret) => ret != undefined);
        await storeUpsert(ctx, newSnapshots);
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
          const las = lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address];
          if (ratio.timestampMilli == las) {
            return;
          }
          await updateAll(ctx, "EigenRatioUpdate");
          lastEigenRatioTimestamp[ctx.chainId + "." + ctx.address] =
            ratio.timestampMilli;
        },
        30,
        30
      )
  )
);

async function updateAll(ctx: HypervisorContext, triggerEvent: string) {
  const snapshots = await storeListAll(ctx, AccountSnapshot, [
    {
      field: "vault",
      op: "=",
      value: ctx.address,
    },
  ]);
  const newSnapshots = (
    await Promise.all(
      snapshots.map((snapshot) =>
        process(ctx, snapshot.vault, snapshot.account, snapshot, triggerEvent)
      )
    )
  ).filter((ret) => ret != undefined);
  await storeUpsert(ctx, newSnapshots);
}

async function getAccountSnapshot(
  ctx: HypervisorContext,
  account: string,
  vault: string,
  timestampMilli: number
) {
  const config = configs.find((config) => config.network == ctx.chainId);
  const lynexGauge = (config!.lynexGauges || {})[ctx.address.toLowerCase()];
  const [totalShares, { total0, total1 }, share, lynexGaugeShare] =
    await Promise.all([
      ctx.contract.totalSupply(),
      ctx.contract.getTotalAmounts(),
      ctx.contract.balanceOf(account),
      lynexGauge && ctx.blockNumber >= lynexGauge.startBlock
        ? getGaugeV2CLContractOnContext(ctx, lynexGauge.address).balanceOf(
          account
        )
        : Promise.resolve(0n),
    ]);
  const balance =
    ((token0IsStone[vault.toLowerCase()] ? total0 : total1) *
      (share + lynexGaugeShare)) /
    totalShares;
  return new AccountSnapshot({
    id: vault + "." + account,
    vault,
    account,
    network: ctx.chainId.toString(),
    timestampMilli: BigInt(timestampMilli),
    balance,
  });
}

async function process(
  ctx: HypervisorContext,
  vault: string,
  account: string,
  snapshot: AccountSnapshot | undefined,
  triggerEvent: string
) {
  if (vault !== ctx.address) {
    return;
  }
  if (
    beefyConfigs.some(
      (conf) =>
        conf.network == ctx.chainId &&
        conf.strategy.toLowerCase() == account.toLowerCase()
    )
  ) {
    return;
  }
  const id = vault + "." + account;
  if (!snapshot) {
    snapshot = await storeGet(ctx, AccountSnapshot, id);
  }
  const points = snapshot
    ? await calculatePoints(ctx, snapshot.timestampMilli, snapshot.balance)
    : new BigDecimal(0);

  const newSnapshot = await getAccountSnapshot(
    ctx,
    account,
    vault,
    ctx.timestamp.getTime()
  );
  ctx.eventLogger.emit("point_update", {
    account,
    vault,
    points,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0,
    snapshotBalance: snapshot?.balance ?? 0,
    newTimestampMilli: newSnapshot.timestampMilli,
    newBalance: newSnapshot.balance,
    triggerEvent,
  });
  return newSnapshot;
}

export async function calculatePoints(
  ctx: EthContext,
  snapshotTimestampMilli: bigint,
  snapshotStoneBalance: bigint
): Promise<BigDecimal> {
  const nowMilli = ctx.timestamp.getTime();
  const snapshotMilli = Number(snapshotTimestampMilli);
  if (nowMilli < snapshotMilli) {
    console.error(
      "unexpected account snapshot from the future",
      nowMilli,
      snapshotTimestampMilli,
      snapshotStoneBalance
    );
    return new BigDecimal(0);
  } else if (nowMilli == snapshotMilli) {
    // account affected for multiple times in the block
    return new BigDecimal(0);
  }
  const deltaHour = (nowMilli - snapshotMilli) / MILLISECOND_PER_HOUR;

  const points = snapshotStoneBalance
    .scaleDown(TOKEN_DECIMALS)
    .multipliedBy((await getEigenRatio(ctx)).ratio)
    .multipliedBy(deltaHour);

  return points;
}
