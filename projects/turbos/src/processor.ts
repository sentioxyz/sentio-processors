import { pool, pool_factory } from "./types/sui/turbos.js";
import { SuiObjectProcessor, SuiContext, SuiObjectsContext } from "@sentio/sdk/sui"
import * as constant from './constant.js'
import { SuiChainId } from "@sentio/sdk"
import * as helper from './helper/turbos-clmm-helper.js'

pool_factory.bind({
  address: constant.CLMM_MAINNET,
  network: SuiChainId.SUI_MAINNET,
  startCheckpoint: 1500000n
})
  .onEventPoolCreatedEvent((event, ctx) => {
    ctx.meter.Counter("create_pool_counter").add(1)
    const account = event.data_decoded.account
    const fee_protocol = event.data_decoded.fee_protocol
    const pool = event.data_decoded.pool
    const tick_spacing = event.data_decoded.tick_spacing
    const fee = event.data_decoded.fee
    const sqrt_price = event.data_decoded.sqrt_price

    ctx.eventLogger.emit("CreatePoolEvent", {
      distinctId: ctx.transaction.transaction.data.sender,
      account,
      fee_protocol,
      pool,
      tick_spacing,
      fee,
      sqrt_price
    })

    helper.getOrCreatePool(ctx, pool)
  })
