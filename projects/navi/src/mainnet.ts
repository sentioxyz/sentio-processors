// import { pool, pool_factory } from "./types/sui/turbos.js";
import { SuiObjectProcessor, SuiContext, SuiObjectContext, SuiObjectProcessorTemplate } from "@sentio/sdk/sui"
import * as constant from './constant-turbos.js'
import { ChainId } from "@sentio/chain"
import { BUILTIN_TYPES } from "@sentio/sdk/move"
import { BigDecimal, Gauge } from "@sentio/sdk";
import { pool } from "./types/sui/testnet/0x8ba6cdd02f5d1b9ff9970690681c21957d9a6a6fbb74546b2f0cfb16dbff4c25.js"
import { lending } from "./types/sui/0xe17e8d461129585fdd83dd891b1b5858f51984acbb308daa7ad8627c13f31c9d.js";
import { getPriceByType, token } from "@sentio/sdk/utils"
import { scaleDown } from "@sentio/sdk";
import { oracle } from "./types/sui/0xccdf4385016f20c784e68376359ddc2f6a9e050ec431ca5c85f1bc81024d4427.js";

import { storage } from "./types/sui/testnet/0x6850914af4d097f53be63182675334fb41a6782e4e702a5d605a61969750e777.js";

import { dynamic_field } from "@sentio/sdk/sui/builtin/0x2";

let coinInfoMap = new Map<string, Promise<token.TokenInfo>>()
const DECIMAL1 = 9
const DECIMAL2 = 27

const reserves = [
  "0xf1b1f1c8ae866b12225e4cbe14d93f0b5d7d8b324bb6df1777ad9d55b22ccc45",
  "0x725c4dcc42071f148e07c8cac7dfbcbf48f176b62caa282b7170fd10c6eb4138",
  "0x198fc6028c73cb482c80a10d719f57bfdd247e84e4af7c942aa4c5aa6d3e23c3",
  "0x38d63f7c83d06b39d1f5bad4bef11081d69c33adc3ff9daa4719f35c2868685f",
  "0x3c42b5bef6ce0565530d0419930994a92952677da7f2dd35d5bf1709a83b266c"
]

const coin = ["SUI", "USDC", "USDT", "ETH", "BTC"]


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
        const treasuryBalance = Number(self.fields.value.fields.treasury_balance)

        ctx.meter.Gauge("total_supply").record(totalSupply, {env: "mainnet", id, type, coin_symbol})
        
        ctx.meter.Gauge("ltv").record(ltv, {env: "mainnet", id, type, coin_symbol})
        ctx.meter.Gauge("currentBorrowIndex").record(currentBorrowIndex, {env: "mainnet", id, type, coin_symbol})
        ctx.meter.Gauge("borrowCapCeiling").record(borrowCapCeiling, {env: "mainnet", id, type, coin_symbol})
        ctx.meter.Gauge("treasuryBalance").record(treasuryBalance, {env: "mainnet", id, type, coin_symbol})

      } catch(e) {
        console.log(e)
        console.log(JSON.stringify(self))
      }
  })
}

SuiObjectProcessor.bind({
  network: ChainId.SUI_MAINNET,
  objectId: '0xbbc729d3dcdaf8239d9c3c1459b2386fb70874eaba32d794e874c9d3573c025e',
}).onTimeInterval(async (self, objects, ctx) => {
  ctx.meter.Gauge('num_portfolio_vault').record(objects.length)

  const decodedObjects = await ctx.coder.getDynamicFields(
      objects,
      BUILTIN_TYPES.U64_TYPE,
      oracle.Price.type()
  )
  console.log(decodedObjects)
  decodedObjects.forEach((entry) => {
    const id = entry.id.toString()
    const name = entry.name.toString()
    const priceObject = entry.value
    const value = priceObject.value
    const decimal = priceObject.decimal
    const result = value.asBigDecimal().div(Math.pow(10, Number(decimal)))
    // price.value

    ctx.meter.Gauge("oracle").record(result, {id, name})
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

// lending.bind()
// .onEventBorrowEvent(onEvent)
// .onEventDepositEvent(onEvent)
// .onEventRepayEvent(onEvent)
// .onEventWithdrawEvent(onEvent)