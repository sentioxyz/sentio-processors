// @ts-ignore
import {
    BurnEvent,
    MintEvent,
    SwapEvent,
    UniswapPoolContext,
    UniswapPoolProcessor,
} from './types/eth/uniswappool.js'
import { getERC20Contract } from '@sentio/sdk/eth/builtin/erc20'
import { getPriceByType,  token } from "@sentio/sdk/utils"
import { BigDecimal, CHAIN_IDS, Gauge, MetricOptions } from "@sentio/sdk";

const usdcEthAddress =[
    "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",  //usdc/eth 0.05%
    "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",  //usdc/eth 0.3%
    "0x7bea39867e4169dbe237d55c8242a8f2fcdcc387",  //usdc/eth 1%
]

const wbtcEthAddress =[
    "0x4585fe77225b41b697c938b018e2ac67ac5a20c0",  //wbtc/eth 0.05%
    "0xcbcdf9626bc03e24f779434178a73a0b4bad62ed",  //wbtc/eth 0.3%
    "0x6ab3bba2f41e7eaa262fa5a1a9b3932fa161526f",  //wbtc/eth 1%
]

const daiUsdcAddress =[
    "0x5777d92f208679db4b9778590fa3cab3ac9e2168",  //dai/usdc 0.01%
    "0x6c6bc977e13df9b0de53b251522280bb72383700",  //dai/usdc 0.05%
]

const daiEthAddress =[
    "0x60594a405d53811d3bc4766596efd80fd545a270",  //dai/eth 0.05%
    "0xc2e9f25be6257c210d7adf0d4cd6e3e881ba25f8",  //dai/eth 0.3%
]

const usdtUsdcAddress =[
    "0x3416cf6c708da44db2624d63ea0aaef7113527c6",  //usdc/usdt 0.01%
    "0x7858e59e0c01ea06df3af3d20ac7b0003275d4bf",  //usdc/usdt 0.05%
]

const ethUsdtAddress =[
    "0x11b815efb8f581194ae79006d24e0d814b7697f6",  //eth/usdt 0.05%
    "0x4e68ccd3e89f51c3074ca5072bbac773960dfa36",  //eth/usdt 0.3%
]

const pools = [
    "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",  //usdc/eth 0.05%
    "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",  //usdc/eth 0.3%
    "0x7bea39867e4169dbe237d55c8242a8f2fcdcc387",  //usdc/eth 1%
    "0x4585fe77225b41b697c938b018e2ac67ac5a20c0",  //wbtc/eth 0.05%
    "0xcbcdf9626bc03e24f779434178a73a0b4bad62ed",  //wbtc/eth 0.3%
    "0x6ab3bba2f41e7eaa262fa5a1a9b3932fa161526f",  //wbtc/eth 1%
    "0x5777d92f208679db4b9778590fa3cab3ac9e2168",  //dai/usdc 0.01%
    "0x6c6bc977e13df9b0de53b251522280bb72383700",  //dai/usdc 0.05%
    "0xc2e9f25be6257c210d7adf0d4cd6e3e881ba25f8",  //dai/eth 0.3%
    "0x60594a405d53811d3bc4766596efd80fd545a270",  //dai/eth 0.05%
    "0x3416cf6c708da44db2624d63ea0aaef7113527c6",  //usdc/usdt 0.01%
    "0x7858e59e0c01ea06df3af3d20ac7b0003275d4bf",  //usdc/usdt 0.05%
    "0x11b815efb8f581194ae79006d24e0d814b7697f6",  //eth/usdt 0.05%
    "0x4e68ccd3e89f51c3074ca5072bbac773960dfa36",  //eth/usdt 0.3%
]

async function getTokenInfo(ctx: UniswapPoolContext, address: string): Promise<token.TokenInfo> {
    if (address !== "0x0000000000000000000000000000000000000000") {
        return await token.getERC20TokenInfo(ctx,address)
    } else {
        return token.NATIVE_ETH
    }
}

