import { BigDecimal, EthChainId, Counter, Gauge } from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import { AaveV3PoolProcessor, AaveV3PoolContext } from './types/eth/aavev3pool.js';
import { getPriceByType, token } from "@sentio/sdk/utils";
import { getERC20ContractOnContext } from '@sentio/sdk/eth/builtin/erc20';

// a const map from chain name to address.
const CHAIN_ADDRESS_MAP = new Map<EthChainId, string>([
    [EthChainId.ETHEREUM, "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"],
    [EthChainId.OPTIMISM, "0x794a61358d6845594f94dc1db02a252b5b4814ad"],
    [EthChainId.ARBITRUM, "0x794a61358d6845594f94dc1db02a252b5b4814ad"],
    [EthChainId.POLYGON, "0x794a61358d6845594f94dc1db02a252b5b4814ad"],
    [EthChainId.FANTOM, "0x794a61358d6845594f94dc1db02a252b5b4814ad"],
    [EthChainId.AVALANCHE, "0x794a61358d6845594f94dc1db02a252b5b4814ad"],
])

let tokenMap = new Map<string, Promise<token.TokenInfo | undefined>>()

export const volOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
        // discardOrigin: false
    }
}

const vol = Gauge.register("vol", volOptions)

async function getTokenInfo(address: string, ctx: AaveV3PoolContext): Promise<token.TokenInfo | undefined> {
    if (address !== "0x0000000000000000000000000000000000000000") {
        try {
            return await token.getERC20TokenInfo(ctx, address)
        } catch (e) {
            console.log("rpc token is undefined", address, ctx.chainId, e)
            return undefined
        }
    } else {
        return token.NATIVE_ETH
    }
}

async function getOrCreateToken(ctx: AaveV3PoolContext, token: string): Promise<token.TokenInfo | undefined> {
    let infoPromise = tokenMap.get(token)
    if (!infoPromise) {
        infoPromise = getTokenInfo(token, ctx)
        tokenMap.set(token, infoPromise)
    }
    return infoPromise
}

async function getPriceByTokenInfo(amount: bigint, addr: string,
    ctx: AaveV3PoolContext, type: string) {
    let token = await getOrCreateToken(ctx, addr)
    if (token == undefined) {
        console.log("token is still undefined", addr, ctx.chainId)
        return BigDecimal(0)
    }
    let price: any
    try {
        price = await getPriceByType(ctx.chainId, addr, ctx.timestamp)
    } catch (e) {
        console.log(e)
        console.log("get price failed", addr, ctx.chainId)
        return BigDecimal(0)
    }

    let scaledAmount = amount.scaleDown(token.decimal)
    let v = scaledAmount.multipliedBy(price)
    if (!isNaN(v.toNumber())) {
        vol.record(ctx, scaledAmount.multipliedBy(price), { token: token.symbol, type: type })
        return v
    }
    return BigDecimal(0)
}


