import { liquidity_pool } from './types/aptos/liquidswap'
import { Counter } from "@sentio/sdk";
import { getCoinInfo, scaleDown } from "./utils";
import { coin } from "@sentio/sdk/lib/builtin/aptos/0x1";
import CoinInfo = coin.CoinInfo;

const liquidityCounter = new Counter("liquidity")

liquidity_pool.bind()
  .onEventPoolCreatedEvent(async (evt, ctx) => {
    const [x, y, pair] = await getCoinAndPairNames(evt.type_arguments)
    ctx.meter.Counter("number_pool").add(1, { pair })
  })
  .onEventLiquidityAddedEvent(async (evt, ctx) => {
    const [x, y, pair] = await getCoinAndPairNames(evt.type_arguments)
    liquidityCounter.add(ctx, scaleDown(evt.data_typed.added_x_val, x.decimals), { coin: x.symbol, pair })
    liquidityCounter.add(ctx, scaleDown(evt.data_typed.added_y_val, y.decimals), { coin: y.symbol, pair })
  })
  .onEventLiquidityRemovedEvent(async (evt, ctx) => {
    const [x, y, pair] = await getCoinAndPairNames(evt.type_arguments)
    liquidityCounter.sub(ctx, scaleDown(evt.data_typed.returned_x_val, x.decimals), { coin: x.symbol, pair })
    liquidityCounter.sub(ctx, scaleDown(evt.data_typed.returned_y_val, y.decimals), { coin: y.symbol, pair })
  })
  .onEventSwapEvent(async (evt, ctx) => {
    const [x, y, pair] = await getCoinAndPairNames(evt.type_arguments)
    liquidityCounter.add(ctx, scaleDown(evt.data_typed.x_in, x.decimals), { coin: x.symbol, pair })
    liquidityCounter.add(ctx, scaleDown(evt.data_typed.y_in, y.decimals), { coin: y.symbol, pair })
    liquidityCounter.sub(ctx, scaleDown(evt.data_typed.x_out, x.decimals), { coin: x.symbol, pair })
    liquidityCounter.sub(ctx, scaleDown(evt.data_typed.y_out, y.decimals), { coin: y.symbol, pair })
    ctx.meter.Counter("number_swap").add(1)
  })
  .onEventFlashloanEvent(async (evt, ctx) => {
    const [x, y, pair] = await getCoinAndPairNames(evt.type_arguments)
    liquidityCounter.add(ctx, scaleDown(evt.data_typed.x_in, x.decimals), { coin: x.symbol, pair })
    liquidityCounter.add(ctx, scaleDown(evt.data_typed.y_in, y.decimals), { coin: y.symbol, pair })
    liquidityCounter.sub(ctx, scaleDown(evt.data_typed.x_out, x.decimals), { coin: x.symbol, pair })
    liquidityCounter.sub(ctx, scaleDown(evt.data_typed.y_out, y.decimals), { coin: y.symbol, pair })
    ctx.meter.Counter("number_flashloan").add(1)
  })

async function getCoinAndPairNames(coins: string[]):Promise<[CoinInfo<any>,CoinInfo<any>, string]> {
  const coinx = await getCoinInfo(coins[0])
  const coiny = await getCoinInfo(coins[1])
  const pair = `${coinx.symbol}-${coiny.symbol}`
  return [coinx, coiny, pair]
}