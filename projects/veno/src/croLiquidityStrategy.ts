import { EthChainId } from "@sentio/sdk/eth";
import { WCroDelegatorContext, WCroDelegatorProcessor } from "./types/eth/wcrodelegator.js";
import { CroDelegatorContext, CroDelegatorProcessor, DepositEvent } from "./types/eth/crodelegator.js";
import { scaleDown } from '@sentio/sdk'
import { LCroDelegatorContext, LCroDelegatorProcessor } from "./types/eth/lcrodelegator.js";
import { FerroLCroCroLPStrategyContext, FerroLCroCroLPStrategyProcessor } from "./types/eth/ferrolcrocrolpstrategy.js";


const StrategyVaultWCRODelegator = "0x186a963f78ba0ca8e1799a32e3106c9fee05c7c1"
const StrategyVaultCRODelegator = "0xd73863c0d3637ca805d449aac7ed04c605bc456c"
const StrategyVaultLCRODelegator = "0xbd69099e29dd0d4a1dd24f3c2058fd7f07e0aee5"
const FerroLCROCROLPStrategy = "0x6b5E1fC9b73aBeE02926F796DCD948DffA139419"


const depositCroEventHandler = async (event: DepositEvent, ctx: WCroDelegatorContext | CroDelegatorContext) => {
    ctx.eventLogger.emit("vault_cro_deposit_amount", {
        distinctId: event.args.recipient,
        amount: scaleDown(event.args.amount, 18),
        shares: event.args.shares
    })
    ctx.meter.Counter("vault_cro_deposit_amount_counter").add(scaleDown(event.args.amount, 18))
    ctx.meter.Counter("vault_share_deposit_amount_counter").add(scaleDown(event.args.amount, 18))
}

const withdrawCroEventHandler = async (event: DepositEvent, ctx: WCroDelegatorContext | CroDelegatorContext) => {
    ctx.eventLogger.emit("vault_cro_withdraw_amount", {
        distinctId: event.args.recipient,
        amount: scaleDown(event.args.amount, 18),
        shares: event.args.shares
    })
    ctx.meter.Counter("vault_cro_withdraw_amount_counter").add(scaleDown(event.args.amount, 18))
    ctx.meter.Counter("vault_share_withdraw_amount_counter").add(scaleDown(event.args.amount, 18))
}

const depositLCroEventHandler = async (event: DepositEvent, ctx: LCroDelegatorContext) => {
    ctx.eventLogger.emit("vault_lcro_deposit_amount", {
        distinctId: event.args.recipient,
        amount: scaleDown(event.args.amount, 18),
        shares: event.args.shares
    })
    ctx.meter.Counter("vault_lcro_deposit_amount_counter").add(scaleDown(event.args.amount, 18))
    ctx.meter.Counter("vault_share_deposit_amount_counter").add(scaleDown(event.args.amount, 18))

}

const withdrawLCroEventHandler = async (event: DepositEvent, ctx: LCroDelegatorContext) => {
    ctx.eventLogger.emit("vault_lcro_withdraw_amount", {
        distinctId: event.args.recipient,
        amount: scaleDown(event.args.amount, 18),
        shares: event.args.shares
    })
    ctx.meter.Counter("vault_lcro_withdraw_counter").add(scaleDown(event.args.amount, 18))
    ctx.meter.Counter("vault_share_withdraw_amount_counter").add(scaleDown(event.args.amount, 18))
}

const depositFerroLPEventHandler = async (event: DepositEvent, ctx: FerroLCroCroLPStrategyContext) => {
    ctx.eventLogger.emit("vault_lp_deposit_amount", {
        distinctId: event.args.recipient,
        amount: scaleDown(event.args.amount, 18),
        shares: event.args.shares
    })
    ctx.meter.Counter("vault_lp_deposit_amount_counter").add(scaleDown(event.args.amount, 18))
    ctx.meter.Counter("vault_share_deposit_amount_counter").add(scaleDown(event.args.amount, 18))
}

const withdrawFerroLPEventHandler = async (event: DepositEvent, ctx: FerroLCroCroLPStrategyContext) => {
    ctx.eventLogger.emit("vault_lp_withdraw_amount", {
        distinctId: event.args.recipient,
        amount: scaleDown(event.args.amount, 18),
        shares: event.args.shares
    })
    ctx.meter.Counter("vault_lp_withdraw_counter").add(scaleDown(event.args.amount, 18))
    ctx.meter.Counter("vault_share_withdraw_amount_counter").add(scaleDown(event.args.amount, 18))
}

const onTimeIntervalHandler = async (_: any, ctx: any) => {
    ctx.meter.Gauge("exchange_rate").record(await ctx.contract.pricePerShare())
}

WCroDelegatorProcessor.bind({
    address: StrategyVaultWCRODelegator,
    network: EthChainId.CRONOS
})
    .onEventDeposit(depositCroEventHandler)
    .onEventWithdraw(withdrawCroEventHandler)

CroDelegatorProcessor.bind({
    address: StrategyVaultCRODelegator,
    network: EthChainId.CRONOS
})
    .onEventDeposit(depositCroEventHandler)
    .onEventWithdraw(withdrawCroEventHandler)


LCroDelegatorProcessor.bind({
    address: StrategyVaultLCRODelegator,
    network: EthChainId.CRONOS
})
    .onEventDeposit(depositLCroEventHandler)
    .onEventWithdraw(withdrawLCroEventHandler)

FerroLCroCroLPStrategyProcessor.bind({
    address: FerroLCROCROLPStrategy,
    network: EthChainId.CRONOS
})
    .onEventDeposit(depositFerroLPEventHandler)
    .onEventWithdraw(withdrawFerroLPEventHandler)
    .onTimeInterval(onTimeIntervalHandler)

