import { SuiContext } from "@sentio/sdk/sui";
import { ChainId } from "@sentio/chain";
import { Gauge, Counter } from "@sentio/sdk";
import { events } from "./types/sui/navi_vault.js";
import {
  getVaultByAddress,
  getCoinSymbolByType,
  getDecimalByCoinType,
  normalizeCoinType,
  scaleAmount,
  scaleWad,
  VaultInfo,
  DEFAULT_COIN_DECIMAL,
} from "./utils.js";

// The defining package address. Event types keep this address across upgrades,
// so the processor always binds here.
const NAVI_VAULT_PACKAGE =
  "0x51cecaacaed0bd436f04ebbd8ba0ca1627c9c4d0e54ad28eff095ca78591518c";

// navi_vault was published at checkpoint 289808972 (2026-06-21). Start a little
// before to be safe.
const START_CHECKPOINT = 289800000n;

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
const depositVolume = Counter.register("vault_deposit_volume");
const withdrawVolume = Counter.register("vault_withdraw_volume");
const marketBalance = Gauge.register("vault_market_balance");
const vaultCapGauge = Gauge.register("vault_cap");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// Resolve the vault's underlying symbol / coin type / decimals for an event.
function vaultLabels(vaultId: string): {
  vault_symbol: string;
  coin_type: string;
  decimals: number;
} {
  const info: VaultInfo | undefined = getVaultByAddress(vaultId);
  return {
    vault_symbol: info?.symbol ?? "UNKNOWN",
    coin_type: info?.coinType ?? "unknown",
    decimals: info?.decimals ?? DEFAULT_COIN_DECIMAL,
  };
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------
export function NaviVaultProcessor() {
  events
    .bind({
      address: NAVI_VAULT_PACKAGE,
      network: ChainId.SUI_MAINNET,
      startCheckpoint: START_CHECKPOINT,
    })
    // ----- lifecycle -----
    .onEventCreateVaultEvent(onCreateVault)
    .onEventCreateReceiptEvent(onCreateReceipt)
    // ----- user flows -----
    .onEventDepositEvent(onDeposit)
    .onEventWithdrawEvent(onWithdraw)
    .onEventClaimRewardEvent(onClaimReward)
    // ----- allocation / market state -----
    .onEventAllocateEvent(onAllocate)
    .onEventDeallocateEvent(onDeallocate)
    .onEventSyncMarketBalanceEvent(onSyncMarketBalance)
    .onEventCollectRewardEvent(onCollectReward)
    // ----- fees -----
    .onEventClaimManagementFeeEvent(onClaimManagementFee)
    .onEventClaimPerformanceFeeEvent(onClaimPerformanceFee)
    .onEventSetManagementFeeEvent(onSetManagementFee)
    .onEventSetPerformanceFeeEvent(onSetPerformanceFee)
    // ----- timelock proposals -----
    .onEventProposalCreatedEvent(onProposalCreated)
    .onEventProposalExecutedEvent(onProposalExecuted)
    .onEventProposalCancelledEvent(onProposalCancelled)
    // ----- market admin -----
    .onEventSetDefaultMarketEvent(onSetDefaultMarket)
    .onEventSetMarketStatusEvent(onSetMarketStatus)
    .onEventAddMarketEvent(onAddMarket)
    .onEventSetMarketCapAndPenaltyEvent(onSetMarketCapAndPenalty)
    .onEventSetVaultCapEvent(onSetVaultCap)
    .onEventSetLossEvent(onSetLoss)
    // ----- access control -----
    .onEventAllocatorAddedEvent(onAllocatorAdded)
    .onEventAllocatorRemovedEvent(onAllocatorRemoved)
    .onEventCuratorAddedEvent(onCuratorAdded)
    .onEventCuratorRemovedEvent(onCuratorRemoved)
    // ----- pause -----
    .onEventSetPausedEvent(onSetPaused)
    .onEventPauseCapMintedEvent(onPauseCapMinted)
    .onEventPauseCapDestroyedEvent(onPauseCapDestroyed)
    // ----- reward rules / vault-native incentives -----
    .onEventRewardRuleCreatedEvent(onRewardRuleCreated)
    .onEventRewardRuleReactivatedEvent(onRewardRuleReactivated)
    .onEventRewardRuleDisabledEvent(onRewardRuleDisabled)
    .onEventDepositRewardBalanceEvent(onDepositRewardBalance)
    .onEventSetRewardRateEvent(onSetRewardRate)
    .onEventWithdrawRewardEvent(onWithdrawReward);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
async function onCreateVault(event: events.CreateVaultEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("CreateVault", {
    vault: d.vault,
    sender: d.sender,
    ...vaultLabels(d.vault),
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onCreateReceipt(event: events.CreateReceiptEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("CreateReceipt", {
    vault: d.vault,
    sender: d.sender,
    receipt_id: d.receipt_id,
    ...vaultLabels(d.vault),
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

// ---------------------------------------------------------------------------
// User flows
// ---------------------------------------------------------------------------
async function onDeposit(event: events.DepositEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, coin_type, decimals } = vaultLabels(d.vault);
  const amountNorm = scaleAmount(d.amount, decimals);
  const sharesNorm = scaleAmount(d.shares, decimals);

  depositVolume.add(ctx, amountNorm, { vault_symbol });

  ctx.eventLogger.emit("Deposit", {
    vault: d.vault,
    sender: d.sender,
    receipt_id: d.receipt_id,
    pool_address: d.pool_address,
    amount: d.amount.toString(),
    shares: d.shares.toString(),
    amount_normalized: amountNorm,
    shares_normalized: sharesNorm,
    vault_symbol,
    coin_type,
    decimals,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onWithdraw(event: events.WithdrawEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, coin_type, decimals } = vaultLabels(d.vault);
  const amountNorm = scaleAmount(d.amount, decimals);
  const sharesNorm = scaleAmount(d.shares_burned, decimals);

  withdrawVolume.add(ctx, amountNorm, { vault_symbol });

  ctx.eventLogger.emit("Withdraw", {
    vault: d.vault,
    sender: d.sender,
    receipt_id: d.receipt_id,
    pool_address: d.pool_address,
    amount: d.amount.toString(),
    shares_burned: d.shares_burned.toString(),
    amount_normalized: amountNorm,
    shares_burned_normalized: sharesNorm,
    vault_symbol,
    coin_type,
    decimals,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onClaimReward(event: events.ClaimRewardEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const rewardCoinType = normalizeCoinType(d.reward_coin_type);
  const rewardSymbol = getCoinSymbolByType(rewardCoinType);
  const rewardDecimals = getDecimalByCoinType(rewardCoinType);

  ctx.eventLogger.emit("ClaimReward", {
    vault: d.vault,
    sender: d.sender,
    receipt_id: d.receipt_id,
    reward_coin_type: rewardCoinType,
    reward_symbol: rewardSymbol,
    amount: d.amount.toString(),
    amount_normalized: scaleAmount(d.amount, rewardDecimals),
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

// ---------------------------------------------------------------------------
// Allocation / market state
// ---------------------------------------------------------------------------
async function onAllocate(event: events.AllocateEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, coin_type, decimals } = vaultLabels(d.vault);
  ctx.eventLogger.emit("Allocate", {
    vault: d.vault,
    sender: d.sender,
    pool_address: d.pool_address,
    amount: d.amount.toString(),
    amount_normalized: scaleAmount(d.amount, decimals),
    vault_symbol,
    coin_type,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onDeallocate(event: events.DeallocateEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, coin_type, decimals } = vaultLabels(d.vault);
  ctx.eventLogger.emit("Deallocate", {
    vault: d.vault,
    sender: d.sender,
    pool_address: d.pool_address,
    amount: d.amount.toString(),
    amount_normalized: scaleAmount(d.amount, decimals),
    vault_symbol,
    coin_type,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onSyncMarketBalance(event: events.SyncMarketBalanceEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, coin_type, decimals } = vaultLabels(d.vault);
  const balanceNorm = scaleAmount(d.current_balance, decimals);

  marketBalance.record(ctx, balanceNorm, {
    vault_symbol,
    pool_address: d.pool_address,
  });

  ctx.eventLogger.emit("SyncMarketBalance", {
    vault: d.vault,
    pool_address: d.pool_address,
    current_balance: d.current_balance.toString(),
    current_balance_normalized: balanceNorm,
    vault_symbol,
    coin_type,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onCollectReward(event: events.CollectRewardEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const rewardCoinType = normalizeCoinType(d.reward_coin_type);
  const rewardDecimals = getDecimalByCoinType(rewardCoinType);
  ctx.eventLogger.emit("CollectReward", {
    vault: d.vault,
    rule_index: d.rule_index.toString(),
    reward_coin_type: rewardCoinType,
    reward_symbol: getCoinSymbolByType(rewardCoinType),
    amount: d.amount.toString(),
    amount_normalized: scaleAmount(d.amount, rewardDecimals),
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------
async function onClaimManagementFee(event: events.ClaimManagementFeeEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, decimals } = vaultLabels(d.vault);
  ctx.eventLogger.emit("ClaimManagementFee", {
    vault: d.vault,
    receipt_id: d.receipt_id,
    shares: d.shares.toString(),
    shares_normalized: scaleAmount(d.shares, decimals),
    vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onClaimPerformanceFee(event: events.ClaimPerformanceFeeEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, decimals } = vaultLabels(d.vault);
  ctx.eventLogger.emit("ClaimPerformanceFee", {
    vault: d.vault,
    receipt_id: d.receipt_id,
    shares: d.shares.toString(),
    shares_normalized: scaleAmount(d.shares, decimals),
    vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onSetManagementFee(event: events.SetManagementFeeEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("SetManagementFee", {
    vault: d.vault,
    old_fee: d.old_fee.toString(),
    new_fee: d.new_fee.toString(),
    old_fee_rate: scaleWad(d.old_fee),
    new_fee_rate: scaleWad(d.new_fee),
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onSetPerformanceFee(event: events.SetPerformanceFeeEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("SetPerformanceFee", {
    vault: d.vault,
    old_fee: d.old_fee.toString(),
    new_fee: d.new_fee.toString(),
    old_fee_rate: scaleWad(d.old_fee),
    new_fee_rate: scaleWad(d.new_fee),
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

// ---------------------------------------------------------------------------
// Timelock proposals
// ---------------------------------------------------------------------------
async function onProposalCreated(event: events.ProposalCreatedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("ProposalCreated", {
    vault: d.vault,
    proposal_type: d.proposal_type,
    subject: d.subject,
    executable_at: d.executable_at.toString(),
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onProposalExecuted(event: events.ProposalExecutedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("ProposalExecuted", {
    vault: d.vault,
    proposal_type: d.proposal_type,
    subject: d.subject,
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onProposalCancelled(event: events.ProposalCancelledEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("ProposalCancelled", {
    vault: d.vault,
    proposal_type: d.proposal_type,
    subject: d.subject,
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

// ---------------------------------------------------------------------------
// Market admin
// ---------------------------------------------------------------------------
async function onSetDefaultMarket(event: events.SetDefaultMarketEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("SetDefaultMarket", {
    vault: d.vault,
    pool_address: d.pool_address,
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onSetMarketStatus(event: events.SetMarketStatusEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("SetMarketStatus", {
    vault: d.vault,
    pool_address: d.pool_address,
    target_status: d.target_status, // 0 = Active, 1 = Disabled
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onAddMarket(event: events.AddMarketEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, decimals } = vaultLabels(d.vault);
  ctx.eventLogger.emit("AddMarket", {
    vault: d.vault,
    pool_address: d.pool_address,
    cap: d.cap.toString(),
    cap_normalized: scaleAmount(d.cap, decimals),
    penalty: d.penalty.toString(),
    penalty_rate: scaleWad(d.penalty),
    storage_address: d.storage_address,
    asset_id: d.asset_id,
    incentive_v3_address: d.incentive_v3_address,
    incentive_v2_address: d.incentive_v2_address,
    vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onSetMarketCapAndPenalty(event: events.SetMarketCapAndPenaltyEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, decimals } = vaultLabels(d.vault);
  ctx.eventLogger.emit("SetMarketCapAndPenalty", {
    vault: d.vault,
    pool_address: d.pool_address,
    cap: d.cap.toString(),
    cap_normalized: scaleAmount(d.cap, decimals),
    penalty: d.penalty.toString(),
    penalty_rate: scaleWad(d.penalty),
    vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onSetVaultCap(event: events.SetVaultCapEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, decimals } = vaultLabels(d.vault);
  const capNorm = scaleAmount(d.vault_cap, decimals);
  vaultCapGauge.record(ctx, capNorm, { vault_symbol });
  ctx.eventLogger.emit("SetVaultCap", {
    vault: d.vault,
    vault_cap: d.vault_cap.toString(),
    vault_cap_normalized: capNorm,
    vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onSetLoss(event: events.SetLossEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const { vault_symbol, decimals } = vaultLabels(d.vault);
  ctx.eventLogger.emit("SetLoss", {
    vault: d.vault,
    pool_address: d.pool_address,
    loss: d.loss.toString(),
    loss_normalized: scaleAmount(d.loss, decimals),
    vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------
async function onAllocatorAdded(event: events.AllocatorAddedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("AllocatorAdded", {
    vault: d.vault,
    cap_id: d.cap_id,
    recipient: d.recipient,
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onAllocatorRemoved(event: events.AllocatorRemovedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("AllocatorRemoved", {
    cap_id: d.cap_id,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onCuratorAdded(event: events.CuratorAddedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("CuratorAdded", {
    vault: d.vault,
    cap_id: d.cap_id,
    recipient: d.recipient,
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onCuratorRemoved(event: events.CuratorRemovedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("CuratorRemoved", {
    cap_id: d.cap_id,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

// ---------------------------------------------------------------------------
// Pause
// ---------------------------------------------------------------------------
async function onSetPaused(event: events.SetPausedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("SetPaused", {
    vault: d.vault,
    paused: d.paused,
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onPauseCapMinted(event: events.PauseCapMintedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("PauseCapMinted", {
    cap_id: d.cap_id,
    recipient: d.recipient,
    sender: d.sender,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onPauseCapDestroyed(event: events.PauseCapDestroyedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  ctx.eventLogger.emit("PauseCapDestroyed", {
    cap_id: d.cap_id,
    sender: d.sender,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

// ---------------------------------------------------------------------------
// Reward rules / vault-native incentives
// ---------------------------------------------------------------------------
async function onRewardRuleCreated(event: events.RewardRuleCreatedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const rewardCoinType = normalizeCoinType(d.reward_coin_type);
  ctx.eventLogger.emit("RewardRuleCreated", {
    vault: d.vault,
    navi_pool_id: d.navi_pool_id,
    reward_coin_type: rewardCoinType,
    reward_symbol: getCoinSymbolByType(rewardCoinType),
    incentive_rule_id: d.incentive_rule_id,
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onRewardRuleReactivated(event: events.RewardRuleReactivatedEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const rewardCoinType = normalizeCoinType(d.reward_coin_type);
  ctx.eventLogger.emit("RewardRuleReactivated", {
    vault: d.vault,
    navi_pool_id: d.navi_pool_id,
    reward_coin_type: rewardCoinType,
    reward_symbol: getCoinSymbolByType(rewardCoinType),
    incentive_rule_id: d.incentive_rule_id,
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onRewardRuleDisabled(event: events.RewardRuleDisabledEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const rewardCoinType = normalizeCoinType(d.reward_coin_type);
  ctx.eventLogger.emit("RewardRuleDisabled", {
    vault: d.vault,
    navi_pool_id: d.navi_pool_id,
    reward_coin_type: rewardCoinType,
    reward_symbol: getCoinSymbolByType(rewardCoinType),
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onDepositRewardBalance(event: events.DepositRewardBalanceEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const rewardCoinType = normalizeCoinType(d.reward_coin_type);
  const rewardDecimals = getDecimalByCoinType(rewardCoinType);
  ctx.eventLogger.emit("DepositRewardBalance", {
    vault: d.vault,
    reward_coin_type: rewardCoinType,
    reward_symbol: getCoinSymbolByType(rewardCoinType),
    amount: d.amount.toString(),
    amount_normalized: scaleAmount(d.amount, rewardDecimals),
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onSetRewardRate(event: events.SetRewardRateEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const rewardCoinType = normalizeCoinType(d.reward_coin_type);
  const rewardDecimals = getDecimalByCoinType(rewardCoinType);
  ctx.eventLogger.emit("SetRewardRate", {
    vault: d.vault,
    reward_coin_type: rewardCoinType,
    reward_symbol: getCoinSymbolByType(rewardCoinType),
    total_supply: d.total_supply.toString(),
    total_supply_normalized: scaleAmount(d.total_supply, rewardDecimals),
    duration_ms: d.duration_ms.toString(),
    rate: d.rate.toString(), // RAY-scaled (1e27) per-ms rate
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

async function onWithdrawReward(event: events.WithdrawRewardEventInstance, ctx: SuiContext) {
  const d = event.data_decoded;
  const rewardCoinType = normalizeCoinType(d.reward_coin_type);
  const rewardDecimals = getDecimalByCoinType(rewardCoinType);
  ctx.eventLogger.emit("WithdrawReward", {
    vault: d.vault,
    reward_coin_type: rewardCoinType,
    reward_symbol: getCoinSymbolByType(rewardCoinType),
    amount: d.amount.toString(),
    amount_normalized: scaleAmount(d.amount, rewardDecimals),
    vault_symbol: vaultLabels(d.vault).vault_symbol,
    timestamp: ctx.timestamp,
    tx_hash: ctx.transaction.digest,
  });
}

NaviVaultProcessor();
