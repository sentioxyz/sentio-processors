import { user, assets, market } from './types/aptos/0xc0deb00c405f84c85dc13442e305df75d1288100cdd82675695f6148c7ece51c.js'

user.bind()
    .onEventCancelOrderEvent(async (evt, ctx ) => {
      ctx.eventLogger.emit('cancel_order', {
        distinctId: evt.data_decoded.user,
        ...evt.data_decoded,
      })
    })
    .onEventPlaceMarketOrderEvent(async (evt, ctx ) => {
      ctx.eventLogger.emit('place_market_order', {
        distinctId: evt.data_decoded.user,
        ...evt.data_decoded,
      })
    })
    .onEventPlaceLimitOrderEvent(async (evt, ctx ) => {
      ctx.eventLogger.emit('place_limit_order', {
        distinctId: evt.data_decoded.user,
        ...evt.data_decoded,
      })
    })
    .onEventFillEvent(async (evt, ctx ) => {
      ctx.eventLogger.emit('fill_order', {
        distinctId: evt.guid.account_address,
        ...evt.data_decoded,
      })
    })

    // .onevent
//     .onEventMakerEvent()
// .onEventPlaceSwapOrderEvent()