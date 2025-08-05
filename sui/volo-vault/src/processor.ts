import { SuiContext } from "@sentio/sdk/sui";
import { SuiBaseProcessor } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { Gauge, Counter } from "@sentio/sdk";

const VAULT_ADDRESS =
  "0xc016d83a05418430e72acb76eced534096af83628a0c78803b1b021bc179f3ad";

const vaultMetrics = {
  totalValue: Gauge.register("vaultTotalValue", {
    description: "Total value locked in the vault",
  }),
  shareRatio: Gauge.register("vaultShareRatio", {
    description: "Current share ratio",
  }),
  depositVolume: Counter.register("vaultDepositVolume", {
    description: "Total deposit volume",
  }),
  withdrawalVolume: Counter.register("vaultWithdrawalVolume", {
    description: "Total withdrawal volume",
  }),
  assetCount: Gauge.register("vaultAssetCount", {
    description: "Number of assets in the vault",
  }),
};

async function handleDepositRequested(event: any, ctx: SuiContext) {
  const data = event.data_decoded;

  ctx.eventLogger.emit("vaultEvent", {
    vaultId: data.vault_id,
    eventType: "DepositRequested",
    requestId: data.request_id,
    recipient: data.recipient,
    amount: data.amount,
    timestamp: ctx.timestamp,
    txHash: ctx.transaction.digest,
  });

  vaultMetrics.depositVolume.add(ctx, Number(data.amount));
}

async function handleDepositExecuted(event: any, ctx: SuiContext) {
  const data = event.data_decoded;

  ctx.eventLogger.emit("vaultEvent", {
    vaultId: data.vault_id,
    eventType: "DepositExecuted",
    requestId: data.request_id,
    recipient: data.recipient,
    amount: data.amount,
    shares: data.shares,
    timestamp: ctx.timestamp,
    txHash: ctx.transaction.digest,
  });
}

async function handleWithdrawRequested(event: any, ctx: SuiContext) {
  const data = event.data_decoded;

  ctx.eventLogger.emit("vaultEvent", {
    vaultId: data.vault_id,
    eventType: "WithdrawRequested",
    requestId: data.request_id,
    recipient: data.recipient,
    shares: data.shares,
    expectedAmount: data.expected_amount,
    timestamp: ctx.timestamp,
    txHash: ctx.transaction.digest,
  });
}

async function handleWithdrawExecuted(event: any, ctx: SuiContext) {
  const data = event.data_decoded;

  ctx.eventLogger.emit("vaultEvent", {
    vaultId: data.vault_id,
    eventType: "WithdrawExecuted",
    requestId: data.request_id,
    recipient: data.recipient,
    shares: data.shares,
    amount: data.amount,
    timestamp: ctx.timestamp,
    txHash: ctx.transaction.digest,
  });

  vaultMetrics.withdrawalVolume.add(ctx, Number(data.amount));
}

async function handleTotalUSDValueUpdated(event: any, ctx: SuiContext) {
  const data = event.data_decoded;

  ctx.eventLogger.emit("vaultEvent", {
    vaultId: data.vault_id,
    eventType: "TotalUSDValueUpdated",
    totalUsdValue: data.total_usd_value,
    timestamp: data.timestamp,
    txHash: ctx.transaction.digest,
  });

  vaultMetrics.totalValue.record(ctx, Number(data.total_usd_value));
}

async function handleShareRatioUpdated(event: any, ctx: SuiContext) {
  const data = event.data_decoded;

  ctx.eventLogger.emit("vaultEvent", {
    vaultId: data.vault_id,
    eventType: "ShareRatioUpdated",
    shareRatio: data.share_ratio,
    timestamp: data.timestamp,
    txHash: ctx.transaction.digest,
  });

  vaultMetrics.shareRatio.record(ctx, Number(data.share_ratio));
}

async function handleNewAssetTypeAdded(event: any, ctx: SuiContext) {
  const data = event.data_decoded;

  ctx.eventLogger.emit("vaultEvent", {
    vaultId: data.vault_id,
    eventType: "NewAssetTypeAdded",
    assetType: data.asset_type,
    timestamp: ctx.timestamp,
    txHash: ctx.transaction.digest,
  });

  vaultMetrics.assetCount.record(ctx, 1);
}

export function VoloVaultProcessor() {
  SuiBaseProcessor.bind({
    address: VAULT_ADDRESS,
    network: ChainId.SUI_MAINNET,
    startCheckpoint: 0n,
  })
    .onEventDepositRequested(handleDepositRequested)
    .onEventDepositExecuted(handleDepositExecuted)
    .onEventWithdrawRequested(handleWithdrawRequested)
    .onEventWithdrawExecuted(handleWithdrawExecuted)
    .onEventTotalUSDValueUpdated(handleTotalUSDValueUpdated)
    .onEventShareRatioUpdated(handleShareRatioUpdated)
    .onEventNewAssetTypeAdded(handleNewAssetTypeAdded);
}

VoloVaultProcessor();
