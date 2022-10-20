import { liquidity_pool } from './types/aptos/liquidswap'
import { Counter } from "@sentio/sdk";

const liquidityCounter = new Counter("liquidity")

liquidity_pool.bind()
  .onEventLiquidityAddedEvent((evt, ctx) => {
    const [x, y, pair] = getCoinAndPairNames(evt.type_arguments)
    liquidityCounter.add(ctx, evt.data_typed.added_x_val, { coin: x, pair })
    liquidityCounter.add(ctx, evt.data_typed.added_y_val, { coin: y, pair })
  })
  .onEventLiquidityRemovedEvent((evt, ctx) => {
    const [x, y, pair] = getCoinAndPairNames(evt.type_arguments)
    liquidityCounter.sub(ctx, evt.data_typed.returned_x_val, { coin: x, pair })
    liquidityCounter.sub(ctx, evt.data_typed.returned_y_val, { coin: y, pair })
  })
  .onEventPoolCreatedEvent((evt, ctx) => {
    const [, , pair] = getCoinAndPairNames(evt.type_arguments)
    ctx.meter.Counter("number_pool").add(1, { pair })
  })

function getCoinName(type: string) {
  return type.split("::")[2]
}

function getCoinAndPairNames(coins: string[]) {
  const coinx = getCoinName(coins[0])
  const coiny = getCoinName(coins[1])
  const pair = `${coinx}-${coiny}`
  return [coinx, coiny, pair]
}