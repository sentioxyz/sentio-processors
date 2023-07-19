// import { pool, pool_factory } from "./types/sui/turbos.js";
import {
  SuiObjectProcessor,
  SuiContext,
  SuiObjectContext,
  SuiObjectProcessorTemplate,
  SuiWrappedObjectProcessor
} from "@sentio/sdk/sui"
// import * as constant from './constant-turbos.js'
import { ChainId } from "@sentio/chain"
import { BUILTIN_TYPES } from "@sentio/sdk/move"
import { BigDecimal, Gauge } from "@sentio/sdk";
import { pool } from "./types/sui/testnet/0x8ba6cdd02f5d1b9ff9970690681c21957d9a6a6fbb74546b2f0cfb16dbff4c25.js"
import { lending } from "./types/sui/0xe17e8d461129585fdd83dd891b1b5858f51984acbb308daa7ad8627c13f31c9d.js";
import { getPriceByType, token } from "@sentio/sdk/utils"
import { scaleDown } from "@sentio/sdk";
import { oracle } from "./types/sui/0xca441b44943c16be0e6e23c5a955bb971537ea3289ae8016fbf33fffe1fd210f.js";

import { storage } from "./types/sui/testnet/0x6850914af4d097f53be63182675334fb41a6782e4e702a5d605a61969750e777.js";

import { dynamic_field } from "@sentio/sdk/sui/builtin/0x2";

let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()
const DECIMAL1 = 9
const DECIMAL2 = 27

// const reserves = [
//   "0xab644b5fd11aa11e930d1c7bc903ef609a9feaf9ffe1b23532ad8441854fbfaf",
//   "0xeb3903f7748ace73429bd52a70fff278aac1725d3b58afa781f25ce3450ac203",
//   "0x9342cc1ca3f48ba5d5acfbdf36d7efafcf48f8af9951515d971253c551d3395c",
//   "0x145ee09c7b74b2470c90d55b9ba9b99684f9d81d03f52968bbaf3a95501f17c6",
//   "0xb78d4cf370d983e1bafd47252fb32355bd12e3a76194c736bb56024694f39308"
// ]

// const coin = ["SUI", "USDC", "USDT", "ETH", "BTC"]

const reserves = [
  "0xab644b5fd11aa11e930d1c7bc903ef609a9feaf9ffe1b23532ad8441854fbfaf",
  "0xeb3903f7748ace73429bd52a70fff278aac1725d3b58afa781f25ce3450ac203",
  "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c"
]

const coin = ["SUI", "USDC", "USDT"]


export const getOrCreateCoin = async function (ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
  let coinInfo = coinInfoMap.get(coinAddress)
  if (!coinInfo) {
      coinInfo = buildCoinInfo(ctx, coinAddress)
      coinInfoMap.set(coinAddress, coinInfo)
      console.log("set coinInfoMap for " + coinAddress)
  }
  return await coinInfo
}

export async function buildCoinInfo(ctx: SuiContext | SuiObjectContext, coinAddress: string): Promise<token.TokenInfo> {
  const metadata = await ctx.client.getCoinMetadata({ coinType: coinAddress })
  const symbol = metadata.symbol
  const decimal = metadata.decimals
  const name = metadata.name
  console.log(`build coin metadata ${symbol} ${decimal} ${name}`)
  return {
      symbol,
      name,
      decimal
  }
}

export type LendingEvent = lending.BorrowEventInstance | lending.DepositEventInstance | lending.WithdrawEventInstance | lending.RepayEventInstance

