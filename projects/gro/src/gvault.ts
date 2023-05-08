import { GVaultProcessor, GVaultContext, WithdrawEvent, DepositEvent } from "./types/eth/gvault.js";
import {
    GStrategyGuardProcessor,
    GStrategyGuardContext,
    LogStopLossEscalatedEvent,
    LogStopLossDescalatedEvent,
    LogStopLossExecutedEvent,
    LogStrategyHarvestFailureEvent
} from "./types/eth/gstrategyguard.js";
import {BigDecimal, Counter, Gauge, scaleDown} from "@sentio/sdk"
import { TypedEvent } from "./types/eth/internal/common.js";

const DECIMAL = 18
export const volOptions = {
    sparse: false,
    aggregationConfig: {
        intervalInMinutes: [60],
    }
}

const withdraw_shares_cume = Counter.register("withdraw_shares_cume", volOptions)
const deposit_shares_cume = Counter.register("deposit_shares_cume", volOptions)
const withdraw_assets_cume = Counter.register("withdraw_assets_cume", volOptions)
const deposit_assets_cume = Counter.register("deposit_assets_cume", volOptions)

async function withdrawHandler(evt: WithdrawEvent, ctx: GVaultContext) {
    const shares = scaleDown(evt.args.shares, DECIMAL)
    const assets = scaleDown(evt.args.assets, DECIMAL)
    const owner = evt.args.owner

    ctx.meter.Gauge("withdraw_shares").record(shares)
    ctx.meter.Gauge("withdraw_assets").record(assets)
    withdraw_shares_cume.add(ctx, shares)
    withdraw_assets_cume.add(ctx, assets)

    ctx.eventLogger.emit("Withdraw", {
        distinctId: owner,
        assets: assets,
        shares: shares,
        message: owner + " withdraw " + assets + " assets, " + shares + " shares"
      })
}


async function depositHandler(evt: DepositEvent, ctx: GVaultContext) {
    const shares = scaleDown(evt.args.shares, DECIMAL)
    const assets = scaleDown(evt.args.assets, DECIMAL)
    const owner = evt.args.owner

    ctx.meter.Gauge("deposit_shares").record(shares)
    ctx.meter.Gauge("deposit_assets").record(assets)
    deposit_shares_cume.add(ctx, shares)
    deposit_assets_cume.add(ctx, assets)

    ctx.eventLogger.emit("Deposit", {
        distinctId: owner,
        assets: assets,
        shares: shares,
        message: owner + " deposit " + assets + " assets, " + shares + " shares"
    })
}

async function logStopLossEscalated(evt: LogStopLossEscalatedEvent, ctx: GStrategyGuardContext) {
    ctx.eventLogger.emit("LogStopLossEscalated", {
        message: `LogStopLossEscalated for strategy: ${evt.args.strategy}`,
        strategy: evt.args.strategy
    })
}

async function logStopLossDescalated(evt: LogStopLossDescalatedEvent, ctx: GStrategyGuardContext) {
    ctx.eventLogger.emit("LogStopLossDescalated", {
        message: `LogStopLossDescalated for ${evt.args.strategy}, active: ${evt.args.active}`,
        strategy: evt.args.strategy,
        active: evt.args.active
    })
}

async function logStopLossExecuted(evt: LogStopLossExecutedEvent, ctx: GStrategyGuardContext) {
    ctx.eventLogger.emit("LogStopLossDescalated", {
        message: `LogStopLossDescalated for ${evt.args.strategy}, success: ${evt.args.success}`,
        strategy: evt.args.strategy,
        success: evt.args.success
    })
}

async function logStrategyHarvestFailure(evt: LogStrategyHarvestFailureEvent, ctx: GStrategyGuardContext) {
    ctx.eventLogger.emit("LogStopLossDescalated", {
        message: `LogStrategyHarvestFailure for ${evt.args.strategy}, reason: ${evt.args.reason} \n data: ${evt.args.lowLevelData}`,
        strategy: evt.args.strategy,
        reason: evt.args.reason
    })
}

async function blockHandler(_:any, ctx: GVaultContext) {
    const totalSupply = scaleDown(await ctx.contract.totalSupply(), DECIMAL)
    const totalAssets = scaleDown(await ctx.contract.totalAssets(), DECIMAL)

    ctx.meter.Gauge("totalSupply").record(totalSupply)
    ctx.meter.Gauge("totalAssets").record(totalAssets)
}

async function genericEventHandler(evt: TypedEvent<any, any>, ctx: GVaultContext) {
    const eventName = evt.name
    if (eventName != 'Deposit' && eventName != 'Withdraw') {
        ctx.eventLogger.emit(eventName, {
            message: `${eventName} occurred at block ${ctx.blockNumber}`
        })

    }
}

GVaultProcessor.bind({address: "0x1402c1cAa002354fC2C4a4cD2b4045A5b9625EF3"})
.onEventWithdraw(withdrawHandler)
.onEventDeposit(depositHandler)
.onBlockInterval(blockHandler)
.onAllEvents(genericEventHandler)

GStrategyGuardProcessor.bind({address: "0xe09de1b49118bb197b2ea45d4d7054d48d1c3224"})
.onEventLogStopLossEscalated(logStopLossEscalated)
.onEventLogStopLossDescalated(logStopLossDescalated)
.onEventLogStopLossExecuted(logStopLossExecuted)
.onEventLogStrategyHarvestFailure(logStrategyHarvestFailure)