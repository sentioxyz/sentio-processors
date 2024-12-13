import { LiquidAtomProcessor, StakeEvent, RequestUnbondEvent, UnbondEvent, AccrueRewardEvent, LiquidAtomContext } from './types/eth/liquidatom.js'
import { EthChainId } from "@sentio/sdk/eth";

const EthStakeEventHandler = async (event: StakeEvent, ctx: LiquidAtomContext) => {
    const receiver = event.args.receiver
    const tokenAmount = Number(event.args.tokenAmount) / Math.pow(10, 18)
    const shareAmount = Number(event.args.shareAmount) / Math.pow(10, 18)
    ctx.meter.Counter(`eth_staked_counter`).add(tokenAmount)

    ctx.eventLogger.emit("StakeEth", {
        distinctId: receiver,
        tokenAmount,
        shareAmount
    })
}

const EthRequestUnbondEventHandler = async (event: RequestUnbondEvent, ctx: LiquidAtomContext) => {
    const receiver = event.args.receiver
    const tokenId = Number(event.args.tokenId)
    const shareAmount = Number(event.args.shareAmount) / Math.pow(10, 18)
    const liquidToken2TokenExchangeRate = Number(event.args.liquidToken2TokenExchangeRate)
    const batchNo = Number(event.args.batchNo)
    try {
        const EXCHANGE_RATE_PRECISION = Number(await ctx.contract.EXCHANGE_RATE_PRECISION())
        const eth_unstaked = shareAmount * liquidToken2TokenExchangeRate / EXCHANGE_RATE_PRECISION

        ctx.meter.Counter(`eth_unstaked_counter`).add(eth_unstaked)

        ctx.eventLogger.emit("RequestUnbond", {
            distinctId: receiver,
            tokenId,
            shareAmount,
            liquidToken2TokenExchangeRate,
            batchNo,
            EXCHANGE_RATE_PRECISION,
            eth_unstaked
        })
    }
    catch (e) {
        console.log(e.message, "get EXCHANGE_RATE_PRECISION issue at ", ctx.transactionHash)
    }
}

const EthUnbondEventHandler = async (event: UnbondEvent, ctx: LiquidAtomContext) => {
    const receiver = event.args.receiver
    const tokenId = Number(event.args.tokenId)
    const tokenAmount = Number(event.args.tokenAmount) / Math.pow(10, 18)
    const tokenFeeAmount = Number(event.args.tokenFeeAmount) / Math.pow(10, 18)
    ctx.meter.Counter(`eth_claimed`).add(tokenAmount)
    ctx.meter.Counter(`eth_withdrawal_fees`).add(tokenFeeAmount)


    ctx.eventLogger.emit("Unbond", {
        distinctId: receiver,
        tokenId,
        tokenAmount,
        tokenFeeAmount
    })
}
const EthAccrueRewardEventHandler = async (event: AccrueRewardEvent, ctx: LiquidAtomContext) => {
    const amount = Number(event.args.amount) / Math.pow(10, 18)
    const txnHash = event.args.txnHash
    ctx.meter.Counter(`accrueReward_counter`).add(amount)
    ctx.eventLogger.emit("AccrueReward", {
        amount,
        txnHash
    })
}

LiquidAtomProcessor.bind({ address: '0xE7895ed01a1a6AAcF1c2E955aF14E7cf612E7F9d', network: EthChainId.ZKSYNC_ERA })
    .onEventStake(EthStakeEventHandler)
    .onEventRequestUnbond(EthRequestUnbondEventHandler)
    .onEventUnbond(EthUnbondEventHandler)
    .onEventAccrueReward(EthAccrueRewardEventHandler)