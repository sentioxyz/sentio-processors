import {BigDecimal, CHAIN_IDS, Counter, Gauge, toBigInteger} from '@sentio/sdk'
import { ERC20Processor } from '@sentio/sdk/eth/builtin'
import {VaultProcessor, VaultContext, FlashLoanCallTrace} from './types/eth/vault.js'
import {MetaStablePoolProcessor, MetaStablePoolContext} from './types/eth/metastablepool.js'
import {ComposableStablePoolProcessor} from './types/eth/composablestablepool.js'
import {WeightedPool, WeightedPoolContext, WeightedPoolProcessor} from './types/eth/weightedpool.js'
import {WeightedPoolFactoryProcessor, WeightedPoolFactoryContext} from './types/eth/weightedpoolfactory.js'
import { getPriceByType,  token } from "@sentio/sdk/utils"

const weightedPools=[
    "0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56",//   BAL80%    WETH20%               1%
    "0x76FCf0e8C7Ff37A47a799FA2cd4c13cDe0D981C9",//    OHM50%    DAI50%            0.3%
    "0xD1eC5e215E8148D76F4460e4097FD3d5ae0A3558",//   OHM50%    WETH50%        0.3%
    "0x1ee442b5326009Bb18F2F472d3e0061513d1A0fF",//    BADGER50%      rETH50%      0.25%
    "0x8bd4a1e74a27182d23b98c10fd21d4fbb0ed4ba",//     TEMPLE50%     DAI50%      0.5%
    "0xf4c0dd9b82da36c07605df83c8a416f11724d88b",//     GNO80%     WETH20%       0.3%
    "0xcfca23ca9ca720b6e98e3eb9b6aa0ffc4a5c08b9",//      WETH50%     AURA50%    0.3%
    "0x9232a548dd9e81bac65500b5e0d918f8ba93675c",//     LIT80%     WETH20%       1%
    "0x87a867f5d240a782d43d90b6b06dea470f3f8f22",//     wstETH50%    COMP50%    0.1%
    "0xb460daa847c45f1c4a41cb05bfb3b51c92e41b36",//      BADGER80%   WBTC20%   0.3%
]

interface poolInfo {
    weight:BigDecimal[],
    reserves: BigDecimal[],
    fee: BigDecimal
}

const poolInfos:poolInfo[]=[
    {weight: [BigDecimal(80), BigDecimal(20)], reserves: [BigDecimal(0), BigDecimal(0)], fee: BigDecimal(0.01)},
    {weight: [BigDecimal(50), BigDecimal(50)], reserves: [BigDecimal(0), BigDecimal(0)], fee: BigDecimal(0.003)},
    {weight: [BigDecimal(50), BigDecimal(50)], reserves: [BigDecimal(0), BigDecimal(0)], fee: BigDecimal(0.003)},
    {weight: [BigDecimal(50), BigDecimal(50)], reserves: [BigDecimal(0), BigDecimal(0)], fee: BigDecimal(0.0025)},
    {weight: [BigDecimal(50), BigDecimal(50)], reserves: [BigDecimal(0), BigDecimal(0)], fee: BigDecimal(0.005)},
    {weight: [BigDecimal(80), BigDecimal(20)], reserves: [BigDecimal(0), BigDecimal(0)], fee: BigDecimal(0.003)},
    {weight: [BigDecimal(50), BigDecimal(50)], reserves: [BigDecimal(0), BigDecimal(0)], fee: BigDecimal(0.003)},
    {weight: [BigDecimal(80), BigDecimal(20)], reserves: [BigDecimal(0), BigDecimal(0)], fee: BigDecimal(0.01)},
    {weight: [BigDecimal(50), BigDecimal(50)], reserves: [BigDecimal(0), BigDecimal(0)], fee: BigDecimal(0.001)},
    {weight: [BigDecimal(80), BigDecimal(20)], reserves: [BigDecimal(0), BigDecimal(0)], fee: BigDecimal(0.003)},
]

let weightedPoolMap = new Map<string, poolInfo>()

for(let i=0;i<weightedPools.length;i++){
    weightedPoolMap.set(weightedPools[i], poolInfos[i])
}

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
    let infoPromise = tokenMap.get(token)
    if (!infoPromise) {
        infoPromise = getTokenInfo(token)
        tokenMap.set(token, infoPromise)
    }
    return infoPromise
}

let startBlock = 17188000

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

async function calOutAmountWeighted(amount: BigDecimal, weightIn:BigDecimal, weightOut:BigDecimal, reserveIn:BigDecimal, reserveOut: BigDecimal, fee:BigDecimal) : Promise<BigDecimal> {
    amount=amount.multipliedBy(BigDecimal(1).minus(fee))
    const exponent = weightIn.div(weightOut);
    const denominator = reserveIn.plus(amount);
    const base = reserveIn.div(denominator);
    const power = base.pow(exponent);
    return reserveOut.minus(reserveOut.times(power));
}

