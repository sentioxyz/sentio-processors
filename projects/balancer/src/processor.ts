import {BigDecimal, CHAIN_IDS, Counter, Gauge} from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {VaultProcessor, VaultContext, FlashLoanCallTrace} from './types/eth/vault.js'
import {MetaStablePoolProcessor, MetaStablePoolContext} from './types/eth/metastablepool.js'
import {ComposableStablePoolProcessor} from './types/eth/composablestablepool.js'
import { getPriceByType,  token } from "@sentio/sdk/utils"

let tokenMap = new Map<string, Promise<token.TokenInfo | undefined>>()

async function getTokenInfo(address: string): Promise<token.TokenInfo | undefined> {
    if (address !== "0x0000000000000000000000000000000000000000") {
        try {
            return await token.getERC20TokenInfo(1, address)
        } catch(e) {
            console.log(e)
            return undefined
        }
    } else {
        return token.NATIVE_ETH
    }
}

async function getOrCreateToken(ctx:VaultContext, token: string) : Promise<token.TokenInfo | undefined>{
    let infoPromise = tokenMap.get(ctx.address)
    if (!infoPromise) {
        infoPromise = getTokenInfo(token)
        tokenMap.set(token, infoPromise)
    }
    return infoPromise
}

async function getPriceByTokenInfo(amount: bigint, addr:string, ctx:VaultContext) : Promise<BigDecimal> {
    let token = await getOrCreateToken(ctx, addr)
    let price :any
    try {
        price = await getPriceByType(CHAIN_IDS.ETHEREUM, addr, ctx.timestamp)
    } catch (e) {
        console.log(e)
        return BigDecimal(0)
    }
    if (token == undefined) {
        return BigDecimal(0)
    }
    let scaledAmount = amount.scaleDown(token.decimal)
    return scaledAmount.multipliedBy(price)
}

VaultProcessor.bind({address: "0xBA12222222228d8Ba445958a75a0704d566BF2C8"})
    .onEventPoolBalanceChanged(async (evt, ctx) => {
        for (let i=0;i<evt.args.tokens.length;i++) {
            let token = await getOrCreateToken(ctx, evt.args.tokens[i])
            if (token == undefined) {
                continue
            }
            ctx.eventLogger.emit("pool",{
                distinctId: evt.args.liquidityProvider,
                token: evt.args.tokens[i],
                poolID: evt.args.poolId,
                amount: evt.args.deltas[i].scaleDown(token.decimal),
            })
        }
    })
    .onCallFlashLoan(async (call:FlashLoanCallTrace, ctx) => {
        if (call.error) {
            return
        }
        let total = BigDecimal(0)
        for (let i=0;i<call.args.tokens.length;i++) {
            let ret = await getPriceByTokenInfo(call.args.amounts[i], call.args.tokens[i], ctx)
            total = total.plus(ret)
        }
        ctx.eventLogger.emit("flashLoan", {
            distinctId: call.args.recipient,
            amounts: call.args.amounts.join(" "),
            tokens: call.args.tokens.join(" "),
            total: total
        })

    })
    .onCallBatchSwap(async (call, ctx) => {
        if (call.error) {
            return
        }
        let total = BigDecimal(0)
        for (let i=0;i<call.args.swaps.length;i++) {
            let ret = await getPriceByTokenInfo(call.args.swaps[i].amount,
                call.args.assets[Number(call.args.swaps[i].assetInIndex)], ctx)
            total = total.plus(ret)
        }
        ctx.eventLogger.emit("batchSwap", {
            distinctId: call.args.funds.sender,
           total:total,
          }
        )

    })
    .onCallSwap(async (call, ctx) => {
        if (call.error) {
            return
        }
        let ret = await getPriceByTokenInfo(call.args.singleSwap.amount, call.args.singleSwap.assetIn, ctx)
    ctx.eventLogger.emit("swap", {
        distinctId: call.args.funds.sender,
        amount: call.args.singleSwap.amount,
        assetIn: call.args.singleSwap.assetIn,
        assetOut: call.args.singleSwap.assetOut,
        poolId: call.args.singleSwap.assetOut,
        total: ret,
    })
})