export const gaugeOptions: MetricOptions = {
    sparse: true,
    aggregationConfig: {
        intervalInMinutes: [60],
    }
}

interface poolInfo {
    token0: token.TokenInfo
    token1: token.TokenInfo
    token0Address: string
    token1Address: string
    fee: string
    realTimePrice: number
}
let poolInfoMap = new Map<string, Promise<poolInfo>>()
let priceMap = new Map<string, number>()


export const vol = Gauge.register("vol", gaugeOptions)

async function buildPoolInfo(ctx: UniswapPoolContext): Promise<poolInfo> {
    const address0 = await ctx.contract.token0()
    const address1 = await ctx.contract.token1()
    const tokenInfo0 = await getTokenInfo(ctx, address0)
    const tokenInfo1 = await getTokenInfo(ctx, address1)
    return {
        token0: tokenInfo0,
        token1: tokenInfo1,
        token0Address: address0,
        token1Address: address1,
        fee: (await ctx.contract.fee()).toString(),
        realTimePrice: 0,
    }
}

const getOrCreatePool = async function (ctx: UniswapPoolContext) :Promise<poolInfo> {
    let infoPromise = poolInfoMap.get(ctx.address)
    if (!infoPromise) {
        infoPromise = buildPoolInfo(ctx)
        poolInfoMap.set(ctx.address, infoPromise)
        console.log("set poolInfoMap for " + ctx.address)
    }
    return await infoPromise
}

async function getToken(ctx: UniswapPoolContext, info: token.TokenInfo, address :string, amount: bigint):
    Promise<[BigDecimal, BigDecimal]> {
    let scaledAmount = amount.scaleDown(info.decimal)
    const price = await getPriceByType(CHAIN_IDS.ETHEREUM, address, ctx.timestamp) || 0
    return [scaledAmount, scaledAmount.multipliedBy(price)]
}

const poolName = function(token0 :string, token1:string, fee: string) {
    const feeNum = Number(fee) / 10000
    return token0 + "/" + token1 + "-" + feeNum + "%"
}

interface priceDiff{
    priceDiff: number
    exchangePool: string
}

async function rtPriceUsdcEth(_:any, ctx: UniswapPoolContext) {
    const slot0 = await ctx.contract.slot0()
    const info = await getOrCreatePool(ctx)
    let sqrtPriceX96 =slot0.sqrtPriceX96
    let token0To1Price = Number(sqrtPriceX96)**2 / (2 ** 192)
    let token1To0Price = (1/token0To1Price) *10**12
    let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
    info.realTimePrice =token1To0Price
    ctx.meter.Gauge("ethToUSDCPrice").record(token1To0Price, {token: info.token0.symbol,
        poolName: name})
    priceMap.set(ctx.address, token1To0Price)
    const priceDiff = await priceDiffCal1(ctx.address, token1To0Price)
    ctx.meter.Gauge("priceDiffForEth").record(priceDiff.priceDiff, {token: info.token0.symbol,
        poolName: priceDiff.exchangePool})
}

