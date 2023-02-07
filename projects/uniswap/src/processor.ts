import {
  BurnEvent,
  MintEvent,
  SwapEvent,
  UniswapContext,
  UniswapProcessor,
  UniswapProcessorTemplate
} from './types/uniswap/index.js'
import { PoolCreatedEvent, UniswapFactoryContext, UniswapFactoryProcessor } from "./types/uniswapfactory/index.js";
// import { token, conversion} from "@sentio/sdk/utils"
// import type { BaseContract, BigNumber } from 'ethers'
import { ERC20Context, ERC20Processor, getERC20Contract } from '@sentio/sdk/eth/builtin/erc20'
import { getPriceByType,  token } from "@sentio/sdk/utils"
import { Status, ClientError } from "nice-grpc-common";
import {BigDecimal, Gauge, MetricOptions} from "@sentio/sdk";


const poolWatching = [
  "0x5777d92f208679db4b9778590fa3cab3ac9e2168",
  "0x6c6bc977e13df9b0de53b251522280bb72383700",
  "0xcbcdf9626bc03e24f779434178a73a0b4bad62ed",
  "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
  "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8",
  "0x4585fe77225b41b697c938b018e2ac67ac5a20c0",
  "0x8ee3cc8e29e72e03c4ab430d7b7e08549f0c71cc",
  "0xc63b0708e2f7e69cb8a1df0e1389a98c35a76d52",
  "0x4e68ccd3e89f51c3074ca5072bbac773960dfa36",
  "0x7379e81228514a1d2a6cf7559203998e20598346",
  "0x3416cf6c708da44db2624d63ea0aaef7113527c6",
  "0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801",
  "0xe0554a476a092703abdb3ef35c80e0d76d32939f",
  "0x5c128d25a21f681e678cb050e551a895c9309945",
  "0x11b815efb8f581194ae79006d24e0d814b7697f6",
  "0x00cef0386ed94d738c8f8a74e8bfd0376926d24c",
  "0x99ac8ca7087fa4a2a1fb6357269965a2014abc35",
  "0x97e7d56a0408570ba1a7852de36350f7713906ec",
  "0xc2e9f25be6257c210d7adf0d4cd6e3e881ba25f8",
  "0x64a078926ad9f9e88016c199017aea196e3899e1",
  "0x40e629a26d96baa6d81fae5f97205c2ab2c1ff29",
  "0x840deeef2f115cf50da625f7368c24af6fe74410",
  "0xa6cc3c2531fdaa6ae1a3ca84c2855806728693e8",
  "0xf56d08221b5942c428acc5de8f78489a97fc5599",
  "0x735a26a57a0a0069dfabd41595a970faf5e1ee8b",
  "0x290a6a7460b308ee3f19023d2d00de604bcf5b42",
  "0x1c5c60bef00c820274d4938a5e6d04b124d4910b",
  "0x39529e96c28807655b5856b3d342c6225111770e",
  "0xa3f558aebaecaf0e11ca4b2199cc5ed341edfd74",
  "0x7858e59e0c01ea06df3af3d20ac7b0003275d4bf",
  "0xe8c6c9227491c0a8156a0106a0204d881bb7e531",
  "0x7bea39867e4169dbe237d55c8242a8f2fcdcc387",
  "0x60594a405d53811d3bc4766596efd80fd545a270",
  "0xac4b3dacb91461209ae9d41ec517c2b9cb1b7daf",
  "0xb9044f46dcdea7ecebbd918a9659ba8239bd9f37",
  "0xc2a856c3aff2110c1171b8f942256d40e980c726",
  "0xa4e0faa58465a2d369aa21b3e42d43374c6f9613",
  "0xf482fce04ef6f29ad56e46fef2de038c42126e2e",
  "0x87986ae1e99f99da1f955d16930dc8914ffbed56",
  "0x69d91b94f0aaf8e8a2586909fa77a5c2c89818d5",
  "0xf4ad61db72f114be877e87d62dc5e7bd52df4d9b",
  "0x4b5ab61593a2401b1075b90c04cbcdd3f87ce011",
  "0x9febc984504356225405e26833608b17719c82ae",
  "0x92560c178ce069cc014138ed3c2f5221ba71f58a",
  "0x2f62f2b4c5fcd7570a709dec05d68ea19c82a9ec",
  "0x5764a6f2212d502bc5970f9f129ffcd61e5d7563"]

