import { LiquidAtomProcessor, StakeEvent, RequestUnbondEvent, UnbondEvent, AccrueRewardEvent, LiquidAtomContext } from './types/eth/liquidatom.js'
import { EthChainId } from "@sentio/sdk/eth";

const AtomStakeEventHandler = async (event: StakeEvent, ctx: LiquidAtomContext) => {
    const receiver = event.args.receiver
    const tokenAmount = Number(event.args.tokenAmount) / Math.pow(10, 6)
    const shareAmount = Number(event.args.shareAmount) / Math.pow(10, 6)
    ctx.meter.Counter(`latom_staked_counter`).add(tokenAmount)

    ctx.eventLogger.emit("StakeLatom", {
        distinctId: receiver,
        tokenAmount,
        shareAmount
    })
}

const AtomRequestUnbondEventHandler = async (event: RequestUnbondEvent, ctx: LiquidAtomContext) => {
    const receiver = event.args.receiver
    const tokenId = Number(event.args.tokenId)
    const shareAmount = Number(event.args.shareAmount) / Math.pow(10, 6)
    const liquidToken2TokenExchangeRate = Number(event.args.liquidToken2TokenExchangeRate)
    const batchNo = Number(event.args.batchNo)
    try {
        const EXCHANGE_RATE_PRECISION = Number(await ctx.contract.EXCHANGE_RATE_PRECISION())
        const latom_unstaked = shareAmount * liquidToken2TokenExchangeRate / EXCHANGE_RATE_PRECISION

        ctx.meter.Counter(`latom_unstaked_counter`).add(latom_unstaked)

        ctx.eventLogger.emit("RequestUnbond", {
            distinctId: receiver,
            tokenId,
            shareAmount,
            liquidToken2TokenExchangeRate,
            batchNo,
            EXCHANGE_RATE_PRECISION,
            latom_unstaked
        })
    }
    catch (e) {
        console.log(e.message, "get EXCHANGE_RATE_PRECISION issue at ", ctx.transactionHash)
    }
}

const AtomUnbondEventHandler = async (event: UnbondEvent, ctx: LiquidAtomContext) => {
    const receiver = event.args.receiver
    const tokenId = Number(event.args.tokenId)
    const tokenAmount = Number(event.args.tokenAmount) / Math.pow(10, 6)
    const tokenFeeAmount = Number(event.args.tokenFeeAmount) / Math.pow(10, 6)
    ctx.meter.Counter(`latom_claimed`).add(tokenAmount)
    ctx.meter.Counter(`latom_withdrawal_fees`).add(tokenFeeAmount)


    ctx.eventLogger.emit("Unbond", {
        distinctId: receiver,
        tokenId,
        tokenAmount,
        tokenFeeAmount
    })
}
const AtomAccrueRewardEventHandler = async (event: AccrueRewardEvent, ctx: LiquidAtomContext) => {
    const amount = Number(event.args.amount) / Math.pow(10, 6)
    const txnHash = event.args.txnHash
    ctx.meter.Counter(`accrueReward_counter`).add(amount)
    ctx.eventLogger.emit("AccrueReward", {
        amount,
        txnHash
    })
}

LiquidAtomProcessor.bind({ address: '0xAC974ee7fc5d083112c809cCb3FCe4a4F385750D', network: EthChainId.CRONOS })
    .onEventStake(AtomStakeEventHandler)
    .onEventRequestUnbond(AtomRequestUnbondEventHandler)
    .onEventUnbond(AtomUnbondEventHandler)
    .onEventAccrueReward(AtomAccrueRewardEventHandler)