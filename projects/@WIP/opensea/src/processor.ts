import { Counter, Gauge } from '@sentio/sdk'
import { token as tokens, conversion, dexPrice } from '@sentio/sdk/lib/utils'
import { ERC20Processor } from '@sentio/sdk/eth/builtin/erc20'
import { 
  SeaportContext, 
  SeaportProcessor,
  OrderFulfilledEvent 
} from './types/seaport'
import { SEAPORT_ADDR } from './constant'
import type { BigNumber } from 'ethers'
import { BigDecimal } from '@sentio/sdk'


function scaleDown(amount: BigNumber, decimal: number) {
  return conversion.toBigDecimal(amount).div(BigDecimal(10).pow(decimal))
}

const orderFulfilled = async function(event: OrderFulfilledEvent, ctx: SeaportContext) {
  const amount = event.args.offer
  ctx.meter.Counter("order_fulfilled_cume").add(1)
  ctx.meter.Gauge("order_fulfilled").record(1)

  for (var i = 0; i < amount.length; i++) {
    var item = amount[i];
    // native eth
    if (item.itemType == 0) {
      ctx.meter.Counter("eth_volume_cume").add(scaleDown(item.amount, 18))
      ctx.meter.Counter("eth_volume").add(scaleDown(item.amount, 18)) 
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