async function priceDiffCal1(address :string, price1: number): Promise<priceDiff>{
    let priceDiff1=0
    let priceDiff2=0
    let returnPriceDiff: priceDiff = {priceDiff: 0, exchangePool: ""}
    if (address==="0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"){
        let ethPrice1 =priceMap.get("0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8")
        let ethPrice2 =priceMap.get("0x7bea39867e4169dbe237d55c8242a8f2fcdcc387")
        if (ethPrice1){
            if(price1 > ethPrice1) {
                priceDiff1 = (price1 / ethPrice1)*0.997*0.9995 - 1.0005
            }
        }
        if (ethPrice2){
            if(price1 > ethPrice2) {
                priceDiff2 = (price1 / ethPrice2)*0.99*0.9995 - 1.0005
            }
        }
        if (priceDiff1>priceDiff2){
            returnPriceDiff = {priceDiff: priceDiff1, exchangePool: "Arbitrage from 0.3% to 0.05%"}
        }else{
            returnPriceDiff= {priceDiff: priceDiff2, exchangePool: "Arbitrage from 1% to 0.05%"}
        }
    }
    if (address==="0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8"){
        let ethPrice1 =priceMap.get("0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640")
        let ethPrice2 =priceMap.get("0x7bea39867e4169dbe237d55c8242a8f2fcdcc387")
        if (ethPrice1){
            if(price1 > ethPrice1) {
                priceDiff1 = (price1 / ethPrice1)*0.997*0.9995 - 1.0005
            }
        }
        if (ethPrice2){
            if(price1 > ethPrice2) {
                priceDiff2 = (price1 / ethPrice2)*0.99*0.997 - 1.0005
            }
        }
        if (priceDiff1>priceDiff2){
            returnPriceDiff = {priceDiff: priceDiff1, exchangePool: "Arbitrage from 0.05% to 0.3%"}
        }else{
            returnPriceDiff = {priceDiff: priceDiff1, exchangePool: "Arbitrage from 1% to 0.3%"}
        }
    }
    if (address==="0x7bea39867e4169dbe237d55c8242a8f2fcdcc387"){
        let ethPrice1 =priceMap.get("0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640")
        let ethPrice2 =priceMap.get("0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8")
        if (ethPrice1){
            if(price1 > ethPrice1) {
                priceDiff1 = (price1 / ethPrice1)*0.99*0.9995 - 1.0005
            }
        }
        if (ethPrice2){
            if(price1 > ethPrice2) {
                priceDiff2 = (price1 / ethPrice2)*0.99*0.997 - 1.0005
            }
        }
        if (priceDiff1>priceDiff2){
            returnPriceDiff = {priceDiff: priceDiff1, exchangePool: "Arbitrage from 0.05% to 1%"}
        }else{
            returnPriceDiff = {priceDiff: priceDiff1, exchangePool: "Arbitrage from 0.3% to 1%"}
        }
    }
    return returnPriceDiff
}


for (let i=0;i<usdcEthAddress.length; i++){
    let address=usdcEthAddress[i]
    UniswapPoolProcessor.bind({address: address}).onBlockInterval(rtPriceUsdcEth, 1, 24 * 60 * 30)
}

async function rtPriceWbtcEth(_:any, ctx: UniswapPoolContext) {
    const slot0 = await ctx.contract.slot0()
    const info = await getOrCreatePool(ctx)
    let sqrtPriceX96 =slot0.sqrtPriceX96
    let token0To1Price = Number(sqrtPriceX96)**2 / (2 ** 192)/(10**10)
    let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
    info.realTimePrice =token0To1Price
    ctx.meter.Gauge("wbtcToEthPrice").record(token0To1Price, {token: info.token0.symbol,
        poolName: name})
    priceMap.set(ctx.address, token0To1Price)
    const priceDiff = await priceDiffCal2(ctx.address, token0To1Price)
    ctx.meter.Gauge("priceDiffForWbtc").record(priceDiff.priceDiff, {token: info.token0.symbol,
        poolName: priceDiff.exchangePool})
}