async function getTokenInfo(address: string): Promise<token.TokenInfo> {
  if (address !== "0x0000000000000000000000000000000000000000") {
    return await token.getERC20TokenInfo(address)
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
}

// define a map from string to poolInfo
let poolInfoMap = new Map<string, Promise<poolInfo>>()

export const vol = Gauge.register("vol", gaugeOptions)

async function buildPoolInfo(token0Promise: Promise<string>,
                             token1Promise: Promise<string>,
                             feePromise: Promise<bigint>): Promise<poolInfo> {
  const address0 = await token0Promise
  const address1 = await token1Promise
  const tokenInfo0 = await getTokenInfo(address0)
  const tokenInfo1 = await getTokenInfo(address1)
  return {
    token0: tokenInfo0,
    token1: tokenInfo1,
    token0Address: address0,
    token1Address: address1,
    fee: (await feePromise).toString(),
  }
}

async function getValue(ctx: UniswapContext, address: string, info: token.TokenInfo):
    Promise<BigDecimal> {
  let amount: bigint
  if (info.symbol === "ETH") {
    try {
      amount = await ctx.contract.provider!.getBalance(ctx.address)
    } catch (e) {
      console.log(e)
      amount = 0n
    }
  } else {
    try {
      amount = await getERC20Contract(address).balanceOf(ctx.address,
          {blockTag: Number(ctx.blockNumber)})
    } catch (e) {
      console.log("error", e)
      amount = 0n
    }
  }
  return amount.scaleDown(info.decimal)
}

async function getTVL(ctx: UniswapContext, info: token.TokenInfo, token :string): Promise<BigDecimal> {
  const amount = await getValue(ctx, token, info)
  let price : any
  try {
    price = await getPriceByType("1", token, ctx.timestamp)
  } catch (error) {
    if (error instanceof ClientError && error.code === Status.NOT_FOUND) {
      return BigDecimal(0)
    }
    throw error
  }
  return amount.multipliedBy(price)
}

const poolName = function(token0 :string, token1:string, fee: string) {
  const feeNum = Number(fee) / 10000
  return token0 + "/" + token1 + "-" + feeNum + "%"
}

const getOrCreatePool = async function (ctx: UniswapContext) :Promise<poolInfo> {
  let infoPromise = poolInfoMap.get(ctx.address)
  if (!infoPromise) {
    infoPromise = buildPoolInfo(ctx.contract.token0(), ctx.contract.token1(), ctx.contract.fee())
    poolInfoMap.set(ctx.address, infoPromise)
    console.log("set poolInfoMap for " + ctx.address)
  }
  return await infoPromise
}

const priceCalc = async function (_: any, ctx: UniswapContext) {
  const info = await getOrCreatePool(ctx)
  const tvl0 = await getTVL(ctx, info.token0, info.token0Address)
  const tvl1 = await getTVL(ctx, info.token1, info.token1Address)
  let pool = poolName(info.token0.symbol, info.token1.symbol, info.fee)
  ctx.meter.Gauge("tvl").record(tvl0, {token: info.token0Address,
    poolName: pool})
  ctx.meter.Gauge("tvl").record(tvl1, {token: info.token1Address,
    poolName: pool})
}

async function getTokenDetails(ctx: UniswapContext, info: token.TokenInfo, address :string, amount: bigint):
    Promise<[BigDecimal, BigDecimal]> {
  let scaledAmount = amount.scaleDown(info.decimal)
  let price: any
  try {
    price = await getPriceByType("1", address, ctx.timestamp)
  } catch (error) {
    if (error instanceof ClientError && error.code === Status.NOT_FOUND) {
      return [scaledAmount, BigDecimal(0)]
    }
    throw error
  }
  return [scaledAmount, scaledAmount.multipliedBy(price)]
}


for (let i = 0; i < poolWatching.length; i++) {
  let address = poolWatching[i]
  UniswapProcessor.bind({address: address}).onEventSwap(
      async function (event: SwapEvent, ctx: UniswapContext) {
        let info = await getOrCreatePool(ctx)
        let [token0Amount, token0Price] = await getTokenDetails(ctx, info.token0, info.token0Address, event.args.amount0)
        let [token1Amount, token1Price] = await getTokenDetails(ctx, info.token1, info.token1Address, event.args.amount1)
        let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
        vol.record(ctx,
            token0Price.abs(),
            {
              poolName: name,
              type: "swap",
            }
        )
        ctx.eventTracker.track("swap", {distinctId: event.args.recipient})
        ctx.meter.Counter("total_tokens").add(token0Amount,
            {token: info.token0.symbol, poolName: name})
        ctx.meter.Counter("total_tokens").add(token1Amount,
            {token: info.token1.symbol, poolName: name})
        ctx.logger.info("swap: " + token0Amount + " " + info.token0.symbol + " " + token0Price + " " + token1Amount + " " + info.token1.symbol + " " + token1Price)
      }).onTimeInterval(priceCalc, 60, 24 * 60 * 30)
  .onEventBurn(async function (event: BurnEvent, ctx: UniswapContext) {
    let info = await getOrCreatePool(ctx)
    let [token0Amount, token0Price] = await getTokenDetails(ctx, info.token0, info.token0Address, event.args.amount0)
    let [token1Amount, token1Price] = await getTokenDetails(ctx, info.token1, info.token1Address, event.args.amount1)
    let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
    let total = token0Price.abs().plus(token1Price.abs())
    vol.record(ctx,
        total,
        {
          poolName: name,
          type: "burn",
        }
    )
    ctx.eventTracker.track("burn", {distinctId: event.args.owner})
    ctx.meter.Counter("total_tokens").sub(token0Amount,
        {token: info.token0.symbol, poolName: name})
    ctx.meter.Counter("total_tokens").sub(token1Amount,
        {token: info.token1.symbol, poolName: name})
    ctx.logger.info("burn: " + token0Amount + " " + info.token0.symbol + " " + token0Price + " " + token1Amount + " " + info.token1.symbol + " " + token1Price)
  })
  .onEventMint(async function (event: MintEvent, ctx: UniswapContext) {
    let info = await getOrCreatePool(ctx)
    let [token0Amount, token0Price] = await getTokenDetails(ctx, info.token0, info.token0Address, event.args.amount0)
    let [token1Amount, token1Price] = await getTokenDetails(ctx, info.token1, info.token1Address, event.args.amount1)
    let name = poolName(info.token0.symbol, info.token1.symbol, info.fee)
    let total = token0Price.abs().plus(token1Price.abs())
    vol.record(ctx,
        total,
        {
          poolName: name,
          type: "mint",
        }
    )
    ctx.eventTracker.track("mint", {distinctId: event.args.owner})
    ctx.meter.Counter("total_tokens").add(token0Amount,
        {token: info.token0.symbol, poolName: name})
    ctx.meter.Counter("total_tokens").add(token1Amount,
        {token: info.token1.symbol, poolName: name})
    ctx.logger.info("mint: " + token0Amount + " " + info.token0.symbol + " " + token0Price + " " + token1Amount + " " + info.token1.symbol + " " + token1Price)
  })

}

