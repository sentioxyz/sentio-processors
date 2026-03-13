import { SuiContext } from '@sentio/sdk/sui'
import { event } from '../../types/sui/navi.js'
import { emitRawEvent } from '../../utils/events.js'

export function registerFlashLoanHandlers(processor: event) {
  processor
    .onEventFlashLoan(async (evt: event.FlashLoanInstance, ctx: SuiContext) => {
      const { sender, asset, amount, market_id } = evt.data_decoded
      emitRawEvent(ctx, 'flash_loan', {
        sender,
        asset,
        amount: amount.toString(),
        market_id: market_id.toString(),
      })
    })

    .onEventFlashRepay(async (evt: event.FlashRepayInstance, ctx: SuiContext) => {
      const { sender, asset, amount, fee_to_supplier, fee_to_treasury, market_id } = evt.data_decoded
      emitRawEvent(ctx, 'flash_repay', {
        sender,
        asset,
        amount: amount.toString(),
        fee_to_supplier: fee_to_supplier.toString(),
        fee_to_treasury: fee_to_treasury.toString(),
        market_id: market_id.toString(),
      })
    })
}
