import { Counter, Gauge } from '@sentio/sdk'
import { toBigDecimal } from '@sentio/sdk/lib/utils'
import { ERC20Processor } from '@sentio/sdk/lib/builtin/erc20'
import { 
  SeaportContext, 
  SeaportProcessor,
  OrderFulfilledEvent 
} from './types/seaport'
import { SEAPORT_ADDR } from './constant'

const orderFulfilled = async function(event: OrderFulfilledEvent, ctx: SeaportContext) {
  const amount = event.args.offer
  for (var i = 0; i < amount.length; i++) {
    var item = amount[i];
    // TODO only process native ETH now
    if (item.itemType == 0) {
      ctx.meter.Counter("eth_volume").add(item.amount)
    }
  }
}

SeaportProcessor.bind({ address: SEAPORT_ADDR })
.onEventOrderFulfilled(orderFulfilled)