async function priceDiffCal2(address :string, price1: number): Promise<priceDiff>{
    let priceDiff1=0
    let priceDiff2=0
    let returnPriceDiff: priceDiff = {priceDiff: 0, exchangePool: ""}
    if (address==="0x4585fe77225b41b697c938b018e2ac67ac5a20c0"){
        let wbtcPrice1 =priceMap.get("0xcbcdf9626bc03e24f779434178a73a0b4bad62ed")
        let wbtcPrice2 =priceMap.get("0x6ab3bba2f41e7eaa262fa5a1a9b3932fa161526f")
        if (wbtcPrice1){
            if(price1 > wbtcPrice1) {
                priceDiff1 = (price1 / wbtcPrice1)*0.997*0.9995 - 1.0005
            }
        }
        if (wbtcPrice2){
            if(price1 > wbtcPrice2) {
                priceDiff2 = (price1 / wbtcPrice2)*0.99*0.9995 - 1.0005
            }
        }
        if (priceDiff1>priceDiff2){
            returnPriceDiff = {priceDiff: priceDiff1, exchangePool: "Arbitrage from 0.3% to 0.05%"}
        }else{
            returnPriceDiff= {priceDiff: priceDiff2, exchangePool: "Arbitrage from 1% to 0.05%"}
        }
    }
    if (address==="0xcbcdf9626bc03e24f779434178a73a0b4bad62ed"){
        let wbtcPrice1 =priceMap.get("0x4585fe77225b41b697c938b018e2ac67ac5a20c0")
        let wbtcPrice2 =priceMap.get("0x6ab3bba2f41e7eaa262fa5a1a9b3932fa161526f")
        if (wbtcPrice1){
            if(price1 > wbtcPrice1) {
                priceDiff1 = (price1 / wbtcPrice1)*0.997*0.9995 - 1.0005
            }
        }
        if (wbtcPrice2){
            if(price1 > wbtcPrice2) {
                priceDiff2 = (price1 / wbtcPrice2)*0.99*0.997 - 1.0005
            }
        }
        if (priceDiff1>priceDiff2){
            returnPriceDiff = {priceDiff: priceDiff1, exchangePool: "Arbitrage from 0.05% to 0.3%"}
        }else{
            returnPriceDiff = {priceDiff: priceDiff1, exchangePool: "Arbitrage from 1% to 0.3%"}
        }
    }
    if (address==="0x6ab3bba2f41e7eaa262fa5a1a9b3932fa161526f"){
        let wbtcPrice1 =priceMap.get("0x4585fe77225b41b697c938b018e2ac67ac5a20c0")
        let wbtcPrice2 =priceMap.get("0xcbcdf9626bc03e24f779434178a73a0b4bad62ed")
        if (wbtcPrice1){
            if(price1 > wbtcPrice1) {
                priceDiff1 = (price1 / wbtcPrice1)*0.99*0.9995 - 1.0005
            }
        }
        if (wbtcPrice2){
            if(price1 > wbtcPrice2) {
                priceDiff2 = (price1 / wbtcPrice2)*0.99*0.997 - 1.0005
            }
        }
        if (priceDiff1>priceDiff2){
            returnPriceDiff = {priceDiff: priceDiff1, exchangePool: "Arbitrage from 0.05% to 1%"}
        }else{
            returnPriceDiff = {priceDiff: priceDiff1, exchangePool: "Arbitrage from 0.3% to 1%"}
        }
    }
    return returnPriceDiff
}

for (let i=0;i<wbtcEthAddress.length; i++){
    let address=wbtcEthAddress[i]
    UniswapPoolProcessor.bind({address: address}).onBlockInterval(rtPriceWbtcEth, 1, 24 * 60 * 30)
}

async function rtPriceDaiUsdc(_:any, ctx: UniswapPoolContext) {
    const slot0 = await ctx.contract.slot0()
    const info = await getOrCreatePool(ctx)
    let sqrtPriceX96 =slot0.sqrtPriceX96
    let token0To1Price = (Number(sqrtPriceX96)**2 / (2 ** 192)) * (10**12)
    let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
    info.realTimePrice =token0To1Price
    ctx.meter.Gauge("daiToUsdcPrice").record(token0To1Price, {token: info.token0.symbol,
        poolName: name})
    priceMap.set(ctx.address, token0To1Price)
    const priceDiff = await priceDiffCal3(ctx.address, token0To1Price)
    ctx.meter.Gauge("priceDiffForDaiToUsdc").record(priceDiff.priceDiff, {token: info.token0.symbol,
        poolName: priceDiff.exchangePool})
}

