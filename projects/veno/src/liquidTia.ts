import { EthChainId } from "@sentio/sdk/eth";
import { LiquidTiaProcessor, StakeEvent, RequestUnbondEvent, UnbondEvent, AccrueRewardEvent, LiquidTiaContext } from './types/eth/liquidtia.js'



const tiaStakeEventHandler = async (event: StakeEvent, ctx: LiquidTiaContext) => {
    const receiver = event.args.receiver
    const tokenAmount = Number(event.args.tokenAmount) / Math.pow(10, 6)
    const shareAmount = Number(event.args.shareAmount) / Math.pow(10, 6)
    ctx.meter.Counter(`ltia_staked_counter`).add(tokenAmount)

    ctx.eventLogger.emit("StakeLtia", {
        distinctId: receiver,
        tokenAmount,
        shareAmount
    })
}

const tiaRequestUnbondEventHandler = async (event: RequestUnbondEvent, ctx: LiquidTiaContext) => {
    const receiver = event.args.receiver
    const tokenId = Number(event.args.tokenId)
    const shareAmount = Number(event.args.shareAmount) / Math.pow(10, 6)
    const liquidToken2TokenExchangeRate = Number(event.args.liquidToken2TokenExchangeRate)
    const batchNo = Number(event.args.batchNo)
    try {
        const EXCHANGE_RATE_PRECISION = Number(await ctx.contract.EXCHANGE_RATE_PRECISION())
        const ltia_unstaked = shareAmount * liquidToken2TokenExchangeRate / EXCHANGE_RATE_PRECISION

        ctx.meter.Counter(`ltia_unstaked_counter`).add(ltia_unstaked)

        ctx.eventLogger.emit("RequestUnbond", {
            distinctId: receiver,
            tokenId,
            shareAmount,
            liquidToken2TokenExchangeRate,
            batchNo,
            EXCHANGE_RATE_PRECISION,
            ltia_unstaked
        })
    }
    catch (e) {
        console.log(e.message, "get EXCHANGE_RATE_PRECISION issue at ", ctx.transactionHash)
    }
}

const tiaUnbondEventHandler = async (event: UnbondEvent, ctx: LiquidTiaContext) => {
    const receiver = event.args.receiver
    const tokenId = Number(event.args.tokenId)
    const tokenAmount = Number(event.args.tokenAmount) / Math.pow(10, 6)
    const tokenFeeAmount = Number(event.args.tokenFeeAmount) / Math.pow(10, 6)
    ctx.meter.Counter(`ltia_claimed`).add(tokenAmount)
    ctx.meter.Counter(`ltia_withdrawal_fees`).add(tokenFeeAmount)


    ctx.eventLogger.emit("Unbond", {
        distinctId: receiver,
        tokenId,
        tokenAmount,
        tokenFeeAmount
    })
}
const tiaAccrueRewardEventHandler = async (event: AccrueRewardEvent, ctx: LiquidTiaContext) => {
    const amount = Number(event.args.amount) / Math.pow(10, 6)
    const txnHash = event.args.txnHash
    ctx.meter.Counter(`accrueReward_counter`).add(amount)
    ctx.eventLogger.emit("AccrueReward", {
        amount,
        txnHash
    })
}

LiquidTiaProcessor.bind({ address: '0x276e28664dec4982f892a5b836e11f23040b6995', network: EthChainId.CRONOS })
    .onEventStake(tiaStakeEventHandler)
    .onEventRequestUnbond(tiaRequestUnbondEventHandler)
    .onEventUnbond(tiaUnbondEventHandler)
    .onEventAccrueReward(tiaAccrueRewardEventHandler)