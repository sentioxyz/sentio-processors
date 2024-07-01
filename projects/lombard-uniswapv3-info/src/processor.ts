import { EthChainId } from "@sentio/sdk/eth"
import { UniswapV3PoolProcessor } from "./types/eth/uniswapv3pool.js"
import './helper.js'
import { calculateTvl, getOrCreatePool, getPoolPrice } from "./helper.js"
import { scaleDown } from "@sentio/sdk"
import { getERC20ContractOnContext } from "@sentio/sdk/eth/builtin/erc20"
import { getPriceBySymbol } from "@sentio/sdk/utils"

export const WBTC_ADDRESS = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
export const LBTC_ADDRESS = "0x8236a87084f8B84306f72007F36F2618A5634494"

const UNISWAPV3_POOL_MAPS = [
  "0x87428a53e14d24Ab19c6Ca4939B4df93B8996cA9" //wbtc-lbtc
]


for (const pool of UNISWAPV3_POOL_MAPS) {
  UniswapV3PoolProcessor.bind({
    address: pool,
    network: EthChainId.ETHEREUM
  })
    .onEventSwap(async (event, ctx) => {
      const poolInfo = await getOrCreatePool(ctx, pool)

      ctx.eventLogger.emit("Swap", {
        distinctId: event.args.sender,
        recipient: event.args.recipient,
        amount0: scaleDown(event.args.amount0, poolInfo.decimal0),
        amount1: scaleDown(event.args.amount1, poolInfo.decimal1),
        sqrtPriceX96: event.args.sqrtPriceX96,
        liquidity: event.args.liquidity,
        tick: event.args.tick,
        symbol0: poolInfo.symbol0,
        symbol1: poolInfo.symbol1,
        pool: poolInfo.pairName
      })
      const coin_a2b_price = await getPoolPrice(ctx)
      const coin0Price = await getPriceBySymbol(poolInfo.symbol0, ctx.timestamp) ?? 0
      const vol = coin0Price * Math.abs(Number(event.args.amount0) / 10 ** poolInfo.decimal0)
      ctx.meter.Counter("swap_vol").add(vol)
      ctx.meter.Gauge("swap_gauge").record(vol)
    })
    .onTimeInterval(async (_, ctx) => {
      const poolInfo = await getOrCreatePool(ctx, pool)
      const lBtcBalance = scaleDown(await getERC20ContractOnContext(ctx, LBTC_ADDRESS).balanceOf(pool), poolInfo.decimal0)
      const wBtcBalance = scaleDown(await getERC20ContractOnContext(ctx, WBTC_ADDRESS).balanceOf(pool), poolInfo.decimal1)
      const coin_a2b_price = await getPoolPrice(ctx)
      const [tvl0, tvl1] = await calculateTvl(ctx, Number(wBtcBalance), Number(lBtcBalance))

      ctx.meter.Gauge("pool_lBTC_gauge").record(lBtcBalance)
      ctx.meter.Gauge("pool_wBTC_gauge").record(wBtcBalance)
      ctx.meter.Gauge("tvl_gauge").record(tvl0 + tvl1)

    },
      60,
      10
    )

}

