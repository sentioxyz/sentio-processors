import { Counter, Gauge } from '@sentio/sdk'
import { token as tokens, conversion, dexPrice } from '@sentio/sdk/lib/utils'
import { ERC20Processor } from '@sentio/sdk/lib/builtin/erc20'
import { 
  SeaportContext, 
  SeaportProcessor,
  OrderFulfilledEvent 
} from './types/seaport'
// import { getEACAggregatorProxyContract } from './types/eacaggregatorproxy'
import { SEAPORT_ADDR, USDC_ETH_ORACLE } from './constant'
import type { BigNumber } from 'ethers'
import { BigDecimal } from '@sentio/sdk'


function scaleDown(amount: BigNumber, decimal: number) {
  return conversion.toBigDecimal(amount).div(BigDecimal(10).pow(decimal))
}

const orderFulfilled = async function(event: OrderFulfilledEvent, ctx: SeaportContext) {
  const amount = event.args.offer
  ctx.meter.Counter("order_fulfilled_cume").add(1)
  ctx.meter.Gauge("order_fulfilled").record(1)
  // const latestAnswer = await getEACAggregatorProxyContract(USDC_ETH_ORACLE).latestAnswer({blockTag: ctx.blockNumber.toNumber()})
  // the oracle actually returns USDC/ETH price with 18 decimal
  // so to get ETH/USDC price, just do 1e18.div(result)
  const priceResult = await dexPrice.EthereumDexPrice.getPrice("usdc", dexPrice.PriceUnit.ETH)
  const eth_usdc_price =  priceResult.error ? 0 : priceResult.price!
  // BigDecimal(10).pow(18).div(conversion.toBigDecimal(latestAnswer))

  for (var i = 0; i < amount.length; i++) {
    var item = amount[i];
    // TODO only process native ETH now
    if (item.itemType == 0) {
      ctx.meter.Counter("eth_volume_cume").add(scaleDown(item.amount, 18))
      ctx.meter.Counter("eth_volume").add(scaleDown(item.amount, 18)) 
      ctx.meter.Counter("eth_volume_in_usdc_cume").add(scaleDown(item.amount, 18).multipliedBy(eth_usdc_price))
      ctx.meter.Counter("eth_volume_in_usdc").add(scaleDown(item.amount, 18).multipliedBy(eth_usdc_price))       
    }
    // ERC20 token
    else if (item.itemType == 1) {
      const token = item.token
      const tokenInfo = await tokens.getERC20TokenInfo(token)
      ctx.meter.Counter("token_volume_cume").add(scaleDown(item.amount, tokenInfo.decimal), {token: tokenInfo.symbol})
      ctx.meter.Gauge("token_volume").record(scaleDown(item.amount, tokenInfo.decimal), {token: tokenInfo.symbol})  
    }
  }
}

SeaportProcessor.bind({ address: SEAPORT_ADDR })
.onEventOrderFulfilled(orderFulfilled)