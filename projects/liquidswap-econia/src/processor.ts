import {
  user,
  registry,
} from './types/aptos/0xc0deb00c405f84c85dc13442e305df75d1288100cdd82675695f6148c7ece51c.js'
import { AptosContext } from "@sentio/sdk/aptos";
import {  getCoinInfo } from "@sentio/sdk/aptos/ext"

user.bind()
    .onEventCancelOrderEvent(async (evt, ctx ) => {
      const marketInfo = await getMarketInfo(ctx, evt.data_decoded.market_id)
      const pair = await getPair(marketInfo)

      ctx.eventLogger.emit('cancel_order', {
        distinctId: evt.data_decoded.user,
        pair,
        ...evt.data_decoded,
      })
    })
    .onEventPlaceMarketOrderEvent(async (evt, ctx ) => {
      const marketInfo = await getMarketInfo(ctx, evt.data_decoded.market_id)
      const pair = await getPair(marketInfo)

      ctx.eventLogger.emit('place_market_order', {
        distinctId: evt.data_decoded.user,
        pair,
        ...evt.data_decoded,
      })
    })
    .onEventPlaceLimitOrderEvent(async (evt, ctx ) => {
      const marketInfo = await getMarketInfo(ctx, evt.data_decoded.market_id)
      const pair = await getPair(marketInfo)

      ctx.eventLogger.emit('place_limit_order', {
        distinctId: evt.data_decoded.user,
        pair,
        ...evt.data_decoded,
      })
    })
    .onEventFillEvent(async (evt, ctx ) => {
      if (evt.data_decoded.maker === evt.guid.account_address) {
        // evt.data_decoded.market_id
        // evt.data_decoded.
        const marketInfo = await getMarketInfo(ctx, evt.data_decoded.market_id)
        const pair = await getPair(marketInfo)
        ctx.eventLogger.emit('fill_order', {
          distinctId: evt.guid.account_address,
          pair,
          ...evt.data_decoded,
        })
      }
    })

    // .onevent
//     .onEventMakerEvent()
// .onEventPlaceSwapOrderEvent()

async function getMarketInfo(ctx: AptosContext, marketId: bigint) {
  const res = (await ctx.getClient().view({
    function: "0xc0deb00c405f84c85dc13442e305df75d1288100cdd82675695f6148c7ece51c::registry::get_market_info",
    arguments: [marketId.toString()],
    type_arguments: [],
  }, ctx.version.toString()))[0]

  return (await ctx.coder.decodedType(res, registry.MarketInfoView.type()))!
}

async function getPair(marketView: registry.MarketInfoView) {
  const type1 = marketView.base_type.package_address + "::" + marketView.base_type.module_name + "::" + marketView.base_type.type_name
  const type2 = marketView.quote_type.package_address + "::" + marketView.quote_type.module_name + "::" + marketView.quote_type.type_name

  return getCoinInfo(type1).symbol + "/" + getCoinInfo(type2).symbol
}