async function calInAmountWeighted(amount: BigDecimal, weightIn:BigDecimal, weightOut:BigDecimal, reserveIn:BigDecimal, reserveOut: BigDecimal, fee:BigDecimal) : Promise<BigDecimal> {
    const base = reserveOut.div(reserveOut.minus(amount));
    const exponent = weightOut.div(weightIn);
    const power = base.sqrt().sqrt().pow(exponent.times(4));
    return reserveIn.times(power.minus(BigDecimal(1))).dividedBy(BigDecimal(1).minus(fee));
}

VaultProcessor.bind({address: "0xBA12222222228d8Ba445958a75a0704d566BF2C8", startBlock:startBlock})
    .onEventSwap(async (evt, ctx) => {
        let [tokens, reserves, lastChangeBlock]= await ctx.contract.getPoolTokens(evt.args.poolId)
        let symbol=""
        let reserve=""
        let weightIn=BigDecimal(0)
        let weightOut=BigDecimal(0)
        let reserveIn=BigDecimal(0)
        let reserveOut=BigDecimal(0)
        let poolAddress = await ctx.contract.getPool(evt.args.poolId)
        let poolInfo = weightedPoolMap.get(poolAddress[0])
        if (poolInfo == undefined) {
            return
        }
        let fee=poolInfo.fee
        let tokenIn = await getOrCreateToken(ctx, evt.args.tokenIn)
        if (tokenIn == undefined) {
            return
        }
        let tokenOut = await getOrCreateToken(ctx, evt.args.tokenOut)
        if (tokenOut == undefined) {
            return
        }
        for (let i=0;i<tokens.length;i++) {
            let token = await getOrCreateToken(ctx, tokens[i])
            if (token == undefined) {
                continue
            }
            if (token == tokenIn) {
                weightIn = poolInfo.weight[i]
                if (!poolInfo.reserves[i].eq(0)){
                    reserveIn = poolInfo.reserves[i]
                }else{
                    reserveIn = reserves[i].scaleDown(token.decimal)
                }
                poolInfo.reserves[i] = reserves[i].scaleDown(token.decimal)
            }else if(token == tokenOut) {
                weightOut = poolInfo.weight[i]
                if (!poolInfo.reserves[i].eq(0)){
                    reserveOut = poolInfo.reserves[i]
                }else{
                    reserveOut = reserves[i].scaleDown(token.decimal)
                }
                poolInfo.reserves[i] = reserves[i].scaleDown(token.decimal)
            }else{
                continue
            }
            weightedPoolMap.set(poolAddress[0], poolInfo)
            symbol=symbol+ token.symbol+", "
            reserve = reserve + token.symbol +": "+Number(reserves[i].scaleDown(token.decimal)) + ", "
        }
        ctx.eventLogger.emit("reserves", {
            token: symbol,
            reserve: reserve,
            fee: fee,
            lastChangeBlock: lastChangeBlock,
        })
        let symbolIn = tokenIn.symbol
        let symbolOut = tokenOut.symbol
        let decimalIn = tokenIn.decimal
        let decimalOut = tokenOut.decimal
        let outAmount = await calOutAmountWeighted(evt.args.amountIn.scaleDown(decimalIn), weightIn, weightOut,reserveIn, reserveOut, fee)
        let inAmount = await calInAmountWeighted(evt.args.amountOut.scaleDown(decimalOut), weightIn, weightOut,reserveIn, reserveOut, fee)
            ctx.eventLogger.emit("OutAmountGivenIn", {
                tokenIn: symbolIn,
                tokenOut: symbolOut,
                giveAmountIn: evt.args.amountIn.scaleDown(decimalIn),
                weightIn: weightIn,
                weightOut: weightOut,
                reserveIn: reserveIn,
                reserveOut: reserveOut,
                amountOut: outAmount,
                fee: fee,
            })
        ctx.eventLogger.emit("InAmountGivenOut", {
            tokenIn: symbolIn,
            tokenOut: symbolOut,
            giveAmountOut: evt.args.amountOut.scaleDown(decimalOut),
            weightIn: weightIn,
            weightOut: weightOut,
            reserveIn: reserveIn,
            reserveOut: reserveOut,
            amountIn: inAmount,
            fee: fee,
        })

        ctx.eventLogger.emit("swap", {
            tokenIn:symbolIn,
            tokenOut:symbolOut,
            amountIn:evt.args.amountIn.scaleDown(decimalIn),
            amountOut:evt.args.amountOut.scaleDown(decimalOut),
        })
    })
