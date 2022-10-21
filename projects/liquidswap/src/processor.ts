import { liquidity_pool } from './types/aptos/liquidswap'
import { aptos, Counter } from "@sentio/sdk";
import { caculateValueInUsd, getCoinInfo, scaleDown } from "./utils";
import { coin } from "@sentio/sdk/lib/builtin/aptos/0x1";
import CoinInfo = coin.CoinInfo;

const valueCounter = new Counter("value")
const volumeCounter = new Counter("volume")

liquidity_pool.bind()
  .onEventPoolCreatedEvent(async (evt, ctx) => {
    evt.type_arguments
    const [x, y, pair] = await getCoinAndPairNames(evt.type_arguments)
    ctx.meter.Counter("number_pool").add(1, { pair })
  })
  .onEventLiquidityAddedEvent(async (evt, ctx) => {
    const [x, y, pair] = await getCoinAndPairNames(evt.type_arguments)
    const timestamp = ctx.transaction.timestamp

    await addFor(ctx, x, evt.data_typed.added_x_val, timestamp, pair)
    await addFor(ctx, y, evt.data_typed.added_y_val, timestamp, pair)
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    const [x, y, pair] = await getCoinAndPairNames(evt.type_arguments)
    const timestamp = ctx.transaction.timestamp

    await subFor(ctx, x, evt.data_typed.returned_x_val, timestamp, pair)
    await subFor(ctx, y, evt.data_typed.returned_y_val, timestamp, pair)
  })
  .onEventSwapEvent(async (evt, ctx) => {
    const [x, y, pair] = await getCoinAndPairNames(evt.type_arguments)
    const timestamp = ctx.transaction.timestamp

    await addFor(ctx, x, evt.data_typed.x_in, timestamp, pair)
    await addFor(ctx, y, evt.data_typed.y_in, timestamp, pair)
    await subFor(ctx, x, evt.data_typed.x_out, timestamp, pair)
    await subFor(ctx, y, evt.data_typed.y_out, timestamp, pair)
    ctx.meter.Counter("number_swap").add(1)
  })
  .onEventFlashloanEvent(async (evt, ctx) => {
    const [x, y, pair] = await getCoinAndPairNames(evt.type_arguments)
    const timestamp = ctx.transaction.timestamp

    await addFor(ctx, x, evt.data_typed.x_in, timestamp, pair)
    await addFor(ctx, y, evt.data_typed.y_in, timestamp, pair)
    await subFor(ctx, x, evt.data_typed.x_out, timestamp, pair)
    await subFor(ctx, y, evt.data_typed.y_out, timestamp, pair)
    ctx.meter.Counter("number_flashloan").add(1)
  })

async function addFor(ctx: aptos.AptosContext, coin: CoinInfo<any>, amount: bigint, timestamp: string, pair: string) {
  valueCounter.add(ctx, await caculateValueInUsd(amount, coin, timestamp), { coin: coin.symbol, pair })
  volumeCounter.add(ctx, amount, { coin: coin.symbol, pair })
}

async function subFor(ctx: aptos.AptosContext, coin: CoinInfo<any>, amount: bigint, timestamp: string, pair: string) {
  valueCounter.sub(ctx, await caculateValueInUsd(amount, coin, timestamp), { coin: coin.symbol, pair })
  volumeCounter.sub(ctx, amount, { coin: coin.symbol, pair })
}

async function getCoinAndPairNames(coins: string[]):Promise<[CoinInfo<any>,CoinInfo<any>, string]> {
  const coinx = await getCoinInfo(coins[0])
  const coiny = await getCoinInfo(coins[1])
  const pair = `${coinx.symbol}-${coiny.symbol}`
  return [coinx, coiny, pair]
}