async function priceDiffCal3(address :string, price1: number): Promise<priceDiff>{
    let priceDiff=0
    let returnPriceDiff: priceDiff = {priceDiff: 0, exchangePool: ""}
    if (address==="0x5777d92f208679db4b9778590fa3cab3ac9e2168"){
        let daiPrice =priceMap.get("0x6c6bc977e13df9b0de53b251522280bb72383700")
        if (daiPrice){
            if(price1 > daiPrice) {
                priceDiff = (price1 / daiPrice)*0.9999*0.9995 - 1.0001
            }
        }
        returnPriceDiff= {priceDiff: priceDiff, exchangePool: "Arbitrage from 0.05% to 0.01%"}
    }
    if (address==="0x6c6bc977e13df9b0de53b251522280bb72383700"){
        let daiPrice =priceMap.get("0x5777d92f208679db4b9778590fa3cab3ac9e2168")
        if (daiPrice){
            if(price1 >daiPrice) {
                priceDiff = (price1 / daiPrice)*0.9999*0.9995 - 1.0001
            }
        }
        returnPriceDiff = {priceDiff: priceDiff, exchangePool: "Arbitrage from 0.01% to 0.05%"}
    }
    return returnPriceDiff
}

for (let i=0;i<daiUsdcAddress.length; i++){
    let address=daiUsdcAddress[i]
    UniswapPoolProcessor.bind({address: address}).onBlockInterval(rtPriceDaiUsdc, 1, 24 * 60 * 30)
}


async function rtPriceDaiEth(_:any, ctx: UniswapPoolContext) {
    const slot0 = await ctx.contract.slot0()
    const info = await getOrCreatePool(ctx)
    let sqrtPriceX96 =slot0.sqrtPriceX96
    let token1To0Price = (2 ** 192)/Number(sqrtPriceX96)**2
    let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
    info.realTimePrice =token1To0Price
    ctx.meter.Gauge("daiToEthPrice").record(token1To0Price, {token: info.token0.symbol,
        poolName: name})
    priceMap.set(ctx.address, token1To0Price)
    const priceDiff = await priceDiffCal4(ctx.address, token1To0Price)
    ctx.meter.Gauge("priceDiffForDaiToEth").record(priceDiff.priceDiff, {token: info.token0.symbol,
        poolName: priceDiff.exchangePool})
}

async function priceDiffCal4(address :string, price1: number): Promise<priceDiff>{
    let priceDiff=0
    let returnPriceDiff: priceDiff = {priceDiff: 0, exchangePool: ""}
    if (address==="0x60594a405d53811d3bc4766596efd80fd545a270"){
        let daiPrice =priceMap.get("0xc2e9f25be6257c210d7adf0d4cd6e3e881ba25f8")
        if (daiPrice){
            if(price1 > daiPrice) {
                priceDiff = (price1 / daiPrice)*0.997*0.9995 - 1.0005
            }
        }
        returnPriceDiff= {priceDiff: priceDiff, exchangePool: "Arbitrage from 0.3% to 0.05%"}
    }
    if (address==="0xc2e9f25be6257c210d7adf0d4cd6e3e881ba25f8"){
        let daiPrice =priceMap.get("0x60594a405d53811d3bc4766596efd80fd545a270")
        if (daiPrice){
            if(price1 >daiPrice) {
                priceDiff = (price1 / daiPrice)*0.997*0.9995 - 1.0005
            }
        }
        returnPriceDiff = {priceDiff: priceDiff, exchangePool: "Arbitrage from 0.05% to 0.3%"}
    }
    return returnPriceDiff
}

for (let i=0;i<daiEthAddress.length; i++){
    let address=daiEthAddress[i]
    UniswapPoolProcessor.bind({address: address}).onBlockInterval(rtPriceDaiEth, 1, 24 * 60 * 30)
}

