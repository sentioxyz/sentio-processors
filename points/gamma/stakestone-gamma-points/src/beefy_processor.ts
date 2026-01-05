import { GLOBAL_CONFIG } from "@sentio/runtime";
import { BigDecimal } from "@sentio/sdk";
import { isNullAddress } from "@sentio/sdk/eth";
import { BeefyAccountSnapshot } from "./schema/store.js";
import { BeefyConfig, beefyConfigs } from "./config.js";
import { storeGet, storeListAll, storeUpsert } from "./store_utils.js";
import {
  BeefyVaultV7Context,
  BeefyVaultV7Processor,
} from "./types/eth/beefyvaultv7.js";
import { calculatePoints } from "./processor.js";
import { getEigenRatio } from "./eigen_ratio.js";

GLOBAL_CONFIG.execution = {
  sequential: true,
};

const lastEigenRatioTimestamp: Record<string, number> = {};

beefyConfigs.forEach((config) =>
  BeefyVaultV7Processor.bind({
    network: config.network,
    address: config.vault,
  })
    .onEventTransfer(async (event, ctx) => {
      const { from, to } = event.args;
      const accounts = [from, to].filter((account) => !isNullAddress(account));
      const newSnapshots = await Promise.all(
        accounts.map((account) =>
          process(ctx, config, account, undefined, event.name)
        )
      );
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
);

async function updateAll(ctx: BeefyVaultV7Context, triggerEvent: string) {
  const snapshots = await storeListAll(ctx, BeefyAccountSnapshot, [
    {
      field: "vault",
      op: "=",
      value: ctx.address,
    },
  ]);
  const newSnapshots = await Promise.all(
    snapshots.map((snapshot) =>
      process(
        ctx,
        beefyConfigs.find(
          (conf) =>
            conf.network == ctx.chainId &&
            conf.vault.toLowerCase() == ctx.address.toLowerCase()
        )!,
        snapshot.account,
        snapshot,
        triggerEvent
      )
    )
  );
  await storeUpsert(ctx, newSnapshots);
}

async function process(
  ctx: BeefyVaultV7Context,
  beefyConfig: BeefyConfig,
  account: string,
  snapshot: BeefyAccountSnapshot | undefined,
  triggerEvent: string
) {
  const id = beefyConfig.gammaVault + "." + ctx.address + "." + account;
  if (!snapshot) {
    snapshot = await storeGet(ctx, BeefyAccountSnapshot, id);
  }
  const points = snapshot
    ? await calculatePoints(ctx, snapshot.timestampMilli, snapshot.balance)
    : new BigDecimal(0);

  const lpBalance = await ctx.contract.balanceOf(account);
  const rate = await ctx.contract.getPricePerFullShare();
  const newBalance = (lpBalance * rate) / 10n ** 18n;
  const newSnapshot = new BeefyAccountSnapshot({
    id,
    vault: ctx.address,
    account,
    network: ctx.chainId.toString(),
    balance: newBalance,
    timestampMilli: BigInt(ctx.timestamp.getTime()),
  });
  ctx.eventLogger.emit("point_update", {
    account,
    vault: beefyConfig.gammaVault,
    beefyVault: beefyConfig.vault,
    points,
    snapshotTimestampMilli: snapshot?.timestampMilli ?? 0,
    snapshotBalance: snapshot?.balance ?? 0,
    newTimestampMilli: newSnapshot.timestampMilli,
    newBalance: newSnapshot.balance,
    triggerEvent,
  });
  return newSnapshot;
}