CHAIN_ADDRESS_MAP.forEach((addr, chainId) => {
    AaveV3PoolProcessor.bind({ address: addr, network: chainId })
        .onEventSupply(async (evt, ctx) => {
            ctx.meter.Counter("supply_counter").add(1, { project: "aave_v3" })
            // emit event log
            let token = (await getOrCreateToken(ctx, evt.args.reserve))!
            ctx.eventLogger.emit("supply", {
                distinctId: evt.args.user,
                amount: Number(evt.args.amount) / Math.pow(10, token.decimal),
                coin_symbol: token.symbol,
                project: "aave_v3"
            })
            //collateral counter
            ctx.meter.Counter("collateral_counter").add(Number(evt.args.amount) / Math.pow(10, token.decimal), { coin_symbol: token.symbol, project: "aave_v3" })
        }).onEventWithdraw(async (evt, ctx) => {
            ctx.meter.Counter("withdraw_counter").add(1, { project: "aave_v3" })
            // emit event log
            let token = (await getOrCreateToken(ctx, evt.args.reserve))!
            ctx.eventLogger.emit("withdraw", {
                distinctId: evt.args.user,
                amount: Number(evt.args.amount) / Math.pow(10, token.decimal),
                coin_symbol: token.symbol,
                to: evt.args.to,
                project: "aave_v3"
            })
            //collateral counter
            ctx.meter.Counter("collateral_counter").sub(Number(evt.args.amount) / Math.pow(10, token.decimal), { coin_symbol: token.symbol, project: "aave_v3" })
        }).onEventBorrow(async (evt, ctx) => {
            ctx.meter.Counter("borrow_counter").add(1, { project: "aave_v3" })
            // emit event log
            let value = await getPriceByTokenInfo(evt.args.amount, evt.args.reserve, ctx, "borrow")
            let token = (await getOrCreateToken(ctx, evt.args.reserve))!
            ctx.eventLogger.emit("borrow", {
                distinctId: evt.args.user,
                amount: Number(evt.args.amount) / Math.pow(10, token.decimal),
                value: value,
                coin_symbol: token.symbol,
                interestRateMode: evt.args.interestRateMode,
                referralCode: evt.args.referralCode,
                borrowRate: evt.args.borrowRate,
                project: "aave_v3"
            })
            //collateral counter
            ctx.meter.Counter("borrow_counter").add(Number(evt.args.amount) / Math.pow(10, token.decimal), { coin_symbol: token.symbol, project: "aave_v3" })
        }).onEventRepay(async (evt, ctx) => {
            ctx.meter.Counter("repay_counter").add(1, { project: "aave_v3" })
            // emit event log
            let value = await getPriceByTokenInfo(evt.args.amount, evt.args.reserve, ctx, "repay")
            let token = (await getOrCreateToken(ctx, evt.args.reserve))!
            ctx.eventLogger.emit("repay", {
                distinctId: evt.args.user,
                repayer: evt.args.repayer,
                amount: Number(evt.args.amount) / Math.pow(10, token.decimal),
                coin_symbol: token.symbol,
                value: value,
                project: "aave_v3"
            })
            //collateral counter
            ctx.meter.Counter("borrow_counter").sub(Number(evt.args.amount) / Math.pow(10, token.decimal), { coin_symbol: token.symbol })
        }).onEventFlashLoan(async (evt, ctx) => {
            ctx.meter.Counter("flashloan_counter").add(1)
            // emit event log like before
            let value = await getPriceByTokenInfo(evt.args.amount, evt.args.asset, ctx, "flashloan")
            ctx.eventLogger.emit("flashloan", {
                distinctId: evt.args.initiator,
                amount: evt.args.amount,
                reserve: evt.args.asset,
                interestRateMode: evt.args.interestRateMode,
                premium: evt.args.premium,
                referralCode: evt.args.referralCode,
                target: evt.args.target,
                value: value,
                project: "aave_v3"
            })
        })
        .onTimeInterval(async (_, ctx) => {
            let reserveList: string[]
            try {
                reserveList = await ctx.contract.getReservesList({ blockTag: ctx.blockNumber })
                // console.log("stringfied: ", JSON.stringify(reserveList))
            }
            catch (e) {
                console.log(`get reserveList error`)
                return
            }
            // let msg = ""
            for (let i = 0; i < reserveList.length; i++) {
                // msg = msg + `reserve ${i}: ${reserveList[i]}n\ `

                let token = await getOrCreateToken(ctx, reserveList[i])
                if (token == undefined) {
                    console.log("reserve token not undefined error", reserveList[i], ctx.chainId)
                    return
                }
                //get aToken address
                let aTokenAddress: any
                try {
                    const reserveData = await ctx.contract.getReserveData(reserveList[i], { blockTag: ctx.blockNumber })
                    // console.log(`reserveData stringfied: ${JSON.stringify(reserveData)}`)
                    // let msg_2 = ""
                    // for (let j = 0; j < reserveData.length; j++) {
                    //     msg_2 = msg_2 + `reserveData ${j}: ${reserveData[j]}n\ `
                    // }
                    // console.log(msg_2, "stringfied reserveData: ", JSON.stringify(reserveData), "reserveList[", i, "]: ", reserveList[i])

                    aTokenAddress = reserveData[8].toString()
                    // console.log(`aTokenAddress: ${aTokenAddress}`)
                }
                catch (e) {
                    console.log(`get reserveData error ${reserveList[i]}`)
                    return
                }
                //get collateral tvl
                let tvl: any
                try {
                    tvl = Number(await getERC20ContractOnContext(ctx, reserveList[i]).balanceOf(aTokenAddress)) / Math.pow(10, token.decimal)
                }
                catch (e) {
                    console.log(`get tvl error ${reserveList[i]} ${aTokenAddress}`)
                    return
                }
                ctx.meter.Gauge("aave_tvl_gauge").record(tvl, {
                    coin_symbol: token.symbol,
                    project: "aave_v3"
                })
            }
            // console.log(msg, "stringfied reservelist: ", JSON.stringify(reserveList))
        }, 14400, 120)
})