for (let i = 0; i < reserves.length; i++) {
  SuiObjectProcessor.bind({
    objectId: reserves[i],
    network: ChainId.SUI_MAINNET,
    startCheckpoint: 5000000n
  }).onTimeInterval(async (self, _, ctx) => {

    // const typeDescriptor = dynamic_field.Field.type(BUILTIN_TYPES.U8_TYPE, storage.ReserveData.type())

    // const v = await ctx.coder.decodedType(self, typeDescriptor)
    // if (v) {
      try {
        const type = String(self.fields.value.fields.coin_type)
        const id = String(self.fields.value.fields.id)
        const ltv = BigDecimal(self.fields.value.fields.ltv).div(Math.pow(10, DECIMAL2))
        const coin_symbol = coin[i]
        // const tokenInfo = getOrCreateCoin(ctx, type)

        const totalSupply = BigDecimal(self.fields.value.fields.supply_balance.fields.total_supply).div(Math.pow(10, DECIMAL1))
        const currentBorrowIndex = BigDecimal(self.fields.value.fields.current_borrow_index).div(Math.pow(10, DECIMAL2))
        const borrowCapCeiling = BigDecimal(self.fields.value.fields.borrow_cap_ceiling).div(Math.pow(10, DECIMAL2))
        const treasuryBalance = BigDecimal(self.fields.value.fields.treasury_balance).div(Math.pow(10, DECIMAL1))
        const currentSupplyIndex = BigDecimal(self.fields.value.fields.current_supply_index).div(Math.pow(10, DECIMAL2))

        ctx.meter.Gauge("total_supply").record(totalSupply, {env: "mainnet", id, type, coin_symbol})

        ctx.meter.Gauge("ltv").record(ltv, {env: "mainnet", id, type, coin_symbol})
        ctx.meter.Gauge("currentBorrowIndex").record(currentBorrowIndex, {env: "mainnet", id, type, coin_symbol})
        ctx.meter.Gauge("borrowCapCeiling").record(borrowCapCeiling, {env: "mainnet", id, type, coin_symbol})
        ctx.meter.Gauge("treasuryBalance").record(treasuryBalance, {env: "mainnet", id, type, coin_symbol})
        ctx.meter.Gauge("currentSupplyIndex").record(currentSupplyIndex, {env: "mainnet", id, type, coin_symbol})

      } catch(e) {
        console.log(e)
        console.log(JSON.stringify(self))
      }
  })
}

SuiWrappedObjectProcessor.bind({
  network: ChainId.SUI_MAINNET,
  objectId: '0xc0601facd3b98d1e82905e660bf9f5998097dedcf86ed802cf485865e3e3667c',
}).onTimeInterval(async (objects, ctx) => {
  // ctx.meter.Gauge('num_portfolio_vault').record(objects.length)
  // console.log(JSON.stringify(objects))

  const decodedObjects = await ctx.coder.getDynamicFields(
      objects,
      BUILTIN_TYPES.U8_TYPE,
      oracle.Price.type()
  )
  // console.log(JSON.stringify(decodedObjects))
  decodedObjects.forEach((entry) => {
    const id = entry.id.toString()
    const name = entry.name.toString()
    const priceObject = entry.value
    const value = priceObject.value
    const decimal = priceObject.decimal
    const result = value.asBigDecimal().div(Math.pow(10, Number(decimal)))
    const coin_symbol = coin[Number(name)]
    // price.value
    try {
    ctx.meter.Gauge("oracle").record(result, {id: name, name, coin_symbol})
    } catch(e) {
      console.log(e)
      console.log(entry)
    }
})
})


async function onEvent(event: LendingEvent, ctx: SuiContext) {
  const sender = event.data_decoded.sender
  const amount = event.data_decoded.amount
  const reserve = event.data_decoded.reserve

  const typeArray = event.type.split("::")
  const type = typeArray[typeArray.length - 1]

  ctx.eventLogger.emit("UserInteraction", {
    distinctId: sender,
    sender,
    amount,
    reserve,
    type,
    env: "mainnet"
  })
}

async function onLiquidationEvent(event: lending.LiquidationCallEventInstance, ctx: SuiContext) {
  const sender = event.data_decoded.sender
  const liquidation_amount = event.data_decoded.liquidate_amount
  const liquidate_user = event.data_decoded.liquidate_user
  const reserve = event.data_decoded.reserve

  const typeArray = event.type.split("::")
  const type = typeArray[typeArray.length - 1]

  ctx.eventLogger.emit("UserInteraction", {
    distinctId: sender,
    sender,
    liquidation_amount,
    liquidate_user,
    reserve,
    type,
    env: "mainnet"
  })
}


lending.bind()
.onEventBorrowEvent(onEvent)
.onEventDepositEvent(onEvent)
.onEventRepayEvent(onEvent)
.onEventWithdrawEvent(onEvent)
.onEventLiquidationCallEvent(onLiquidationEvent)