async function rtPriceUsdcUsdt(_:any, ctx: UniswapPoolContext) {
    const slot0 = await ctx.contract.slot0()
    const info = await getOrCreatePool(ctx)
    let sqrtPriceX96 =slot0.sqrtPriceX96
    let token1To0Price = (2 ** 192)/Number(sqrtPriceX96)**2
    let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
    info.realTimePrice =token1To0Price
    ctx.meter.Gauge("usdtToUsdcPrice").record(token1To0Price, {token: info.token0.symbol,
        poolName: name})
    priceMap.set(ctx.address, token1To0Price)
    const priceDiff = await priceDiffCal5(ctx.address, token1To0Price)
    ctx.meter.Gauge("priceDiffForUsdtToUsdc").record(priceDiff.priceDiff, {token: info.token0.symbol,
        poolName: priceDiff.exchangePool})
}

async function priceDiffCal5(address :string, price1: number): Promise<priceDiff>{
    let priceDiff=0
    let returnPriceDiff: priceDiff = {priceDiff: 0, exchangePool: ""}
    if (address==="0x3416cf6c708da44db2624d63ea0aaef7113527c6"){
        let usdtPrice =priceMap.get("0x7858e59e0c01ea06df3af3d20ac7b0003275d4bf")
        if (usdtPrice){
            if(price1 > usdtPrice) {
                priceDiff = (price1 / usdtPrice)*0.9999*0.9995 - 1.0001
            }
        }
        returnPriceDiff= {priceDiff: priceDiff, exchangePool: "Arbitrage from 0.05% to 0.01%"}
    }
    if (address==="0x7858e59e0c01ea06df3af3d20ac7b0003275d4bf"){
        let usdtPrice =priceMap.get("0x3416cf6c708da44db2624d63ea0aaef7113527c6")
        if (usdtPrice){
            if(price1 >usdtPrice) {
                priceDiff = (price1 / usdtPrice)*0.9999*0.9995 - 1.0001
            }
        }
        returnPriceDiff = {priceDiff: priceDiff, exchangePool: "Arbitrage from 0.01% to 0.05%"}
    }
    return returnPriceDiff
}

for (let i=0;i<usdtUsdcAddress.length; i++){
    let address=usdtUsdcAddress[i]
    UniswapPoolProcessor.bind({address: address}).onBlockInterval(rtPriceUsdcUsdt, 1, 24 * 60 * 30)
}

async function rtPriceEthUsdt(_:any, ctx: UniswapPoolContext) {
    const slot0 = await ctx.contract.slot0()
    const info = await getOrCreatePool(ctx)
    let sqrtPriceX96 =slot0.sqrtPriceX96
    let token0To1Price = (Number(sqrtPriceX96)**2 / (2 ** 192)) * (10**12)
    let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
    info.realTimePrice =token0To1Price
    ctx.meter.Gauge("ethToUsdtPrice").record(token0To1Price, {token: info.token0.symbol,
        poolName: name})
    priceMap.set(ctx.address, token0To1Price)
    const priceDiff = await priceDiffCal6(ctx.address, token0To1Price)
    ctx.meter.Gauge("priceDiffForEthToUsdt").record(priceDiff.priceDiff, {token: info.token0.symbol,
        poolName: priceDiff.exchangePool})
}

async function priceDiffCal6(address :string, price1: number): Promise<priceDiff>{
    let priceDiff=0
    let returnPriceDiff: priceDiff = {priceDiff: 0, exchangePool: ""}

    if (address==="0x11b815efb8f581194ae79006d24e0d814b7697f6"){
        let usdtPrice =priceMap.get("0x4e68ccd3e89f51c3074ca5072bbac773960dfa36")
        if (usdtPrice){
            if(price1 > usdtPrice) {
                priceDiff = (price1 / usdtPrice)*0.997*0.9995 - 1.0005
            }
        }
        returnPriceDiff= {priceDiff: priceDiff, exchangePool: "Arbitrage from 0.3% to 0.05%"}
    }
    if (address==="0x4e68ccd3e89f51c3074ca5072bbac773960dfa36"){
        let usdtPrice =priceMap.get("0x11b815efb8f581194ae79006d24e0d814b7697f6")
        if (usdtPrice){
            if(price1 >usdtPrice) {
                priceDiff = (price1 / usdtPrice)*0.997*0.9995 - 1.0005
            }
        }
        returnPriceDiff = {priceDiff: priceDiff, exchangePool: "Arbitrage from 0.05% to 0.3%"}
    }
    return returnPriceDiff
}

for (let i=0;i<ethUsdtAddress.length; i++){
    let address=ethUsdtAddress[i]
    UniswapPoolProcessor.bind({address: address}).onBlockInterval(rtPriceEthUsdt, 1, 24 * 60 * 30)
}


for (let i=0;i<pools.length; i++){
    let address=pools[i]
    UniswapPoolProcessor.bind({address: address}).onEventSwap(async function(event: SwapEvent, ctx: UniswapPoolContext) {
        let info = await getOrCreatePool(ctx)
        let [token0Amount, token0Price] = await getToken(ctx, info.token0, info.token0Address, event.args.amount0)
        let [token1Amount, token1Price] = await getToken(ctx, info.token1, info.token1Address, event.args.amount1)
        let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
        vol.record(ctx,
            token0Price.abs(),
            {
                poolName: name,
                type: "swap",
            }
        )
        ctx.eventLogger.emit("Swap",
            {
                distinctId: event.args.recipient,
                poolName: name,
                amount: token0Price,
                message: name + " swap " + token0Amount.abs().toString() + " " +
                    info.token0.symbol + " for " + token1Amount.abs().toString() + " " + info.token1.symbol,
            }
        )
        ctx.meter.Counter("total_tokens").add(token0Amount,
            {token: info.token0.symbol, poolName: name})
        ctx.meter.Counter("total_tokens").add(token1Amount,
            {token: info.token1.symbol, poolName: name})
    })
        .onEventBurn(async function (event: BurnEvent, ctx: UniswapPoolContext) {
            let info = await getOrCreatePool(ctx)
            let [token0Amount, token0Price] = await getToken(ctx, info.token0, info.token0Address, event.args.amount0)
            let [token1Amount, token1Price] = await getToken(ctx, info.token1, info.token1Address, event.args.amount1)
            let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
            let total = token0Price.abs().plus(token1Price.abs())
            vol.record(ctx,
                total,
                {
                    poolName: name,
                    type: "burn",
                }
            )
            ctx.eventLogger.emit("Burn",
                {
                    distinctId: event.args.owner,
                    poolName: name,
                    amount: total,
                    message: name + " burn " + token0Amount.abs().toString() +
                        " " + info.token0.symbol + " and " +
                        token1Amount.abs().toString() + " " + info.token1.symbol,
                })
            ctx.meter.Counter("total_tokens").sub(token0Amount,
                {token: info.token0.symbol, poolName: name})
            ctx.meter.Counter("total_tokens").sub(token1Amount,
                {token: info.token1.symbol, poolName: name})
        })
        .onEventMint(async function (event: MintEvent, ctx: UniswapPoolContext) {
            let info = await getOrCreatePool(ctx)
            let [token0Amount, token0Price] = await getToken(ctx, info.token0, info.token0Address, event.args.amount0)
            let [token1Amount, token1Price] = await getToken(ctx, info.token1, info.token1Address, event.args.amount1)
            let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
            let total = token0Price.abs().plus(token1Price.abs())
            vol.record(ctx,
                total,
                {
                    poolName: name,
                    type: "mint",
                }
            )
            ctx.eventLogger.emit("Mint", {
                distinctId: event.args.owner,
                poolName: name,
                amount: total,
                message: name + " mint " +
                    token0Amount.abs().toString() + " " +
                    info.token0.symbol + " and " +
                    token1Amount.abs().toString() + " " + info.token1.symbol,
            })
            ctx.meter.Counter("total_tokens").add(token0Amount,
                {token: info.token0.symbol, poolName: name})
            ctx.meter.Counter("total_tokens").add(token1Amount,
                {token: info.token1.symbol, poolName: name})
        })
}